import Image from "next/image";
import Link from "next/link";

export function SiteHeader({ userName }: { userName?: string | null }) {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 border-b border-line-soft px-6 py-4">
      <Link
        href={userName ? "/dashboard" : "/"}
        className="group min-w-0 shrink"
        aria-label="Savage Root home"
      >
        <Image
          src="/savage-root-logo.png"
          alt="Savage Root"
          width={681}
          height={155}
          priority
          className="h-[30px] w-auto max-w-[min(100%,18rem)] sm:h-9"
        />
      </Link>
      <nav className="flex shrink-0 items-center gap-3 text-[12.5px]">
        {userName ? (
          <>
            <span className="hidden text-muted sm:inline">{userName}</span>
            <Link
              href="/dashboard"
              className="rounded-[var(--radius-md)] border border-line px-3 py-1.5 text-text-3 transition hover:border-accent-line hover:text-accent"
            >
              Campaigns
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="rounded-[var(--radius-md)] px-3 py-1.5 text-text-3 transition hover:text-accent"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-[var(--radius-md)] border border-[rgba(225,173,102,0.5)] px-3 py-1.5 text-accent transition hover:border-accent-300 hover:bg-[var(--accent-tint-11)]"
            >
              Sign up
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
