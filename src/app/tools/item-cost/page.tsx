import Link from "next/link";
import { ItemCostCalculator } from "@/components/item-cost-calculator";
import { SiteHeader } from "@/components/site-header";
import { getSession } from "@/lib/session";

export default async function ItemCostPage() {
  const session = await getSession();

  return (
    <>
      <SiteHeader userName={session?.user.name} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-ink-soft">
              Tools
            </p>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl tracking-tight">
              Item cost calculator
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-ink-soft">
              Quick SRR gear builder: market coin value, load, and Tinker Unique
              Creation resource + clock estimates. Add custom tags to your local
              repository anytime.
            </p>
          </div>
          <Link
            href={session ? "/dashboard" : "/"}
            className="rounded-lg border border-line px-4 py-2 text-sm hover:border-accent"
          >
            {session ? "Back to campaigns" : "Home"}
          </Link>
        </div>
        <div className="mt-8">
          <ItemCostCalculator />
        </div>
      </main>
    </>
  );
}
