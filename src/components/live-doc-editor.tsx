"use client";

import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useTransition,
} from "react";
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

const SAVE_DEBOUNCE_MS = 700;
const POLL_MS = 2500;

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
  const [pending, startTransition] = useTransition();
  const dirtyRef = useRef(false);
  const valuesRef = useRef(values);
  const updatedAtRef = useRef(updatedAt);
  const textRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  valuesRef.current = values;
  updatedAtRef.current = updatedAt;

  function applySnapshot(fieldsNext: Record<string, string>, at: number, by: string | null) {
    setValues(fieldsNext);
    valuesRef.current = fieldsNext;
    setUpdatedAt(at);
    updatedAtRef.current = at;
    setUpdatedByName(by);
    dirtyRef.current = false;
  }

  const saveNow = useEffectEvent(async () => {
    if (!dirtyRef.current) return;
    setSaveState("saving");
    setMessage(null);
    const result = await patchLiveDocAction({
      campaignId,
      docType,
      docId,
      expectedUpdatedAt: updatedAtRef.current,
      patch: valuesRef.current,
    });
    if (!result.ok) {
      setSaveState("error");
      setMessage(result.error);
      return;
    }
    if ("conflict" in result && result.conflict) {
      applySnapshot(result.fields, result.updatedAt, result.updatedByName);
      setEditors(result.editors);
      setSaveState("saved");
      setMessage(result.message);
      return;
    }
    applySnapshot(result.fields, result.updatedAt, result.updatedByName);
    setEditors(result.editors);
    setSaveState("saved");
  });

  const pollRemote = useEffectEvent(async () => {
    if (dirtyRef.current || pending) return;
    const result = await getLiveDocSnapshotAction({
      campaignId,
      docType,
      docId,
    });
    if (!result.ok) return;
    setEditors(result.editors);
    if (result.updatedAt !== updatedAtRef.current) {
      applySnapshot(result.fields, result.updatedAt, result.updatedByName);
      setSaveState("saved");
      setMessage(
        result.updatedByName
          ? `Updated live from ${result.updatedByName}`
          : "Updated from another editor",
      );
    }
  });

  useEffect(() => {
    const saveTimer = window.setInterval(() => {
      if (!dirtyRef.current) return;
      startTransition(() => {
        void saveNow();
      });
    }, SAVE_DEBOUNCE_MS);

    const pollTimer = window.setInterval(() => {
      void pollRemote();
    }, POLL_MS);

    const beatTimer = window.setInterval(() => {
      void heartbeatLiveDocAction({ campaignId, docType, docId }).then(
        (result) => {
          if (result.ok) setEditors(result.editors);
        },
      );
    }, 8000);

    void heartbeatLiveDocAction({ campaignId, docType, docId }).then(
      (result) => {
        if (result.ok) setEditors(result.editors);
      },
    );

    return () => {
      window.clearInterval(saveTimer);
      window.clearInterval(pollTimer);
      window.clearInterval(beatTimer);
      if (dirtyRef.current) {
        void saveNow();
      }
    };
  }, [campaignId, docType, docId]);

  useEffect(() => {
    function onLeave() {
      if (dirtyRef.current) void saveNow();
    }
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, []);

  function markDirty(next: Record<string, string>) {
    setValues(next);
    valuesRef.current = next;
    dirtyRef.current = true;
    setSaveState("dirty");
    setMessage(null);
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
        ? "Editing…"
        : saveState === "error"
          ? "Save failed"
          : saveState === "saved"
            ? "Saved"
            : "Live sync on";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-paper-deep/30 px-3 py-2 text-xs">
        <div className="flex flex-wrap items-center gap-2 text-ink-soft">
          <span
            className={`inline-flex h-2 w-2 rounded-full ${
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
                className="mt-1.5 w-full resize-y rounded-lg border border-line bg-paper-deep/40 px-3 py-2 text-ink outline-none transition focus:border-accent focus:bg-paper"
              />
              <span className="mt-1 block text-[11px] text-ink-soft">
                Markdown formatting · autosaves for the whole table
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
              className="mt-1.5 w-full rounded-lg border border-line bg-paper-deep/40 px-3 py-2 text-ink outline-none transition focus:border-accent focus:bg-paper"
            />
          </label>
        );
      })}

      <button
        type="button"
        disabled={pending || saveState === "saving"}
        onClick={() => {
          dirtyRef.current = true;
          startTransition(() => {
            void saveNow();
          });
        }}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-paper hover:bg-accent-deep disabled:opacity-50"
      >
        {saveState === "saving" ? "Saving…" : "Save now"}
      </button>
    </div>
  );
}
