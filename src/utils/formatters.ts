import type {
  AssetClassKey,
  CohortRow,
  FixedIncomeStrategyKey,
  StrategyKey,
} from '../types/backtest';

export const STRATEGY_META: Record<
  StrategyKey,
  {
    label: string;
    shortLabel: string;
    color: string;
    mutedBg: string;
    assetClass: AssetClassKey;
    classLabel: string;
  }
> = {
  US_TREASURY_10Y: {
    label: 'US Treasury 10Y',
    shortLabel: 'Treasury 10Y',
    color: '#1D4ED8',
    mutedBg: '#EFF6FF',
    assetClass: 'RENDA_FIXA_EUA',
    classLabel: 'RF EUA',
  },
  US_TIPS_10Y: {
    label: 'US TIPS 10Y',
    shortLabel: 'TIPS 10Y',
    color: '#0284C7',
    mutedBg: '#F0F9FF',
    assetClass: 'RENDA_FIXA_EUA',
    classLabel: 'RF EUA',
  },
  US_TBILLS_3M: {
    label: 'US T-Bills 3M',
    shortLabel: 'T-Bills 3M',
    color: '#475569',
    mutedBg: '#F8FAFC',
    assetClass: 'RENDA_FIXA_EUA',
    classLabel: 'RF EUA',
  },
  TESOURO_IPCA_MAIS: {
    label: 'Tesouro IPCA+',
    shortLabel: 'IPCA+',
    color: '#047857',
    mutedBg: '#ECFDF5',
    assetClass: 'RENDA_FIXA_BR',
    classLabel: 'RF BR',
  },
  TESOURO_SELIC: {
    label: 'Tesouro Selic',
    shortLabel: 'Selic',
    color: '#B45309',
    mutedBg: '#FFFBEB',
    assetClass: 'RENDA_FIXA_BR',
    classLabel: 'RF BR',
  },
  TESOURO_PREFIXADO: {
    label: 'Tesouro Prefixado',
    shortLabel: 'Prefixado',
    color: '#6D28D9',
    mutedBg: '#F5F3FF',
    assetClass: 'RENDA_FIXA_BR',
    classLabel: 'RF BR',
  },
  SP500_TR: {
    label: 'S&P 500 Total Return',
    shortLabel: 'S&P 500 TR',
    color: '#BE123C',
    mutedBg: '#FFF1F2',
    assetClass: 'RENDA_VARIAVEL_EUA',
    classLabel: 'Ações EUA',
  },
};

export const US_FIXED_INCOME_STRATEGIES: FixedIncomeStrategyKey[] = [
  'US_TREASURY_10Y',
  'US_TIPS_10Y',
  'US_TBILLS_3M',
];

export const BR_FIXED_INCOME_STRATEGIES: FixedIncomeStrategyKey[] = [
  'TESOURO_IPCA_MAIS',
  'TESOURO_SELIC',
  'TESOURO_PREFIXADO',
];

export const FIXED_INCOME_STRATEGIES: FixedIncomeStrategyKey[] = [
  ...US_FIXED_INCOME_STRATEGIES,
  ...BR_FIXED_INCOME_STRATEGIES,
];

export const ALL_STRATEGIES: StrategyKey[] = [
  ...FIXED_INCOME_STRATEGIES,
  'SP500_TR',
];

export function formatBRL(value: number, decimals = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatUSD(value: number, decimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPct(value: number, decimals = 2, signed = false): string {
  const formatted = formatNumber(value, decimals);
  if (signed && value > 0) return `+${formatted}%`;
  return `${formatted}%`;
}

export function formatWindowLabel(months: number): string {
  const years = months / 12;
  if (Number.isInteger(years)) {
    return `${years} ${years === 1 ? 'ano' : 'anos'} (${months}m)`;
  }
  return `${months} meses`;
}

export function getValueByStrategy(
  cohort: CohortRow,
  strategy: StrategyKey,
  mode: 'nominal' | 'real',
): number {
  if (mode === 'nominal') {
    switch (strategy) {
      case 'US_TREASURY_10Y':
        return cohort.eua_brl_liquido;
      case 'US_TIPS_10Y':
        return cohort.tips_brl_liquido;
      case 'US_TBILLS_3M':
        return cohort.tbill_brl_liquido;
      case 'SP500_TR':
        return cohort.sp500_brl_liquido;
      case 'TESOURO_SELIC':
        return cohort.selic_brl_liquido;
      case 'TESOURO_PREFIXADO':
        return cohort.prefix_brl_liquido;
      case 'TESOURO_IPCA_MAIS':
        return cohort.ipca_mais_brl_liquido;
    }
  }
  switch (strategy) {
    case 'US_TREASURY_10Y':
      return cohort.eua_brl_real_ipca;
    case 'US_TIPS_10Y':
      return cohort.tips_brl_real_ipca;
    case 'US_TBILLS_3M':
      return cohort.tbill_brl_real_ipca;
    case 'SP500_TR':
      return cohort.sp500_brl_real_ipca;
    case 'TESOURO_SELIC':
      return cohort.selic_brl_real_ipca;
    case 'TESOURO_PREFIXADO':
      return cohort.prefix_brl_real_ipca;
    case 'TESOURO_IPCA_MAIS':
      return cohort.ipca_mais_brl_real_ipca;
  }
}

export function getNominalCagrByStrategy(cohort: CohortRow, strategy: StrategyKey): number {
  switch (strategy) {
    case 'US_TREASURY_10Y':
      return cohort.eua_cagr_liquido_aa_pct;
    case 'US_TIPS_10Y':
      return cohort.tips_cagr_liquido_aa_pct;
    case 'US_TBILLS_3M':
      return cohort.tbill_cagr_liquido_aa_pct;
    case 'SP500_TR':
      return cohort.sp500_cagr_liquido_aa_pct;
    case 'TESOURO_SELIC':
      return cohort.selic_cagr_liquido_aa_pct;
    case 'TESOURO_PREFIXADO':
      return cohort.prefix_cagr_liquido_aa_pct;
    case 'TESOURO_IPCA_MAIS':
      return cohort.ipca_mais_cagr_liquido_aa_pct;
  }
}

export function computeCagrByMode(
  nominalCagrPct: number,
  ipcaAccumulatedPct: number,
  windowMonths: number,
  mode: 'nominal' | 'real',
): number {
  if (mode === 'nominal') return nominalCagrPct;
  const years = Math.max(1 / 12, windowMonths / 12);
  const ipcaFactor = Math.max(1e-9, 1 + ipcaAccumulatedPct / 100);
  const annualInflationFactor = ipcaFactor ** (1 / years);
  const realFactor = (1 + nominalCagrPct / 100) / annualInflationFactor;
  return (realFactor - 1) * 100;
}

export function getCagrByStrategy(
  cohort: CohortRow,
  strategy: StrategyKey,
  fallbackWindowMonths: number,
  mode: 'nominal' | 'real',
): number {
  const nominalCagr = getNominalCagrByStrategy(cohort, strategy);
  const months = cohort.janela_meses || fallbackWindowMonths;
  return computeCagrByMode(nominalCagr, cohort.ipca_acumulado_pct, months, mode);
}
