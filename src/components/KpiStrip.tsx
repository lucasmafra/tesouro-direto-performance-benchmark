import type { CohortRow, FixedIncomeStrategyKey } from '../types/backtest';
import {
  BR_FIXED_INCOME_STRATEGIES,
  FIXED_INCOME_STRATEGIES,
  STRATEGY_META,
  US_FIXED_INCOME_STRATEGIES,
  formatBRL,
  formatPct,
  formatWindowLabel,
  getCagrByStrategy,
  getValueByStrategy,
} from '../utils/formatters';

interface KpiStripProps {
  cohorts: CohortRow[];
  windowMonths: number;
  valueMode: 'nominal' | 'real';
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function KpiStrip({ cohorts, windowMonths, valueMode }: KpiStripProps) {
  if (cohorts.length === 0) return null;

  const total = cohorts.length;

  const rfStats = FIXED_INCOME_STRATEGIES.map((key) => {
    const vals = cohorts.map((c) => getValueByStrategy(c, key, valueMode));
    const med = median(vals);
    const wins = cohorts.filter((c) => c.melhor_estrategia_brl === key).length;
    const cagrs = cohorts.map((c) => getCagrByStrategy(c, key, windowMonths, valueMode));
    const medCagr = median(cagrs);
    const meanCagr = cagrs.reduce((acc, v) => acc + v, 0) / total;
    return { key, med, wins, medCagr, meanCagr };
  });

  const brRfStats = rfStats.filter((s) =>
    (BR_FIXED_INCOME_STRATEGIES as FixedIncomeStrategyKey[]).includes(s.key),
  );
  const usRfStats = rfStats.filter((s) =>
    (US_FIXED_INCOME_STRATEGIES as FixedIncomeStrategyKey[]).includes(s.key),
  );

  const bestBrSingle = [...brRfStats].sort((a, b) => b.med - a.med)[0];
  const bestUsSingle = [...usRfStats].sort((a, b) => b.med - a.med)[0];

  const brWinsTotal = brRfStats.reduce((acc, s) => acc + s.wins, 0);
  const usRfWinsTotal = usRfStats.reduce((acc, s) => acc + s.wins, 0);

  const ipcaWins = brRfStats.find((s) => s.key === 'TESOURO_IPCA_MAIS')?.wins ?? 0;
  const prefixWins = brRfStats.find((s) => s.key === 'TESOURO_PREFIXADO')?.wins ?? 0;
  const selicWins = brRfStats.find((s) => s.key === 'TESOURO_SELIC')?.wins ?? 0;

  const tipsWins = usRfStats.find((s) => s.key === 'US_TIPS_10Y')?.wins ?? 0;
  const treasuryWins = usRfStats.find((s) => s.key === 'US_TREASURY_10Y')?.wins ?? 0;
  const tbillWins = usRfStats.find((s) => s.key === 'US_TBILLS_3M')?.wins ?? 0;

  // S&P 500 Total Return (Benchmark de Renda Variável separado)
  const sp500Vals = cohorts.map((c) => getValueByStrategy(c, 'SP500_TR', valueMode));
  const sp500Cagrs = cohorts.map((c) => getCagrByStrategy(c, 'SP500_TR', windowMonths, valueMode));
  const sp500Med = median(sp500Vals);
  const sp500MedCagr = median(sp500Cagrs);
  const sp500MeanCagr = sp500Cagrs.reduce((acc, v) => acc + v, 0) / total;
  const sp500WinsBr = cohorts.filter((c) => c.sp500_superou_rf_br === 'SIM').length;
  const sp500WinsEua = cohorts.filter((c) => c.sp500_superou_rf_eua === 'SIM').length;

  let worstSp500Row = cohorts[0];
  let worstSp500Val = getValueByStrategy(cohorts[0], 'SP500_TR', valueMode);
  for (const c of cohorts) {
    const val = getValueByStrategy(c, 'SP500_TR', valueMode);
    if (val < worstSp500Val) {
      worstSp500Val = val;
      worstSp500Row = c;
    }
  }

  const modeSubtitle = valueMode === 'nominal' ? 'BRL líquido nominal' : 'BRL real (IPCA)';
  const cagrLabel = valueMode === 'real' ? 'CAGR real mediano' : 'CAGR mediano';

  return (
    <section aria-label="Indicadores resumidos do backtest" className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 border border-slate-200 bg-white divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        <div className="p-6 flex flex-col justify-between gap-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-lg font-semibold text-slate-900 flex items-center gap-2.5">
              <span
                className="inline-block w-2.5 h-2.5 shrink-0"
                style={{ backgroundColor: STRATEGY_META.TESOURO_IPCA_MAIS.color }}
              />
              <span>Tesouro Direto (Renda Fixa Brasil)</span>
            </div>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              RF 3×3 · {formatWindowLabel(windowMonths)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <div className="text-xs font-medium text-slate-500">% de vitórias (RF)</div>
              <div className="mt-1 font-mono tabular-nums text-3xl font-semibold text-emerald-700">
                {formatPct((brWinsTotal / total) * 100, 1)}
              </div>
              <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
                {brWinsTotal} de {total} janelas
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-slate-500">{cagrLabel}</div>
              <div
                className={`mt-1 font-mono tabular-nums text-2xl font-semibold ${
                  bestBrSingle.medCagr >= 0 ? 'text-slate-900' : 'text-red-700'
                }`}
              >
                {formatPct(bestBrSingle.medCagr, 2)}
                <span className="text-xs font-normal text-slate-500 ml-1">a.a.</span>
              </div>
              <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
                Médio {formatPct(bestBrSingle.meanCagr, 2)} a.a.
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-slate-500">
                Mediana ({STRATEGY_META[bestBrSingle.key].shortLabel})
              </div>
              <div className="mt-1 font-mono tabular-nums text-2xl font-semibold text-slate-900">
                {formatBRL(bestBrSingle.med)}
              </div>
              <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
                {modeSubtitle}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-xs text-slate-600 font-mono tabular-nums">
            Vitórias RF por título: IPCA+ {formatPct((ipcaWins / total) * 100, 1)} · Prefixado{' '}
            {formatPct((prefixWins / total) * 100, 1)} · Selic{' '}
            {formatPct((selicWins / total) * 100, 1)}
          </div>
        </div>

        <div className="p-6 flex flex-col justify-between gap-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-lg font-semibold text-slate-900 flex items-center gap-2.5">
              <span
                className="inline-block w-2.5 h-2.5 shrink-0"
                style={{ backgroundColor: STRATEGY_META.US_TREASURY_10Y.color }}
              />
              <span>Treasuries EUA (Renda Fixa Dólar)</span>
            </div>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              RF 3×3 · {formatWindowLabel(windowMonths)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <div className="text-xs font-medium text-slate-500">% de vitórias (RF)</div>
              <div className="mt-1 font-mono tabular-nums text-3xl font-semibold text-blue-700">
                {formatPct((usRfWinsTotal / total) * 100, 1)}
              </div>
              <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
                {usRfWinsTotal} de {total} janelas
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-slate-500">{cagrLabel}</div>
              <div
                className={`mt-1 font-mono tabular-nums text-2xl font-semibold ${
                  bestUsSingle.medCagr >= 0 ? 'text-slate-900' : 'text-red-700'
                }`}
              >
                {formatPct(bestUsSingle.medCagr, 2)}
                <span className="text-xs font-normal text-slate-500 ml-1">a.a.</span>
              </div>
              <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
                Médio {formatPct(bestUsSingle.meanCagr, 2)} a.a.
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-slate-500">
                Mediana ({STRATEGY_META[bestUsSingle.key].shortLabel})
              </div>
              <div className="mt-1 font-mono tabular-nums text-2xl font-semibold text-slate-900">
                {formatBRL(bestUsSingle.med)}
              </div>
              <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
                {modeSubtitle}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-xs text-slate-600 font-mono tabular-nums">
            Vitórias RF por título: TIPS 10Y {formatPct((tipsWins / total) * 100, 1)} · Treasury 10Y{' '}
            {formatPct((treasuryWins / total) * 100, 1)} · T-Bills 3M{' '}
            {formatPct((tbillWins / total) * 100, 1)}
          </div>
        </div>
      </div>

      <div className="border border-slate-200 bg-white p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-100">
          <div className="text-base font-semibold text-slate-900 flex items-center gap-2.5">
            <span
              className="inline-block w-2.5 h-2.5 shrink-0"
              style={{ backgroundColor: STRATEGY_META.SP500_TR.color }}
            />
            <span>S&amp;P 500 Total Return (Renda Variável EUA · Dividendos Reinvestidos)</span>
          </div>
          <span className="text-xs text-slate-500">
            Referência de ações separada da disputa de Renda Fixa · {formatWindowLabel(windowMonths)}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div>
            <div className="text-xs font-medium text-slate-500">% de vitórias vs. RF Brasil</div>
            <div className="mt-1 font-mono tabular-nums text-2xl font-semibold text-rose-700">
              {formatPct((sp500WinsBr / total) * 100, 1)}
            </div>
            <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
              {sp500WinsBr} de {total} janelas
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-500">% de vitórias vs. RF EUA</div>
            <div className="mt-1 font-mono tabular-nums text-2xl font-semibold text-slate-900">
              {formatPct((sp500WinsEua / total) * 100, 1)}
            </div>
            <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
              {sp500WinsEua} de {total} janelas
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-500">{cagrLabel}</div>
            <div
              className={`mt-1 font-mono tabular-nums text-2xl font-semibold ${
                sp500MedCagr >= 0 ? 'text-slate-900' : 'text-red-700'
              }`}
            >
              {formatPct(sp500MedCagr, 2)}
              <span className="text-xs font-normal text-slate-500 ml-1">a.a.</span>
            </div>
            <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
              Médio {formatPct(sp500MeanCagr, 2)} a.a.
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-500">Mediana e Pior Janela (Risco)</div>
            <div className="mt-1 font-mono tabular-nums text-2xl font-semibold text-slate-900">
              {formatBRL(sp500Med)}
            </div>
            <div className="mt-1 text-xs text-red-700 font-mono tabular-nums">
              Pior: {formatBRL(worstSp500Val)} ({worstSp500Row.mes_entrada}→{worstSp500Row.mes_saida})
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
