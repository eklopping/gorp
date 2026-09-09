import {
  CampaignChrome,
  loadCampaignChrome,
} from "@/components/campaign-chrome";
import { RulebookReader } from "@/components/rulebook-reader";
import {
  getActiveRulebook,
  listUserBookmarks,
} from "@/lib/rulebook-actions";

export default async function CampaignRulebookPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ section?: string }>;
}) {
  const { id } = await params;
  const { section } = await searchParams;
  const { session, membership, campaign, counts } =
    await loadCampaignChrome(id);

  const [active, bookmarks] = await Promise.all([
    getActiveRulebook(),
    listUserBookmarks(session.user.id),
  ]);

  return (
    <CampaignChrome
      campaignId={id}
      campaignName={campaign.name}
      userName={session.user.name}
      userRole={membership.role}
      active="rulebook"
      counts={counts}
    >
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 pb-16">
        <RulebookReader
          campaignId={id}
          isGm={membership.role === "gm"}
          bookTitle={active?.book.title ?? null}
          bookVersion={active?.book.version ?? null}
          sections={active?.sections ?? []}
          quickRefs={active?.quickRefs ?? []}
          bookmarks={bookmarks}
          initialSectionId={section ?? null}
        />
      </main>
    </CampaignChrome>
  );
}
