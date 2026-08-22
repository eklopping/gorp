"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  FormatButton,
  prefixLines,
  wrapSelection,
} from "@/components/markdown-view";
import {
  getLiveDocSnapshotAction,
  heartbeatLiveDocAction,
  patchLiveDocAction,
  type LiveDocType,
} from "@/lib/live-doc-actions";

type FieldKind = "text" | "date" | "markdown";

type FieldConfig = {
  key: string;
  label: string;
  kind: FieldKind;
  rows?: number;
  required?: boolean;
};

type Props = {
  campaignId: string;
  docType: LiveDocType;
  docId: string;
  initialFields: Record<string, string>;
  initialUpdatedAt: number;
  initialUpdatedByName?: string | null;
  fields: FieldConfig[];
};

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

const SAVE_DEBOUNCE_MS = 900;
const POLL_MS = 4000;

function fieldsEqual(a: Record<string, string>, b: Record<string, string>) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if ((a[key] ?? "") !== (b[key] ?? "")) return false;
  }
  return true;
}

export function LiveDocEditor({
  campaignId,
  docType,
  docId,
  initialFields,
  initialUpdatedAt,
  initialUpdatedByName = null,
  fields,
}: Props) {
  const [values, setValues] = useState(initialFields);
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);
  const [updatedByName, setUpdatedByName] = useState(initialUpdatedByName);
  const [editors, setEditors] = useState<{ userId: string; userName: string }[]>(
    [],
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const valuesRef = useRef(values);
  const updatedAtRef = useRef(updatedAt);
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const editEpochRef = useRef(0);
  const savedEpochRef = useRef(0);
  const debounceRef = useRef<number | null>(null);
  const textRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  valuesRef.current = values;
  updatedAtRef.current = updatedAt;

  const clearDebounce = () => {
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  };

  const scheduleSave = useEffectEvent((delay = SAVE_DEBOUNCE_MS) => {
    clearDebounce();
    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = null;
      void flushSave(false);
    }, delay);
  });

  const flushSave = useEffectEvent(async (force = false) => {
    if (savingRef.current) return;
    if (!dirtyRef.current && !force) return;

    const epochAtStart = editEpochRef.current;
    const patch = { ...valuesRef.current };
    const expectedUpdatedAt = updatedAtRef.current;

    savingRef.current = true;
    setSaveState("saving");
    setMessage(null);

    try {
      let result = await patchLiveDocAction({
        campaignId,
        docType,
        docId,
        expectedUpdatedAt,
        patch,
      });

      // Active editor wins: if someone else saved while we typed, rewrite with our buffer.
      if (result.ok && "conflict" in result && result.conflict) {
        result = await patchLiveDocAction({
          campaignId,
          docType,
          docId,
          expectedUpdatedAt: result.updatedAt,
          patch: valuesRef.current,
          force: true,
        });
      }

      if (!result.ok) {
        setSaveState("error");
        setMessage(result.error);
        return;
      }

      setEditors(result.editors);
      setUpdatedAt(result.updatedAt);
      updatedAtRef.current = result.updatedAt;
      setUpdatedByName(result.updatedByName);

      // Only clear dirty if nothing newer was typed during the request.
      if (editEpochRef.current === epochAtStart) {
        dirtyRef.current = false;
        savedEpochRef.current = epochAtStart;
        setSaveState("saved");
        setMessage(null);
      } else {
        dirtyRef.current = true;
        setSaveState("dirty");
        scheduleSave(400);
      }
    } catch {
      setSaveState("error");
      setMessage("Couldn’t save — retrying…");
      scheduleSave(1200);
    } finally {
      savingRef.current = false;
    }
  });

  const pollRemote = useEffectEvent(async () => {
    if (dirtyRef.current || savingRef.current) return;
    const result = await getLiveDocSnapshotAction({
      campaignId,
      docType,
      docId,
    });
    if (!result.ok) return;
    setEditors(result.editors);
    if (result.updatedAt === updatedAtRef.current) return;
    if (dirtyRef.current || savingRef.current) return;
    if (fieldsEqual(result.fields, valuesRef.current)) {
      setUpdatedAt(result.updatedAt);
      updatedAtRef.current = result.updatedAt;
      setUpdatedByName(result.updatedByName);
      return;
    }

    setValues(result.fields);
    valuesRef.current = result.fields;
    setUpdatedAt(result.updatedAt);
    updatedAtRef.current = result.updatedAt;
    setUpdatedByName(result.updatedByName);
    setSaveState("saved");
    setMessage(
      result.updatedByName
        ? `Updated live from ${result.updatedByName}`
        : "Updated from another editor",
    );
  });

  useEffect(() => {
    const pollTimer = window.setInterval(() => {
      void pollRemote();
    }, POLL_MS);

    const beatTimer = window.setInterval(() => {
      void heartbeatLiveDocAction({ campaignId, docType, docId }).then(
        (result) => {
          if (result.ok) setEditors(result.editors);
        },
      );
    }, 10000);

    void heartbeatLiveDocAction({ campaignId, docType, docId }).then(
      (result) => {
        if (result.ok) setEditors(result.editors);
      },
    );

    return () => {
      window.clearInterval(pollTimer);
      window.clearInterval(beatTimer);
      clearDebounce();
      if (dirtyRef.current) {
        void flushSave(true);
      }
    };
  }, [campaignId, docType, docId]);

  useEffect(() => {
    function onLeave() {
      if (dirtyRef.current) void flushSave(true);
    }
    function onVisibility() {
      if (document.visibilityState === "hidden") onLeave();
    }
    window.addEventListener("beforeunload", onLeave);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("beforeunload", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  function markDirty(next: Record<string, string>) {
    setValues(next);
    valuesRef.current = next;
    dirtyRef.current = true;
    editEpochRef.current += 1;
    setSaveState("dirty");
    setMessage(null);
    scheduleSave();
  }

  function updateField(key: string, value: string) {
    markDirty({ ...valuesRef.current, [key]: value });
  }

  function runFormat(
    key: string,
    transform: (
      value: string,
      start: number,
      end: number,
    ) => { value: string; selectionStart: number; selectionEnd: number },
  ) {
    const node = textRefs.current[key];
    const current = valuesRef.current[key] ?? "";
    const start = node?.selectionStart ?? current.length;
    const end = node?.selectionEnd ?? current.length;
    const result = transform(current, start, end);
    markDirty({ ...valuesRef.current, [key]: result.value });
    requestAnimationFrame(() => {
      const el = textRefs.current[key];
      if (!el) return;
      el.focus();
      el.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  }

  const statusLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "dirty"
        ? "Unsaved changes"
        : saveState === "error"
          ? "Save failed"
          : saveState === "saved"
            ? "All changes saved"
            : "Ready";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-paper-deep/30 px-3 py-2 text-xs">
        <div className="flex flex-wrap items-center gap-2 text-ink-soft">
          <span
            className={`inline-flex h-2 w-2 rounded-full transition-colors ${
              saveState === "error"
                ? "bg-warn"
                : saveState === "dirty" || saveState === "saving"
                  ? "bg-[#c49a55]"
                  : "bg-accent"
            }`}
          />
          <span className="font-medium text-ink">{statusLabel}</span>
          {updatedByName ? <span>· last edit by {updatedByName}</span> : null}
        </div>
        {editors.length > 0 ? (
          <p className="text-ink-soft">
            Also here: {editors.map((editor) => editor.userName).join(", ")}
          </p>
        ) : (
          <p className="text-ink-soft">Only you are viewing this</p>
        )}
      </div>

      {message ? (
        <p
          className={`text-xs ${
            saveState === "error" ? "text-warn" : "text-ink-soft"
          }`}
        >
          {message}
        </p>
      ) : null}

      {fields.map((field) => {
        const value = values[field.key] ?? "";
        if (field.kind === "markdown") {
          return (
            <label key={field.key} className="block text-sm text-ink-soft">
              <span className="font-medium text-ink">{field.label}</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <FormatButton
                  label={<strong>B</strong>}
                  title="Bold"
                  onClick={() =>
                    runFormat(field.key, (v, s, e) =>
                      wrapSelection(v, s, e, "**"),
                    )
                  }
                />
                <FormatButton
                  label={<em>I</em>}
                  title="Italic"
                  onClick={() =>
                    runFormat(field.key, (v, s, e) =>
                      wrapSelection(v, s, e, "_"),
                    )
                  }
                />
                <FormatButton
                  label="H"
                  title="Heading"
                  onClick={() =>
                    runFormat(field.key, (v, s, e) =>
                      prefixLines(v, s, e, "## "),
                    )
                  }
                />
                <FormatButton
                  label="• List"
                  title="Bullet list"
                  onClick={() =>
                    runFormat(field.key, (v, s, e) =>
                      prefixLines(v, s, e, "- "),
                    )
                  }
                />
                <FormatButton
                  label="1. List"
                  title="Numbered list"
                  onClick={() =>
                    runFormat(field.key, (v, s, e) =>
                      prefixLines(v, s, e, "1. "),
                    )
                  }
                />
                <FormatButton
                  label="Link"
                  title="Link"
                  onClick={() =>
                    runFormat(field.key, (v, s, e) => {
                      const selected = v.slice(s, e) || "label";
                      const next =
                        v.slice(0, s) +
                        `[${selected}](https://)` +
                        v.slice(e);
                      return {
                        value: next,
                        selectionStart: s + selected.length + 3,
                        selectionEnd: s + selected.length + 3 + 8,
                      };
                    })
                  }
                />
                <FormatButton
                  label="Quote"
                  title="Quote"
                  onClick={() =>
                    runFormat(field.key, (v, s, e) =>
                      prefixLines(v, s, e, "> "),
                    )
                  }
                />
              </div>
              <textarea
                ref={(node) => {
                  textRefs.current[field.key] = node;
                }}
                value={value}
                rows={field.rows ?? 10}
                onChange={(event) => updateField(field.key, event.target.value)}
                onBlur={() => {
                  if (dirtyRef.current) void flushSave(true);
                }}
                className="mt-1.5 w-full resize-y rounded-lg border border-line bg-paper-deep/40 px-3 py-2 text-ink outline-none transition focus:border-accent focus:bg-paper"
              />
              <span className="mt-1 block text-[11px] text-ink-soft">
                Autosaves after you pause typing · blur also saves
              </span>
            </label>
          );
        }

        return (
          <label key={field.key} className="block text-sm text-ink-soft">
            <span className="font-medium text-ink">{field.label}</span>
            <input
              type={field.kind === "date" ? "date" : "text"}
              required={field.required}
              value={value}
              onChange={(event) => updateField(field.key, event.target.value)}
              onBlur={() => {
                if (dirtyRef.current) void flushSave(true);
              }}
              className="mt-1.5 w-full rounded-lg border border-line bg-paper-deep/40 px-3 py-2 text-ink outline-none transition focus:border-accent focus:bg-paper"
            />
          </label>
        );
      })}

      <button
        type="button"
        disabled={saveState === "saving"}
        onClick={() => {
          dirtyRef.current = true;
          void flushSave(true);
        }}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-paper hover:bg-accent-deep disabled:opacity-50"
      >
        {saveState === "saving" ? "Saving…" : "Save now"}
      </button>
    </div>
  );
}
