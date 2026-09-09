import { notFound } from "next/navigation";
import { TravelTracker } from "@/components/travel-tracker";
import {
  CampaignChrome,
  loadCampaignChrome,
} from "@/components/campaign-chrome";

export default async function TravelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { session, membership, campaign, counts } =
    await loadCampaignChrome(id);

  return (
    <CampaignChrome
      campaignId={id}
      campaignName={campaign.name}
      userName={session.user.name}
      userRole={membership.role}
      active="travel"
      counts={counts}
    >
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 pb-16">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-ink-soft">
            {campaign.name}
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl tracking-tight">
            Travel
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">
            Track Travel Sequences, estimate Drain and Attrition, and price
            beasts and wagons from Savage Root Vol.2.
          </p>
        </div>

        <section className="mt-8">
          <TravelTracker />
        </section>
      </main>
    </CampaignChrome>
  );
}
