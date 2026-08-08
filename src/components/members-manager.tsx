"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  banMemberAction,
  createInviteAction,
  kickMemberAction,
  revokeActiveInviteAction,
} from "@/lib/actions";

type MemberRow = {
  id: string;
  role: "gm" | "player";
  status: "active" | "kicked" | "banned";
  user: {
    id: string;
    name: string;
    email: string;
  };
};

export function MembersManager({
  campaignId,
  isGm,
  members,
  inviteToken,
  origin,
}: {
  campaignId: string;
  isGm: boolean;
  members: MemberRow[];
  inviteToken: string | null;
  origin: string;
}) {
  const router = useRouter();
  const [token, setToken] = useState(inviteToken);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const inviteUrl = useMemo(() => {
    if (!token) return null;
    return `${origin}/invite/${token}`;
  }, [origin, token]);

  return (
    <div className="space-y-8">
      {isGm ? (
        <section className="rounded-2xl border border-line bg-paper/70 p-5">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            Invite link
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Anyone with an account can join as a player using this link. Banned
            players cannot rejoin.
          </p>
          <div className="mt-4 flex flex-col gap-3">
            <code className="overflow-x-auto rounded-lg border border-line bg-paper-deep/50 px-3 py-2 text-xs">
              {inviteUrl ?? "No active invite. Generate one."}
            </code>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!inviteUrl || pending}
                onClick={() => {
                  if (!inviteUrl) return;
                  void navigator.clipboard.writeText(inviteUrl);
                  setMessage("Invite link copied.");
                }}
                className="rounded-lg border border-line px-4 py-2 text-sm hover:border-accent disabled:opacity-50"
              >
                Copy
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await createInviteAction(campaignId);
                    if (result?.token) {
                      setToken(result.token);
                      setMessage(
                        "New invite link created. Previous links no longer work.",
                      );
                      router.refresh();
                    }
                  })
                }
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-paper hover:bg-accent-deep disabled:opacity-60"
              >
                {token ? "Rotate link" : "Create link"}
              </button>
              {token ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await revokeActiveInviteAction(campaignId);
                      setToken(null);
                      setMessage("Invite link revoked.");
                      router.refresh();
                    })
                  }
                  className="rounded-lg border border-warn/40 px-4 py-2 text-sm text-warn hover:bg-warn/10 disabled:opacity-60"
                >
                  Revoke
                </button>
              ) : null}
            </div>
          </div>
          {message ? (
            <p className="mt-3 text-sm text-accent-deep">{message}</p>
          ) : null}
        </section>
      ) : (
        <p className="text-sm text-ink-soft">
          Only the GM can create invite links or remove players.
        </p>
      )}

      <section>
        <h2 className="font-[family-name:var(--font-display)] text-2xl">
          Members
        </h2>
        <ul className="mt-4 space-y-3">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-paper/60 px-4 py-3"
            >
              <div>
                <p className="font-medium">{member.user.name}</p>
                <p className="text-xs text-ink-soft">
                  {member.user.email} · {member.role} · {member.status}
                </p>
              </div>
              {isGm && member.role !== "gm" && member.status === "active" ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    className="rounded-lg border border-line px-3 py-1.5 text-sm hover:border-accent disabled:opacity-60"
                    onClick={() =>
                      startTransition(async () => {
                        await kickMemberAction(campaignId, member.id);
                        setMessage(
                          `${member.user.name} was kicked. They can rejoin with the invite link.`,
                        );
                        router.refresh();
                      })
                    }
                  >
                    Kick
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    className="rounded-lg bg-warn/90 px-3 py-1.5 text-sm text-paper hover:bg-warn disabled:opacity-60"
                    onClick={() =>
                      startTransition(async () => {
                        await banMemberAction(campaignId, member.id);
                        setMessage(
                          `${member.user.name} was banned and cannot rejoin.`,
                        );
                        router.refresh();
                      })
                    }
                  >
                    Ban
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
