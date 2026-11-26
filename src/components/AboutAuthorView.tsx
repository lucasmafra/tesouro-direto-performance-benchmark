import { ExternalLink, Mail } from 'lucide-react';

export function AboutAuthorView() {
  return (
    <div className="space-y-6">
      <section className="border border-slate-200 bg-white p-6">
        <div className="pb-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Sobre o autor</h2>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-5 text-[15px] leading-[1.65] text-slate-700">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Lucas Mafra</h3>
              <p className="mt-1 text-xs text-slate-500">
                Engenheiro de Software · Escola Politécnica da Universidade de São Paulo (USP)
              </p>
            </div>

            <p>
              Engenheiro de Software formado pela{' '}
              <strong className="text-slate-900">
                Escola Politécnica da Universidade de São Paulo
              </strong>
              , interessado por investimentos, economia e política. Este projeto reúne coleta
              automatizada de séries oficiais e simulação histórica para avaliar, com transparência
              de premissas, a comparação entre títulos do Tesouro Direto e ativos dolarizados.
            </p>

            <div className="pt-1">
              <a
                href="https://www.linkedin.com/in/lucas-mafra-23b323313/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-slate-900 text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                <span>LinkedIn</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="border border-slate-200 bg-slate-50 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 pb-3 border-b border-slate-200">
                Contato e Contribuições
              </h3>
              <p className="text-sm leading-relaxed text-slate-700">
                Achou um erro na metodologia ou gostaria de contribuir? Entre em contato diretamente
                por e-mail:
              </p>
              <a
                href="mailto:lucas.mafra95@gmail.com"
                className="inline-flex items-center gap-2 font-mono text-xs text-blue-700 hover:text-blue-800 hover:underline break-all"
              >
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span>lucas.mafra95@gmail.com</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
