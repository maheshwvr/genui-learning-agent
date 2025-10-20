'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// Types for markdown component props - compatible with ReactMarkdown
interface MarkdownComponentProps {
  children?: React.ReactNode;
}

interface LinkProps extends MarkdownComponentProps {
  href?: string;
}

interface TableCellProps extends MarkdownComponentProps {
  style?: React.CSSProperties;
}

// Variant types for different UI contexts
export type MarkdownVariant = 'chat' | 'lesson';

interface MarkdownRendererProps {
  children: string;
  variant?: MarkdownVariant;
  className?: string;
}

// Consolidated markdown components for different variants
const getMarkdownComponents = (variant: MarkdownVariant) => {
  // Base components used by both variants
  const baseComponents = {
    strong: ({ children }: MarkdownComponentProps) => <strong className="font-semibold">{children}</strong>,
    em: ({ children }: MarkdownComponentProps) => <em className="italic">{children}</em>,
    a: ({ children, href }: LinkProps) => <a href={href} className="text-primary hover:underline">{children}</a>,
  };

  if (variant === 'chat') {
    // Chat variant - more comprehensive styling for full markdown content
    return {
      ...baseComponents,
      h1: ({ children }: MarkdownComponentProps) => <h1 className="text-lg font-bold mt-3 mb-2">{children}</h1>,
      h2: ({ children }: MarkdownComponentProps) => <h2 className="text-base font-semibold mt-2 mb-1">{children}</h2>,
      h3: ({ children }: MarkdownComponentProps) => <h3 className="text-sm font-medium mt-2 mb-1">{children}</h3>,
      h4: ({ children }: MarkdownComponentProps) => <h4 className="text-sm font-medium mt-1 mb-1">{children}</h4>,
      h5: ({ children }: MarkdownComponentProps) => <h5 className="text-sm font-medium mt-1 mb-1">{children}</h5>,
      h6: ({ children }: MarkdownComponentProps) => <h6 className="text-sm font-medium mt-1 mb-1">{children}</h6>,
      p: ({ children }: MarkdownComponentProps) => <p className="text-sm mb-2 last:mb-0">{children}</p>,
      code: ({ children }: MarkdownComponentProps) => <code className="bg-muted-foreground/10 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
      pre: ({ children }: MarkdownComponentProps) => <pre className="bg-muted-foreground/10 p-2 rounded-lg overflow-x-auto text-xs font-mono mb-2 last:mb-0">{children}</pre>,
      ul: ({ children }: MarkdownComponentProps) => <ul className="list-disc pl-4 mb-2 last:mb-0 space-y-1">{children}</ul>,
      ol: ({ children }: MarkdownComponentProps) => <ol className="list-decimal pl-4 mb-2 last:mb-0 space-y-1">{children}</ol>,
      li: ({ children }: MarkdownComponentProps) => <li className="text-sm">{children}</li>,
      blockquote: ({ children }: MarkdownComponentProps) => <blockquote className="border-l-2 border-muted-foreground/30 pl-3 italic my-2 last:mb-0">{children}</blockquote>,
      hr: () => <hr className="border-muted-foreground/20 my-2" />,
      table: ({ children }: MarkdownComponentProps) => <table className="min-w-full border-collapse border border-muted-foreground/20 mb-2 last:mb-0">{children}</table>,
      thead: ({ children }: MarkdownComponentProps) => <thead className="bg-muted/50">{children}</thead>,
      tbody: ({ children }: MarkdownComponentProps) => <tbody>{children}</tbody>,
      tr: ({ children }: MarkdownComponentProps) => <tr className="border-b border-muted-foreground/20">{children}</tr>,
      th: ({ children }: TableCellProps) => <th className="border border-muted-foreground/20 px-2 py-1 text-xs font-medium text-left">{children}</th>,
      td: ({ children }: TableCellProps) => <td className="border border-muted-foreground/20 px-2 py-1 text-xs">{children}</td>,
      a: ({ children, href }: LinkProps) => <a href={href} className="text-primary hover:underline">{children}</a>,
    };
  } else {
    // Lesson variant - compact styling for MCQ, TF, and Flashcard components
    return {
      ...baseComponents,
      h1: ({ children }: MarkdownComponentProps) => <h1 className="text-base font-bold mt-2 mb-1">{children}</h1>,
      h2: ({ children }: MarkdownComponentProps) => <h2 className="text-sm font-semibold mt-2 mb-1">{children}</h2>,
      h3: ({ children }: MarkdownComponentProps) => <h3 className="text-sm font-medium mt-1 mb-1">{children}</h3>,
      p: ({ children }: MarkdownComponentProps) => <p className="text-sm mb-1 last:mb-0">{children}</p>,
      code: ({ children }: MarkdownComponentProps) => <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
      pre: ({ children }: MarkdownComponentProps) => <pre className="bg-muted p-2 rounded text-xs font-mono overflow-x-auto my-1">{children}</pre>,
      ul: ({ children }: MarkdownComponentProps) => <ul className="list-disc pl-4 mb-1 space-y-0.5">{children}</ul>,
      ol: ({ children }: MarkdownComponentProps) => <ol className="list-decimal pl-4 mb-1 space-y-0.5">{children}</ol>,
      li: ({ children }: MarkdownComponentProps) => <li className="text-sm">{children}</li>,
      blockquote: ({ children }: MarkdownComponentProps) => <blockquote className="border-l-2 border-muted-foreground pl-2 italic my-1">{children}</blockquote>,
      a: ({ children, href }: LinkProps) => <a href={href} className="text-primary hover:underline text-sm">{children}</a>,
    };
  }
};

/**
 * Centralized markdown renderer with KaTeX support
 * 
 * Features:
 * - LaTeX math rendering via KaTeX (inline: $...$ and block: $$...$$)
 * - Consistent styling across all lesson components
 * - Two variants: 'chat' for comprehensive markdown, 'lesson' for compact UI
 * - TypeScript support with proper prop types
 * 
 * @param children - Markdown content to render
 * @param variant - 'chat' for full markdown features, 'lesson' for compact lesson content
 * @param className - Additional CSS classes to apply
 */
export function MarkdownRenderer({ 
  children, 
  variant = 'lesson',
  className 
}: MarkdownRendererProps) {
  const components = getMarkdownComponents(variant);
  
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={components}
      className={className}
    >
      {children}
    </ReactMarkdown>
  );
}

// Export component props type for consuming components
export type { MarkdownRendererProps };