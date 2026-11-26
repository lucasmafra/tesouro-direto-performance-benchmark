export function MotivationView() {
  return (
    <div className="space-y-6">
      <section className="border border-slate-200 bg-white p-6">
        <div className="pb-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">
            Motivação do Estudo: Os Dados Sustentam a Tese da Dolarização?
          </h2>
          <p className="mt-1 text-sm text-slate-600 max-w-3xl">
            Contexto econômico por trás desta análise empírica que testa se dolarizar o patrimônio
            realmente supera os títulos do Tesouro Direto ao longo de janelas móveis históricas.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-6 text-[15px] leading-[1.65] text-slate-700">
            <div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">
                1. Um Debate Recorrente em Tempos de Pressão Fiscal e Dólar em Alta
              </h3>
              <p>
                A recomendação de que investidores brasileiros deveriam{' '}
                <strong className="text-slate-900">dolarizar seu patrimônio</strong> retorna ao
                centro do debate financeiro de tempos em tempos — quase sempre acompanhando ciclos de
                estresse macroeconômico, ruído político e desvalorização acelerada do Real.
              </p>
              <p className="mt-3">
                Esse tema ganhou nova força diante das discussões em torno do{' '}
                <strong className="text-slate-900">ajuste fiscal no Brasil</strong> e da forte
                pressão exercida pelo mercado sobre o governo, cenário que impulsionou o dólar para
                patamares recordes e reforçou a percepção popular de que manter recursos em moeda
                local seria uma armadilha estrutural.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">
                2. A Pergunta Central: O Que Mostram os Dados Históricos?
              </h3>
              <p>
                Em momentos de disparada do câmbio, o viés de recência costuma dominar a discussão:
                olha-se para a valorização recente do dólar como se ela garantisse superioridade em
                qualquer horizonte. A motivação deste projeto é testar essa tese de forma fria e
                quantitativa, perguntando:{' '}
                <strong className="text-slate-900">
                  os dados históricos realmente dão suporte à ideia de que o brasileiro deveria
                  dolarizar o patrimônio?
                </strong>
              </p>
              <p className="mt-3">
                Em vez de escolher datas convenientes de início ou fim, o backtest simula{' '}
                <strong className="text-slate-900">todas as janelas móveis possíveis</strong> de 5 e
                10 anos desde dezembro de 2004, medindo o patrimônio líquido final em Reais (nominais
                e reais pelo IPCA) após impostos, taxa de custódia e custos de remessa.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">
                3. O Cabo de Guerra Econômico por Trás da Comparação
              </h3>
              <p>
                Para o investidor residente no Brasil, enviar dinheiro para o exterior coloca duas
                forças econômicas relevantes em sentidos opostos:
              </p>
              <ul className="mt-2.5 space-y-2.5 list-disc pl-5 marker:text-slate-400">
                <li>
                  <strong className="text-slate-900">A favor do Dólar:</strong> proteção contra a
                  depreciação de longo prazo do Real frente à moeda de reserva global, exposição a
                  juros americanos (Treasuries, TIPS e T-Bills) e acesso direto ao mercado acionário
                  dos Estados Unidos (S&amp;P 500 Total Return).
                </li>
                <li>
                  <strong className="text-slate-900">A favor do Tesouro Direto:</strong> o Brasil
                  opera historicamente com uma das maiores taxas de juros reais do mundo (Selic e
                  IPCA+), além de não sofrer fricção de câmbio (IOF de entrada/saída e spread) nem
                  tributação sobre variação cambial na repatriação.
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">
                4. Renda Fixa vs. Renda Fixa e S&amp;P 500 em Separado
              </h3>
              <p>
                Para evitar distorções na comparação, o estudo separa o confronto em dois níveis:
                primeiro, uma disputa simétrica de <strong className="text-slate-900">Renda Fixa (3×3)</strong>{' '}
                colocando os 3 títulos públicos brasileiros (Selic, Prefixado e IPCA+) contra os 3
                equivalentes soberanos americanos (US Treasury 10Y, US TIPS 10Y e US T-Bills 3M);
                em paralelo, acompanha o{' '}
                <strong className="text-slate-900">S&amp;P 500 Total Return</strong> como referência
                de renda variável em dólar, evidenciando o papel do prêmio de risco das ações em
                relação à dívida pública americana.
              </p>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-sm font-semibold text-slate-900 pb-3 border-b border-slate-200">
                Perguntas que o Painel Ajuda a Responder
              </h3>
              <dl className="divide-y divide-slate-200 text-xs mt-2">
                <div className="py-3 space-y-1">
                  <dt className="font-semibold text-slate-900">
                    Em quantas janelas históricas dolarizar na renda fixa venceu o Tesouro Direto?
                  </dt>
                  <dd className="text-slate-600 leading-relaxed">
                    Os cartões principais da Visão Comparativa mostram o percentual exato de vitórias
                    entre Renda Fixa Brasil e Renda Fixa EUA em 5 e 10 anos, junto com o CAGR
                    mediano e médio.
                  </dd>
                </div>
                <div className="py-3 space-y-1">
                  <dt className="font-semibold text-slate-900">
                    O resultado muda se o objetivo for ações americanas (S&amp;P 500)?
                  </dt>
                  <dd className="text-slate-600 leading-relaxed">
                    O cartão separado do S&amp;P 500 Total Return e as séries de retorno permitem
                    comparar o ganho adicional das bolsas americanas frente aos juros brasileiros — e
                    também a magnitude das piores janelas em crises.
                  </dd>
                </div>
                <div className="py-3 space-y-1">
                  <dt className="font-semibold text-slate-900">
                    Qual o peso do câmbio de entrada no resultado?
                  </dt>
                  <dd className="text-slate-600 leading-relaxed">
                    Na Tabela de Coortes e na inspeção mensal de cada coorte é possível verificar como
                    janelas iniciadas com o dólar esticado ou depreciado alteraram drasticamente o
                    vencedor 5 ou 10 anos depois.
                  </dd>
                </div>
                <div className="py-3 space-y-1">
                  <dt className="font-semibold text-slate-900">
                    Os ganhos resistiram à inflação brasileira?
                  </dt>
                  <dd className="text-slate-600 leading-relaxed">
                    O seletor BRL Real (IPCA) desconta a inflação acumulada de cada janela para medir
                    preservação efetiva de poder de compra no Brasil.
                  </dd>
                </div>
              </dl>
            </div>

            <div className="border border-slate-200 bg-white p-5 space-y-2.5 text-xs text-slate-600">
              <h3 className="text-sm font-semibold text-slate-900">
                Escopo e Limites de Interpretação
              </h3>
              <p className="leading-relaxed">
                Este levantamento tem caráter estritamente histórico e educacional: avalia o que
                teria ocorrido com aportes mensais hipotéticos ao longo da série oficial iniciada em{' '}
                <span className="font-mono text-slate-800">2004-12</span>, não constituindo
                recomendação de investimento nem previsão para a trajetória futura do câmbio ou do
                risco fiscal brasileiro.
              </p>
              <p className="leading-relaxed">
                Fatores não financeiros associados à dolarização — como diversificação
                jurisdicional, proteção contra eventos extremos de cauda ou gastos futuros
                diretamente em dólar — ficam fora do escopo puramente numérico em Reais medido aqui.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
