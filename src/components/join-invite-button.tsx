"use client";

import { useState, useTransition } from "react";
import { joinCampaignAction } from "@/lib/actions";

export function JoinInviteButton({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-6 space-y-3">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await joinCampaignAction(token);
            if (result?.error) setError(result.error);
          })
        }
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-paper hover:bg-accent-deep disabled:opacity-60"
      >
        {pending ? "Joining…" : "Join as player"}
      </button>
      {error ? (
        <p className="rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-warn">
          {error}
        </p>
      ) : null}
    </div>
  );
}
