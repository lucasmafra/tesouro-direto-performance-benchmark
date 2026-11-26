#!/usr/bin/env python3
"""
Etapas 2 e 3: Motor de simulacao Damodaran + regras fiscais/cambiais e exportacao CSV.

Le a base mensal consolidada gerada por coletar_dados.py e simula aportes mensais
consecutivos em janelas moveis parametrizaveis (ex.: 60 meses = 5 anos, 120 meses = 10 anos):

  Renda Fixa EUA (Dolar + FX + Lei 14.754/2023):
    - US Treasury 10Y (FRED GS10, reaprecamento mensal Damodaran)
    - US TIPS 10Y (FRED FII10 real + CPIAUCSL, reaprecamento mensal Damodaran)
    - US T-Bills 3M (FRED TB3MS taxa de desconto convertida para rendimento mensal)

  Renda Fixa Brasil (BRL + custodia B3 + IR Brasil):
    - Tesouro Selic (BCB SGS 4390)
    - Tesouro Prefixado (Tesouro Direto taxa longa, reaprecamento Damodaran)
    - Tesouro IPCA+ (Tesouro Direto taxa real longa + IPCA, reaprecamento Damodaran)

  Renda Variavel EUA (Benchmark separado de acoes):
    - S&P 500 Total Return (^SP500TR com dividendos reinvestidos + FX + Lei 14.754/2023)

Uso:
  python3 simular_backtest.py
  python3 simular_backtest.py --janelas 60 120
  python3 simular_backtest.py --janela-meses 120 --detalhar-mes 2015-01
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import statistics
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Dict, List, Optional


ROOT_DIR = Path(__file__).resolve().parent
DEFAULT_DATA_CSV = ROOT_DIR / "dados" / "tratados" / "serie_mensal_consolidada.csv"
DEFAULT_CONFIG_JSON = ROOT_DIR / "parametros.json"
OUTPUT_DIR = ROOT_DIR / "resultados"


@dataclass
class SimulationConfig:
    aporte_inicial_brl: float = 1000.0
    data_inicio: str = "2003-01"
    data_fim: Optional[str] = None
    janela_meses: int = 120
    ir_brasil_aliquota: float = 0.15
    custodia_b3_anual: float = 0.002
    isentar_custodia_selic_ate_10k: bool = True
    iof_entrada: float = 0.011
    iof_saida: float = 0.0038
    spread_cambio_entrada: float = 0.01
    spread_cambio_saida: float = 0.01
    ir_exterior_aliquota: float = 0.15
    taxa_custodia_eua_anual: float = 0.0
    prazo_alvo_anos_damodaran: float = 10.0
    formato_ptbr: bool = False


@dataclass
class MonthlyRecord:
    mes: str
    ptax: float
    ipca_mensal_pct: float
    selic_mensal_pct: float
    us_cpi_mensal_pct: float
    us_treasury_10y_aa_pct: float
    us_tips_10y_taxa_real_aa_pct: float
    us_tbill_3m_aa_pct: float
    sp500_tr_indice: float
    br_prefixado_taxa_aa_pct: float
    br_ipca_mais_taxa_real_aa_pct: float


def load_config(config_path: Path) -> SimulationConfig:
    cfg = SimulationConfig()
    if config_path.exists():
        with open(config_path, "r", encoding="utf-8") as f:
            raw = json.load(f)
        for k, v in raw.items():
            if hasattr(cfg, k):
                setattr(cfg, k, v)
    return cfg


def load_market_series(csv_path: Path, data_inicio: str, data_fim: Optional[str]) -> List[MonthlyRecord]:
    if not csv_path.exists():
        raise FileNotFoundError(
            f"Base mensal nao encontrada em {csv_path}. Execute primeiro: python3 coletar_dados.py"
        )
    records: List[MonthlyRecord] = []
    with open(csv_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            ym = row["mes"].strip()
            if ym < data_inicio:
                continue
            if data_fim and ym > data_fim:
                continue
            records.append(
                MonthlyRecord(
                    mes=ym,
                    ptax=float(row["ptax_venda_fim_mes"]),
                    ipca_mensal_pct=float(row["ipca_mensal_pct"]),
                    selic_mensal_pct=float(row["selic_mensal_pct"]),
                    us_cpi_mensal_pct=float(row["us_cpi_mensal_pct"]),
                    us_treasury_10y_aa_pct=float(row["us_treasury_10y_aa_pct"]),
                    us_tips_10y_taxa_real_aa_pct=float(row["us_tips_10y_taxa_real_aa_pct"]),
                    us_tbill_3m_aa_pct=float(row["us_tbill_3m_aa_pct"]),
                    sp500_tr_indice=float(row["sp500_tr_indice"]),
                    br_prefixado_taxa_aa_pct=float(row["br_prefixado_taxa_aa_pct"]),
                    br_ipca_mais_taxa_real_aa_pct=float(row["br_ipca_mais_taxa_real_aa_pct"]),
                )
            )
    records.sort(key=lambda r: r.mes)
    for i in range(1, len(records)):
        py, pm = map(int, records[i - 1].mes.split("-"))
        cy, cm = map(int, records[i].mes.split("-"))
        expected_y, expected_m = (py + 1, 1) if pm == 12 else (py, pm + 1)
        if (cy, cm) != (expected_y, expected_m):
            raise ValueError(
                f"Quebra de continuidade mensal entre {records[i - 1].mes} e {records[i].mes}."
            )
    return records


def damodaran_monthly_return(
    y_prev_annual: float,
    y_curr_annual: float,
    maturity_years: float = 10.0,
    semiannual_convention: bool = False,
) -> float:
    if semiannual_convention:
        r_prev = (1.0 + y_prev_annual / 2.0) ** (1.0 / 6.0) - 1.0
        r_curr = (1.0 + y_curr_annual / 2.0) ** (1.0 / 6.0) - 1.0
    else:
        r_prev = (1.0 + y_prev_annual) ** (1.0 / 12.0) - 1.0
        r_curr = (1.0 + y_curr_annual) ** (1.0 / 12.0) - 1.0

    rem_months = max(1, int(round(maturity_years * 12)) - 1)
    if abs(r_curr) < 1e-12:
        price_end = r_prev * rem_months + 1.0
    else:
        pv_factor = (1.0 - (1.0 + r_curr) ** (-rem_months)) / r_curr
        price_end = r_prev * pv_factor + (1.0 + r_curr) ** (-rem_months)

    return r_prev + (price_end - 1.0)


def tbill_monthly_return(discount_rate_annual: float) -> float:
    """
    Converte a taxa anual de desconto bancario (TB3MS, base 360 dias, 91 dias)
    para Bond Equivalent Yield e retorno mensal composto.
    """
    d = max(0.0, discount_rate_annual)
    if d < 1e-12:
        return 0.0
    bey = (365.0 / 360.0) * d / max(1e-9, 1.0 - d * (91.0 / 360.0))
    return (1.0 + bey) ** (1.0 / 12.0) - 1.0


def simulate_cohort(series: List[MonthlyRecord], start_idx: int, cfg: SimulationConfig) -> dict:
    n = cfg.janela_meses
    entry = series[start_idx]
    exit_rec = series[start_idx + n]

    # 1. Entrada no exterior (BRL -> USD com IOF e spread de entrada)
    brl_apos_iof_entrada = cfg.aporte_inicial_brl / (1.0 + cfg.iof_entrada)
    ptax_entrada_efetiva = entry.ptax * (1.0 + cfg.spread_cambio_entrada)
    usd_inicial = brl_apos_iof_entrada / ptax_entrada_efetiva

    treasury_usd = usd_inicial
    tips_usd = usd_inicial
    tbill_usd = usd_inicial
    sp500_usd = usd_inicial

    # 2. Carteiras iniciais no Brasil
    selic_brl = cfg.aporte_inicial_brl
    prefix_brl = cfg.aporte_inicial_brl
    ipca_mais_brl = cfg.aporte_inicial_brl

    ipca_factor = 1.0
    us_cpi_factor = 1.0

    b3_monthly_factor = (1.0 - cfg.custodia_b3_anual) ** (1.0 / 12.0)
    selic_b3_factor = (
        1.0
        if (cfg.isentar_custodia_selic_ate_10k and cfg.aporte_inicial_brl <= 10000.0)
        else b3_monthly_factor
    )
    us_custody_factor = (1.0 - cfg.taxa_custodia_eua_anual) ** (1.0 / 12.0)

    for step in range(1, n + 1):
        prev_r = series[start_idx + step - 1]
        curr_r = series[start_idx + step]

        ipca_m = curr_r.ipca_mensal_pct / 100.0
        cpi_m = curr_r.us_cpi_mensal_pct / 100.0
        ipca_factor *= 1.0 + ipca_m
        us_cpi_factor *= 1.0 + cpi_m

        # US Treasury 10Y (Damodaran nominal)
        us_ret = damodaran_monthly_return(
            prev_r.us_treasury_10y_aa_pct / 100.0,
            curr_r.us_treasury_10y_aa_pct / 100.0,
            maturity_years=cfg.prazo_alvo_anos_damodaran,
            semiannual_convention=True,
        )
        treasury_usd *= (1.0 + us_ret) * us_custody_factor

        # US TIPS 10Y (Damodaran real + CPI dos EUA)
        tips_real_ret = damodaran_monthly_return(
            prev_r.us_tips_10y_taxa_real_aa_pct / 100.0,
            curr_r.us_tips_10y_taxa_real_aa_pct / 100.0,
            maturity_years=cfg.prazo_alvo_anos_damodaran,
            semiannual_convention=True,
        )
        tips_usd *= (1.0 + tips_real_ret) * (1.0 + cpi_m) * us_custody_factor

        # US T-Bills 3M
        tbill_ret = tbill_monthly_return(prev_r.us_tbill_3m_aa_pct / 100.0)
        tbill_usd *= (1.0 + tbill_ret) * us_custody_factor

        # S&P 500 Total Return
        sp500_factor = curr_r.sp500_tr_indice / prev_r.sp500_tr_indice
        sp500_usd *= sp500_factor * us_custody_factor

        # Tesouro Selic
        selic_ret = curr_r.selic_mensal_pct / 100.0
        selic_brl *= (1.0 + selic_ret) * selic_b3_factor

        # Tesouro Prefixado
        prefix_ret = damodaran_monthly_return(
            prev_r.br_prefixado_taxa_aa_pct / 100.0,
            curr_r.br_prefixado_taxa_aa_pct / 100.0,
            maturity_years=cfg.prazo_alvo_anos_damodaran,
            semiannual_convention=False,
        )
        prefix_brl *= (1.0 + prefix_ret) * b3_monthly_factor

        # Tesouro IPCA+
        ipca_real_ret = damodaran_monthly_return(
            prev_r.br_ipca_mais_taxa_real_aa_pct / 100.0,
            curr_r.br_ipca_mais_taxa_real_aa_pct / 100.0,
            maturity_years=cfg.prazo_alvo_anos_damodaran,
            semiannual_convention=False,
        )
        ipca_mais_brl *= (1.0 + ipca_real_ret) * (1.0 + ipca_m) * b3_monthly_factor

    # 3. Saida no exterior (USD -> BRL com spread, IOF e IR Lei 14.754/2023)
    ptax_saida_efetiva = exit_rec.ptax * (1.0 - cfg.spread_cambio_saida)

    def finalize_us(final_usd: float) -> tuple[float, float, float, float]:
        brl_apos_spread = final_usd * ptax_saida_efetiva
        brl_bruto_pos_cambio = brl_apos_spread / (1.0 + cfg.iof_saida)
        ganho_brl = max(0.0, brl_bruto_pos_cambio - cfg.aporte_inicial_brl)
        ir_brl = ganho_brl * cfg.ir_exterior_aliquota
        brl_liq = brl_bruto_pos_cambio - ir_brl
        brl_real = brl_liq / ipca_factor
        return brl_bruto_pos_cambio, ir_brl, brl_liq, brl_real

    eua_bruto, eua_ir, eua_liq, eua_real = finalize_us(treasury_usd)
    tips_bruto, tips_ir, tips_liq, tips_real = finalize_us(tips_usd)
    tbill_bruto, tbill_ir, tbill_liq, tbill_real = finalize_us(tbill_usd)
    sp500_bruto, sp500_ir, sp500_liq, sp500_real = finalize_us(sp500_usd)

    # 4. Saida no Brasil
    def finalize_br(gross_brl: float) -> tuple[float, float, float]:
        gain = max(0.0, gross_brl - cfg.aporte_inicial_brl)
        ir = gain * cfg.ir_brasil_aliquota
        net = gross_brl - ir
        real = net / ipca_factor
        return ir, net, real

    selic_ir, selic_liq, selic_real = finalize_br(selic_brl)
    prefix_ir, prefix_liq, prefix_real = finalize_br(prefix_brl)
    ipca_ir, ipca_liq, ipca_real = finalize_br(ipca_mais_brl)

    # 5. Comparativo Renda Fixa (3x3) e S&P 500 separado
    estrategias_rf = {
        "US_TREASURY_10Y": eua_liq,
        "US_TIPS_10Y": tips_liq,
        "US_TBILLS_3M": tbill_liq,
        "TESOURO_SELIC": selic_liq,
        "TESOURO_PREFIXADO": prefix_liq,
        "TESOURO_IPCA_MAIS": ipca_liq,
    }
    vencedor_rf = max(estrategias_rf, key=lambda k: estrategias_rf[k])
    melhor_rf_br = max(selic_liq, prefix_liq, ipca_liq)
    melhor_rf_eua = max(eua_liq, tips_liq, tbill_liq)

    diff_rf_eua_br_brl = melhor_rf_eua - melhor_rf_br
    diff_rf_eua_br_pct = ((melhor_rf_eua / melhor_rf_br) - 1.0) * 100.0 if melhor_rf_br > 0 else 0.0

    anos = n / 12.0

    def cagr_pct(final_val: float) -> float:
        return ((final_val / cfg.aporte_inicial_brl) ** (1.0 / anos) - 1.0) * 100.0

    return {
        "mes_entrada": entry.mes,
        "mes_saida": exit_rec.mes,
        "janela_meses": n,
        "ptax_entrada": entry.ptax,
        "ptax_saida": exit_rec.ptax,
        "variacao_cambial_pct": ((exit_rec.ptax / entry.ptax) - 1.0) * 100.0,
        "ipca_acumulado_pct": (ipca_factor - 1.0) * 100.0,
        "cpi_eua_acumulado_pct": (us_cpi_factor - 1.0) * 100.0,
        "us_yield_10y_entrada_aa_pct": entry.us_treasury_10y_aa_pct,
        "us_tips_10y_entrada_aa_pct": entry.us_tips_10y_taxa_real_aa_pct,
        "us_tbill_3m_entrada_aa_pct": entry.us_tbill_3m_aa_pct,
        "sp500_tr_entrada": entry.sp500_tr_indice,
        "sp500_tr_saida": exit_rec.sp500_tr_indice,
        "br_prefix_entrada_aa_pct": entry.br_prefixado_taxa_aa_pct,
        "br_ipca_real_entrada_aa_pct": entry.br_ipca_mais_taxa_real_aa_pct,
        "eua_usd_inicial": usd_inicial,
        "eua_usd_final_bruto": treasury_usd,
        "eua_brl_bruto_pos_cambio": eua_bruto,
        "eua_ir_lei14754_brl": eua_ir,
        "eua_brl_liquido": eua_liq,
        "eua_brl_real_ipca": eua_real,
        "eua_cagr_liquido_aa_pct": cagr_pct(eua_liq),
        "tips_usd_final_bruto": tips_usd,
        "tips_brl_bruto_pos_cambio": tips_bruto,
        "tips_ir_lei14754_brl": tips_ir,
        "tips_brl_liquido": tips_liq,
        "tips_brl_real_ipca": tips_real,
        "tips_cagr_liquido_aa_pct": cagr_pct(tips_liq),
        "tbill_usd_final_bruto": tbill_usd,
        "tbill_brl_bruto_pos_cambio": tbill_bruto,
        "tbill_ir_lei14754_brl": tbill_ir,
        "tbill_brl_liquido": tbill_liq,
        "tbill_brl_real_ipca": tbill_real,
        "tbill_cagr_liquido_aa_pct": cagr_pct(tbill_liq),
        "sp500_usd_final_bruto": sp500_usd,
        "sp500_brl_bruto_pos_cambio": sp500_bruto,
        "sp500_ir_lei14754_brl": sp500_ir,
        "sp500_brl_liquido": sp500_liq,
        "sp500_brl_real_ipca": sp500_real,
        "sp500_cagr_liquido_aa_pct": cagr_pct(sp500_liq),
        "selic_brl_bruto": selic_brl,
        "selic_ir_brl": selic_ir,
        "selic_brl_liquido": selic_liq,
        "selic_brl_real_ipca": selic_real,
        "selic_cagr_liquido_aa_pct": cagr_pct(selic_liq),
        "prefix_brl_bruto": prefix_brl,
        "prefix_ir_brl": prefix_ir,
        "prefix_brl_liquido": prefix_liq,
        "prefix_brl_real_ipca": prefix_real,
        "prefix_cagr_liquido_aa_pct": cagr_pct(prefix_liq),
        "ipca_mais_brl_bruto": ipca_mais_brl,
        "ipca_mais_ir_brl": ipca_ir,
        "ipca_mais_brl_liquido": ipca_liq,
        "ipca_mais_brl_real_ipca": ipca_real,
        "ipca_mais_cagr_liquido_aa_pct": cagr_pct(ipca_liq),
        "melhor_estrategia_brl": vencedor_rf,
        "eua_superou_selic": "SIM" if eua_liq > selic_liq else "NAO",
        "eua_superou_prefixado": "SIM" if eua_liq > prefix_liq else "NAO",
        "eua_superou_ipca_mais": "SIM" if eua_liq > ipca_liq else "NAO",
        "eua_superou_todos_br": "SIM" if eua_liq > melhor_rf_br else "NAO",
        "eua_rf_superou_todos_br": "SIM" if melhor_rf_eua > melhor_rf_br else "NAO",
        "sp500_superou_rf_br": "SIM" if sp500_liq > melhor_rf_br else "NAO",
        "sp500_superou_rf_eua": "SIM" if sp500_liq > melhor_rf_eua else "NAO",
        "diferenca_eua_vs_melhor_br_brl": diff_rf_eua_br_brl,
        "diferenca_eua_vs_melhor_br_pct": diff_rf_eua_br_pct,
    }


def format_csv_value(val: object, decimal_comma: bool, decimals: int = 2) -> str:
    if isinstance(val, float):
        if math.isnan(val) or math.isinf(val):
            return ""
        s = f"{val:.{decimals}f}"
        return s.replace(".", ",") if decimal_comma else s
    return str(val)


def write_cohorts_csv(cohorts: List[dict], out_path: Path, ptbr: bool) -> None:
    if not cohorts:
        return
    out_path.parent.mkdir(parents=True, exist_ok=True)
    delim = ";" if ptbr else ","
    precision_map = {
        "ptax_entrada": 4,
        "ptax_saida": 4,
        "eua_usd_inicial": 4,
        "eua_usd_final_bruto": 4,
        "tips_usd_final_bruto": 4,
        "tbill_usd_final_bruto": 4,
        "sp500_usd_final_bruto": 4,
    }
    fieldnames = list(cohorts[0].keys())
    encoding = "utf-8-sig" if ptbr else "utf-8"

    with open(out_path, "w", encoding=encoding, newline="") as f:
        writer = csv.writer(f, delimiter=delim)
        writer.writerow(fieldnames)
        for row in cohorts:
            formatted = [
                format_csv_value(
                    row[k],
                    decimal_comma=ptbr,
                    decimals=precision_map.get(k, 2),
                )
                if k != "janela_meses"
                else str(row[k])
                for k in fieldnames
            ]
            writer.writerow(formatted)


def build_summary_rows(cohorts: List[dict], cfg: SimulationConfig) -> List[dict]:
    total = len(cohorts)
    strategies = [
        ("US_TREASURY_10Y", "RENDA_FIXA_EUA", "eua_brl_liquido", "eua_brl_real_ipca", "eua_cagr_liquido_aa_pct"),
        ("US_TIPS_10Y", "RENDA_FIXA_EUA", "tips_brl_liquido", "tips_brl_real_ipca", "tips_cagr_liquido_aa_pct"),
        ("US_TBILLS_3M", "RENDA_FIXA_EUA", "tbill_brl_liquido", "tbill_brl_real_ipca", "tbill_cagr_liquido_aa_pct"),
        ("TESOURO_SELIC", "RENDA_FIXA_BR", "selic_brl_liquido", "selic_brl_real_ipca", "selic_cagr_liquido_aa_pct"),
        ("TESOURO_PREFIXADO", "RENDA_FIXA_BR", "prefix_brl_liquido", "prefix_brl_real_ipca", "prefix_cagr_liquido_aa_pct"),
        ("TESOURO_IPCA_MAIS", "RENDA_FIXA_BR", "ipca_mais_brl_liquido", "ipca_mais_brl_real_ipca", "ipca_mais_cagr_liquido_aa_pct"),
        ("SP500_TR", "RENDA_VARIAVEL_EUA", "sp500_brl_liquido", "sp500_brl_real_ipca", "sp500_cagr_liquido_aa_pct"),
    ]
    rows: List[dict] = []
    for name, asset_class, col_nom, col_real, col_cagr in strategies:
        noms = [c[col_nom] for c in cohorts]
        reals = [c[col_real] for c in cohorts]
        cagrs = [c[col_cagr] for c in cohorts]
        if asset_class == "RENDA_VARIAVEL_EUA":
            wins_rf = sum(1 for c in cohorts if c["sp500_superou_rf_br"] == "SIM")
        else:
            wins_rf = sum(1 for c in cohorts if c["melhor_estrategia_brl"] == name)

        best_c = max(cohorts, key=lambda c: c[col_nom])
        worst_c = min(cohorts, key=lambda c: c[col_nom])

        win_vs_selic = sum(1 for c in cohorts if c[col_nom] > c["selic_brl_liquido"]) / total * 100.0
        win_vs_prefix = sum(1 for c in cohorts if c[col_nom] > c["prefix_brl_liquido"]) / total * 100.0
        win_vs_ipca = sum(1 for c in cohorts if c[col_nom] > c["ipca_mais_brl_liquido"]) / total * 100.0

        rows.append(
            {
                "estrategia": name,
                "classe": asset_class,
                "janela_meses": cfg.janela_meses,
                "total_coortes": total,
                "periodo_entradas": f"{cohorts[0]['mes_entrada']} a {cohorts[-1]['mes_entrada']}",
                "vitorias_gerais_qtd": wins_rf,
                "vitorias_gerais_pct": wins_rf / total * 100.0,
                "superou_selic_pct": win_vs_selic,
                "superou_prefixado_pct": win_vs_prefix,
                "superou_ipca_mais_pct": win_vs_ipca,
                "patrimonio_medio_brl_liquido": statistics.mean(noms),
                "patrimonio_mediano_brl_liquido": statistics.median(noms),
                "patrimonio_min_brl_liquido": min(noms),
                "pior_janela": f"{worst_c['mes_entrada']}->{worst_c['mes_saida']}",
                "patrimonio_max_brl_liquido": max(noms),
                "melhor_janela": f"{best_c['mes_entrada']}->{best_c['mes_saida']}",
                "patrimonio_medio_brl_real_ipca": statistics.mean(reals),
                "patrimonio_mediano_brl_real_ipca": statistics.median(reals),
                "cagr_medio_liquido_aa_pct": statistics.mean(cagrs),
                "cagr_mediano_liquido_aa_pct": statistics.median(cagrs),
            }
        )
    return rows


def write_summary_csv(rows: List[dict], out_path: Path, ptbr: bool) -> None:
    if not rows:
        return
    out_path.parent.mkdir(parents=True, exist_ok=True)
    delim = ";" if ptbr else ","
    encoding = "utf-8-sig" if ptbr else "utf-8"
    fieldnames = list(rows[0].keys())
    with open(out_path, "w", encoding=encoding, newline="") as f:
        writer = csv.writer(f, delimiter=delim)
        writer.writerow(fieldnames)
        for row in rows:
            writer.writerow(
                [
                    str(row[k])
                    if k in ("janela_meses", "total_coortes", "vitorias_gerais_qtd", "classe")
                    else format_csv_value(row[k], decimal_comma=ptbr, decimals=2)
                    for k in fieldnames
                ]
            )


def export_cohort_detail_csv(
    series: List[MonthlyRecord],
    entry_ym: str,
    cfg: SimulationConfig,
) -> Optional[Path]:
    idx = next((i for i, r in enumerate(series) if r.mes == entry_ym), None)
    if idx is None or idx + cfg.janela_meses >= len(series):
        print(f"  [aviso] Nao ha janela completa de {cfg.janela_meses}m iniciando em {entry_ym}.")
        return None

    n = cfg.janela_meses
    entry = series[idx]
    brl_apos_iof_entrada = cfg.aporte_inicial_brl / (1.0 + cfg.iof_entrada)
    ptax_entrada_efetiva = entry.ptax * (1.0 + cfg.spread_cambio_entrada)
    usd_inicial = brl_apos_iof_entrada / ptax_entrada_efetiva

    treasury_usd = usd_inicial
    tips_usd = usd_inicial
    tbill_usd = usd_inicial
    sp500_usd = usd_inicial

    selic_brl = cfg.aporte_inicial_brl
    prefix_brl = cfg.aporte_inicial_brl
    ipca_mais_brl = cfg.aporte_inicial_brl
    ipca_factor = 1.0

    b3_monthly_factor = (1.0 - cfg.custodia_b3_anual) ** (1.0 / 12.0)
    selic_b3_factor = (
        1.0
        if (cfg.isentar_custodia_selic_ate_10k and cfg.aporte_inicial_brl <= 10000.0)
        else b3_monthly_factor
    )
    us_custody_factor = (1.0 - cfg.taxa_custodia_eua_anual) ** (1.0 / 12.0)

    detail_rows: List[dict] = [
        {
            "passo_mes": 0,
            "mes": entry.mes,
            "ptax_fim_mes": entry.ptax,
            "ipca_mensal_pct": entry.ipca_mensal_pct,
            "selic_mensal_pct": entry.selic_mensal_pct,
            "us_yield_10y_aa_pct": entry.us_treasury_10y_aa_pct,
            "us_tips_10y_real_aa_pct": entry.us_tips_10y_taxa_real_aa_pct,
            "us_tbill_3m_aa_pct": entry.us_tbill_3m_aa_pct,
            "sp500_tr_indice": entry.sp500_tr_indice,
            "br_prefix_aa_pct": entry.br_prefixado_taxa_aa_pct,
            "br_ipca_real_aa_pct": entry.br_ipca_mais_taxa_real_aa_pct,
            "eua_usd_saldo": treasury_usd,
            "eua_brl_marcacao_bruta": treasury_usd * entry.ptax,
            "tips_brl_marcacao_bruta": tips_usd * entry.ptax,
            "tbill_brl_marcacao_bruta": tbill_usd * entry.ptax,
            "sp500_brl_marcacao_bruta": sp500_usd * entry.ptax,
            "selic_brl_saldo": selic_brl,
            "prefix_brl_saldo": prefix_brl,
            "ipca_mais_brl_saldo": ipca_mais_brl,
            "ipca_fator_acumulado": ipca_factor,
        }
    ]

    for step in range(1, n + 1):
        prev_r = series[idx + step - 1]
        curr_r = series[idx + step]
        ipca_m = curr_r.ipca_mensal_pct / 100.0
        cpi_m = curr_r.us_cpi_mensal_pct / 100.0
        ipca_factor *= 1.0 + ipca_m

        us_ret = damodaran_monthly_return(
            prev_r.us_treasury_10y_aa_pct / 100.0,
            curr_r.us_treasury_10y_aa_pct / 100.0,
            maturity_years=cfg.prazo_alvo_anos_damodaran,
            semiannual_convention=True,
        )
        treasury_usd *= (1.0 + us_ret) * us_custody_factor

        tips_real_ret = damodaran_monthly_return(
            prev_r.us_tips_10y_taxa_real_aa_pct / 100.0,
            curr_r.us_tips_10y_taxa_real_aa_pct / 100.0,
            maturity_years=cfg.prazo_alvo_anos_damodaran,
            semiannual_convention=True,
        )
        tips_usd *= (1.0 + tips_real_ret) * (1.0 + cpi_m) * us_custody_factor

        tbill_usd *= (1.0 + tbill_monthly_return(prev_r.us_tbill_3m_aa_pct / 100.0)) * us_custody_factor
        sp500_usd *= (curr_r.sp500_tr_indice / prev_r.sp500_tr_indice) * us_custody_factor

        selic_brl *= (1.0 + curr_r.selic_mensal_pct / 100.0) * selic_b3_factor
        prefix_ret = damodaran_monthly_return(
            prev_r.br_prefixado_taxa_aa_pct / 100.0,
            curr_r.br_prefixado_taxa_aa_pct / 100.0,
            maturity_years=cfg.prazo_alvo_anos_damodaran,
            semiannual_convention=False,
        )
        prefix_brl *= (1.0 + prefix_ret) * b3_monthly_factor
        ipca_real_ret = damodaran_monthly_return(
            prev_r.br_ipca_mais_taxa_real_aa_pct / 100.0,
            curr_r.br_ipca_mais_taxa_real_aa_pct / 100.0,
            maturity_years=cfg.prazo_alvo_anos_damodaran,
            semiannual_convention=False,
        )
        ipca_mais_brl *= (1.0 + ipca_real_ret) * (1.0 + ipca_m) * b3_monthly_factor

        detail_rows.append(
            {
                "passo_mes": step,
                "mes": curr_r.mes,
                "ptax_fim_mes": curr_r.ptax,
                "ipca_mensal_pct": curr_r.ipca_mensal_pct,
                "selic_mensal_pct": curr_r.selic_mensal_pct,
                "us_yield_10y_aa_pct": curr_r.us_treasury_10y_aa_pct,
                "us_tips_10y_real_aa_pct": curr_r.us_tips_10y_taxa_real_aa_pct,
                "us_tbill_3m_aa_pct": curr_r.us_tbill_3m_aa_pct,
                "sp500_tr_indice": curr_r.sp500_tr_indice,
                "br_prefix_aa_pct": curr_r.br_prefixado_taxa_aa_pct,
                "br_ipca_real_aa_pct": curr_r.br_ipca_mais_taxa_real_aa_pct,
                "eua_usd_saldo": treasury_usd,
                "eua_brl_marcacao_bruta": treasury_usd * curr_r.ptax,
                "tips_brl_marcacao_bruta": tips_usd * curr_r.ptax,
                "tbill_brl_marcacao_bruta": tbill_usd * curr_r.ptax,
                "sp500_brl_marcacao_bruta": sp500_usd * curr_r.ptax,
                "selic_brl_saldo": selic_brl,
                "prefix_brl_saldo": prefix_brl,
                "ipca_mais_brl_saldo": ipca_mais_brl,
                "ipca_fator_acumulado": ipca_factor,
            }
        )

    out_path = OUTPUT_DIR / f"backtest_detalhe_{entry_ym}_{n}m.csv"
    delim = ";" if cfg.formato_ptbr else ","
    encoding = "utf-8-sig" if cfg.formato_ptbr else "utf-8"
    fieldnames = list(detail_rows[0].keys())
    with open(out_path, "w", encoding=encoding, newline="") as f:
        writer = csv.writer(f, delimiter=delim)
        writer.writerow(fieldnames)
        for row in detail_rows:
            writer.writerow(
                [
                    str(row[k])
                    if k in ("passo_mes", "mes")
                    else format_csv_value(
                        row[k],
                        decimal_comma=cfg.formato_ptbr,
                        decimals=4 if k in ("ptax_fim_mes", "eua_usd_saldo", "ipca_fator_acumulado") else 2,
                    )
                    for k in fieldnames
                ]
            )
    return out_path


def run_for_window(
    series: List[MonthlyRecord],
    cfg: SimulationConfig,
    detail_month: Optional[str] = None,
) -> None:
    if len(series) <= cfg.janela_meses:
        raise ValueError(
            f"Serie tem {len(series)} meses, insuficiente para janela de {cfg.janela_meses} meses."
        )

    cohorts = [
        simulate_cohort(series, i, cfg)
        for i in range(len(series) - cfg.janela_meses)
    ]
    summary = build_summary_rows(cohorts, cfg)

    cohorts_path = OUTPUT_DIR / f"backtest_coortes_{cfg.janela_meses}m.csv"
    summary_path = OUTPUT_DIR / f"backtest_resumo_{cfg.janela_meses}m.csv"

    write_cohorts_csv(cohorts, cohorts_path, ptbr=cfg.formato_ptbr)
    write_summary_csv(summary, summary_path, ptbr=cfg.formato_ptbr)

    print(f"\n=== Janela Movel: {cfg.janela_meses} meses ({cfg.janela_meses / 12:.1f} anos) ===")
    print(f"Coortes simuladas: {len(cohorts)} ({cohorts[0]['mes_entrada']} ate {cohorts[-1]['mes_entrada']})")
    print("CSVs gerados:")
    print(f"  - {cohorts_path.relative_to(ROOT_DIR)}")
    print(f"  - {summary_path.relative_to(ROOT_DIR)}")
    if detail_month:
        det_path = export_cohort_detail_csv(series, detail_month, cfg)
        if det_path:
            print(f"  - {det_path.relative_to(ROOT_DIR)} (extrato passo a passo)")
    print("Resumo rapido (Patrimonio Mediano Liquido em BRL | Vitorias RF 3x3):")
    for row in summary:
        tag = "vs RF BR" if row["classe"] == "RENDA_VARIAVEL_EUA" else "RF 3x3"
        print(
            f"  {row['estrategia']:<18} | Mediana: R$ {row['patrimonio_mediano_brl_liquido']:>8.2f} "
            f"| Media: R$ {row['patrimonio_medio_brl_liquido']:>8.2f} "
            f"| Vitorias ({tag}): {row['vitorias_gerais_pct']:>5.1f}% "
            f"| CAGR mediano: {row['cagr_mediano_liquido_aa_pct']:>5.2f}% a.a."
        )


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Simula backtest mensal Tesouro Direto vs RF EUA (Treasury 10Y, TIPS, T-Bills) + S&P 500 TR."
    )
    parser.add_argument("--dados", type=Path, default=DEFAULT_DATA_CSV, help="Caminho da serie mensal consolidada")
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG_JSON, help="Caminho do parametros.json")
    parser.add_argument("--janela-meses", type=int, help="Tamanho unico da janela movel em meses (ex.: 60 ou 120)")
    parser.add_argument("--janelas", type=int, nargs="+", help="Lista de janelas em meses (ex.: --janelas 60 120)")
    parser.add_argument("--inicio", help="Mes inicial de entrada (YYYY-MM)")
    parser.add_argument("--fim", help="Mes final da serie (YYYY-MM)")
    parser.add_argument("--aporte", type=float, help="Aporte inicial em BRL")
    parser.add_argument("--ir-br", type=float, help="Aliquota de IR no Brasil (ex.: 0.15)")
    parser.add_argument("--ir-eua", type=float, help="Aliquota de IR no exterior Lei 14.754 (ex.: 0.15)")
    parser.add_argument("--custodia-b3", type=float, help="Custodia anual B3 (ex.: 0.002)")
    parser.add_argument("--iof-entrada", type=float, help="IOF de entrada no cambio (ex.: 0.011)")
    parser.add_argument("--iof-saida", type=float, help="IOF de retorno no cambio (ex.: 0.0038)")
    parser.add_argument("--spread-entrada", type=float, help="Spread cambial na entrada (ex.: 0.01)")
    parser.add_argument("--spread-saida", type=float, help="Spread cambial na saida (ex.: 0.01)")
    parser.add_argument(
        "--detalhar-mes",
        help="Exporta CSV passo a passo da evolucao mensal para um mes de entrada especifico (ex.: 2015-01)",
    )
    parser.add_argument(
        "--formato-ptbr",
        action="store_true",
        help="Usa ponto-e-virgula (;) e virgula decimal para abrir direto no Excel PT-BR",
    )
    args = parser.parse_args()

    try:
        cfg = load_config(args.config)
        if args.inicio:
            cfg.data_inicio = args.inicio
        if args.fim:
            cfg.data_fim = args.fim
        if args.aporte is not None:
            cfg.aporte_inicial_brl = args.aporte
        if args.ir_br is not None:
            cfg.ir_brasil_aliquota = args.ir_br
        if args.ir_eua is not None:
            cfg.ir_exterior_aliquota = args.ir_eua
        if args.custodia_b3 is not None:
            cfg.custodia_b3_anual = args.custodia_b3
        if args.iof_entrada is not None:
            cfg.iof_entrada = args.iof_entrada
        if args.iof_saida is not None:
            cfg.iof_saida = args.iof_saida
        if args.spread_entrada is not None:
            cfg.spread_cambio_entrada = args.spread_entrada
        if args.spread_saida is not None:
            cfg.spread_cambio_saida = args.spread_saida
        if args.formato_ptbr:
            cfg.formato_ptbr = True

        series = load_market_series(args.dados, cfg.data_inicio, cfg.data_fim)
        windows = args.janelas if args.janelas else [args.janela_meses or cfg.janela_meses]

        print("=== Parametros Ativos ===")
        print(json.dumps(asdict(cfg), ensure_ascii=False, indent=2))

        for w in windows:
            win_cfg = SimulationConfig(**asdict(cfg))
            win_cfg.janela_meses = w
            run_for_window(series, win_cfg, detail_month=args.detalhar_mes)

        return 0
    except Exception as exc:
        print(f"[erro] {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
