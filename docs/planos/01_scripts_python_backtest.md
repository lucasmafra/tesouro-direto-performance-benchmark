# Plano 01 — Scripts Python de Backtest (Coleta Local, Simulação Damodaran e Saída CSV)

Conjunto de scripts em **Python 3.11 padrão** (sem dependências externas e sem interface gráfica) para baixar uma única vez as séries históricas oficiais a partir de **janeiro de 2003**, executar simulações em **janelas móveis parametrizáveis** (ex.: 60 meses = 5 anos e 120 meses = 10 anos) segundo a metodologia de Aswath Damodaran, e exportar arquivos **CSV prontos para Google Sheets**.

## Decisões Confirmadas

- **Fontes Oficiais Locais (Download Único)**:
  - **FRED**: `GS10` (US 10Y Treasury Constant Maturity) e `CPIAUCSL` (US CPI).
  - **Banco Central (API SGS)**: Série `1` (PTAX venda diária agrupada para fechamento mensal), `433` (IPCA mensal) e `4390` (Selic mensal acumulada).
  - **Tesouro Transparente (CKAN)**: `precotaxatesourodireto.csv` (extração mensal das taxas longas próximas a 10 anos para Tesouro Prefixado e Tesouro IPCA+; início oficial publicado pela STN em `2004-12-31`).
- **Títulos Comparados**: `US_TREASURY_10Y`, `TESOURO_SELIC`, `TESOURO_PREFIXADO` e `TESOURO_IPCA_MAIS`.
- **Regras Fiscais e Custos Editáveis (`parametros.json`)**: Aporte inicial (`R$ 1.000,00`), janela em meses, IR Brasil (`15%`), custódia B3 (`0,20% a.a.` com isenção opcional no Selic até R$ 10k), IOF câmbio entrada/saída, spread cambial entrada/saída e IR Exterior (`15%`, Lei 14.754/2023 sobre ganho de capital + variação cambial em BRL).

## Fluxo de Execução

1. `python3 coletar_dados.py` — Baixa as fontes oficiais para `dados/brutos/` uma única vez e gera `dados/tratados/serie_mensal_consolidada.csv` com continuidade mensal garantida.
2. `python3 simular_backtest.py --janelas 60 120` — Simula todas as coortes mensais disponíveis e exporta `resultados/backtest_coortes_<N>m.csv`, `resultados/backtest_resumo_<N>m.csv` e, opcionalmente com `--detalhar-mes YYYY-MM`, `resultados/backtest_detalhe_<MES>_<N>m.csv`.
