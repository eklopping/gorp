import Link from "next/link";

export function SiteHeader({
  userName,
}: {
  userName?: string | null;
}) {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
      <Link href={userName ? "/dashboard" : "/"} className="group">
        <p className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-ink transition-transform duration-300 group-hover:-translate-y-0.5">
          SessionNote
        </p>
        <p className="text-xs uppercase tracking-[0.22em] text-ink-soft/70">
          Campaign field journal
        </p>
      </Link>
      <nav className="flex items-center gap-3 text-sm">
        <Link
          href="/tools/item-cost"
          className="rounded-md px-3 py-1.5 transition hover:text-accent-deep"
        >
          Item cost
        </Link>
        {userName ? (
          <>
            <span className="hidden text-ink-soft sm:inline">{userName}</span>
            <Link
              href="/dashboard"
              className="rounded-md border border-line px-3 py-1.5 transition hover:border-accent hover:text-accent-deep"
            >
              Campaigns
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="rounded-md px-3 py-1.5 transition hover:text-accent-deep"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-accent px-3 py-1.5 text-paper transition hover:bg-accent-deep"
            >
              Sign up
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
