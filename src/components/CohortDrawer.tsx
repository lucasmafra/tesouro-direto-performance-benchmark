import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CohortDetailRow, CohortRow } from '../types/backtest';
import {
  STRATEGY_META,
  formatBRL,
  formatPct,
  formatUSD,
  getCagrByStrategy,
} from '../utils/formatters';

interface CohortDrawerProps {
  cohort: CohortRow | null;
  windowMonths: number;
  valueMode: 'nominal' | 'real';
  hasLocalServerData: boolean;
  onClose: () => void;
}

export function CohortDrawer({
  cohort,
  windowMonths,
  valueMode,
  hasLocalServerData,
  onClose,
}: CohortDrawerProps) {
  const [detailRows, setDetailRows] = useState<CohortDetailRow[] | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (!cohort || !hasLocalServerData) {
      setDetailRows(null);
      return;
    }

    let cancelled = false;
    setLoadingDetail(true);
    fetch(`/api/backtests/${windowMonths}/detalhe/${cohort.mes_entrada}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) {
          setDetailRows(data?.rows ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) setDetailRows(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cohort, windowMonths, hasLocalServerData]);

  if (!cohort) return null;

  const breakdownRows = [
    {
      label: STRATEGY_META.US_TREASURY_10Y.label,
      classLabel: STRATEGY_META.US_TREASURY_10Y.classLabel,
      color: STRATEGY_META.US_TREASURY_10Y.color,
      bruto: cohort.eua_brl_bruto_pos_cambio,
      ir: cohort.eua_ir_lei14754_brl,
      liquido: cohort.eua_brl_liquido,
      real: cohort.eua_brl_real_ipca,
      cagr: getCagrByStrategy(cohort, 'US_TREASURY_10Y', windowMonths, valueMode),
      isEquity: false,
    },
    {
      label: STRATEGY_META.US_TIPS_10Y.label,
      classLabel: STRATEGY_META.US_TIPS_10Y.classLabel,
      color: STRATEGY_META.US_TIPS_10Y.color,
      bruto: cohort.tips_brl_bruto_pos_cambio,
      ir: cohort.tips_ir_lei14754_brl,
      liquido: cohort.tips_brl_liquido,
      real: cohort.tips_brl_real_ipca,
      cagr: getCagrByStrategy(cohort, 'US_TIPS_10Y', windowMonths, valueMode),
      isEquity: false,
    },
    {
      label: STRATEGY_META.US_TBILLS_3M.label,
      classLabel: STRATEGY_META.US_TBILLS_3M.classLabel,
      color: STRATEGY_META.US_TBILLS_3M.color,
      bruto: cohort.tbill_brl_bruto_pos_cambio,
      ir: cohort.tbill_ir_lei14754_brl,
      liquido: cohort.tbill_brl_liquido,
      real: cohort.tbill_brl_real_ipca,
      cagr: getCagrByStrategy(cohort, 'US_TBILLS_3M', windowMonths, valueMode),
      isEquity: false,
    },
    {
      label: STRATEGY_META.TESOURO_IPCA_MAIS.label,
      classLabel: STRATEGY_META.TESOURO_IPCA_MAIS.classLabel,
      color: STRATEGY_META.TESOURO_IPCA_MAIS.color,
      bruto: cohort.ipca_mais_brl_bruto,
      ir: cohort.ipca_mais_ir_brl,
      liquido: cohort.ipca_mais_brl_liquido,
      real: cohort.ipca_mais_brl_real_ipca,
      cagr: getCagrByStrategy(cohort, 'TESOURO_IPCA_MAIS', windowMonths, valueMode),
      isEquity: false,
    },
    {
      label: STRATEGY_META.TESOURO_SELIC.label,
      classLabel: STRATEGY_META.TESOURO_SELIC.classLabel,
      color: STRATEGY_META.TESOURO_SELIC.color,
      bruto: cohort.selic_brl_bruto,
      ir: cohort.selic_ir_brl,
      liquido: cohort.selic_brl_liquido,
      real: cohort.selic_brl_real_ipca,
      cagr: getCagrByStrategy(cohort, 'TESOURO_SELIC', windowMonths, valueMode),
      isEquity: false,
    },
    {
      label: STRATEGY_META.TESOURO_PREFIXADO.label,
      classLabel: STRATEGY_META.TESOURO_PREFIXADO.classLabel,
      color: STRATEGY_META.TESOURO_PREFIXADO.color,
      bruto: cohort.prefix_brl_bruto,
      ir: cohort.prefix_ir_brl,
      liquido: cohort.prefix_brl_liquido,
      real: cohort.prefix_brl_real_ipca,
      cagr: getCagrByStrategy(cohort, 'TESOURO_PREFIXADO', windowMonths, valueMode),
      isEquity: false,
    },
    {
      label: STRATEGY_META.SP500_TR.label,
      classLabel: STRATEGY_META.SP500_TR.classLabel,
      color: STRATEGY_META.SP500_TR.color,
      bruto: cohort.sp500_brl_bruto_pos_cambio,
      ir: cohort.sp500_ir_lei14754_brl,
      liquido: cohort.sp500_brl_liquido,
      real: cohort.sp500_brl_real_ipca,
      cagr: getCagrByStrategy(cohort, 'SP500_TR', windowMonths, valueMode),
      isEquity: true,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/25">
      <div className="w-full max-w-3xl bg-white border-l border-slate-200 h-full overflow-y-auto flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <div className="text-xs text-slate-500 font-mono tabular-nums">
              Auditoria da Coorte · {windowMonths} meses
            </div>
            <h3 className="text-lg font-semibold text-slate-900 font-mono tabular-nums">
              {cohort.mes_entrada} → {cohort.mes_saida}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar painel de auditoria"
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-5 border-b border-slate-200 text-xs">
            <div>
              <div className="text-slate-500">PTAX Entrada → Saída</div>
              <div className="mt-1 font-mono tabular-nums font-semibold text-slate-900">
                R$ {cohort.ptax_entrada.toFixed(4)} → R$ {cohort.ptax_saida.toFixed(4)}
              </div>
              <div className="mt-0.5 font-mono tabular-nums text-slate-600">
                Câmbio: {formatPct(cohort.variacao_cambial_pct, 2, true)}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Taxas EUA Entrada</div>
              <div className="mt-1 font-mono tabular-nums font-semibold text-slate-900">
                10Y {formatPct(cohort.us_yield_10y_entrada_aa_pct, 2)} · TIPS{' '}
                {formatPct(cohort.us_tips_10y_entrada_aa_pct, 2)}
              </div>
              <div className="mt-0.5 font-mono tabular-nums text-slate-600">
                T-Bills 3M: {formatPct(cohort.us_tbill_3m_entrada_aa_pct, 2)}
              </div>
            </div>
            <div>
              <div className="text-slate-500">S&amp;P 500 TR (USD)</div>
              <div className="mt-1 font-mono tabular-nums font-semibold text-slate-900">
                {formatUSD(cohort.eua_usd_inicial)} → {formatUSD(cohort.sp500_usd_final_bruto)}
              </div>
              <div className="mt-0.5 font-mono tabular-nums text-slate-600">
                Treasury 10Y: {formatUSD(cohort.eua_usd_final_bruto)}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Inflação na Janela</div>
              <div className="mt-1 font-mono tabular-nums font-semibold text-slate-900">
                IPCA {formatPct(cohort.ipca_acumulado_pct, 2)}
              </div>
              <div className="mt-0.5 font-mono tabular-nums text-slate-600">
                CPI EUA {formatPct(cohort.cpi_eua_acumulado_pct, 2)}
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-3">
              Apuração final de patrimônio e impostos
            </h4>
            <div className="border border-slate-200 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3 text-left font-medium">Estratégia</th>
                    <th className="py-2 px-3 text-right font-medium">Bruto</th>
                    <th className="py-2 px-3 text-right font-medium">IR Pago</th>
                    <th className="py-2 px-3 text-right font-medium">Líquido Nominal</th>
                    <th className="py-2 px-3 text-right font-medium">Real (IPCA)</th>
                    <th className="py-2 px-3 text-right font-medium whitespace-nowrap">
                      {valueMode === 'real' ? 'CAGR Real a.a.' : 'CAGR a.a.'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                  {breakdownRows.map((r) => (
                    <tr key={r.label} className={r.isEquity ? 'border-t-2 border-slate-200 bg-slate-50/70' : ''}>
                      <td className="py-2.5 px-3 font-sans text-slate-900 flex items-center gap-2 whitespace-nowrap">
                        <span
                          className="inline-block w-2 h-2 shrink-0"
                          style={{ backgroundColor: r.color }}
                        />
                        <span>{r.label}</span>
                        <span className="text-[11px] text-slate-400">· {r.classLabel}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600">
                        {formatBRL(r.bruto)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-red-700">
                        -{formatBRL(r.ir)}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right ${
                          valueMode === 'nominal' ? 'font-semibold text-slate-900' : 'text-slate-700'
                        }`}
                      >
                        {formatBRL(r.liquido)}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right ${
                          valueMode === 'real' ? 'font-semibold text-slate-900' : 'text-slate-700'
                        }`}
                      >
                        {formatBRL(r.real)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                        {formatPct(r.cagr, 2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-2">
              Trajetória mês a mês (saldo bruto em R$)
            </h4>
            {loadingDetail ? (
              <div className="border border-slate-200 p-6 text-xs text-slate-500">
                Carregando extrato mensal da coorte...
              </div>
            ) : detailRows && detailRows.length > 0 ? (
              <div className="border border-slate-200 p-4">
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={detailRows} margin={{ top: 8, right: 12, left: 6, bottom: 4 }}>
                      <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="mes"
                        tick={{ fontSize: 10, fill: '#64748B', fontFamily: 'JetBrains Mono' }}
                        minTickGap={24}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: '#64748B', fontFamily: 'JetBrains Mono' }}
                        tickFormatter={(v: number) => `R$ ${Math.round(v)}`}
                        width={68}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(val, name) => [
                          formatBRL(Number(val ?? 0)),
                          String(name ?? ''),
                        ]}
                        contentStyle={{
                          fontSize: '11px',
                          borderColor: '#CBD5E1',
                          borderRadius: 0,
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="eua_brl_marcacao_bruta"
                        name="US Treasury 10Y (BRL)"
                        stroke={STRATEGY_META.US_TREASURY_10Y.color}
                        strokeWidth={1.9}
                        dot={false}
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="tips_brl_marcacao_bruta"
                        name="US TIPS 10Y (BRL)"
                        stroke={STRATEGY_META.US_TIPS_10Y.color}
                        strokeWidth={1.8}
                        dot={false}
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="tbill_brl_marcacao_bruta"
                        name="US T-Bills 3M (BRL)"
                        stroke={STRATEGY_META.US_TBILLS_3M.color}
                        strokeWidth={1.6}
                        dot={false}
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="ipca_mais_brl_saldo"
                        name="Tesouro IPCA+"
                        stroke={STRATEGY_META.TESOURO_IPCA_MAIS.color}
                        strokeWidth={1.8}
                        dot={false}
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="selic_brl_saldo"
                        name="Tesouro Selic"
                        stroke={STRATEGY_META.TESOURO_SELIC.color}
                        strokeWidth={1.6}
                        dot={false}
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="prefix_brl_saldo"
                        name="Tesouro Prefixado"
                        stroke={STRATEGY_META.TESOURO_PREFIXADO.color}
                        strokeWidth={1.6}
                        dot={false}
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="sp500_brl_marcacao_bruta"
                        name="S&P 500 TR (BRL)"
                        stroke={STRATEGY_META.SP500_TR.color}
                        strokeWidth={2}
                        strokeDasharray="6 3"
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 space-y-2">
                <p>
                  O CSV de evolução passo a passo para <strong>{cohort.mes_entrada}</strong> ainda
                  não foi exportado em <code className="font-mono">resultados/</code>.
                </p>
                <p className="font-mono text-[11px] bg-white border border-slate-200 px-3 py-2 text-slate-800 select-all">
                  python3 simular_backtest.py --janela-meses {windowMonths} --detalhar-mes{' '}
                  {cohort.mes_entrada}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
