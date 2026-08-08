import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { getSession } from "@/lib/session";

export default async function HomePage() {
  const session = await getSession();

  return (
    <>
      <SiteHeader userName={session?.user.name} />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 pb-16 pt-8">
        <div className="max-w-2xl animate-[fade-rise_700ms_ease-out]">
          <p className="font-[family-name:var(--font-display)] text-5xl leading-[1.05] tracking-tight text-ink sm:text-6xl">
            SessionNote
          </p>
          <h1 className="mt-5 max-w-xl text-xl text-ink-soft sm:text-2xl">
            Shared campaign notes your whole table can edit—sessions, people,
            places, and the trail between them.
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink-soft/90">
            The GM creates the campaign and invites players with a link. Everyone
            can write session notes. The GM can kick or ban anyone who should not
            stay.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={session ? "/dashboard" : "/signup"}
              className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-paper transition hover:bg-accent-deep"
            >
              {session ? "Open campaigns" : "Start as GM"}
            </Link>
            <Link
              href={session ? "/dashboard" : "/login"}
              className="rounded-lg border border-line px-5 py-2.5 text-sm transition hover:border-accent"
            >
              {session ? "Dashboard" : "Log in"}
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
