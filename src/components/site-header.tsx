import Image from "next/image";
import Link from "next/link";

export function SiteHeader({
  userName,
}: {
  userName?: string | null;
}) {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
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
          className="h-14 w-auto max-w-[min(100%,22rem)] transition-transform duration-300 group-hover:-translate-y-0.5 sm:h-16 sm:max-w-[26rem] md:h-[4.5rem] md:max-w-[30rem]"
        />
      </Link>
      <nav className="flex shrink-0 items-center gap-3 text-sm">
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
