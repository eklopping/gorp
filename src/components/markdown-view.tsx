"use client";

import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function plainPreview(content: string) {
  return content
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function MarkdownView({
  content,
  className = "",
  clamp,
}: {
  content: string;
  className?: string;
  clamp?: boolean;
}) {
  if (!content.trim()) return null;
  if (clamp) {
    return (
      <p className={`line-clamp-2 text-sm text-ink-soft ${className}`}>
        {plainPreview(content)}
      </p>
    );
  }
  return (
    <div
      className={`markdown-body text-sm leading-relaxed text-ink-soft [&_a]:text-accent-deep [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-line [&_blockquote]:pl-3 [&_blockquote]:italic [&_code]:rounded [&_code]:bg-paper-deep/50 [&_code]:px-1 [&_em]:italic [&_li]:ml-4 [&_ol]:list-decimal [&_p+p]:mt-2 [&_strong]:font-semibold [&_strong]:text-ink [&_ul]:list-disc ${className}`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

export function wrapSelection(
  value: string,
  start: number,
  end: number,
  before: string,
  after: string = before,
) {
  const selected = value.slice(start, end) || "text";
  const next =
    value.slice(0, start) + before + selected + after + value.slice(end);
  return {
    value: next,
    selectionStart: start + before.length,
    selectionEnd: start + before.length + selected.length,
  };
}

export function prefixLines(
  value: string,
  start: number,
  end: number,
  prefix: string,
) {
  const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const lineEndIdx = value.indexOf("\n", end);
  const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
  const block = value.slice(lineStart, lineEnd);
  const nextBlock = block
    .split("\n")
    .map((line) => (line.startsWith(prefix) ? line : `${prefix}${line}`))
    .join("\n");
  const next = value.slice(0, lineStart) + nextBlock + value.slice(lineEnd);
  return {
    value: next,
    selectionStart: lineStart,
    selectionEnd: lineStart + nextBlock.length,
  };
}

export function FormatButton({
  label,
  title,
  onClick,
}: {
  label: ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="rounded-md border border-line px-2 py-1 text-xs font-medium text-ink hover:border-accent hover:text-accent-deep"
    >
      {label}
    </button>
  );
}
