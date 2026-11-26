import { RotateCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { CohortDrawer } from './components/CohortDrawer';
import { CohortsTable } from './components/CohortsTable';
import { ComparativeCharts } from './components/ComparativeCharts';
import { HistoricalSeriesView } from './components/HistoricalSeriesView';
import { KpiStrip } from './components/KpiStrip';
import { MethodologyView } from './components/MethodologyView';
import { MotivationView } from './components/MotivationView';
import { ResultExplanationSection } from './components/ResultExplanationSection';
import type {
  BacktestCatalogResponse,
  BacktestExplanationResponse,
  BacktestWindowResponse,
  CohortRow,
  MarketSeriesRow,
  SimulationParams,
} from './types/backtest';
import { formatBRL, formatPct, formatWindowLabel } from './utils/formatters';

type TabKey = 'comparativo' | 'tabela' | 'serie' | 'metodologia' | 'motivacao';
type ValueMode = 'nominal' | 'real';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('comparativo');
  const [valueMode, setValueMode] = useState<ValueMode>('nominal');

  const [catalog, setCatalog] = useState<BacktestCatalogResponse | null>(null);
  const [selectedWindow, setSelectedWindow] = useState<number | null>(null);
  const [cohorts, setCohorts] = useState<CohortRow[]>([]);
  const [loadingBacktest, setLoadingBacktest] = useState(true);
  const [backtestError, setBacktestError] = useState<string | null>(null);

  const [selectedCohort, setSelectedCohort] = useState<CohortRow | null>(null);

  const [seriesRows, setSeriesRows] = useState<MarketSeriesRow[]>([]);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [seriesError, setSeriesError] = useState<string | null>(null);
  const [seriesLoaded, setSeriesLoaded] = useState(false);

  const [explanation, setExplanation] = useState<BacktestExplanationResponse | null>(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [explanationError, setExplanationError] = useState<string | null>(null);

  const loadExplanation = useCallback(async (win: number) => {
    setLoadingExplanation(true);
    setExplanationError(null);
    try {
      const res = await fetch(`/api/backtests/${win}/explicacao`);
      if (!res.ok) {
        throw new Error(`Falha ao ler explicações da janela ${win}m.`);
      }
      const data = (await res.json()) as BacktestExplanationResponse;
      setExplanation(data);
    } catch (err) {
      setExplanationError((err as Error).message);
      setExplanation(null);
    } finally {
      setLoadingExplanation(false);
    }
  }, []);

  const loadWindow = useCallback(async (win: number) => {
    setLoadingBacktest(true);
    setBacktestError(null);
    try {
      const res = await fetch(`/api/backtests/${win}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Falha ao carregar janela de ${win} meses.`);
      }
      const data = (await res.json()) as BacktestWindowResponse;
      setCohorts(data.cohorts);
      setSelectedWindow(win);
      setSelectedCohort(null);
      void loadExplanation(win);
    } catch (err) {
      setBacktestError((err as Error).message);
    } finally {
      setLoadingBacktest(false);
    }
  }, [loadExplanation]);

  const loadCatalogAndInitial = useCallback(
    async (preferredWindow?: number | null) => {
      setLoadingBacktest(true);
      setBacktestError(null);
      try {
        const res = await fetch('/api/backtests');
        if (!res.ok) throw new Error('Não foi possível consultar os arquivos de backtest.');
        const cat = (await res.json()) as BacktestCatalogResponse;
        setCatalog(cat);

        if (cat.windows.length === 0) {
          setCohorts([]);
          setSelectedWindow(null);
          setLoadingBacktest(false);
          return;
        }

        const defaultWin =
          preferredWindow && cat.windows.includes(preferredWindow)
            ? preferredWindow
            : cat.windows.includes(120)
              ? 120
              : cat.windows[cat.windows.length - 1];

        await loadWindow(defaultWin);
      } catch (err) {
        setBacktestError((err as Error).message);
        setLoadingBacktest(false);
      }
    },
    [loadWindow],
  );

  const loadSeries = useCallback(async () => {
    setLoadingSeries(true);
    setSeriesError(null);
    try {
      const res = await fetch('/api/series');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Falha ao carregar série histórica.');
      }
      const data = (await res.json()) as { rows: MarketSeriesRow[] };
      setSeriesRows(data.rows);
      setSeriesLoaded(true);
    } catch (err) {
      setSeriesError((err as Error).message);
    } finally {
      setLoadingSeries(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalogAndInitial();
  }, [loadCatalogAndInitial]);

  useEffect(() => {
    if (activeTab === 'serie' && !seriesLoaded && !loadingSeries) {
      void loadSeries();
    }
  }, [activeTab, seriesLoaded, loadingSeries, loadSeries]);

  const params: SimulationParams | null = catalog?.parametros ?? null;
  const initialDeposit = params?.aporte_inicial_brl ?? 1000;
  const activeWindow = selectedWindow ?? 120;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <span className="text-lg font-semibold tracking-tight text-slate-900 whitespace-nowrap shrink-0 font-[var(--font-display)]">
            Backtest Tesouro
          </span>

          <nav aria-label="Navegação principal" className="flex items-center gap-6 overflow-x-auto">
            {(
              [
                { id: 'comparativo', label: 'Visão Comparativa' },
                { id: 'motivacao', label: 'Motivação' },
                { id: 'tabela', label: 'Tabela de Coortes' },
                { id: 'serie', label: 'Série Histórica' },
                { id: 'metodologia', label: 'Metodologia' },
              ] as const
            ).map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'border-blue-700 text-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <div className="bg-white border-b border-slate-200">
        <div className="max-w-[1440px] mx-auto px-6 py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {(activeTab === 'comparativo' || activeTab === 'tabela') && (
              <>
                <div className="flex items-center gap-1 p-1 bg-slate-100">
                  {(catalog?.windows ?? []).map((win) => {
                    const isActive = selectedWindow === win;
                    return (
                      <button
                        key={win}
                        type="button"
                        onClick={() => void loadWindow(win)}
                        className={`px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          isActive
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {formatWindowLabel(win)}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1 p-1 bg-slate-100">
                  <button
                    type="button"
                    onClick={() => setValueMode('nominal')}
                    className={`px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      valueMode === 'nominal'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    BRL Nominal
                  </button>
                  <button
                    type="button"
                    onClick={() => setValueMode('real')}
                    className={`px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      valueMode === 'real'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    BRL Real (IPCA)
                  </button>
                </div>
              </>
            )}

            {activeTab === 'serie' && (
              <div className="text-xs text-slate-600">
                Base mensal consolidada a partir de FRED, Banco Central SGS e Tesouro Transparente
              </div>
            )}

            {activeTab === 'metodologia' && (
              <div className="text-xs text-slate-600">
                Documentação fixa das equações financeiras, convenções tributárias e fontes de dados
              </div>
            )}

            {activeTab === 'motivacao' && (
              <div className="text-xs text-slate-600">
                Contexto macroeconômico e pergunta central sobre a tese de dolarização do patrimônio
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
            {params && (activeTab === 'comparativo' || activeTab === 'tabela') && (
              <span className="font-mono tabular-nums">
                Aporte {formatBRL(initialDeposit, 0)} · IR BR{' '}
                {formatPct((params.ir_brasil_aliquota ?? 0.15) * 100, 0)} · IR Ext{' '}
                {formatPct((params.ir_exterior_aliquota ?? 0.15) * 100, 0)} · IOF{' '}
                {formatPct((params.iof_entrada ?? 0.011) * 100, 2)}/
                {formatPct((params.iof_saida ?? 0.0038) * 100, 2)} · Spread{' '}
                {formatPct((params.spread_cambio_entrada ?? 0.01) * 100, 1)}
              </span>
            )}
            {activeTab !== 'metodologia' && activeTab !== 'motivacao' && (
              <button
                type="button"
                onClick={() => {
                  if (activeTab === 'serie') {
                    void loadSeries();
                  } else {
                    void loadCatalogAndInitial(selectedWindow);
                  }
                }}
                className="inline-flex items-center gap-1.5 text-slate-700 hover:text-blue-700 font-medium whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Recarregar CSVs</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-[1440px] w-full mx-auto px-6 py-6 flex-1 space-y-6">
        {(activeTab === 'comparativo' || activeTab === 'tabela') && (
          <>
            {loadingBacktest ? (
              <div className="border border-slate-200 bg-white p-8 text-sm text-slate-500">
                Carregando resultados do backtest...
              </div>
            ) : backtestError ? (
              <div className="border border-red-200 bg-white p-6 text-sm text-red-700 space-y-2">
                <div className="font-semibold">Erro ao carregar dados</div>
                <div>{backtestError}</div>
              </div>
            ) : cohorts.length === 0 ? (
              <div className="border border-slate-200 bg-white p-8 space-y-3">
                <h2 className="text-base font-semibold text-slate-900">
                  Nenhum CSV de backtest encontrado em resultados/
                </h2>
                <p className="text-sm text-slate-600">
                  Execute os scripts Python no terminal para gerar os arquivos de simulação.
                </p>
                <div className="font-mono text-xs bg-slate-50 border border-slate-200 p-3 text-slate-800">
                  python3 coletar_dados.py &amp;&amp; python3 simular_backtest.py --janelas 60 120
                </div>
              </div>
            ) : activeTab === 'comparativo' ? (
              <>
                <KpiStrip
                  cohorts={cohorts}
                  windowMonths={activeWindow}
                  valueMode={valueMode}
                />
                <ComparativeCharts
                  cohorts={cohorts}
                  windowMonths={activeWindow}
                  valueMode={valueMode}
                  initialDeposit={initialDeposit}
                  onSelectCohort={setSelectedCohort}
                />
                <ResultExplanationSection
                  windowMonths={activeWindow}
                  filename={explanation?.filename ?? `resultados/explicacoes_${activeWindow}m.md`}
                  content={explanation?.content ?? null}
                  exists={explanation?.exists ?? false}
                  loading={loadingExplanation}
                  error={explanationError}
                />
              </>
            ) : (
              <CohortsTable
                cohorts={cohorts}
                valueMode={valueMode}
                selectedMonth={selectedCohort?.mes_entrada}
                onSelectCohort={setSelectedCohort}
              />
            )}
          </>
        )}

        {activeTab === 'serie' && (
          <HistoricalSeriesView
            rows={seriesRows}
            loading={loadingSeries}
            error={seriesError}
          />
        )}

        {activeTab === 'metodologia' && <MethodologyView parametros={params} />}

        {activeTab === 'motivacao' && <MotivationView />}
      </main>

      <CohortDrawer
        cohort={selectedCohort}
        windowMonths={activeWindow}
        valueMode={valueMode}
        hasLocalServerData={true}
        onClose={() => setSelectedCohort(null)}
      />
    </div>
  );
}
