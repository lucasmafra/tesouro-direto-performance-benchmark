# Plano 03 — Seção "Explicações do Resultado" e Versionamento de Planos

Adição de uma seção editorial integrada à aba **Visão Comparativa** (logo abaixo dos gráficos) para exibir análises explicativas carregadas de um arquivo Markdown local específico para cada backtest (`resultados/explicacoes_<N>m.md`), além da gravação permanente dos planos de implementação em `docs/planos/`.

## Decisões Confirmadas

- **Posicionamento na Interface**: Seção integrada diretamente na **Visão Comparativa**, imediatamente abaixo da grade de gráficos comparativos, acompanhando automaticamente a janela selecionada (`60m`, `120m`, etc.).
- **Um Arquivo Local por Backtest**: Cada janela possui seu próprio arquivo Markdown editável em `resultados/explicacoes_<N>m.md`, permitindo atualizar a análise de cada horizonte diretamente no arquivo sem alterar o código da interface.
- **Renderização Segura em JSX**: Parser Markdown leve renderizado em elementos JSX nativos (títulos, parágrafos, negrito, listas, citações numéricas), evitando qualquer injeção de HTML bruto.
- **Endpoint de Leitura**: `GET /api/backtests/:janela/explicacao` no `server.ts`, com validação estrita de parâmetro numérico para prevenir traversal de diretórios e atualização instantânea ao clicar em **Recarregar CSVs**.
