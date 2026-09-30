import { memo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../utils/cn';

/**
 * AI 回复的 Markdown 渲染。
 *
 * react-markdown 默认不解析原始 HTML（没有接 rehype-raw），
 * 所以模型返回的内容不会被当成 HTML 执行，链接也走 v10 内置的 URL 过滤。
 */
const COMPONENTS: Components = {
  p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,

  h1: ({ children }) => (
    <h3 className="mt-3 mb-1.5 text-sm font-semibold text-slate-50 first:mt-0">{children}</h3>
  ),
  h2: ({ children }) => (
    <h3 className="mt-3 mb-1.5 text-sm font-semibold text-slate-50 first:mt-0">{children}</h3>
  ),
  h3: ({ children }) => (
    <h4 className="mt-3 mb-1.5 text-[13px] font-semibold text-slate-50 first:mt-0">{children}</h4>
  ),
  h4: ({ children }) => (
    <h4 className="mt-3 mb-1.5 text-[13px] font-semibold text-slate-50 first:mt-0">{children}</h4>
  ),

  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-4.5">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-4.5">{children}</ol>,
  li: ({ children }) => <li className="marker:text-brand-400/80">{children}</li>,

  strong: ({ children }) => <strong className="font-semibold text-slate-50">{children}</strong>,
  em: ({ children }) => <em className="text-slate-100 italic">{children}</em>,
  del: ({ children }) => <del className="text-slate-500">{children}</del>,

  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-brand-300 underline underline-offset-2 transition hover:text-brand-200"
    >
      {children}
    </a>
  ),

  // 块级代码的外层容器，内层 code 只负责字体
  pre: ({ children }) => (
    <pre className="no-scrollbar my-2 overflow-x-auto rounded-xl border border-brand-400/15 bg-night-950/80 p-3 text-[12px] leading-relaxed">
      {children}
    </pre>
  ),
  code: ({ className, children }) => {
    // v10 去掉了 inline 参数，用有没有 language-xxx 判断是不是围栏代码块
    const isBlock = typeof className === 'string' && className.includes('language-');
    if (isBlock) return <code className={cn('font-mono', className)}>{children}</code>;
    return (
      <code className="rounded bg-night-950/80 px-1 py-0.5 font-mono text-[12px] text-aqua-300">
        {children}
      </code>
    );
  },

  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-brand-400/40 bg-brand-500/5 py-1 pl-3 text-slate-300">
      {children}
    </blockquote>
  ),

  hr: () => <hr className="my-3 border-brand-400/15" />,

  // 表格：外层横向滚动，避免窄屏撑破气泡
  table: ({ children }) => (
    <div className="no-scrollbar my-2 overflow-x-auto rounded-xl border border-brand-400/15">
      <table className="w-full border-collapse text-[12px]">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-brand-400/15 bg-brand-500/10 px-2.5 py-1.5 text-left font-semibold text-brand-200">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-white/5 px-2.5 py-1.5 align-top text-slate-300">{children}</td>
  ),
};

/**
 * memo：流式输出时父组件每个 token 都会重渲染，
 * 已经说完的历史消息靠它跳过重复解析。
 */
export const MarkdownMessage = memo(function MarkdownMessage({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
      {content}
    </ReactMarkdown>
  );
});
