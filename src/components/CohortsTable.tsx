import { ArrowDown, ArrowUp, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { CohortRow, FixedIncomeStrategyKey } from '../types/backtest';
import {
  FIXED_INCOME_STRATEGIES,
  STRATEGY_META,
  formatBRL,
  formatPct,
  getValueByStrategy,
} from '../utils/formatters';

interface CohortsTableProps {
  cohorts: CohortRow[];
  valueMode: 'nominal' | 'real';
  selectedMonth?: string | null;
  onSelectCohort: (cohort: CohortRow) => void;
}

type SortField =
  | 'mes_entrada'
  | 'variacao_cambial_pct'
  | 'eua10'
  | 'tips'
  | 'tbill'
  | 'selic'
  | 'prefix'
  | 'ipca'
  | 'sp500';

export function CohortsTable({
  cohorts,
  valueMode,
  selectedMonth,
  onSelectCohort,
}: CohortsTableProps) {
  const [search, setSearch] = useState('');
  const [winnerFilter, setWinnerFilter] = useState<'ALL' | FixedIncomeStrategyKey>('ALL');
  const [sortField, setSortField] = useState<SortField>('mes_entrada');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc((prev) => !prev);
    } else {
      setSortField(field);
      setSortAsc(field === 'mes_entrada');
    }
  };

  const filteredAndSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = cohorts.filter((c) => {
      if (winnerFilter !== 'ALL' && c.melhor_estrategia_brl !== winnerFilter) {
        return false;
      }
      if (q) {
        return (
          c.mes_entrada.toLowerCase().includes(q) ||
          c.mes_saida.toLowerCase().includes(q)
        );
      }
      return true;
    });

    const getVal = (c: CohortRow, field: SortField): number | string => {
      switch (field) {
        case 'mes_entrada':
          return c.mes_entrada;
        case 'variacao_cambial_pct':
          return c.variacao_cambial_pct;
        case 'eua10':
          return getValueByStrategy(c, 'US_TREASURY_10Y', valueMode);
        case 'tips':
          return getValueByStrategy(c, 'US_TIPS_10Y', valueMode);
        case 'tbill':
          return getValueByStrategy(c, 'US_TBILLS_3M', valueMode);
        case 'selic':
          return getValueByStrategy(c, 'TESOURO_SELIC', valueMode);
        case 'prefix':
          return getValueByStrategy(c, 'TESOURO_PREFIXADO', valueMode);
        case 'ipca':
          return getValueByStrategy(c, 'TESOURO_IPCA_MAIS', valueMode);
        case 'sp500':
          return getValueByStrategy(c, 'SP500_TR', valueMode);
      }
    };

    return [...filtered].sort((a, b) => {
      const va = getVal(a, sortField);
      const vb = getVal(b, sortField);
      if (typeof va === 'string' && typeof vb === 'string') {
        return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortAsc ? Number(va) - Number(vb) : Number(vb) - Number(va);
    });
  }, [cohorts, search, winnerFilter, sortField, sortAsc, valueMode]);

  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortAsc ? (
      <ArrowUp className="inline w-3 h-3 ml-1 text-blue-700" />
    ) : (
      <ArrowDown className="inline w-3 h-3 ml-1 text-blue-700" />
    );
  };

  return (
    <section className="border border-slate-200 bg-white">
      <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar mês (ex: 2015-01)"
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-700 font-mono w-48"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100">
            <button
              type="button"
              onClick={() => setWinnerFilter('ALL')}
              className={`px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                winnerFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todas
            </button>
            {FIXED_INCOME_STRATEGIES.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setWinnerFilter(key)}
                className={`px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  winnerFilter === key
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {STRATEGY_META[key].shortLabel}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-500 font-mono tabular-nums">
          {filteredAndSorted.length} de {cohorts.length} coortes · Clique na linha para auditar
        </div>
      </div>

      <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="bg-slate-100 sticky top-0 z-10 border-b border-slate-200 text-slate-600">
            <tr>
              <th className="py-2.5 px-3 text-left font-medium whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => handleSort('mes_entrada')}
                  className="hover:text-slate-900 cursor-pointer inline-flex items-center"
                >
                  Entrada → Saída
                  <SortIndicator field="mes_entrada" />
                </button>
              </th>
              <th className="py-2.5 px-3 text-right font-medium whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => handleSort('variacao_cambial_pct')}
                  className="hover:text-slate-900 cursor-pointer inline-flex items-center"
                >
                  PTAX (Δ%)
                  <SortIndicator field="variacao_cambial_pct" />
                </button>
              </th>
              <th className="py-2.5 px-3 text-right font-medium whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => handleSort('eua10')}
                  className="hover:text-slate-900 cursor-pointer inline-flex items-center"
                >
                  Treasury 10Y
                  <SortIndicator field="eua10" />
                </button>
              </th>
              <th className="py-2.5 px-3 text-right font-medium whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => handleSort('tips')}
                  className="hover:text-slate-900 cursor-pointer inline-flex items-center"
                >
                  TIPS 10Y
                  <SortIndicator field="tips" />
                </button>
              </th>
              <th className="py-2.5 px-3 text-right font-medium whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => handleSort('tbill')}
                  className="hover:text-slate-900 cursor-pointer inline-flex items-center"
                >
                  T-Bills 3M
                  <SortIndicator field="tbill" />
                </button>
              </th>
              <th className="py-2.5 px-3 text-right font-medium whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => handleSort('selic')}
                  className="hover:text-slate-900 cursor-pointer inline-flex items-center"
                >
                  Selic
                  <SortIndicator field="selic" />
                </button>
              </th>
              <th className="py-2.5 px-3 text-right font-medium whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => handleSort('prefix')}
                  className="hover:text-slate-900 cursor-pointer inline-flex items-center"
                >
                  Prefixado
                  <SortIndicator field="prefix" />
                </button>
              </th>
              <th className="py-2.5 px-3 text-right font-medium whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => handleSort('ipca')}
                  className="hover:text-slate-900 cursor-pointer inline-flex items-center"
                >
                  IPCA+
                  <SortIndicator field="ipca" />
                </button>
              </th>
              <th className="py-2.5 px-3 text-left font-medium whitespace-nowrap">
                Vencedor RF
              </th>
              <th className="py-2.5 px-3 text-right font-medium whitespace-nowrap border-l border-slate-200">
                <button
                  type="button"
                  onClick={() => handleSort('sp500')}
                  className="hover:text-slate-900 cursor-pointer inline-flex items-center"
                >
                  S&amp;P 500 TR
                  <SortIndicator field="sp500" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
            {filteredAndSorted.map((row) => {
              const euaVal = getValueByStrategy(row, 'US_TREASURY_10Y', valueMode);
              const tipsVal = getValueByStrategy(row, 'US_TIPS_10Y', valueMode);
              const tbillVal = getValueByStrategy(row, 'US_TBILLS_3M', valueMode);
              const selicVal = getValueByStrategy(row, 'TESOURO_SELIC', valueMode);
              const prefixVal = getValueByStrategy(row, 'TESOURO_PREFIXADO', valueMode);
              const ipcaVal = getValueByStrategy(row, 'TESOURO_IPCA_MAIS', valueMode);
              const sp500Val = getValueByStrategy(row, 'SP500_TR', valueMode);
              const isSelected = selectedMonth === row.mes_entrada;

              return (
                <tr
                  key={row.mes_entrada}
                  onClick={() => onSelectCohort(row)}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="py-2.5 px-3 text-left text-slate-900 whitespace-nowrap">
                    <span className="font-semibold">{row.mes_entrada}</span>
                    <span className="text-slate-400 mx-1">→</span>
                    <span className="text-slate-600">{row.mes_saida}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-600 whitespace-nowrap">
                    {row.ptax_entrada.toFixed(2)}→{row.ptax_saida.toFixed(2)}{' '}
                    <span
                      className={
                        row.variacao_cambial_pct >= 0 ? 'text-slate-700' : 'text-red-700'
                      }
                    >
                      ({formatPct(row.variacao_cambial_pct, 0, true)})
                    </span>
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right whitespace-nowrap ${
                      row.melhor_estrategia_brl === 'US_TREASURY_10Y'
                        ? 'font-semibold text-blue-700'
                        : 'text-slate-900'
                    }`}
                  >
                    {formatBRL(euaVal)}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right whitespace-nowrap ${
                      row.melhor_estrategia_brl === 'US_TIPS_10Y'
                        ? 'font-semibold text-sky-700'
                        : 'text-slate-800'
                    }`}
                  >
                    {formatBRL(tipsVal)}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right whitespace-nowrap ${
                      row.melhor_estrategia_brl === 'US_TBILLS_3M'
                        ? 'font-semibold text-slate-900'
                        : 'text-slate-700'
                    }`}
                  >
                    {formatBRL(tbillVal)}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right whitespace-nowrap ${
                      row.melhor_estrategia_brl === 'TESOURO_SELIC'
                        ? 'font-semibold text-amber-700'
                        : 'text-slate-800'
                    }`}
                  >
                    {formatBRL(selicVal)}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right whitespace-nowrap ${
                      row.melhor_estrategia_brl === 'TESOURO_PREFIXADO'
                        ? 'font-semibold text-violet-700'
                        : 'text-slate-800'
                    }`}
                  >
                    {formatBRL(prefixVal)}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right whitespace-nowrap ${
                      row.melhor_estrategia_brl === 'TESOURO_IPCA_MAIS'
                        ? 'font-semibold text-emerald-700'
                        : 'text-slate-800'
                    }`}
                  >
                    {formatBRL(ipcaVal)}
                  </td>
                  <td className="py-2.5 px-3 text-left font-sans whitespace-nowrap">
                    <span
                      className="font-medium"
                      style={{ color: STRATEGY_META[row.melhor_estrategia_brl].color }}
                    >
                      {STRATEGY_META[row.melhor_estrategia_brl].shortLabel}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap font-medium text-rose-700 border-l border-slate-100">
                    {formatBRL(sp500Val)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
