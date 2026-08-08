"use client";

import { useState, useTransition } from "react";
import {
  deleteVaultItemAction,
  saveVaultItemForSelfAction,
  type VaultItemSnapshot,
} from "@/lib/vault-actions";
import type { SelectedTag } from "@/lib/srr/types";

export type VaultItemView = {
  id: string;
  name: string;
  notes: string;
  profileId: string;
  totalWear: number;
  selected: SelectedTag[];
  tagLabels: string[];
  snapshot: VaultItemSnapshot;
  createdAt: Date;
  createdBy: string;
  creatorName: string;
  copiedFromId: string | null;
  savedByMe: boolean;
};

export function VaultItemList({
  campaignId,
  items,
  currentUserId,
  isGm,
}: {
  campaignId: string;
  items: VaultItemView[];
  currentUserId: string;
  isGm: boolean;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function saveItem(id: string) {
    setMessage(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await saveVaultItemForSelfAction(campaignId, id);
      setPendingId(null);
      if ("error" in result && result.error) {
        setMessage(result.error);
        return;
      }
      if ("alreadySaved" in result && result.alreadySaved) {
        setMessage("Already saved to your vault.");
        return;
      }
      setMessage("Saved a personal copy to the vault.");
    });
  }

  function removeItem(id: string) {
    setMessage(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await deleteVaultItemAction(campaignId, id);
      setPendingId(null);
      if ("error" in result && result.error) {
        setMessage(result.error);
        return;
      }
      setMessage("Removed from vault.");
    });
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        No published items yet. Build one below and publish it for the table.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {message ? <p className="text-xs text-ink-soft">{message}</p> : null}
      <ul className="space-y-3">
        {items.map((item) => {
          const canDelete = isGm || item.createdBy === currentUserId;
          const busy = pending && pendingId === item.id;
          return (
            <li
              key={item.id}
              className="rounded-2xl border border-line bg-paper/70 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-[family-name:var(--font-display)] text-xl">
                    {item.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {item.snapshot.profileName} · Wear {item.totalWear} · by{" "}
                    {item.creatorName}
                    {item.copiedFromId ? " · personal copy" : ""}
                  </p>
                  {item.notes ? (
                    <p className="mt-2 text-sm text-ink-soft">{item.notes}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {!item.copiedFromId && item.createdBy !== currentUserId ? (
                    <button
                      type="button"
                      disabled={busy || item.savedByMe}
                      onClick={() => saveItem(item.id)}
                      className="rounded-lg bg-accent px-3 py-1.5 text-xs text-paper hover:bg-accent-deep disabled:opacity-50"
                    >
                      {item.savedByMe
                        ? "Saved"
                        : busy
                          ? "Saving…"
                          : "Save for myself"}
                    </button>
                  ) : null}
                  {canDelete ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => removeItem(item.id)}
                      className="rounded-lg border border-line px-3 py-1.5 text-xs hover:border-warn hover:text-warn disabled:opacity-50"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <MiniStat
                  label="Market"
                  value={`${item.snapshot.marketValue}c`}
                />
                <MiniStat label="Load" value={`${item.snapshot.load}`} />
                <MiniStat
                  label="Resource"
                  value={`${item.snapshot.tinkerResource}`}
                />
                <MiniStat
                  label="UC clock"
                  value={`${item.snapshot.tinkerSegments}s / ${item.snapshot.tinkerBp}BP`}
                />
              </div>
              {item.tagLabels.length > 0 ? (
                <p className="mt-3 text-xs text-ink-soft">
                  Tags: {item.tagLabels.join(", ")}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-paper-deep/30 px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-[0.14em] text-ink-soft">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  );
}
