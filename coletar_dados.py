#!/usr/bin/env python3
"""
Etapa 1: Coleta unica e tratamento local das series historicas oficiais (2003-presente).

Fontes oficiais utilizadas:
  1. FRED (Federal Reserve):
     - GS10: 10-Year Treasury Constant Maturity Rate (% a.a., mensal)
     - FII10: 10-Year Treasury Inflation-Indexed Security (TIPS) Constant Maturity (% a.a. real, mensal)
     - TB3MS: 3-Month Treasury Bill Secondary Market Rate, Discount Basis (% a.a., mensal)
     - CPIAUCSL: Consumer Price Index US (indice mensal)
  2. Yahoo Finance:
     - ^SP500TR: S&P 500 Total Return Index (mensal, dividendos reinvestidos)
  3. Banco Central do Brasil (API SGS):
     - Serie 1: PTAX Dolar Venda (diaria -> agrupada para fechamento do ultimo dia util do mes)
     - Serie 433: IPCA - Variacao mensal (% a.m.)
     - Serie 4390: Selic acumulada no mes (% a.m.)
  4. Tesouro Transparente (CKAN - Secretaria do Tesouro Nacional):
     - precotaxatesourodireto.csv: Taxas e precos historicos diarios do Tesouro Direto

Uso:
  python3 coletar_dados.py
  python3 coletar_dados.py --forcar          # re-baixa todos os arquivos brutos
  python3 coletar_dados.py --inicio 2003-01  # define mes inicial da serie tratada
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import shutil
import ssl
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Dict, List, Optional, Tuple


ROOT_DIR = Path(__file__).resolve().parent
RAW_DIR = ROOT_DIR / "dados" / "brutos"
PROCESSED_DIR = ROOT_DIR / "dados" / "tratados"

URLS = {
    "fred_gs10": "https://fred.stlouisfed.org/graph/fredgraph.csv?id=GS10",
    "fred_fii10": "https://fred.stlouisfed.org/graph/fredgraph.csv?id=FII10",
    "fred_tb3ms": "https://fred.stlouisfed.org/graph/fredgraph.csv?id=TB3MS",
    "fred_cpiaucsl": "https://fred.stlouisfed.org/graph/fredgraph.csv?id=CPIAUCSL",
    "yahoo_sp500tr": (
        "https://query1.finance.yahoo.com/v8/finance/chart/%5ESP500TR"
        "?range=30y&interval=1mo"
    ),
    "tesouro_direto": (
        "https://www.tesourotransparente.gov.br/ckan/dataset/"
        "df56aa42-484a-4a59-8184-7676580c81e3/resource/"
        "796d2059-14e9-44e3-80c9-2d9e30b405c1/download/precotaxatesourodireto.csv"
    ),
}

HEADERS = {
    "User-Agent": "curl/8.5.0",
    "Accept": "*/*",
}


def build_ssl_context() -> ssl.SSLContext:
    ctx = ssl.create_default_context()
    return ctx


def download_file(
    url: str,
    dest: Path,
    force: bool = False,
    timeout: int = 180,
    user_agent: Optional[str] = None,
) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 0 and not force:
        print(f"  [cache] Usando arquivo local existente: {dest.relative_to(ROOT_DIR)}", flush=True)
        return dest

    print(f"  [download] Baixando {url} ...", flush=True)
    tmp = dest.with_suffix(dest.suffix + ".tmp")
    curl_bin = shutil.which("curl")
    if curl_bin:
        try:
            cmd = [curl_bin, "-sSL", "--fail", "--max-time", str(timeout)]
            if user_agent:
                cmd.extend(["-A", user_agent])
            cmd.extend(["-o", str(tmp), url])
            subprocess.run(cmd, check=True)
            tmp.replace(dest)
            print(
                f"  [ok] Salvo em {dest.relative_to(ROOT_DIR)} ({dest.stat().st_size / 1024:.1f} KB)",
                flush=True,
            )
            return dest
        except Exception:
            if tmp.exists():
                tmp.unlink()
            raise

    req_headers = dict(HEADERS)
    if user_agent:
        req_headers["User-Agent"] = user_agent
    req = urllib.request.Request(url, headers=req_headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=build_ssl_context()) as resp:
            total = resp.headers.get("Content-Length")
            total_bytes = int(total) if total and total.isdigit() else None
            downloaded = 0
            with open(tmp, "wb") as f:
                while True:
                    chunk = resp.read(1024 * 256)
                    if not chunk:
                        break
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total_bytes and downloaded % (1024 * 1024 * 4) < 1024 * 256:
                        pct = (downloaded / total_bytes) * 100
                        print(f"    ... {downloaded / (1024 * 1024):.1f} MB ({pct:.0f}%)", flush=True)
        tmp.replace(dest)
        print(f"  [ok] Salvo em {dest.relative_to(ROOT_DIR)} ({dest.stat().st_size / 1024:.1f} KB)", flush=True)
        return dest
    except Exception:
        if tmp.exists():
            tmp.unlink()
        raise


def fetch_bcb_sgs(
    serie_id: int,
    nome_arquivo: str,
    start_year: int = 2002,
    chunk_years: int = 5,
    force: bool = False,
) -> Path:
    """
    Consulta a API do BCB SGS em janelas de anos (evita limite de 10 anos em series diarias)
    e salva uma copia JSON unica localmente.
    """
    dest = RAW_DIR / nome_arquivo
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 0 and not force:
        print(f"  [cache] Usando arquivo local existente: {dest.relative_to(ROOT_DIR)}")
        return dest

    today = dt.date.today()
    all_records: List[dict] = []
    seen_dates = set()

    cur_start = dt.date(start_year, 1, 1)
    print(f"  [download] Consultando BCB SGS serie {serie_id} desde {cur_start.strftime('%d/%m/%Y')} ...")
    while cur_start <= today:
        cur_end = min(dt.date(cur_start.year + chunk_years - 1, 12, 31), today)
        url = (
            f"https://api.bcb.gov.br/dados/serie/bcdata.sgs.{serie_id}/dados"
            f"?formato=json&dataInicial={cur_start.strftime('%d/%m/%Y')}"
            f"&dataFinal={cur_end.strftime('%d/%m/%Y')}"
        )
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=60, context=build_ssl_context()) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
        if isinstance(payload, list):
            for row in payload:
                d = row.get("data")
                if d and d not in seen_dates:
                    seen_dates.add(d)
                    all_records.append(row)
        cur_start = dt.date(cur_end.year + 1, 1, 1)

    with open(dest, "w", encoding="utf-8") as f:
        json.dump(all_records, f, ensure_ascii=False, indent=2)
    print(f"  [ok] Salvo em {dest.relative_to(ROOT_DIR)} ({len(all_records)} registros)")
    return dest


def parse_fred_monthly(csv_path: Path) -> Dict[str, float]:
    out: Dict[str, float] = {}
    with open(csv_path, "r", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        header = next(reader, None)
        if not header or len(header) < 2:
            raise ValueError(f"Cabecalho invalido em {csv_path}")
        for row in reader:
            if len(row) < 2:
                continue
            date_str = row[0].strip()
            val_str = row[1].strip()
            if not date_str or val_str in ("", ".", "NA", "NaN"):
                continue
            ym = date_str[:7]
            try:
                out[ym] = float(val_str)
            except ValueError:
                continue
    return out


def parse_yahoo_monthly_close(json_path: Path) -> Dict[str, float]:
    with open(json_path, "r", encoding="utf-8") as f:
        payload = json.load(f)
    results = payload.get("chart", {}).get("result") or []
    if not results:
        raise ValueError(f"Estrutura invalida no JSON do Yahoo Finance em {json_path}")
    res = results[0]
    timestamps = res.get("timestamp") or []
    closes = ((res.get("indicators") or {}).get("quote") or [{}])[0].get("close") or []
    out: Dict[str, float] = {}
    for ts, close_val in zip(timestamps, closes):
        if ts is None or close_val is None:
            continue
        ym = dt.datetime.fromtimestamp(ts, dt.timezone.utc).strftime("%Y-%m")
        out[ym] = float(close_val)
    return out


def parse_bcb_monthly_direct(json_path: Path) -> Dict[str, float]:
    with open(json_path, "r", encoding="utf-8") as f:
        rows = json.load(f)
    out: Dict[str, float] = {}
    for row in rows:
        d_str = row.get("data", "").strip()
        v_str = str(row.get("valor", "")).strip().replace(",", ".")
        if not d_str or not v_str:
            continue
        try:
            d = dt.datetime.strptime(d_str, "%d/%m/%Y").date()
            out[d.strftime("%Y-%m")] = float(v_str)
        except ValueError:
            continue
    return out


def parse_bcb_ptax_month_end(json_path: Path) -> Dict[str, Tuple[float, str]]:
    """
    Agrupa PTAX diaria para o ultimo dia util disponivel de cada mes.
    Retorna {YYYY-MM: (valor_venda, YYYY-MM-DD)}.
    """
    with open(json_path, "r", encoding="utf-8") as f:
        rows = json.load(f)
    latest_per_month: Dict[str, Tuple[dt.date, float]] = {}
    for row in rows:
        d_str = row.get("data", "").strip()
        v_str = str(row.get("valor", "")).strip().replace(",", ".")
        if not d_str or not v_str:
            continue
        try:
            d = dt.datetime.strptime(d_str, "%d/%m/%Y").date()
            val = float(v_str)
        except ValueError:
            continue
        ym = d.strftime("%Y-%m")
        if ym not in latest_per_month or d > latest_per_month[ym][0]:
            latest_per_month[ym] = (d, val)

    return {ym: (val, d.isoformat()) for ym, (d, val) in latest_per_month.items()}


def parse_br_float(val: str) -> Optional[float]:
    s = val.strip().replace(".", "").replace(",", ".") if "," in val and "." in val else val.strip().replace(",", ".")
    if not s:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def normalize_tesouro_tipo(tipo: str) -> Optional[str]:
    t = tipo.strip().lower()
    if "prefixado" in t:
        return "PREFIXADO"
    if "ipca" in t:
        return "IPCA_MAIS"
    return None


def parse_tesouro_direto_monthly(
    csv_path: Path,
    target_years: float = 10.0,
) -> Dict[str, Dict[str, dict]]:
    best_date_seen: Dict[Tuple[str, str], dt.date] = {}
    candidates_on_best_date: Dict[Tuple[str, str], List[dict]] = {}

    encodings = ["utf-8-sig", "latin-1", "cp1252"]
    used_encoding = None
    for enc in encodings:
        try:
            with open(csv_path, "r", encoding=enc) as f:
                f.readline()
            used_encoding = enc
            break
        except UnicodeDecodeError:
            continue

    if not used_encoding:
        raise RuntimeError(f"Nao foi possivel decodificar {csv_path}")

    with open(csv_path, "r", encoding=used_encoding, newline="") as f:
        sample = f.readline()
        delim = ";" if ";" in sample else ","
        f.seek(0)
        reader = csv.DictReader(f, delimiter=delim)
        if not reader.fieldnames:
            raise RuntimeError("CSV do Tesouro Direto sem cabecalho.")

        col_map = {c.strip().lower(): c for c in reader.fieldnames}

        def get_col(row: dict, *options: str) -> str:
            for opt in options:
                for key_lower, orig_name in col_map.items():
                    if opt in key_lower:
                        return row.get(orig_name, "")
            return ""

        for row in reader:
            tipo_raw = get_col(row, "tipo titulo", "tipo título")
            cat = normalize_tesouro_tipo(tipo_raw)
            if not cat:
                continue

            base_str = get_col(row, "data base").strip()
            venc_str = get_col(row, "data vencimento").strip()
            if not base_str or not venc_str:
                continue

            try:
                base_date = dt.datetime.strptime(base_str, "%d/%m/%Y").date()
                venc_date = dt.datetime.strptime(venc_str, "%d/%m/%Y").date()
            except ValueError:
                continue

            if base_date < dt.date(2002, 11, 1):
                continue

            prazo_anos = (venc_date - base_date).days / 365.25
            if prazo_anos < 1.0:
                continue

            taxa_venda = parse_br_float(get_col(row, "taxa venda"))
            taxa_compra = parse_br_float(get_col(row, "taxa compra"))
            taxa = taxa_venda if taxa_venda is not None else taxa_compra
            if taxa is None or taxa <= 0:
                continue

            ym = base_date.strftime("%Y-%m")
            key = (ym, cat)
            prev_best = best_date_seen.get(key)
            if prev_best is None or base_date > prev_best:
                best_date_seen[key] = base_date
                candidates_on_best_date[key] = []
            elif base_date < prev_best:
                continue

            candidates_on_best_date[key].append(
                {
                    "tipo_titulo": tipo_raw.strip(),
                    "data_base": base_date.isoformat(),
                    "data_vencimento": venc_date.isoformat(),
                    "prazo_anos": prazo_anos,
                    "taxa_aa_pct": taxa,
                    "sem_cupom": "juros semestrais" not in tipo_raw.lower(),
                }
            )

    result: Dict[str, Dict[str, dict]] = {}
    for (ym, cat), cands in candidates_on_best_date.items():
        def score(c: dict) -> Tuple[float, int]:
            dist = abs(c["prazo_anos"] - target_years)
            short_penalty = 5.0 if c["prazo_anos"] < 3.0 else 0.0
            cupom_tiebreak = 0 if c["sem_cupom"] else 1
            return (round(dist + short_penalty, 2), cupom_tiebreak)

        chosen = min(cands, key=score)
        result.setdefault(ym, {})[cat] = chosen

    return result


def generate_month_range(start_ym: str, end_ym: str) -> List[str]:
    sy, sm = map(int, start_ym.split("-"))
    ey, em = map(int, end_ym.split("-"))
    months: List[str] = []
    y, m = sy, sm
    while (y, m) <= (ey, em):
        months.append(f"{y:04d}-{m:02d}")
        m += 1
        if m > 12:
            m = 1
            y += 1
    return months


def interpolate_missing_series(series_map: Dict[str, float], timeline: List[str], label: str) -> None:
    for idx, ym in enumerate(timeline):
        if ym not in series_map:
            prev_idx = next((j for j in range(idx - 1, -1, -1) if timeline[j] in series_map), None)
            next_idx = next((j for j in range(idx + 1, len(timeline)) if timeline[j] in series_map), None)
            if prev_idx is not None and next_idx is not None:
                v0, v1 = series_map[timeline[prev_idx]], series_map[timeline[next_idx]]
                frac = (idx - prev_idx) / (next_idx - prev_idx)
                series_map[ym] = v0 + (v1 - v0) * frac
                print(f"  [aviso] {ym}: {label} ausente; interpolado para {series_map[ym]:.4f}", flush=True)
            elif prev_idx is not None:
                series_map[ym] = series_map[timeline[prev_idx]]
                print(f"  [aviso] {ym}: {label} ausente; repetido valor anterior {series_map[ym]:.4f}", flush=True)


def run_collection(start_ym: str = "2003-01", target_years: float = 10.0, force: bool = False) -> Path:
    print("=== Etapa 1: Coleta e Tratamento Local de Dados Oficiais ===")
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    gs10_path = download_file(URLS["fred_gs10"], RAW_DIR / "fred_gs10.csv", force=force)
    fii10_path = download_file(URLS["fred_fii10"], RAW_DIR / "fred_fii10.csv", force=force)
    tb3ms_path = download_file(URLS["fred_tb3ms"], RAW_DIR / "fred_tb3ms.csv", force=force)
    cpi_path = download_file(URLS["fred_cpiaucsl"], RAW_DIR / "fred_cpiaucsl.csv", force=force)
    sp500tr_path = download_file(
        URLS["yahoo_sp500tr"],
        RAW_DIR / "yahoo_sp500tr.json",
        force=force,
        user_agent="Mozilla/5.0",
    )
    ptax_path = fetch_bcb_sgs(1, "bcb_sgs_1_ptax_venda.json", start_year=2002, chunk_years=5, force=force)
    ipca_path = fetch_bcb_sgs(433, "bcb_sgs_433_ipca_mensal.json", start_year=2002, chunk_years=10, force=force)
    selic_path = fetch_bcb_sgs(4390, "bcb_sgs_4390_selic_mensal.json", start_year=2002, chunk_years=10, force=force)
    td_path = download_file(URLS["tesouro_direto"], RAW_DIR / "precotaxatesourodireto.csv", force=force, timeout=240)

    print("\nProcessando e alinhando series mensais...")
    gs10 = parse_fred_monthly(gs10_path)
    fii10 = parse_fred_monthly(fii10_path)
    tb3ms = parse_fred_monthly(tb3ms_path)
    cpi = parse_fred_monthly(cpi_path)
    sp500tr = parse_yahoo_monthly_close(sp500tr_path)
    ptax = parse_bcb_ptax_month_end(ptax_path)
    ipca = parse_bcb_monthly_direct(ipca_path)
    selic = parse_bcb_monthly_direct(selic_path)
    td = parse_tesouro_direto_monthly(td_path, target_years=target_years)

    common_months = (
        set(gs10.keys())
        & set(fii10.keys())
        & set(tb3ms.keys())
        & set(sp500tr.keys())
        & set(ptax.keys())
        & set(ipca.keys())
        & set(selic.keys())
        & set(td.keys())
    )
    valid_months = sorted(m for m in common_months if m >= start_ym)
    if not valid_months:
        raise RuntimeError("Nenhum mes em comum encontrado entre as fontes oficiais.")

    first_valid_ym = valid_months[0]
    last_ym = valid_months[-1]
    timeline = generate_month_range(first_valid_ym, last_ym)

    interpolate_missing_series(cpi, timeline, "us_cpi_indice")
    interpolate_missing_series(fii10, timeline, "us_tips_10y_taxa_real_aa_pct")
    interpolate_missing_series(tb3ms, timeline, "us_tbill_3m_aa_pct")
    interpolate_missing_series(sp500tr, timeline, "sp500_tr_indice")

    out_csv = PROCESSED_DIR / "serie_mensal_consolidada.csv"
    fieldnames = [
        "mes",
        "ptax_venda_fim_mes",
        "ptax_data_ref",
        "ipca_mensal_pct",
        "selic_mensal_pct",
        "us_cpi_indice",
        "us_cpi_mensal_pct",
        "us_treasury_10y_aa_pct",
        "us_tips_10y_taxa_real_aa_pct",
        "us_tbill_3m_aa_pct",
        "sp500_tr_indice",
        "sp500_tr_mensal_pct",
        "br_prefixado_taxa_aa_pct",
        "br_prefixado_titulo_ref",
        "br_prefixado_prazo_anos",
        "br_ipca_mais_taxa_real_aa_pct",
        "br_ipca_mais_titulo_ref",
        "br_ipca_mais_prazo_anos",
    ]

    prev_prefix: Optional[dict] = None
    prev_ipca: Optional[dict] = None
    missing_warnings: List[str] = []
    rows_to_write: List[dict] = []

    sy, sm = map(int, first_valid_ym.split("-"))
    prev_ym_before_start = f"{sy - 1:04d}-12" if sm == 1 else f"{sy:04d}-{sm - 1:02d}"
    prev_cpi_val: Optional[float] = cpi.get(prev_ym_before_start)
    prev_sp500_val: Optional[float] = sp500tr.get(prev_ym_before_start)

    for ym in timeline:
        ptax_val, ptax_ref = ptax.get(ym, (None, ""))
        ipca_val = ipca.get(ym)
        selic_val = selic.get(ym)
        cpi_val = cpi.get(ym)
        gs10_val = gs10.get(ym)
        fii10_val = fii10.get(ym)
        tb3ms_val = tb3ms.get(ym)
        sp500_val = sp500tr.get(ym)

        td_month = td.get(ym, {})
        prefix_info = td_month.get("PREFIXADO") or prev_prefix
        ipca_info = td_month.get("IPCA_MAIS") or prev_ipca

        if "PREFIXADO" not in td_month and prev_prefix is not None:
            missing_warnings.append(f"{ym}: PREFIXADO preenchido com mes anterior")
        if "IPCA_MAIS" not in td_month and prev_ipca is not None:
            missing_warnings.append(f"{ym}: IPCA+ preenchido com mes anterior")

        if prefix_info:
            prev_prefix = prefix_info
        if ipca_info:
            prev_ipca = ipca_info

        if (
            None in (ptax_val, ipca_val, selic_val, cpi_val, gs10_val, fii10_val, tb3ms_val, sp500_val)
            or not prefix_info
            or not ipca_info
        ):
            missing_warnings.append(f"{ym}: mes ignorado por ausencia de serie basica")
            if cpi_val is not None:
                prev_cpi_val = cpi_val
            if sp500_val is not None:
                prev_sp500_val = sp500_val
            continue

        cpi_mom_pct = ((cpi_val / prev_cpi_val) - 1.0) * 100.0 if prev_cpi_val else 0.0
        sp500_mom_pct = ((sp500_val / prev_sp500_val) - 1.0) * 100.0 if prev_sp500_val else 0.0
        prev_cpi_val = cpi_val
        prev_sp500_val = sp500_val

        rows_to_write.append(
            {
                "mes": ym,
                "ptax_venda_fim_mes": f"{ptax_val:.4f}",
                "ptax_data_ref": ptax_ref,
                "ipca_mensal_pct": f"{ipca_val:.4f}",
                "selic_mensal_pct": f"{selic_val:.4f}",
                "us_cpi_indice": f"{cpi_val:.3f}",
                "us_cpi_mensal_pct": f"{cpi_mom_pct:.4f}",
                "us_treasury_10y_aa_pct": f"{gs10_val:.4f}",
                "us_tips_10y_taxa_real_aa_pct": f"{fii10_val:.4f}",
                "us_tbill_3m_aa_pct": f"{tb3ms_val:.4f}",
                "sp500_tr_indice": f"{sp500_val:.4f}",
                "sp500_tr_mensal_pct": f"{sp500_mom_pct:.4f}",
                "br_prefixado_taxa_aa_pct": f"{prefix_info['taxa_aa_pct']:.4f}",
                "br_prefixado_titulo_ref": f"{prefix_info['tipo_titulo']} ({prefix_info['data_vencimento']})",
                "br_prefixado_prazo_anos": f"{prefix_info['prazo_anos']:.2f}",
                "br_ipca_mais_taxa_real_aa_pct": f"{ipca_info['taxa_aa_pct']:.4f}",
                "br_ipca_mais_titulo_ref": f"{ipca_info['tipo_titulo']} ({ipca_info['data_vencimento']})",
                "br_ipca_mais_prazo_anos": f"{ipca_info['prazo_anos']:.2f}",
            }
        )

    with open(out_csv, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows_to_write)

    print(f"\n[sucesso] Base mensal consolidada gerada: {out_csv.relative_to(ROOT_DIR)}")
    print(f"  Periodo coberto: {rows_to_write[0]['mes']} ate {rows_to_write[-1]['mes']} ({len(rows_to_write)} meses)")
    if missing_warnings:
        print(f"  Observacoes ({len(missing_warnings)}):")
        for w in missing_warnings[:10]:
            print(f"    - {w}")
        if len(missing_warnings) > 10:
            print(f"    ... e mais {len(missing_warnings) - 10} observacoes.")
    return out_csv


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Baixa fontes oficiais uma vez e gera a base mensal consolidada em CSV."
    )
    parser.add_argument(
        "--inicio",
        default="2003-01",
        help="Mes inicial no formato YYYY-MM (padrao: 2003-01)",
    )
    parser.add_argument(
        "--prazo-alvo",
        type=float,
        default=10.0,
        help="Prazo alvo em anos para selecao dos titulos BR no Tesouro Direto (padrao: 10.0)",
    )
    parser.add_argument(
        "--forcar",
        action="store_true",
        help="Forca novo download mesmo se os arquivos brutos ja existirem localmente",
    )
    args = parser.parse_args()

    try:
        run_collection(start_ym=args.inicio, target_years=args.prazo_alvo, force=args.forcar)
        return 0
    except urllib.error.URLError as exc:
        print(f"[erro de rede] Falha ao baixar dados oficiais: {exc}", file=sys.stderr)
        return 1
    except Exception as exc:
        print(f"[erro] {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
