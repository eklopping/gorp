import type { ReactNode } from "react";

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[var(--radius-lg)] border border-line bg-surface/80 p-6 shadow-[var(--shadow-card)] ${className}`}
    >
      {children}
    </section>
  );
}

export function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  placeholder,
  as = "input",
  rows = 5,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  as?: "input" | "textarea";
  rows?: number;
}) {
  const shared =
    "mt-1.5 w-full rounded-[var(--radius-md)] border border-line-strong bg-transparent px-3 py-2 text-text outline-none transition placeholder:text-muted-3 focus:border-accent focus:bg-[var(--accent-tint-04)]";

  return (
    <label className="block text-sm text-text-3">
      <span className="text-text">{label}</span>
      {as === "textarea" ? (
        <textarea
          name={name}
          required={required}
          defaultValue={defaultValue}
          placeholder={placeholder}
          rows={rows}
          className={`${shared} resize-y`}
        />
      ) : (
        <input
          name={name}
          type={type}
          required={required}
          defaultValue={defaultValue}
          placeholder={placeholder}
          className={shared}
        />
      )}
    </label>
  );
}

export function Button({
  children,
  type = "submit",
  variant = "primary",
  className = "",
  formAction,
}: {
  children: ReactNode;
  type?: "submit" | "button";
  variant?: "primary" | "ghost" | "danger";
  className?: string;
  formAction?: (formData: FormData) => void | Promise<void>;
}) {
  const styles =
    variant === "primary"
      ? "border border-[rgba(225,173,102,0.5)] text-accent hover:border-accent-300 hover:bg-[var(--accent-tint-11)]"
      : variant === "danger"
        ? "border border-warn/60 text-warn hover:bg-warn/10"
        : "border border-line text-text-3 hover:border-accent-line hover:text-accent";

  return (
    <button
      type={type}
      formAction={formAction}
      className={`inline-flex items-center justify-center rounded-[var(--radius-md)] px-[13px] py-1.5 text-[12.5px] transition disabled:opacity-45 ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

/** Hairline that stretches between a title and a trailing action. */
export function TitleRule({
  title,
  action,
  meta,
  as: Tag = "h1",
}: {
  title: ReactNode;
  action?: ReactNode;
  meta?: ReactNode;
  as?: "h1" | "h2";
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-0">
        <Tag className="font-[family-name:var(--font-heading)] text-[32px] font-normal leading-tight tracking-tight text-text">
          {title}
        </Tag>
        {meta ? <div className="mt-1 text-[11px] tabular text-muted">{meta}</div> : null}
      </div>
      <div className="mb-2 h-px min-w-[2rem] flex-1 bg-[var(--line)]" />
      {action ? <div className="mb-1 shrink-0">{action}</div> : null}
    </div>
  );
}
