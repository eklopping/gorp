"use client";

import { useRef, useState } from "react";
import {
  FormatButton,
  prefixLines,
  wrapSelection,
} from "@/components/markdown-view";

/** Markdown textarea for create forms (no live sync until the doc exists). */
export function MarkdownField({
  label,
  name,
  defaultValue = "",
  rows = 8,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  rows?: number;
  required?: boolean;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(defaultValue);

  function runFormat(
    transform: (
      value: string,
      start: number,
      end: number,
    ) => { value: string; selectionStart: number; selectionEnd: number },
  ) {
    const node = ref.current;
    const start = node?.selectionStart ?? value.length;
    const end = node?.selectionEnd ?? value.length;
    const result = transform(value, start, end);
    setValue(result.value);
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  }

  return (
    <label className="block text-sm text-ink-soft">
      <span className="font-medium text-ink">{label}</span>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        <FormatButton
          label={<strong>B</strong>}
          title="Bold"
          onClick={() => runFormat((v, s, e) => wrapSelection(v, s, e, "**"))}
        />
        <FormatButton
          label={<em>I</em>}
          title="Italic"
          onClick={() => runFormat((v, s, e) => wrapSelection(v, s, e, "_"))}
        />
        <FormatButton
          label="H"
          title="Heading"
          onClick={() => runFormat((v, s, e) => prefixLines(v, s, e, "## "))}
        />
        <FormatButton
          label="• List"
          title="Bullet list"
          onClick={() => runFormat((v, s, e) => prefixLines(v, s, e, "- "))}
        />
        <FormatButton
          label="Link"
          title="Link"
          onClick={() =>
            runFormat((v, s, e) => {
              const selected = v.slice(s, e) || "label";
              const next = v.slice(0, s) + `[${selected}](https://)` + v.slice(e);
              return {
                value: next,
                selectionStart: s + selected.length + 3,
                selectionEnd: s + selected.length + 3 + 8,
              };
            })
          }
        />
      </div>
      <textarea
        ref={ref}
        name={name}
        required={required}
        value={value}
        placeholder={placeholder}
        rows={rows}
        onChange={(event) => setValue(event.target.value)}
        className="mt-1.5 w-full resize-y rounded-lg border border-line bg-paper-deep/40 px-3 py-2 text-ink outline-none transition focus:border-accent focus:bg-paper"
      />
      <span className="mt-1 block text-[11px] text-ink-soft">
        Supports markdown (bold, lists, links)
      </span>
    </label>
  );
}
