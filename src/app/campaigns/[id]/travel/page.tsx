import { notFound } from "next/navigation";
import { CampaignNav } from "@/components/campaign-nav";
import { SiteHeader } from "@/components/site-header";
import { TravelTracker } from "@/components/travel-tracker";
import { getCampaignById } from "@/lib/actions";
import { requireCampaignMember } from "@/lib/session";

export default async function TravelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { session } = await requireCampaignMember(id);
  const campaign = await getCampaignById(id);
  if (!campaign) notFound();

  return (
    <>
      <SiteHeader userName={session.user.name} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-16">
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

        <CampaignNav campaignId={id} active="travel" />

        <section className="mt-8">
          <TravelTracker />
        </section>
      </main>
    </>
  );
}
