import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import type {
  BacktestCatalogResponse,
  CohortDetailRow,
  CohortRow,
  MarketSeriesRow,
  SimulationParams,
  SummaryRow,
} from './src/types/backtest.ts';
import {
  parseCohortsCsv,
  parseDetailCsv,
  parseSeriesCsv,
  parseSummaryCsv,
} from './src/utils/csvParser.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RESULTS_DIR = path.resolve(__dirname, 'resultados');
const SERIES_CSV_PATH = path.resolve(__dirname, 'dados', 'tratados', 'serie_mensal_consolidada.csv');
const PARAMS_JSON_PATH = path.resolve(__dirname, 'parametros.json');

function readTextIfExists(filePath: string): string | null {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf-8');
}

function buildCatalog(): BacktestCatalogResponse {
  const windowsSet = new Set<number>();
  const summaries: Record<number, SummaryRow[]> = {};
  const availableDetails: string[] = [];

  if (fs.existsSync(RESULTS_DIR)) {
    const files = fs.readdirSync(RESULTS_DIR);
    for (const file of files) {
      const cohortMatch = file.match(/^backtest_coortes_(\d+)m\.csv$/);
      if (cohortMatch) {
        windowsSet.add(Number(cohortMatch[1]));
      }
      const summaryMatch = file.match(/^backtest_resumo_(\d+)m\.csv$/);
      if (summaryMatch) {
        const win = Number(summaryMatch[1]);
        const raw = readTextIfExists(path.join(RESULTS_DIR, file));
        if (raw) {
          summaries[win] = parseSummaryCsv<SummaryRow>(raw);
        }
      }
      const detailMatch = file.match(/^backtest_detalhe_(\d{4}-\d{2})_(\d+)m\.csv$/);
      if (detailMatch) {
        availableDetails.push(`${detailMatch[1]}_${detailMatch[2]}m`);
      }
    }
  }

  let parametros: SimulationParams | null = null;
  const paramsRaw = readTextIfExists(PARAMS_JSON_PATH);
  if (paramsRaw) {
    try {
      parametros = JSON.parse(paramsRaw) as SimulationParams;
    } catch {
      parametros = null;
    }
  }

  const windows = Array.from(windowsSet).sort((a, b) => a - b);
  return { windows, summaries, availableDetails, parametros };
}

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.get('/api/backtests', (_req, res) => {
    try {
      res.json(buildCatalog());
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get('/api/backtests/:janela', (req, res) => {
    const janelaParam = req.params.janela;
    if (!/^\d+$/.test(janelaParam)) {
      res.status(400).json({ error: 'Parâmetro de janela inválido.' });
      return;
    }
    const janela = Number(janelaParam);
    const cohortsPath = path.join(RESULTS_DIR, `backtest_coortes_${janela}m.csv`);
    const summaryPath = path.join(RESULTS_DIR, `backtest_resumo_${janela}m.csv`);

    const cohortsRaw = readTextIfExists(cohortsPath);
    if (!cohortsRaw) {
      res.status(404).json({
        error: `Arquivo backtest_coortes_${janela}m.csv não encontrado em resultados/.`,
      });
      return;
    }

    const cohorts = parseCohortsCsv<CohortRow>(cohortsRaw);
    const summaryRaw = readTextIfExists(summaryPath);
    const summary = summaryRaw ? parseSummaryCsv<SummaryRow>(summaryRaw) : [];

    res.json({ janela, summary, cohorts });
  });

  app.get('/api/backtests/:janela/detalhe/:mes', (req, res) => {
    const { janela, mes } = req.params;
    if (!/^\d+$/.test(janela) || !/^\d{4}-\d{2}$/.test(mes)) {
      res.status(400).json({ error: 'Parâmetros inválidos.' });
      return;
    }
    const detailPath = path.join(RESULTS_DIR, `backtest_detalhe_${mes}_${janela}m.csv`);
    const raw = readTextIfExists(detailPath);
    if (!raw) {
      res.status(404).json({ error: 'Extrato detalhado não gerado para este mês.' });
      return;
    }
    const rows = parseDetailCsv<CohortDetailRow>(raw);
    res.json({ janela: Number(janela), mes, rows });
  });

  app.get('/api/backtests/:janela/explicacao', (req, res) => {
    const { janela } = req.params;
    if (!/^\d+$/.test(janela)) {
      res.status(400).json({ error: 'Parâmetro de janela inválido.' });
      return;
    }
    const filename = `explicacoes_${janela}m.md`;
    const filePath = path.join(RESULTS_DIR, filename);
    const content = readTextIfExists(filePath);
    res.json({
      janela: Number(janela),
      exists: content !== null,
      filename: `resultados/${filename}`,
      content,
    });
  });

  app.get('/api/series', (_req, res) => {
    const raw = readTextIfExists(SERIES_CSV_PATH);
    if (!raw) {
      res.status(404).json({
        error: 'Arquivo dados/tratados/serie_mensal_consolidada.csv não encontrado.',
      });
      return;
    }
    const rows = parseSeriesCsv<MarketSeriesRow>(raw);
    res.json({ rows });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Servidor de visualização disponível em http://localhost:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Erro ao iniciar servidor:', err);
  process.exit(1);
});
