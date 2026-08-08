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
      className={`rounded-2xl border border-line bg-paper/70 p-6 shadow-[0_20px_60px_-40px_rgba(20,32,28,0.55)] backdrop-blur-sm ${className}`}
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
    "mt-1.5 w-full rounded-lg border border-line bg-paper-deep/40 px-3 py-2 text-ink outline-none transition focus:border-accent focus:bg-paper";

  return (
    <label className="block text-sm text-ink-soft">
      <span className="font-medium text-ink">{label}</span>
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
      ? "bg-accent text-paper hover:bg-accent-deep"
      : variant === "danger"
        ? "bg-warn/90 text-paper hover:bg-warn"
        : "border border-line hover:border-accent hover:text-accent-deep";

  return (
    <button
      type={type}
      formAction={formAction}
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition ${styles} ${className}`}
    >
      {children}
    </button>
  );
}
