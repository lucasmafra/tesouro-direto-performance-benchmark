import type { SimulationParams } from '../types/backtest';
import { formatBRL, formatPct } from '../utils/formatters';

interface MethodologyViewProps {
  parametros: SimulationParams | null;
}

export function MethodologyView({ parametros }: MethodologyViewProps) {
  const aporte = parametros?.aporte_inicial_brl ?? 1000;
  const irBr = (parametros?.ir_brasil_aliquota ?? 0.15) * 100;
  const irExt = (parametros?.ir_exterior_aliquota ?? 0.15) * 100;
  const custodiaB3 = (parametros?.custodia_b3_anual ?? 0.002) * 100;
  const iofIn = (parametros?.iof_entrada ?? 0.011) * 100;
  const iofOut = (parametros?.iof_saida ?? 0.0038) * 100;
  const spreadIn = (parametros?.spread_cambio_entrada ?? 0.01) * 100;
  const spreadOut = (parametros?.spread_cambio_saida ?? 0.01) * 100;

  return (
    <div className="space-y-6">
      <section className="border border-slate-200 bg-white p-6">
        <div className="pb-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">
            Metodologia de Simulação e Fontes Oficiais
          </h2>
          <p className="mt-1 text-sm text-slate-600 max-w-3xl">
            Estrutura fixa aplicada igualmente a todas as janelas móveis (60m, 120m ou qualquer
            horizonte configurado nos scripts Python), com simetria 3×3 dentro da Renda Fixa e
            referência separada de Renda Variável.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-6 text-[15px] leading-[1.65] text-slate-700">
            <div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">
                1. Apreçamento Mensal Estilo Aswath Damodaran
              </h3>
              <p>
                Seguindo a abordagem de Aswath Damodaran em{' '}
                <em>Historical Returns on Stocks, Bonds and Bills</em>, títulos de renda fixa de
                longo prazo são modelados a partir de séries de taxas de maturidade constante (como o{' '}
                <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 border border-slate-200">
                  GS10
                </code>{' '}
                e o{' '}
                <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 border border-slate-200">
                  FII10
                </code>{' '}
                de 10 anos do Federal Reserve). Como essas séries refletem a taxa de mercado de um
                título teórico renovado continuamente — e não um papel físico levado até o
                vencimento —, cada passo mensal combina o cupom do período com a marcação a mercado
                causada pela variação da taxa.
              </p>
              <div className="mt-3 border border-slate-200 bg-slate-50 p-4 font-mono text-xs text-slate-800 space-y-1.5 overflow-x-auto">
                <div>1. Taxa mensal equivalente (EUA semestral): r = (1 + Y / 2)^(1 / 6) - 1</div>
                <div>2. Taxa mensal equivalente (Brasil efetiva): r = (1 + Y)^(1 / 12) - 1</div>
                <div>
                  3. Preço ao fim do mês (119 meses restantes): P = r_ant * [1 - (1 + r_atual)^(-119)] /
                  r_atual + (1 + r_atual)^(-119)
                </div>
                <div>4. Retorno total do mês: R_m = r_ant + (P - 1)</div>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                Quando a taxa de mercado cai entre um mês e outro, <code className="font-mono">P &gt; 1</code>{' '}
                gera ganho de capital adicional ao cupom; quando sobe, <code className="font-mono">P &lt; 1</code>{' '}
                gera perda de marcação a mercado.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">
                2. Modelagem de Cada Ativo Comparado (Simetria 3×3 RF + S&amp;P 500 Separado)
              </h3>
              <ul className="space-y-2.5 list-disc pl-5 marker:text-slate-400">
                <li>
                  <strong className="text-slate-900">US Treasury 10Y (RF EUA):</strong> Usa o
                  rendimento anual da série <code className="font-mono text-xs">GS10</code> (FRED)
                  com reapreçamento mensal Damodaran em dólar na convenção semestral americana.
                </li>
                <li>
                  <strong className="text-slate-900">US TIPS 10Y (RF EUA):</strong> Equivalente
                  americano ao Tesouro IPCA+. Extrai a taxa real constante de 10 anos (FRED{' '}
                  <code className="font-mono text-xs">FII10</code>), aplica reapreçamento real
                  Damodaran e compõe com o CPI mensal oficial dos EUA (FRED{' '}
                  <code className="font-mono text-xs">CPIAUCSL</code>).
                </li>
                <li>
                  <strong className="text-slate-900">US T-Bills 3M (RF EUA):</strong> Equivalente
                  americano ao Tesouro Selic (caixa/curtíssimo prazo). Converte a taxa de desconto
                  bancário de 3 meses (FRED <code className="font-mono text-xs">TB3MS</code>, base
                  360 dias) em <em>Bond Equivalent Yield</em> e rendimento composto mensal sem risco
                  relevante de marcação a mercado.
                </li>
                <li>
                  <strong className="text-slate-900">Tesouro Selic (RF BR):</strong> Capitalização
                  mensal direta pela taxa Selic acumulada no mês (BCB SGS{' '}
                  <code className="font-mono text-xs">4390</code>).
                </li>
                <li>
                  <strong className="text-slate-900">Tesouro Prefixado (RF BR):</strong> Extrai no
                  último dia útil de cada mês a taxa do título prefixado público com maturidade mais
                  próxima de 10 anos e aplica a fórmula Damodaran em Reais nominais.
                </li>
                <li>
                  <strong className="text-slate-900">Tesouro IPCA+ (RF BR):</strong> Extrai a taxa
                  real do título indexado ao IPCA mais próximo de 10 anos, calcula o retorno real
                  mensal pela fórmula Damodaran e compõe com o IPCA oficial do mês (BCB SGS{' '}
                  <code className="font-mono text-xs">433</code>).
                </li>
                <li>
                  <strong className="text-slate-900">
                    S&amp;P 500 Total Return (Renda Variável EUA · Separado):
                  </strong>{' '}
                  Usa o índice oficial com dividendos reinvestidos (
                  <code className="font-mono text-xs">^SP500TR</code>) em USD. Como possui perfil
                  de risco e volatilidade muito superior ao de títulos públicos (com quedas
                  relevantes em crises como 2008, 2020 e 2022), suas vitórias são reportadas em
                  bloco próprio, separadas da disputa de Renda Fixa 3×3.
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">
                3. Câmbio, Custos e Tributação (Regras Vigentes Parametrizadas)
              </h3>
              <ul className="space-y-2.5 list-disc pl-5 marker:text-slate-400">
                <li>
                  <strong className="text-slate-900">Remessa para os EUA (Entrada):</strong> Do
                  aporte inicial (<span className="font-mono tabular-nums">{formatBRL(aporte, 0)}</span>),
                  deduz-se o IOF de entrada ({formatPct(iofIn, 2)}) sobre o valor convertido e
                  aplica-se o spread cambial ({formatPct(spreadIn, 2)}) sobre a PTAX de fechamento
                  do mês de entrada.
                </li>
                <li>
                  <strong className="text-slate-900">Repatriação e Lei 14.754/2023 (Saída):</strong>{' '}
                  Ao término da janela, o saldo em USD é convertido pela PTAX do mês de saída com
                  desconto do spread ({formatPct(spreadOut, 2)}) e do IOF de retorno ({formatPct(iofOut, 2)}).
                  Sobre o lucro total em Reais (incluindo ganho do ativo em dólar e variação
                  cambial), incide a alíquota de{' '}
                  <span className="font-mono tabular-nums">{formatPct(irExt, 0)}</span> caso o
                  resultado em BRL seja positivo.
                </li>
                <li>
                  <strong className="text-slate-900">Tesouro Direto no Brasil:</strong> Deduz-se a
                  taxa de custódia da B3 ({formatPct(custodiaB3, 2)} a.a. proporcional ao mês;
                  respeitando isenção no Tesouro Selic até R$ 10.000 quando habilitada) e aplica-se{' '}
                  <span className="font-mono tabular-nums">{formatPct(irBr, 0)}</span> de Imposto de
                  Renda no resgate exclusivamente sobre o rendimento nominal positivo.
                </li>
                <li>
                  <strong className="text-slate-900">Poder de Compra (BRL Real IPCA):</strong>{' '}
                  Todos os patrimônios líquidos finais são divididos pelo fator acumulado do IPCA
                  da respectiva janela para mostrar quanto o investimento preservou em moeda
                  constante brasileira.
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">
                4. Considerações sobre ETFs/BDRs Locais vs. Remessa Direta (IOF e Spread)
              </h3>
              <p>
                Investidores brasileiros podem se expor a Treasuries americanos ou ao S&amp;P 500
                por meio de <strong>ETFs ou fundos locais listados na B3</strong> em Reais (sem
                hedge cambial), evitando diretamente o pagamento de{' '}
                <strong>IOF de remessa/retorno ({formatPct(iofIn, 2)} + {formatPct(iofOut, 2)})</strong>{' '}
                e do <strong>spread cambial de corretora de varejo</strong>. Apesar dessa vantagem
                inicial, este estudo mantém o modelo padrão de remessa direta pelos seguintes
                motivos:
              </p>
              <ul className="mt-2.5 space-y-2 list-disc pl-5 marker:text-slate-400">
                <li>
                  <strong className="text-slate-900">Taxa de administração recorrente:</strong>{' '}
                  ETFs/fundos locais cobram tipicamente entre <span className="font-mono">0,20%</span>{' '}
                  e <span className="font-mono">0,60% a.a.</span> (além da taxa do ETF subjacente no
                  exterior e do spread implícito dos formadores de mercado). Em uma janela de 10
                  anos, um custo anual de <span className="font-mono">0,35% a.a.</span> reduz o
                  patrimônio final em cerca de <span className="font-mono">3,4%</span> — efeito
                  praticamente equivalente aos <span className="font-mono">~3,4%</span> únicos de
                  IOF + spread na ida e volta.
                </li>
                <li>
                  <strong className="text-slate-900">Sensibilidade reduzida nos resultados:</strong>{' '}
                  Mesmo zerando completamente IOF e spread no <code className="font-mono text-xs">parametros.json</code>,
                  o impacto no saldo final de 10 anos (~+3,5%) não altera a liderança estrutural
                  entre Renda Fixa Brasil e Renda Fixa EUA nem a conclusão sobre o S&amp;P 500.
                </li>
              </ul>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-sm font-semibold text-slate-900 pb-3 border-b border-slate-200">
                Fontes Oficiais Utilizadas
              </h3>
              <table className="w-full text-xs mt-3">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-200">
                    <th className="py-1.5 text-left font-medium">Série</th>
                    <th className="py-1.5 text-left font-medium">Fonte</th>
                    <th className="py-1.5 text-left font-medium">Código / Arquivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="py-2 text-slate-800 font-medium">US Treasury 10Y</td>
                    <td className="py-2 text-slate-600">FRED (Fed)</td>
                    <td className="py-2 font-mono text-slate-700">GS10</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-800 font-medium">US TIPS 10Y (Real)</td>
                    <td className="py-2 text-slate-600">FRED (Fed)</td>
                    <td className="py-2 font-mono text-slate-700">FII10</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-800 font-medium">US T-Bills 3M</td>
                    <td className="py-2 text-slate-600">FRED (Fed)</td>
                    <td className="py-2 font-mono text-slate-700">TB3MS</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-800 font-medium">Inflação EUA</td>
                    <td className="py-2 text-slate-600">FRED (Fed)</td>
                    <td className="py-2 font-mono text-slate-700">CPIAUCSL</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-800 font-medium">S&amp;P 500 Total Return</td>
                    <td className="py-2 text-slate-600">Yahoo Finance</td>
                    <td className="py-2 font-mono text-slate-700">^SP500TR (mensal)</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-800 font-medium">Dólar PTAX Venda</td>
                    <td className="py-2 text-slate-600">Banco Central</td>
                    <td className="py-2 font-mono text-slate-700">SGS 1 (fim mês)</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-800 font-medium">IPCA Mensal</td>
                    <td className="py-2 text-slate-600">Banco Central</td>
                    <td className="py-2 font-mono text-slate-700">SGS 433</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-800 font-medium">Selic Mensal</td>
                    <td className="py-2 text-slate-600">Banco Central</td>
                    <td className="py-2 font-mono text-slate-700">SGS 4390</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-800 font-medium">Prefixado e IPCA+</td>
                    <td className="py-2 text-slate-600">Tesouro Transparente</td>
                    <td className="py-2 font-mono text-slate-700">precotaxatesourodireto.csv</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="border border-slate-200 bg-white p-5 space-y-2.5 text-xs text-slate-600">
              <h3 className="text-sm font-semibold text-slate-900">
                Premissas e Limitações de Leitura
              </h3>
              <p className="leading-relaxed">
                O arquivo oficial de preços e taxas do Tesouro Transparente inicia em{' '}
                <span className="font-mono text-slate-800">2004-12-31</span>; por isso a série
                contínua unificada começa em <span className="font-mono text-slate-800">2004-12</span>.
              </p>
              <p className="leading-relaxed">
                Em <span className="font-mono text-slate-800">2025-10</span>, uma lacuna pontual do
                índice <span className="font-mono text-slate-800">CPIAUCSL</span> no FRED foi
                interpolada linearmente apenas para manter a continuidade mensal da inflação
                americana (aplicada tanto ao poder de compra americano quanto ao ajuste mensal do
                US TIPS 10Y).
              </p>
              <p className="leading-relaxed">
                A metodologia de maturidade constante (Damodaran) mede o retorno econômico total de
                manter exposição constante a ~10 anos com marcação a mercado mensal, diferente da
                estratégia de carregar um único título físico sem reinvestimento até o vencimento.
              </p>
              <p className="leading-relaxed">
                Para o <strong>S&amp;P 500 Total Return</strong>, os dividendos americanos são
                reinvestidos integralmente no índice bruto (<span className="font-mono">^SP500TR</span>);
                na prática, investidores não residentes via ETF americano sofrem retenção de 30% na
                fonte sobre dividendos (ou ~15% via ETF irlandês), o que reduziria o retorno
                líquido em ~0,4% a 0,5% ao ano.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
