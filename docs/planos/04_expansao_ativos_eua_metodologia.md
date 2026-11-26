# Expansão do Backtest: US T-Bills, US TIPS, S&P 500 Total Return e Nota Metodológica de ETFs Locais

Este documento espelha no repositório o plano aprovado de expansão do pipeline e da interface de visualização.

## Decisões Implementadas

- **Simetria 3×3 na Renda Fixa**: Comparação justa dentro da mesma classe de ativos entre **Tesouro Direto (Selic, Prefixado, IPCA+)** e **Treasuries EUA (T-Bills 3M via FRED `TB3MS`, Treasury 10Y via FRED `GS10` e TIPS 10Y via FRED `FII10` + `CPIAUCSL`)**.
- **S&P 500 Total Return separado (`^SP500TR`)**: Coletado mensalmente via Yahoo Finance com dividendos reinvestidos e apresentado como benchmark separado de renda variável em dólar nos cartões KPI, nos gráficos comparativos, na tabela de coortes e no painel de auditoria.
- **ETFs/BDRs locais documentados na Metodologia**: Em vez de criar curvas duplicadas sem IOF/spread, a aba **Metodologia** documenta o trade-off entre remessa direta (IOF + spread na entrada/saída) e veículos listados na B3 (taxa de administração anual e spread implícito de formador de mercado).
