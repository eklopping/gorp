import Link from "next/link";
import { createCampaignAction, listUserCampaigns } from "@/lib/actions";
import { requireSession } from "@/lib/session";
import { SiteHeader } from "@/components/site-header";
import { Button, Field, Panel } from "@/components/ui";

export default async function DashboardPage() {
  const session = await requireSession();
  const campaigns = await listUserCampaigns(session.user.id);

  return (
    <>
      <SiteHeader userName={session.user.name} />
      <main className="mx-auto grid w-full max-w-5xl flex-1 gap-8 px-6 pb-16 lg:grid-cols-[1.1fr_0.9fr]">
        <section>
          <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight">
            Your campaigns
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            Open a table you belong to, or create one as GM and invite players.{" "}
            <Link href="/tools/item-cost" className="text-accent-deep underline-offset-2 hover:underline">
              Item cost calculator
            </Link>
          </p>

          <div className="mt-6 space-y-3">
            {campaigns.length === 0 ? (
              <Panel>
                <p className="text-sm text-ink-soft">
                  No campaigns yet. Create one to get an invite link for your
                  players.
                </p>
              </Panel>
            ) : (
              campaigns.map((campaign) => (
                <Link
                  key={campaign.id}
                  href={`/campaigns/${campaign.id}`}
                  className="block rounded-2xl border border-line bg-paper/60 px-5 py-4 transition hover:-translate-y-0.5 hover:border-accent"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-[family-name:var(--font-display)] text-2xl">
                        {campaign.name}
                      </h2>
                      {campaign.description ? (
                        <p className="mt-1 line-clamp-2 text-sm text-ink-soft">
                          {campaign.description}
                        </p>
                      ) : null}
                    </div>
                    <span className="rounded-md border border-line px-2 py-1 text-xs uppercase tracking-wider text-ink-soft">
                      {campaign.role}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <Panel className="h-fit">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            New campaign
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            You become the GM. Share the invite link from the members page.
          </p>
          <form action={createCampaignAction} className="mt-5 space-y-4">
            <Field label="Campaign name" name="name" required placeholder="Curse of the Emerald Coast" />
            <Field
              label="Short description"
              name="description"
              as="textarea"
              rows={3}
              placeholder="What this table is about"
            />
            <Button>Create campaign</Button>
          </form>
        </Panel>
      </main>
    </>
  );
}
