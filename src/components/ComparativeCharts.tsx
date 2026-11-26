import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CohortRow, StrategyKey } from '../types/backtest';
import {
  ALL_STRATEGIES,
  BR_FIXED_INCOME_STRATEGIES,
  FIXED_INCOME_STRATEGIES,
  STRATEGY_META,
  formatBRL,
  formatPct,
  getCagrByStrategy,
  getValueByStrategy,
} from '../utils/formatters';

interface ComparativeChartsProps {
  cohorts: CohortRow[];
  windowMonths: number;
  valueMode: 'nominal' | 'real';
  initialDeposit: number;
  onSelectCohort: (cohort: CohortRow) => void;
}

export function ComparativeCharts({
  cohorts,
  windowMonths,
  valueMode,
  initialDeposit,
  onSelectCohort,
}: ComparativeChartsProps) {
  const [hidden, setHidden] = useState<Record<StrategyKey, boolean>>({
    US_TREASURY_10Y: false,
    US_TIPS_10Y: false,
    US_TBILLS_3M: false,
    TESOURO_IPCA_MAIS: false,
    TESOURO_SELIC: false,
    TESOURO_PREFIXADO: false,
    SP500_TR: false,
  });

  const toggleStrategy = (key: StrategyKey) => {
    setHidden((prev) => {
      const visibleCount = ALL_STRATEGIES.filter((s) => !prev[s]).length;
      if (!prev[key] && visibleCount <= 1) return prev;
      return { ...prev, [key]: !prev[key] };
    });
  };

  const applyPreset = (preset: 'all' | 'rf' | 'br_sp500') => {
    if (preset === 'all') {
      setHidden({
        US_TREASURY_10Y: false,
        US_TIPS_10Y: false,
        US_TBILLS_3M: false,
        TESOURO_IPCA_MAIS: false,
        TESOURO_SELIC: false,
        TESOURO_PREFIXADO: false,
        SP500_TR: false,
      });
    } else if (preset === 'rf') {
      setHidden({
        US_TREASURY_10Y: false,
        US_TIPS_10Y: false,
        US_TBILLS_3M: false,
        TESOURO_IPCA_MAIS: false,
        TESOURO_SELIC: false,
        TESOURO_PREFIXADO: false,
        SP500_TR: true,
      });
    } else {
      setHidden({
        US_TREASURY_10Y: true,
        US_TIPS_10Y: true,
        US_TBILLS_3M: true,
        TESOURO_IPCA_MAIS: false,
        TESOURO_SELIC: false,
        TESOURO_PREFIXADO: false,
        SP500_TR: false,
      });
    }
  };

  const chartData = useMemo(() => {
    return cohorts.map((c) => {
      const eua10 = getValueByStrategy(c, 'US_TREASURY_10Y', valueMode);
      const tips = getValueByStrategy(c, 'US_TIPS_10Y', valueMode);
      const tbill = getValueByStrategy(c, 'US_TBILLS_3M', valueMode);
      const selic = getValueByStrategy(c, 'TESOURO_SELIC', valueMode);
      const prefix = getValueByStrategy(c, 'TESOURO_PREFIXADO', valueMode);
      const ipca = getValueByStrategy(c, 'TESOURO_IPCA_MAIS', valueMode);
      const sp500 = getValueByStrategy(c, 'SP500_TR', valueMode);

      const bestBrRf = Math.max(selic, prefix, ipca);
      const bestUsRf = Math.max(eua10, tips, tbill);
      return {
        raw: c,
        mes_entrada: c.mes_entrada,
        mes_saida: c.mes_saida,
        US_TREASURY_10Y: Number(eua10.toFixed(2)),
        US_TIPS_10Y: Number(tips.toFixed(2)),
        US_TBILLS_3M: Number(tbill.toFixed(2)),
        TESOURO_SELIC: Number(selic.toFixed(2)),
        TESOURO_PREFIXADO: Number(prefix.toFixed(2)),
        TESOURO_IPCA_MAIS: Number(ipca.toFixed(2)),
        SP500_TR: Number(sp500.toFixed(2)),
        diff_rf_eua_br: Number((bestUsRf - bestBrRf).toFixed(2)),
      };
    });
  }, [cohorts, valueMode]);

  const rfWinMatrix = useMemo(() => {
    const total = cohorts.length || 1;
    return FIXED_INCOME_STRATEGIES.map((key) => {
      const vals = chartData.map((d) => d[key]).sort((a, b) => a - b);
      const mid = Math.floor(vals.length / 2);
      const medianVal =
        vals.length === 0 ? 0 : vals.length % 2 !== 0 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2;
      const meanVal = vals.reduce((acc, v) => acc + v, 0) / (vals.length || 1);
      const cagrs = cohorts
        .map((c) => getCagrByStrategy(c, key, windowMonths, valueMode))
        .sort((a, b) => a - b);
      const cMid = Math.floor(cagrs.length / 2);
      const medianCagr =
        cagrs.length === 0
          ? 0
          : cagrs.length % 2 !== 0
            ? cagrs[cMid]
            : (cagrs[cMid - 1] + cagrs[cMid]) / 2;
      const meanCagr = cagrs.reduce((acc, v) => acc + v, 0) / (cagrs.length || 1);
      const wins = cohorts.filter((c) => c.melhor_estrategia_brl === key).length;
      return {
        key,
        label: STRATEGY_META[key].label,
        shortLabel: STRATEGY_META[key].shortLabel,
        classLabel: STRATEGY_META[key].classLabel,
        color: STRATEGY_META[key].color,
        winPct: Number(((wins / total) * 100).toFixed(1)),
        wins,
        medianVal,
        meanVal,
        medianCagr,
        meanCagr,
      };
    }).sort((a, b) => b.winPct - a.winPct);
  }, [cohorts, chartData, windowMonths, valueMode]);

  const sp500SummaryRow = useMemo(() => {
    const total = cohorts.length || 1;
    const vals = chartData.map((d) => d.SP500_TR).sort((a, b) => a - b);
    const mid = Math.floor(vals.length / 2);
    const medianVal =
      vals.length === 0 ? 0 : vals.length % 2 !== 0 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2;
    const meanVal = vals.reduce((acc, v) => acc + v, 0) / (vals.length || 1);
    const cagrs = cohorts
      .map((c) => getCagrByStrategy(c, 'SP500_TR', windowMonths, valueMode))
      .sort((a, b) => a - b);
    const cMid = Math.floor(cagrs.length / 2);
    const medianCagr =
      cagrs.length === 0
        ? 0
        : cagrs.length % 2 !== 0
          ? cagrs[cMid]
          : (cagrs[cMid - 1] + cagrs[cMid]) / 2;
    const meanCagr = cagrs.reduce((acc, v) => acc + v, 0) / (cagrs.length || 1);
    const winsVsBr = cohorts.filter((c) => c.sp500_superou_rf_br === 'SIM').length;
    return {
      key: 'SP500_TR' as const,
      label: STRATEGY_META.SP500_TR.label,
      classLabel: STRATEGY_META.SP500_TR.classLabel,
      color: STRATEGY_META.SP500_TR.color,
      winVsBrPct: Number(((winsVsBr / total) * 100).toFixed(1)),
      medianVal,
      meanVal,
      medianCagr,
      meanCagr,
    };
  }, [cohorts, chartData, windowMonths, valueMode]);

  if (cohorts.length === 0) return null;

  const isOnlyRfVisible =
    !hidden.US_TREASURY_10Y &&
    !hidden.US_TIPS_10Y &&
    !hidden.US_TBILLS_3M &&
    !hidden.TESOURO_IPCA_MAIS &&
    !hidden.TESOURO_SELIC &&
    !hidden.TESOURO_PREFIXADO &&
    hidden.SP500_TR;

  const isAllVisible = ALL_STRATEGIES.every((k) => !hidden[k]);
  const isBrVsSp500 =
    hidden.US_TREASURY_10Y &&
    hidden.US_TIPS_10Y &&
    hidden.US_TBILLS_3M &&
    BR_FIXED_INCOME_STRATEGIES.every((k) => !hidden[k]) &&
    !hidden.SP500_TR;

  return (
    <div className="space-y-6">
      <section className="border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 pb-5 border-b border-slate-100">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Patrimônio final líquido por mês de entrada ({windowMonths} meses)
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Cada ponto mostra quanto {formatBRL(initialDeposit)} aportados no mês X valiam após{' '}
                {(windowMonths / 12).toFixed(0)} anos (
                {valueMode === 'nominal'
                  ? 'em Reais nominais líquidos'
                  : 'deflacionado pelo IPCA da janela'}
                ). Clique em qualquer ponto para auditar a coorte.
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 bg-slate-100 self-start">
              <button
                type="button"
                onClick={() => applyPreset('all')}
                className={`px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isAllVisible
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos (7)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('rf')}
                className={`px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isOnlyRfVisible
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Só Renda Fixa (6)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('br_sp500')}
                className={`px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isBrVsSp500
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tesouro BR vs. S&amp;P 500
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {ALL_STRATEGIES.map((key) => {
              const meta = STRATEGY_META[key];
              const isHidden = hidden[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleStrategy(key)}
                  className={`px-3 py-1.5 text-xs font-medium border transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer ${
                    isHidden
                      ? 'border-slate-200 bg-slate-50 text-slate-400'
                      : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`inline-block shrink-0 ${
                      key === 'SP500_TR' ? 'w-3 h-0.5 border-t-2 border-dashed' : 'w-2.5 h-2.5'
                    }`}
                    style={
                      key === 'SP500_TR'
                        ? { borderColor: isHidden ? '#CBD5E1' : meta.color }
                        : { backgroundColor: isHidden ? '#CBD5E1' : meta.color }
                    }
                  />
                  <span>{meta.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 h-[380px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 8, right: 16, left: 10, bottom: 4 }}
              onClick={(state) => {
                const idx = state?.activeTooltipIndex;
                if (typeof idx === 'number' && chartData[idx]) {
                  onSelectCohort(chartData[idx].raw);
                }
              }}
            >
              <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="mes_entrada"
                tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'JetBrains Mono' }}
                tickLine={false}
                axisLine={{ stroke: '#CBD5E1' }}
                minTickGap={36}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'JetBrains Mono' }}
                tickLine={false}
                axisLine={false}
                width={80}
                tickFormatter={(v: number) => `R$ ${Math.round(v).toLocaleString('pt-BR')}`}
              />
              <ReferenceLine
                y={initialDeposit}
                stroke="#94A3B8"
                strokeDasharray="4 4"
                label={{
                  value: `Aporte ${formatBRL(initialDeposit, 0)}`,
                  position: 'insideTopLeft',
                  fill: '#64748B',
                  fontSize: 11,
                }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const item = payload[0].payload as (typeof chartData)[number];
                  const row = item.raw;
                  return (
                    <div className="bg-white border border-slate-300 shadow-sm p-3 text-xs min-w-[280px]">
                      <div className="font-mono tabular-nums font-semibold text-slate-900 pb-2 border-b border-slate-100">
                        {row.mes_entrada} → {row.mes_saida}
                      </div>
                      <div className="mt-2 space-y-1.5">
                        {ALL_STRATEGIES.filter((k) => !hidden[k]).map((k) => (
                          <div key={k} className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5 text-slate-700">
                              <span
                                className="inline-block w-2 h-2"
                                style={{ backgroundColor: STRATEGY_META[k].color }}
                              />
                              {STRATEGY_META[k].label}
                            </span>
                            <span className="font-mono tabular-nums font-medium text-slate-900">
                              {formatBRL(item[k])}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-slate-100 text-slate-600 font-mono tabular-nums space-y-0.5">
                        <div>
                          PTAX: {row.ptax_entrada.toFixed(2)} → {row.ptax_saida.toFixed(2)} (
                          {formatPct(row.variacao_cambial_pct, 1, true)})
                        </div>
                        <div>IPCA janela: {formatPct(row.ipca_acumulado_pct, 1)}</div>
                      </div>
                    </div>
                  );
                }}
              />
              {ALL_STRATEGIES.map((key) =>
                hidden[key] ? null : (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={STRATEGY_META[key].color}
                    strokeWidth={key === 'SP500_TR' ? 2.1 : key === 'US_TREASURY_10Y' ? 2.2 : 1.8}
                    strokeDasharray={key === 'SP500_TR' ? '6 3' : undefined}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    isAnimationActive={false}
                  />
                ),
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        <section className="xl:col-span-5 border border-slate-200 bg-white p-6 flex flex-col">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">
              Diferença líquida RF: Melhor EUA menos melhor título BR
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Compara o melhor título de Renda Fixa dos EUA (Treasury 10Y, TIPS ou T-Bills) contra o
              melhor título BR da janela.
            </p>
          </div>
          <div className="mt-4 flex-1 min-h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 12, left: 10, bottom: 4 }}
                onClick={(state) => {
                  const idx = state?.activeTooltipIndex;
                  if (typeof idx === 'number' && chartData[idx]) {
                    onSelectCohort(chartData[idx].raw);
                  }
                }}
              >
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="mes_entrada"
                  tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'JetBrains Mono' }}
                  tickLine={false}
                  axisLine={{ stroke: '#CBD5E1' }}
                  minTickGap={36}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'JetBrains Mono' }}
                  tickLine={false}
                  axisLine={false}
                  width={76}
                  tickFormatter={(v: number) => `R$ ${Math.round(v).toLocaleString('pt-BR')}`}
                />
                <ReferenceLine y={0} stroke="#0F172A" strokeWidth={1} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const item = payload[0].payload as (typeof chartData)[number];
                    return (
                      <div className="bg-white border border-slate-300 shadow-sm p-2.5 text-xs">
                        <div className="font-mono tabular-nums font-semibold text-slate-900">
                          {item.mes_entrada} → {item.mes_saida}
                        </div>
                        <div
                          className={`mt-1 font-mono tabular-nums font-semibold ${
                            item.diff_rf_eua_br >= 0 ? 'text-blue-700' : 'text-red-700'
                          }`}
                        >
                          {item.diff_rf_eua_br >= 0 ? '+' : ''}
                          {formatBRL(item.diff_rf_eua_br)} (melhor RF EUA vs. melhor RF BR)
                        </div>
                        <div className="mt-0.5 text-slate-500">
                          Vencedor RF: {STRATEGY_META[item.raw.melhor_estrategia_brl].label}
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="diff_rf_eua_br" isAnimationActive={false}>
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.mes_entrada}
                      fill={entry.diff_rf_eua_br >= 0 ? '#1D4ED8' : '#DC2626'}
                      fillOpacity={0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="xl:col-span-7 border border-slate-200 bg-white p-6 flex flex-col justify-between">
          <div>
            <div className="pb-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">
                Frequência de vitórias (RF 3×3) e estatísticas por ativo
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Disputa 3×3 dentro da Renda Fixa ({cohorts.length} janelas), com S&amp;P 500 listado
                separadamente · CAGR {valueMode === 'real' ? 'real (IPCA)' : 'nominal'} a.a.
              </p>
            </div>

            <div className="mt-4 h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={rfWinMatrix}
                  layout="vertical"
                  margin={{ top: 0, right: 28, left: 4, bottom: 0 }}
                >
                  <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: '#64748B', fontFamily: 'JetBrains Mono' }}
                    tickFormatter={(v: number) => `${v}%`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="shortLabel"
                    width={82}
                    tick={{ fontSize: 11, fill: '#334155' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value) => [formatPct(Number(value ?? 0), 1), 'Vitórias RF']}
                    contentStyle={{
                      fontSize: '12px',
                      borderColor: '#CBD5E1',
                      borderRadius: 0,
                    }}
                  />
                  <Bar dataKey="winPct" barSize={15} isAnimationActive={false}>
                    {rfWinMatrix.map((entry) => (
                      <Cell key={entry.key} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-200">
                  <th className="py-1.5 pr-2 text-left font-medium">Estratégia</th>
                  <th className="py-1.5 px-2 text-right font-medium whitespace-nowrap">Vitórias</th>
                  <th className="py-1.5 px-2 text-right font-medium">Mediana</th>
                  <th className="py-1.5 px-2 text-right font-medium">Média</th>
                  <th className="py-1.5 px-2 text-right font-medium whitespace-nowrap">
                    CAGR Med.
                  </th>
                  <th className="py-1.5 pl-2 text-right font-medium whitespace-nowrap">
                    CAGR Méd.
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                {rfWinMatrix.map((row) => (
                  <tr key={row.key}>
                    <td className="py-2 pr-2 font-sans text-slate-800 flex items-center gap-2 whitespace-nowrap">
                      <span
                        className="inline-block w-2 h-2 shrink-0"
                        style={{ backgroundColor: row.color }}
                      />
                      <span>{row.label}</span>
                      <span className="text-[11px] text-slate-400">· {row.classLabel}</span>
                    </td>
                    <td className="py-2 px-2 text-right text-slate-700 whitespace-nowrap">
                      {formatPct(row.winPct, 1)}
                    </td>
                    <td className="py-2 px-2 text-right font-semibold text-slate-900 whitespace-nowrap">
                      {formatBRL(row.medianVal)}
                    </td>
                    <td className="py-2 px-2 text-right text-slate-600 whitespace-nowrap">
                      {formatBRL(row.meanVal)}
                    </td>
                    <td className="py-2 px-2 text-right font-medium text-slate-800 whitespace-nowrap">
                      {formatPct(row.medianCagr, 2)}
                    </td>
                    <td className="py-2 pl-2 text-right text-slate-600 whitespace-nowrap">
                      {formatPct(row.meanCagr, 2)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-200 bg-slate-50/70">
                  <td className="py-2.5 pr-2 font-sans text-slate-900 font-medium flex items-center gap-2 whitespace-nowrap">
                    <span
                      className="inline-block w-2 h-2 shrink-0"
                      style={{ backgroundColor: sp500SummaryRow.color }}
                    />
                    <span>{sp500SummaryRow.label}</span>
                    <span className="text-[11px] text-rose-700">· {sp500SummaryRow.classLabel}</span>
                  </td>
                  <td className="py-2.5 px-2 text-right text-rose-700 whitespace-nowrap">
                    {formatPct(sp500SummaryRow.winVsBrPct, 1)} (vs RF BR)
                  </td>
                  <td className="py-2.5 px-2 text-right font-semibold text-slate-900 whitespace-nowrap">
                    {formatBRL(sp500SummaryRow.medianVal)}
                  </td>
                  <td className="py-2.5 px-2 text-right text-slate-600 whitespace-nowrap">
                    {formatBRL(sp500SummaryRow.meanVal)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-medium text-slate-800 whitespace-nowrap">
                    {formatPct(sp500SummaryRow.medianCagr, 2)}
                  </td>
                  <td className="py-2.5 pl-2 text-right text-slate-600 whitespace-nowrap">
                    {formatPct(sp500SummaryRow.meanCagr, 2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
