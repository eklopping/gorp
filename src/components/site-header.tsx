import Image from "next/image";
import Link from "next/link";

export function SiteHeader({
  userName,
}: {
  userName?: string | null;
}) {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
      <Link
        href={userName ? "/dashboard" : "/"}
        className="group flex items-center gap-3"
        aria-label="Savage Root home"
      >
        <Image
          src="/savage-root-logo.png"
          alt="Savage Root"
          width={180}
          height={120}
          priority
          className="h-12 w-auto transition-transform duration-300 group-hover:-translate-y-0.5 sm:h-14"
        />
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
