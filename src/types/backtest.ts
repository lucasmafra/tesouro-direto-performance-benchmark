export type FixedIncomeStrategyKey =
  | 'US_TREASURY_10Y'
  | 'US_TIPS_10Y'
  | 'US_TBILLS_3M'
  | 'TESOURO_SELIC'
  | 'TESOURO_PREFIXADO'
  | 'TESOURO_IPCA_MAIS';

export type StrategyKey = FixedIncomeStrategyKey | 'SP500_TR';

export type AssetClassKey = 'RENDA_FIXA_EUA' | 'RENDA_FIXA_BR' | 'RENDA_VARIAVEL_EUA';

export interface CohortRow {
  mes_entrada: string;
  mes_saida: string;
  janela_meses: number;
  ptax_entrada: number;
  ptax_saida: number;
  variacao_cambial_pct: number;
  ipca_acumulado_pct: number;
  cpi_eua_acumulado_pct: number;
  us_yield_10y_entrada_aa_pct: number;
  us_tips_10y_entrada_aa_pct: number;
  us_tbill_3m_entrada_aa_pct: number;
  sp500_tr_entrada: number;
  sp500_tr_saida: number;
  br_prefix_entrada_aa_pct: number;
  br_ipca_real_entrada_aa_pct: number;
  eua_usd_inicial: number;
  eua_usd_final_bruto: number;
  eua_brl_bruto_pos_cambio: number;
  eua_ir_lei14754_brl: number;
  eua_brl_liquido: number;
  eua_brl_real_ipca: number;
  eua_cagr_liquido_aa_pct: number;
  tips_usd_final_bruto: number;
  tips_brl_bruto_pos_cambio: number;
  tips_ir_lei14754_brl: number;
  tips_brl_liquido: number;
  tips_brl_real_ipca: number;
  tips_cagr_liquido_aa_pct: number;
  tbill_usd_final_bruto: number;
  tbill_brl_bruto_pos_cambio: number;
  tbill_ir_lei14754_brl: number;
  tbill_brl_liquido: number;
  tbill_brl_real_ipca: number;
  tbill_cagr_liquido_aa_pct: number;
  sp500_usd_final_bruto: number;
  sp500_brl_bruto_pos_cambio: number;
  sp500_ir_lei14754_brl: number;
  sp500_brl_liquido: number;
  sp500_brl_real_ipca: number;
  sp500_cagr_liquido_aa_pct: number;
  selic_brl_bruto: number;
  selic_ir_brl: number;
  selic_brl_liquido: number;
  selic_brl_real_ipca: number;
  selic_cagr_liquido_aa_pct: number;
  prefix_brl_bruto: number;
  prefix_ir_brl: number;
  prefix_brl_liquido: number;
  prefix_brl_real_ipca: number;
  prefix_cagr_liquido_aa_pct: number;
  ipca_mais_brl_bruto: number;
  ipca_mais_ir_brl: number;
  ipca_mais_brl_liquido: number;
  ipca_mais_brl_real_ipca: number;
  ipca_mais_cagr_liquido_aa_pct: number;
  melhor_estrategia_brl: FixedIncomeStrategyKey;
  eua_superou_selic: 'SIM' | 'NAO';
  eua_superou_prefixado: 'SIM' | 'NAO';
  eua_superou_ipca_mais: 'SIM' | 'NAO';
  eua_superou_todos_br: 'SIM' | 'NAO';
  eua_rf_superou_todos_br: 'SIM' | 'NAO';
  sp500_superou_rf_br: 'SIM' | 'NAO';
  sp500_superou_rf_eua: 'SIM' | 'NAO';
  diferenca_eua_vs_melhor_br_brl: number;
  diferenca_eua_vs_melhor_br_pct: number;
}

export interface SummaryRow {
  estrategia: StrategyKey;
  classe?: AssetClassKey;
  janela_meses: number;
  total_coortes: number;
  periodo_entradas: string;
  vitorias_gerais_qtd: number;
  vitorias_gerais_pct: number;
  superou_selic_pct: number;
  superou_prefixado_pct: number;
  superou_ipca_mais_pct: number;
  patrimonio_medio_brl_liquido: number;
  patrimonio_mediano_brl_liquido: number;
  patrimonio_min_brl_liquido: number;
  pior_janela: string;
  patrimonio_max_brl_liquido: number;
  melhor_janela: string;
  patrimonio_medio_brl_real_ipca: number;
  patrimonio_mediano_brl_real_ipca: number;
  cagr_medio_liquido_aa_pct: number;
  cagr_mediano_liquido_aa_pct: number;
}

export interface CohortDetailRow {
  passo_mes: number;
  mes: string;
  ptax_fim_mes: number;
  ipca_mensal_pct: number;
  selic_mensal_pct: number;
  us_yield_10y_aa_pct: number;
  us_tips_10y_real_aa_pct: number;
  us_tbill_3m_aa_pct: number;
  sp500_tr_indice: number;
  br_prefix_aa_pct: number;
  br_ipca_real_aa_pct: number;
  eua_usd_saldo: number;
  eua_brl_marcacao_bruta: number;
  tips_brl_marcacao_bruta: number;
  tbill_brl_marcacao_bruta: number;
  sp500_brl_marcacao_bruta: number;
  selic_brl_saldo: number;
  prefix_brl_saldo: number;
  ipca_mais_brl_saldo: number;
  ipca_fator_acumulado: number;
}

export interface MarketSeriesRow {
  mes: string;
  ptax_venda_fim_mes: number;
  ptax_data_ref: string;
  ipca_mensal_pct: number;
  selic_mensal_pct: number;
  us_cpi_indice: number;
  us_cpi_mensal_pct: number;
  us_treasury_10y_aa_pct: number;
  us_tips_10y_taxa_real_aa_pct: number;
  us_tbill_3m_aa_pct: number;
  sp500_tr_indice: number;
  sp500_tr_mensal_pct: number;
  br_prefixado_taxa_aa_pct: number;
  br_prefixado_titulo_ref: string;
  br_prefixado_prazo_anos: number;
  br_ipca_mais_taxa_real_aa_pct: number;
  br_ipca_mais_titulo_ref: string;
  br_ipca_mais_prazo_anos: number;
}

export interface SimulationParams {
  aporte_inicial_brl?: number;
  data_inicio?: string;
  janela_meses?: number;
  ir_brasil_aliquota?: number;
  custodia_b3_anual?: number;
  isentar_custodia_selic_ate_10k?: boolean;
  iof_entrada?: number;
  iof_saida?: number;
  spread_cambio_entrada?: number;
  spread_cambio_saida?: number;
  ir_exterior_aliquota?: number;
  taxa_custodia_eua_anual?: number;
}

export interface BacktestCatalogResponse {
  windows: number[];
  summaries: Record<number, SummaryRow[]>;
  availableDetails: string[];
  parametros: SimulationParams | null;
}

export interface BacktestWindowResponse {
  janela: number;
  summary: SummaryRow[];
  cohorts: CohortRow[];
}

export interface BacktestExplanationResponse {
  janela: number;
  exists: boolean;
  filename: string;
  content: string | null;
}
