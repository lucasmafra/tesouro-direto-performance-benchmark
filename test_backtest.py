#!/usr/bin/env python3
"""
Testes unitarios de verificacao matematica para o motor de simulacao e parser.
"""

import unittest
from simular_backtest import (
    MonthlyRecord,
    SimulationConfig,
    damodaran_monthly_return,
    simulate_cohort,
    tbill_monthly_return,
)


class TestBacktestMath(unittest.TestCase):
    def test_damodaran_flat_yield_zero_drift(self):
        y = 0.06
        r_br = damodaran_monthly_return(y, y, maturity_years=10.0, semiannual_convention=False)
        expected_br = (1.0 + y) ** (1.0 / 12.0) - 1.0
        self.assertAlmostEqual(r_br, expected_br, places=10)

        r_us = damodaran_monthly_return(y, y, maturity_years=10.0, semiannual_convention=True)
        expected_us = (1.0 + y / 2.0) ** (1.0 / 6.0) - 1.0
        self.assertAlmostEqual(r_us, expected_us, places=10)

    def test_damodaran_yield_increase_causes_price_loss(self):
        r = damodaran_monthly_return(0.04, 0.05, maturity_years=10.0, semiannual_convention=True)
        self.assertLess(r, 0.0)

    def test_damodaran_yield_decrease_causes_price_gain(self):
        r = damodaran_monthly_return(0.05, 0.04, maturity_years=10.0, semiannual_convention=True)
        monthly_coupon = (1.0 + 0.05 / 2.0) ** (1.0 / 6.0) - 1.0
        self.assertGreater(r, monthly_coupon)

    def test_tbill_discount_to_monthly_return(self):
        self.assertEqual(tbill_monthly_return(0.0), 0.0)
        r = tbill_monthly_return(0.04)
        # 4% bank discount -> BEY ~4.097%, compounded over 12 months > 4.0%
        annualized = (1.0 + r) ** 12 - 1.0
        self.assertGreater(annualized, 0.04)
        self.assertLess(annualized, 0.042)

    def test_cohort_fx_tips_tbills_sp500_and_rf_separation(self):
        series = [
            MonthlyRecord(
                mes=f"2020-{m:02d}" if m <= 12 else "2021-01",
                ptax=5.00,
                ipca_mensal_pct=0.5,
                selic_mensal_pct=0.8,
                us_cpi_mensal_pct=0.2,
                us_treasury_10y_aa_pct=4.0,
                us_tips_10y_taxa_real_aa_pct=1.5,
                us_tbill_3m_aa_pct=3.0,
                sp500_tr_indice=1000.0 * (1.02 ** (m - 1)),  # +2%/mes -> vence tudo em retorno bruto
                br_prefixado_taxa_aa_pct=10.0,
                br_ipca_mais_taxa_real_aa_pct=5.0,
            )
            for m in range(1, 14)
        ]
        cfg = SimulationConfig(
            aporte_inicial_brl=1000.0,
            janela_meses=12,
            ir_brasil_aliquota=0.15,
            custodia_b3_anual=0.0,
            isentar_custodia_selic_ate_10k=True,
            iof_entrada=0.01,
            iof_saida=0.0038,
            spread_cambio_entrada=0.01,
            spread_cambio_saida=0.01,
            ir_exterior_aliquota=0.15,
        )
        res = simulate_cohort(series, 0, cfg)
        self.assertAlmostEqual(res["eua_usd_inicial"], (1000.0 / 1.01) / 5.05, places=6)

        expected_selic_gross = 1000.0 * (1.008 ** 12)
        expected_selic_net = expected_selic_gross - (expected_selic_gross - 1000.0) * 0.15
        self.assertAlmostEqual(res["selic_brl_bruto"], expected_selic_gross, places=4)
        self.assertAlmostEqual(res["selic_brl_liquido"], expected_selic_net, places=4)
        self.assertAlmostEqual(res["prefix_brl_bruto"], 1100.0, places=3)

        # TIPS deve superar retorno sem CPI para taxa real positiva + CPI positivo
        expected_tips_usd = res["eua_usd_inicial"] * (
            ((1.0 + 0.015 / 2.0) ** (1.0 / 6.0) * 1.002) ** 12
        )
        self.assertAlmostEqual(res["tips_usd_final_bruto"], expected_tips_usd, places=5)

        # S&P 500 = 1.02^12 em USD
        self.assertAlmostEqual(res["sp500_usd_final_bruto"], res["eua_usd_inicial"] * (1.02 ** 12), places=5)
        self.assertEqual(res["sp500_superou_rf_br"], "SIM")
        self.assertEqual(res["sp500_superou_rf_eua"], "SIM")
        # Vencedor de Renda Fixa nao deve incluir SP500_TR
        self.assertNotEqual(res["melhor_estrategia_brl"], "SP500_TR")


if __name__ == "__main__":
    unittest.main()
