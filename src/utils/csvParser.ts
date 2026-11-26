/**
 * Parser CSV resiliente compatível tanto com formato padrão (',' e '.')
 * quanto com formato PT-BR gerado por --formato-ptbr (';' e ',').
 */
export function parseCsvRecords(rawText: string): Array<Record<string, string>> {
  const cleaned = rawText.replace(/^\uFEFF/, '').trim();
  if (!cleaned) return [];

  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const firstLine = lines[0];
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const delimiter = semicolonCount > commaCount ? ';' : ',';

  const splitLine = (line: string): string[] => {
    const out: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === delimiter && !inQuotes) {
        out.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    out.push(current.trim());
    return out;
  };

  const headers = splitLine(lines[0]);
  const records: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitLine(lines[i]);
    if (values.length === 0) continue;
    const obj: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = values[c] ?? '';
    }
    records.push(obj);
  }

  return records;
}

export function toNumber(val: string | undefined): number {
  if (!val) return 0;
  const trimmed = val.trim();
  if (!trimmed) return 0;
  const normalized =
    trimmed.includes(',') && !trimmed.includes('.')
      ? trimmed.replace(',', '.')
      : trimmed.includes(',') && trimmed.includes('.')
        ? trimmed.replace(/\./g, '').replace(',', '.')
        : trimmed;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

const COHORT_STRING_COLS = new Set([
  'mes_entrada',
  'mes_saida',
  'melhor_estrategia_brl',
  'eua_superou_selic',
  'eua_superou_prefixado',
  'eua_superou_ipca_mais',
  'eua_superou_todos_br',
  'eua_rf_superou_todos_br',
  'sp500_superou_rf_br',
  'sp500_superou_rf_eua',
]);

const SUMMARY_STRING_COLS = new Set([
  'estrategia',
  'classe',
  'periodo_entradas',
  'pior_janela',
  'melhor_janela',
]);

const SERIES_STRING_COLS = new Set([
  'mes',
  'ptax_data_ref',
  'br_prefixado_titulo_ref',
  'br_ipca_mais_titulo_ref',
]);

const DETAIL_STRING_COLS = new Set(['mes']);

export function mapRecordsTyped<T>(
  records: Array<Record<string, string>>,
  stringCols: Set<string>,
): T[] {
  return records.map((rec) => {
    const out: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(rec)) {
      out[k] = stringCols.has(k) ? v : toNumber(v);
    }
    return out as T;
  });
}

export function parseCohortsCsv<T>(rawText: string): T[] {
  return mapRecordsTyped<T>(parseCsvRecords(rawText), COHORT_STRING_COLS);
}

export function parseSummaryCsv<T>(rawText: string): T[] {
  return mapRecordsTyped<T>(parseCsvRecords(rawText), SUMMARY_STRING_COLS);
}

export function parseSeriesCsv<T>(rawText: string): T[] {
  return mapRecordsTyped<T>(parseCsvRecords(rawText), SERIES_STRING_COLS);
}

export function parseDetailCsv<T>(rawText: string): T[] {
  return mapRecordsTyped<T>(parseCsvRecords(rawText), DETAIL_STRING_COLS);
}
