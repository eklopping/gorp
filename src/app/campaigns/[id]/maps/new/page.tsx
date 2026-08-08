import Link from "next/link";
import { CampaignNav } from "@/components/campaign-nav";
import { SiteHeader } from "@/components/site-header";
import { Button, Field, Panel } from "@/components/ui";
import { createMapAction } from "@/lib/entity-actions";
import { requireCampaignMember } from "@/lib/session";

export default async function NewMapPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { session } = await requireCampaignMember(id);

  async function action(formData: FormData) {
    "use server";
    await createMapAction(id, formData);
  }

  return (
    <>
      <SiteHeader userName={session.user.name} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 pb-16">
        <Link
          href={`/campaigns/${id}/maps`}
          className="text-sm text-ink-soft hover:text-accent-deep"
        >
          ← Back to maps
        </Link>
        <CampaignNav campaignId={id} active="maps" />
        <Panel className="mt-4">
          <h1 className="font-[family-name:var(--font-display)] text-3xl">
            Import map
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Upload an image of the region. Players can pin people and places on
            it during or after sessions.
          </p>
          <form action={action} className="mt-5 space-y-4" encType="multipart/form-data">
            <Field
              label="Map name"
              name="name"
              required
              placeholder="Coastal Marches"
            />
            <label className="block text-sm text-ink-soft">
              <span className="font-medium text-ink">Map image</span>
              <input
                type="file"
                name="image"
                required
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="mt-1.5 block w-full text-sm"
              />
            </label>
            <Button>Import map</Button>
          </form>
        </Panel>
      </main>
    </>
  );
}
