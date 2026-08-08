"use client";

import { useState, useTransition } from "react";
import {
  deleteVaultItemAction,
  saveVaultItemForSelfAction,
  updateVaultItemStatusAction,
  type VaultItemSnapshot,
} from "@/lib/vault-actions";
import type {
  CalculatorMode,
  SelectedTag,
  VaultItemStatus,
} from "@/lib/srr/types";

export type VaultItemView = {
  id: string;
  name: string;
  notes: string;
  profileId: string;
  totalWear: number;
  selected: SelectedTag[];
  tagLabels: string[];
  snapshot: VaultItemSnapshot;
  crafterType: CalculatorMode;
  status: VaultItemStatus;
  creatorUserId: string | null;
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

  function setStatus(id: string, status: VaultItemStatus) {
    setMessage(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await updateVaultItemStatusAction(campaignId, id, status);
      setPendingId(null);
      if ("error" in result && result.error) {
        setMessage(result.error);
        return;
      }
      setMessage(
        status === "finished" ? "Marked finished." : "Marked in progress.",
      );
    });
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        No published items yet. Build one above and publish it for the table.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {message ? <p className="text-xs text-ink-soft">{message}</p> : null}
      <ul className="space-y-3">
        {items.map((item) => {
          const canDelete = isGm || item.createdBy === currentUserId;
          const canStatus =
            isGm ||
            item.createdBy === currentUserId ||
            item.creatorUserId === currentUserId;
          const busy = pending && pendingId === item.id;
          const isTinker = item.crafterType === "tinker";
          return (
            <li
              key={item.id}
              className="rounded-2xl border border-line bg-paper/70 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-[family-name:var(--font-display)] text-xl">
                      {item.name}
                    </h3>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] ${
                        item.status === "finished"
                          ? "bg-accent/15 text-accent-deep"
                          : "border border-line text-ink-soft"
                      }`}
                    >
                      {item.status === "finished" ? "Finished" : "In progress"}
                    </span>
                    <span className="rounded-md border border-line px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-ink-soft">
                      {isTinker ? "Tinker" : "Craftsman"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {item.snapshot.profileName} · Wear {item.totalWear} ·
                    creator {item.creatorName}
                    {item.copiedFromId ? " · personal copy" : ""}
                  </p>
                  {item.notes ? (
                    <p className="mt-2 text-sm text-ink-soft">{item.notes}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {canStatus ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        setStatus(
                          item.id,
                          item.status === "finished"
                            ? "in_progress"
                            : "finished",
                        )
                      }
                      className="rounded-lg border border-line px-3 py-1.5 text-xs hover:border-accent disabled:opacity-50"
                    >
                      {item.status === "finished"
                        ? "Mark in progress"
                        : "Mark finished"}
                    </button>
                  ) : null}
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
                {isTinker ? (
                  <>
                    <MiniStat
                      label="Resource"
                      value={`${item.snapshot.tinkerResource}`}
                    />
                    <MiniStat
                      label="UC clock"
                      value={`${item.snapshot.tinkerSegments}s / ${item.snapshot.tinkerBp}BP`}
                    />
                    <MiniStat
                      label="Market"
                      value={`${item.snapshot.marketValue}c`}
                    />
                    <MiniStat label="Load" value={`${item.snapshot.load}`} />
                  </>
                ) : (
                  <>
                    <MiniStat
                      label="Commission"
                      value={`${item.snapshot.craftsmanCost}c`}
                    />
                    <MiniStat
                      label="Market"
                      value={`${item.snapshot.marketValue}c`}
                    />
                    <MiniStat label="Load" value={`${item.snapshot.load}`} />
                    <MiniStat
                      label="Progress"
                      value={
                        item.status === "finished" ? "Finished" : "In progress"
                      }
                    />
                  </>
                )}
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
