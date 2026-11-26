import type { ReactNode } from 'react';
import { formatWindowLabel } from '../utils/formatters';

interface ResultExplanationSectionProps {
  windowMonths: number;
  filename: string;
  content: string | null;
  exists: boolean;
  loading: boolean;
  error: string | null;
}

function renderInlineMarkdown(text: string): ReactNode[] {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return tokens.map((token, idx) => {
    if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-slate-900">
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
      return (
        <code
          key={idx}
          className="font-mono tabular-nums text-[13px] bg-slate-100 text-slate-800 px-1.5 py-0.5 border border-slate-200"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    return token;
  });
}

function renderMarkdownBlocks(markdown: string): ReactNode[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    if (trimmed === '---' || trimmed === '***') {
      blocks.push(<hr key={`hr-${i}`} className="border-slate-200 my-5" />);
      i++;
      continue;
    }

    if (trimmed.startsWith('### ')) {
      blocks.push(
        <h4 key={`h4-${i}`} className="text-sm font-semibold text-slate-900 mt-5 mb-2">
          {renderInlineMarkdown(trimmed.slice(4))}
        </h4>,
      );
      i++;
      continue;
    }

    if (trimmed.startsWith('## ')) {
      blocks.push(
        <h3 key={`h3-${i}`} className="text-base font-semibold text-slate-900 mt-6 mb-2.5">
          {renderInlineMarkdown(trimmed.slice(3))}
        </h3>,
      );
      i++;
      continue;
    }

    if (trimmed.startsWith('# ')) {
      blocks.push(
        <h2 key={`h2-${i}`} className="text-lg font-semibold text-slate-900 mb-3">
          {renderInlineMarkdown(trimmed.slice(2))}
        </h2>,
      );
      i++;
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: Array<{ num: string; text: string; bullets: string[] }> = [];
      while (i < lines.length) {
        const cur = lines[i].trim();
        const ordMatch = cur.match(/^(\d+)\.\s+(.*)$/);
        if (ordMatch) {
          items.push({ num: ordMatch[1], text: ordMatch[2], bullets: [] });
          i++;
        } else if (/^[-*]\s+/.test(cur) && items.length > 0) {
          items[items.length - 1].bullets.push(cur.replace(/^[-*]\s+/, ''));
          i++;
        } else if (!cur) {
          const nextNonEmpty = lines.slice(i + 1).find((l) => l.trim().length > 0)?.trim() ?? '';
          if (/^\d+\.\s+/.test(nextNonEmpty)) {
            i++;
            continue;
          }
          break;
        } else {
          break;
        }
      }
      blocks.push(
        <ol key={`ol-${i}`} className="space-y-4 my-3">
          {items.map((item, idx) => (
            <li key={idx} className="text-[15px] leading-relaxed text-slate-700">
              <div className="flex gap-2.5">
                <span className="font-mono tabular-nums text-xs font-semibold text-slate-500 mt-1 shrink-0">
                  {item.num}.
                </span>
                <div className="space-y-2 flex-1">
                  <div>{renderInlineMarkdown(item.text)}</div>
                  {item.bullets.length > 0 && (
                    <ul className="space-y-1.5 pl-4 list-disc marker:text-slate-400">
                      {item.bullets.map((b, bIdx) => (
                        <li key={bIdx} className="text-sm leading-relaxed text-slate-600">
                          {renderInlineMarkdown(b)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const bullets: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        bullets.push(lines[i].trim().replace(/^[-*]\s+/, ''));
        i++;
      }
      blocks.push(
        <ul key={`ul-${i}`} className="space-y-2 my-3 pl-5 list-disc marker:text-slate-400">
          {bullets.map((b, idx) => (
            <li key={idx} className="text-[15px] leading-relaxed text-slate-700">
              {renderInlineMarkdown(b)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    const paraLines: string[] = [];
    while (i < lines.length) {
      const cur = lines[i].trim();
      if (
        !cur ||
        cur.startsWith('#') ||
        cur === '---' ||
        cur === '***' ||
        /^\d+\.\s+/.test(cur) ||
        /^[-*]\s+/.test(cur)
      ) {
        break;
      }
      paraLines.push(cur);
      i++;
    }
    blocks.push(
      <p key={`p-${i}`} className="text-[15px] leading-[1.65] text-slate-700 my-3">
        {renderInlineMarkdown(paraLines.join(' '))}
      </p>,
    );
  }

  return blocks;
}

export function ResultExplanationSection({
  windowMonths,
  filename,
  content,
  exists,
  loading,
  error,
}: ResultExplanationSectionProps) {
  return (
    <section
      aria-label="Explicações do resultado"
      className="border border-slate-200 bg-white p-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Explicações do resultado · {formatWindowLabel(windowMonths)}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Análise econômica lida do arquivo local{' '}
            <code className="font-mono text-slate-700">{filename}</code>
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-6 text-sm text-slate-500">
          Carregando explicações locais...
        </div>
      ) : error ? (
        <div className="py-6 text-sm text-red-700">{error}</div>
      ) : !exists || !content ? (
        <div className="py-6 text-sm text-slate-600 space-y-2 max-w-3xl">
          <p>
            Nenhum arquivo de explicação foi encontrado para a janela de{' '}
            <span className="font-mono tabular-nums">{windowMonths}</span> meses.
          </p>
          <p className="text-xs text-slate-500">
            Para adicionar uma interpretação personalizada a este backtest, crie o arquivo{' '}
            <code className="font-mono bg-slate-100 px-1.5 py-0.5 border border-slate-200 text-slate-800">
              {filename}
            </code>{' '}
            em formato Markdown e clique em <strong>Recarregar CSVs</strong>.
          </p>
        </div>
      ) : (
        <article className="pt-4 max-w-3xl">
          {renderMarkdownBlocks(content)}
        </article>
      )}
    </section>
  );
}
