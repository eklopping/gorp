import { JoinInviteButton } from "@/components/join-invite-button";
import { SiteHeader } from "@/components/site-header";
import { Panel } from "@/components/ui";
import { db } from "@/lib/db";
import { campaignInvites, campaigns } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { eq } from "drizzle-orm";
import Link from "next/link";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await getSession();

  const [invite] = await db
    .select({
      token: campaignInvites.token,
      revokedAt: campaignInvites.revokedAt,
      expiresAt: campaignInvites.expiresAt,
      campaignId: campaigns.id,
      campaignName: campaigns.name,
      campaignDescription: campaigns.description,
    })
    .from(campaignInvites)
    .innerJoin(campaigns, eq(campaigns.id, campaignInvites.campaignId))
    .where(eq(campaignInvites.token, token))
    .limit(1);

  const invalid =
    !invite ||
    Boolean(invite.revokedAt) ||
    (invite.expiresAt !== null && invite.expiresAt.getTime() < Date.now());

  return (
    <>
      <SiteHeader userName={session?.user.name} />
      <main className="mx-auto flex w-full max-w-lg flex-1 items-center px-6 pb-16">
        <Panel className="w-full">
          {invalid ? (
            <>
              <h1 className="font-[family-name:var(--font-display)] text-3xl">
                Invite unavailable
              </h1>
              <p className="mt-2 text-sm text-ink-soft">
                This invite link is invalid, expired, or was revoked by the GM.
              </p>
              <Link
                href="/dashboard"
                className="mt-5 inline-block text-sm text-accent-deep underline-offset-2 hover:underline"
              >
                Go to dashboard
              </Link>
            </>
          ) : (
            <>
              <p className="text-xs uppercase tracking-[0.2em] text-ink-soft">
                Campaign invite
              </p>
              <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl">
                {invite.campaignName}
              </h1>
              {invite.campaignDescription ? (
                <p className="mt-2 text-sm text-ink-soft">
                  {invite.campaignDescription}
                </p>
              ) : null}

              {!session ? (
                <div className="mt-6 space-y-3 text-sm text-ink-soft">
                  <p>Sign in or create an account to join this campaign.</p>
                  <div className="flex gap-2">
                    <Link
                      href={`/login?next=/invite/${token}`}
                      className="rounded-lg bg-accent px-4 py-2 text-paper hover:bg-accent-deep"
                    >
                      Log in
                    </Link>
                    <Link
                      href={`/signup?next=/invite/${token}`}
                      className="rounded-lg border border-line px-4 py-2 hover:border-accent"
                    >
                      Sign up
                    </Link>
                  </div>
                </div>
              ) : (
                <JoinInviteButton token={token} />
              )}
            </>
          )}
        </Panel>
      </main>
    </>
  );
}
