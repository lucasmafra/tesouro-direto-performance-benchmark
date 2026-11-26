# Plano 02 — Interface Web de Visualização dos CSVs

Aplicação web em **tema claro editorial financeiro de alto contraste** para explorar visualmente os arquivos CSV já gerados pelos scripts Python (`resultados/` e `dados/tratados/`), reunindo faixa executiva de KPIs, gráficos interativos comparativos, tabela analítica detalhada mês a mês e leitura da série histórica consolidada.

## Decisões Confirmadas

- **Fonte Única de Verdade (Read-Only sobre CSVs Python)**: A interface lê diretamente os arquivos salvos em `resultados/` e `dados/tratados/`, sem duplicar fórmulas financeiras no cliente. Também permite carregar manualmente um arquivo CSV local pelo botão **Carregar CSV**.
- **Arquitetura Servidor + Cliente (`server.ts`)**: Servidor Express com middlewares Vite servindo os endpoints `/api/backtests`, `/api/backtests/:janela`, `/api/backtests/:janela/detalhe/:mes` e `/api/series`.
- **Visualizações**:
  - Barra de trabalho com seletor dinâmico de janelas (`60m`, `120m`, etc.) e alternância entre **BRL Nominal** e **BRL Real (IPCA)**.
  - Faixa de 4 KPIs em grade plana com números tabulares (`JetBrains Mono`).
  - Gráficos Recharts: evolução multissérie por mês de entrada, barras divergentes da diferença líquida EUA vs. melhor título BR, e matriz de taxa de vitória.
  - Tabela ordenável e filtrável de coortes com gaveta lateral de auditoria passo a passo.
  - Aba de auditoria da série histórica consolidada (juros e PTAX).
