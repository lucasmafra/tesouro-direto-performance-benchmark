import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MarketSeriesRow } from '../types/backtest';
import { STRATEGY_META, formatNumber, formatPct } from '../utils/formatters';

interface HistoricalSeriesViewProps {
  rows: MarketSeriesRow[];
  loading: boolean;
  error: string | null;
}

export function HistoricalSeriesView({ rows, loading, error }: HistoricalSeriesViewProps) {
  const [search, setSearch] = useState('');

  const filteredRows = useMemo(() => {
    const q = search.trim();
    if (!q) return rows;
    return rows.filter((r) => r.mes.includes(q));
  }, [rows, search]);

  if (loading) {
    return (
      <div className="border border-slate-200 bg-white p-8 text-sm text-slate-500">
        Carregando série histórica consolidada...
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-red-200 bg-white p-6 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="border border-slate-200 bg-white p-8 text-sm text-slate-600">
        Nenhum registro encontrado em <code className="font-mono">dados/tratados/serie_mensal_consolidada.csv</code>.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="border border-slate-200 bg-white p-6">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">
              Taxas de juros de mercado (% a.a.)
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Treasury 10Y, TIPS 10Y real, T-Bills 3M (EUA), Prefixado e IPCA+ real (Brasil).
            </p>
          </div>
          <div className="mt-4 h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="mes"
                  tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'JetBrains Mono' }}
                  minTickGap={36}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'JetBrains Mono' }}
                  tickFormatter={(v: number) => `${v}%`}
                  width={44}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value, name) => [
                    formatPct(Number(value ?? 0), 2),
                    String(name ?? ''),
                  ]}
                  contentStyle={{ fontSize: '12px', borderColor: '#CBD5E1', borderRadius: 0 }}
                />
                <Line
                  type="monotone"
                  dataKey="br_prefixado_taxa_aa_pct"
                  name="Tesouro Prefixado (% a.a.)"
                  stroke={STRATEGY_META.TESOURO_PREFIXADO.color}
                  strokeWidth={1.8}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="br_ipca_mais_taxa_real_aa_pct"
                  name="Tesouro IPCA+ Real (% a.a.)"
                  stroke={STRATEGY_META.TESOURO_IPCA_MAIS.color}
                  strokeWidth={1.8}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="us_treasury_10y_aa_pct"
                  name="US Treasury 10Y (% a.a.)"
                  stroke={STRATEGY_META.US_TREASURY_10Y.color}
                  strokeWidth={1.9}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="us_tips_10y_taxa_real_aa_pct"
                  name="US TIPS 10Y Real (% a.a.)"
                  stroke={STRATEGY_META.US_TIPS_10Y.color}
                  strokeWidth={1.6}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="us_tbill_3m_aa_pct"
                  name="US T-Bills 3M (% a.a.)"
                  stroke={STRATEGY_META.US_TBILLS_3M.color}
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="border border-slate-200 bg-white p-6">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">
              Câmbio PTAX venda fim de mês (USD/BRL)
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Cotação oficial do Banco Central (SGS 1) usada nas conversões de entrada e saída.
            </p>
          </div>
          <div className="mt-4 h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="mes"
                  tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'JetBrains Mono' }}
                  minTickGap={36}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'JetBrains Mono' }}
                  tickFormatter={(v: number) => `R$ ${v.toFixed(1)}`}
                  width={54}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value) => [`R$ ${Number(value ?? 0).toFixed(4)}`, 'PTAX Venda']}
                  contentStyle={{ fontSize: '12px', borderColor: '#CBD5E1', borderRadius: 0 }}
                />
                <Line
                  type="monotone"
                  dataKey="ptax_venda_fim_mes"
                  name="PTAX Venda"
                  stroke="#0F172A"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="border border-slate-200 bg-white p-6">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">
              S&amp;P 500 Total Return (índice em USD)
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Índice mensal com dividendos reinvestidos (<code className="font-mono">^SP500TR</code>).
            </p>
          </div>
          <div className="mt-4 h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="mes"
                  tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'JetBrains Mono' }}
                  minTickGap={36}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'JetBrains Mono' }}
                  tickFormatter={(v: number) => Math.round(v).toLocaleString('pt-BR')}
                  width={58}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value) => [
                    formatNumber(Number(value ?? 0), 2),
                    'S&P 500 TR (USD)',
                  ]}
                  contentStyle={{ fontSize: '12px', borderColor: '#CBD5E1', borderRadius: 0 }}
                />
                <Line
                  type="monotone"
                  dataKey="sp500_tr_indice"
                  name="S&P 500 Total Return"
                  stroke={STRATEGY_META.SP500_TR.color}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="border border-slate-200 bg-white">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar mês (ex: 2020-03)"
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-700 font-mono w-48"
            />
          </div>
          <div className="text-xs text-slate-500 font-mono tabular-nums">
            {filteredRows.length} de {rows.length} meses · {rows[0].mes} a {rows[rows.length - 1].mes}
          </div>
        </div>

        <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-slate-100 sticky top-0 z-10 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-2.5 px-3 text-left font-medium">Mês</th>
                <th className="py-2.5 px-3 text-right font-medium">PTAX</th>
                <th className="py-2.5 px-3 text-right font-medium">IPCA m/m</th>
                <th className="py-2.5 px-3 text-right font-medium">Selic m/m</th>
                <th className="py-2.5 px-3 text-right font-medium">US 10Y</th>
                <th className="py-2.5 px-3 text-right font-medium">TIPS 10Y</th>
                <th className="py-2.5 px-3 text-right font-medium">T-Bills 3M</th>
                <th className="py-2.5 px-3 text-right font-medium">S&amp;P 500 TR</th>
                <th className="py-2.5 px-3 text-right font-medium">Prefixado</th>
                <th className="py-2.5 px-3 text-right font-medium">IPCA+ Real</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
              {filteredRows.map((r) => (
                <tr key={r.mes} className="hover:bg-slate-50">
                  <td className="py-2 px-3 font-semibold text-slate-900 whitespace-nowrap">
                    {r.mes}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-800 whitespace-nowrap">
                    {formatNumber(r.ptax_venda_fim_mes, 4)}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-600 whitespace-nowrap">
                    {formatPct(r.ipca_mensal_pct, 2)}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-700 whitespace-nowrap">
                    {formatPct(r.selic_mensal_pct, 2)}
                  </td>
                  <td className="py-2 px-3 text-right text-blue-700 whitespace-nowrap">
                    {formatPct(r.us_treasury_10y_aa_pct, 2)}
                  </td>
                  <td className="py-2 px-3 text-right text-sky-700 whitespace-nowrap">
                    {formatPct(r.us_tips_10y_taxa_real_aa_pct, 2)}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-700 whitespace-nowrap">
                    {formatPct(r.us_tbill_3m_aa_pct, 2)}
                  </td>
                  <td className="py-2 px-3 text-right text-rose-700 whitespace-nowrap">
                    {formatNumber(r.sp500_tr_indice, 2)}
                  </td>
                  <td className="py-2 px-3 text-right text-violet-700 whitespace-nowrap">
                    {formatPct(r.br_prefixado_taxa_aa_pct, 2)}
                  </td>
                  <td className="py-2 px-3 text-right text-emerald-700 whitespace-nowrap">
                    {formatPct(r.br_ipca_mais_taxa_real_aa_pct, 2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
