import Link from "next/link";
import { notFound } from "next/navigation";
import { CampaignNav } from "@/components/campaign-nav";
import { SiteHeader } from "@/components/site-header";
import { Button, Field, Panel } from "@/components/ui";
import { listCampaignGameSessions } from "@/lib/actions";
import {
  addEntityAppearanceAction,
  getEntity,
  listEntityAppearances,
  updateEntityAction,
} from "@/lib/entity-actions";
import { deleteEntityAction } from "@/lib/fate-actions";
import { requireCampaignMember } from "@/lib/session";
import { uploadUrl } from "@/lib/upload-url";

export default async function EntityDetailPage({
  params,
}: {
  params: Promise<{ id: string; entityId: string }>;
}) {
  const { id, entityId } = await params;
  const { session } = await requireCampaignMember(id);
  const entity = await getEntity(id, entityId);
  if (!entity) notFound();

  const appearances = await listEntityAppearances(entityId);
  const sessions = await listCampaignGameSessions(id);

  async function saveAction(formData: FormData) {
    "use server";
    await updateEntityAction(id, entityId, formData);
  }

  async function appearanceAction(formData: FormData) {
    "use server";
    await addEntityAppearanceAction(id, entityId, formData);
  }

  async function deleteAction() {
    "use server";
    await deleteEntityAction(id, entityId);
  }

  return (
    <>
      <SiteHeader userName={session.user.name} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-16">
        <Link
          href={`/campaigns/${id}/entities`}
          className="text-sm text-ink-soft hover:text-accent-deep"
        >
          ← Back to ID cards
        </Link>
        <CampaignNav campaignId={id} active="entities" />

        <div className="mt-4 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Panel>
            <div className="flex flex-wrap items-start gap-4">
              <div className="h-28 w-28 overflow-hidden rounded-2xl border border-line bg-paper-deep/50">
                {entity.imagePath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={uploadUrl(entity.imagePath)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-wider text-ink-soft">
                    {entity.type}
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-ink-soft">
                  {entity.type} ID card
                </p>
                <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight">
                  {entity.name}
                </h1>
              </div>
            </div>

            <form
              action={saveAction}
              className="mt-6 space-y-4"
              encType="multipart/form-data"
            >
              <Field label="Name" name="name" required defaultValue={entity.name} />
              <Field label="Role" name="role" defaultValue={entity.role} />
              <Field
                label="Allegiance"
                name="allegiance"
                defaultValue={entity.allegiance}
              />
              <Field
                label="Description"
                name="description"
                as="textarea"
                rows={6}
                defaultValue={entity.description}
              />
              <Field
                label="Items of interest"
                name="itemsOfInterest"
                as="textarea"
                rows={3}
                defaultValue={entity.itemsOfInterest}
              />
              <label className="block text-sm text-ink-soft">
                <span className="font-medium text-ink">Replace portrait</span>
                <input
                  type="file"
                  name="image"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="mt-1.5 block w-full text-sm"
                />
              </label>
                <Button>Save ID card</Button>
              </form>
              <form action={deleteAction} className="mt-4 border-t border-line pt-4">
                <p className="text-xs text-ink-soft">
                  Deleting removes this card from the campaign, maps, and Fate
                  river.
                </p>
                <button
                  type="submit"
                  className="mt-3 rounded-lg border border-warn/40 px-4 py-2 text-sm text-warn hover:bg-warn/10"
                >
                  Delete ID card
                </button>
              </form>
            </Panel>

          <div className="space-y-4">
            <Panel>
              <h2 className="font-[family-name:var(--font-display)] text-2xl">
                Appearances
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                Sessions where this {entity.type} showed up, and map pins if
                placed.
              </p>
              <ul className="mt-4 space-y-3">
                {appearances.length === 0 ? (
                  <li className="text-sm text-ink-soft">No appearances yet.</li>
                ) : (
                  appearances.map((appearance) => (
                    <li
                      key={appearance.id}
                      className="rounded-xl border border-line bg-paper-deep/30 px-3 py-3"
                    >
                      <Link
                        href={`/campaigns/${id}/sessions/${appearance.sessionId}`}
                        className="font-medium hover:text-accent-deep"
                      >
                        {appearance.sessionTitle}
                      </Link>
                      <p className="text-xs text-ink-soft">
                        {appearance.sessionDate || "No date"}
                        {appearance.mapId
                          ? ` · pinned on map`
                          : ""}
                      </p>
                      {appearance.note ? (
                        <p className="mt-1 text-sm text-ink-soft">
                          {appearance.note}
                        </p>
                      ) : null}
                      {appearance.mapId ? (
                        <Link
                          href={`/campaigns/${id}/maps/${appearance.mapId}`}
                          className="mt-2 inline-block text-xs text-accent-deep underline-offset-2 hover:underline"
                        >
                          Open map location
                        </Link>
                      ) : null}
                    </li>
                  ))
                )}
              </ul>
            </Panel>

            <Panel>
              <h2 className="font-[family-name:var(--font-display)] text-2xl">
                Log appearance
              </h2>
              <form action={appearanceAction} className="mt-4 space-y-3">
                <label className="block text-sm">
                  <span className="font-medium">Session</span>
                  <select
                    name="gameSessionId"
                    required
                    className="mt-1.5 w-full rounded-lg border border-line bg-paper-deep/40 px-3 py-2"
                  >
                    <option value="">Select a session</option>
                    {sessions.map((gameSession) => (
                      <option key={gameSession.id} value={gameSession.id}>
                        {gameSession.title}
                        {gameSession.sessionDate
                          ? ` · ${gameSession.sessionDate}`
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <Field
                  label="Note"
                  name="note"
                  as="textarea"
                  rows={3}
                  placeholder="First met after the ferry crossing…"
                />
                <Button>Add appearance</Button>
              </form>
            </Panel>
          </div>
        </div>
      </main>
    </>
  );
}
