# Backtest Histórico: Tesouro Direto vs. US Treasury 10 Anos

Scripts em Python 3 (biblioteca padrão, sem dependências externas) para coleta única de séries históricas oficiais (2003–presente), simulação em janelas móveis parametrizáveis pela metodologia de Aswath Damodaran e exportação direta para CSV (Google Sheets / Excel).

## Fontes Oficiais Utilizadas (Download Único)

1. **FRED (Federal Reserve)**:
   - `GS10`: US 10-Year Treasury Constant Maturity Rate (`https://fred.stlouisfed.org/graph/fredgraph.csv?id=GS10`)
   - `CPIAUCSL`: Inflação americana (`https://fred.stlouisfed.org/graph/fredgraph.csv?id=CPIAUCSL`)
2. **Banco Central do Brasil (API SGS)**:
   - Série `1`: Dólar PTAX venda diária (agrupada para o último dia útil de cada mês)
   - Série `433`: IPCA variação mensal (`% a.m.`)
   - Série `4390`: Taxa Selic acumulada no mês (`% a.m.`)
3. **Tesouro Transparente (CKAN - Secretaria do Tesouro Nacional)**:
   - `precotaxatesourodireto.csv`: Preços e taxas diários do Tesouro Direto (extração mensal das taxas longas próximas a 10 anos de Tesouro Prefixado e Tesouro IPCA+).

## Como Usar

### 1. Baixar e consolidar os dados locais (executar uma vez)

```bash
python3 coletar_dados.py
```

Os arquivos brutos ficam salvos em `dados/brutos/` e a série mensal tratada em `dados/tratados/serie_mensal_consolidada.csv`. Para forçar um novo download no futuro, use `python3 coletar_dados.py --forcar`.

### 2. Rodar a simulação e gerar CSVs para o Google Sheets

Editar o arquivo `parametros.json` (IR Brasil, custódia B3, IOF entrada/saída, spread cambial, IR exterior Lei 14.754/2023 e janela padrão) ou passar argumentos pela linha de comando:

```bash
# Simular janelas de 5 anos (60 meses) e 10 anos (120 meses) de uma vez
python3 simular_backtest.py --janelas 60 120

# Exportar também o extrato passo a passo mês a mês de uma janela específica (ex.: entrada em 2015-01)
python3 simular_backtest.py --janela-meses 120 --detalhar-mes 2015-01

# Exemplo alterando IOF e spread na linha de comando
python3 simular_backtest.py --janela-meses 120 --iof-entrada 0.011 --spread-entrada 0.01 --spread-saida 0.01
```

Os resultados são salvos em `resultados/`:
- `backtest_coortes_<N>m.csv`: Tabela mês a mês de cada janela de investimento (a série oficial do Tesouro Transparente inicia em `2004-12`).
- `backtest_resumo_<N>m.csv`: Taxa de vitória, média, mediana, pior e melhor janela de cada estratégia.
- `backtest_detalhe_<MES>_<N>m.csv` (opcional com `--detalhar-mes`): Evolução mês a mês de uma coorte específica.

Para importar no Google Sheets: **Arquivo → Importar → Fazer upload** e escolher o CSV em `resultados/` (padrão UTF-8 com separador vírgula `,` e ponto decimal `.`). Caso prefira abrir direto no Excel em português com separador `;` e vírgula decimal, adicione `--formato-ptbr`.
