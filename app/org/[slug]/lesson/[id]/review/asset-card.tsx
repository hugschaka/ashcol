"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FullAssetView } from "@/components/asset-view";

export type AssetForCard = {
  id: string;
  type: string;
  version: number;
  approved: boolean;
  content: unknown;
  fileUrl?: string | null;
};

const TYPE_META: Record<string, { label: string; icon: string }> = {
  PRESENTATION: { label: "מצגת", icon: "📊" },
  QUIZ: { label: "שאלון", icon: "📝" },
  FLASHCARDS: { label: "כרטיסיות", icon: "🃏" },
  INFOGRAPHIC: { label: "אינפוגרפיה", icon: "🎨" },
};

export function AssetCard({
  lessonId,
  asset,
  disabled,
  notebookId,
}: {
  lessonId: string;
  asset: AssetForCard;
  disabled: boolean;
  notebookId?: string | null;
}) {
  const router = useRouter();
  const meta = TYPE_META[asset.type] ?? { label: asset.type, icon: "📄" };
  const [modalOpen, setModalOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/assets/${asset.id}/approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "משהו השתבש");
        return;
      }
      router.refresh();
    } catch {
      setError("משהו השתבש, נסו שוב");
    } finally {
      setBusy(false);
    }
  }

  async function sendEdit() {
    if (message.trim().length < 3) {
      setError("כתבו מה לשנות");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/assets/${asset.id}/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "משהו השתבש");
        return;
      }
      setEditOpen(false);
      setMessage("");
      router.refresh();
    } catch {
      setError("משהו השתבש, נסו שוב");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`rounded-2xl border p-4 space-y-3 flex flex-col transition-colors ${
        asset.approved ? "border-green-300 bg-green-50/40" : "border-neutral-200"
      }`}
    >
      <header className="flex items-center justify-between gap-2">
        <h2 className="font-bold">
          {meta.icon} {meta.label}
          {asset.version > 1 && (
            <span className="text-xs text-neutral-400 font-normal mr-2">
              גרסה {asset.version}
            </span>
          )}
        </h2>
        {asset.approved ? (
          <span className="rounded-full bg-green-100 text-green-700 px-3 py-1 text-xs font-medium">
            ✓ מאושר
          </span>
        ) : (
          <span className="rounded-full bg-yellow-50 text-yellow-700 px-3 py-1 text-xs font-medium">
            ממתין לאישור
          </span>
        )}
      </header>

      <Thumbnail asset={asset} meta={meta} onOpen={() => setModalOpen(true)} />

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {/* תוצר מאושר — אין יותר פעולות על הכרטיס */}
      {!asset.approved && (
        <div className="flex gap-2">
          <button
            onClick={approve}
            disabled={busy || disabled}
            className="flex-1 rounded-xl bg-green-600 text-white py-2 text-sm font-medium disabled:opacity-40"
          >
            ✅ אשר
          </button>
          <button
            onClick={() => setEditOpen(!editOpen)}
            disabled={busy || disabled}
            className="flex-1 rounded-xl border border-neutral-300 py-2 text-sm font-medium disabled:opacity-40 bg-white"
          >
            ✏️ שלח לעריכה
          </button>
        </div>
      )}

      {!asset.approved && editOpen && (
        <div className="space-y-2">
          <textarea
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="מה לשנות? לדוגמה: תוסיף עוד שאלות על הנושא השני, תפשט את השפה..."
            className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent bg-white"
            autoFocus
          />
          <button
            onClick={sendEdit}
            disabled={busy || disabled || message.trim().length < 3}
            className="w-full rounded-xl bg-accent text-white py-2 text-sm font-medium disabled:opacity-40"
          >
            {busy ? "שולחים..." : "שליחת בקשת העריכה"}
          </button>
        </div>
      )}

      {modalOpen && (
        <AssetModal
          asset={asset}
          meta={meta}
          notebookId={notebookId}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}

/* ---------- תמונה ממוזערת — לחיצה פותחת תצוגה מלאה ---------- */

function Thumbnail({
  asset,
  meta,
  onOpen,
}: {
  asset: AssetForCard;
  meta: { label: string; icon: string };
  onOpen: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      className="relative block w-full h-44 rounded-xl overflow-hidden border border-neutral-200 bg-white text-right cursor-zoom-in group"
      title="תצוגה מלאה"
    >
      <ThumbnailInner asset={asset} meta={meta} />
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent text-white text-xs px-3 pb-2 pt-6 text-center opacity-90 group-hover:opacity-100">
        🔍 לחיצה לתצוגה מלאה
      </span>
    </button>
  );
}

function ThumbnailInner({
  asset,
  meta,
}: {
  asset: AssetForCard;
  meta: { label: string; icon: string };
}) {
  const c = (asset.content ?? {}) as Record<string, unknown>;

  if (asset.fileUrl && asset.type === "INFOGRAPHIC") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={asset.fileUrl}
        alt={meta.label}
        className="w-full h-full object-cover object-top"
      />
    );
  }

  if (asset.fileUrl && asset.type === "PRESENTATION") {
    return (
      <object
        data={`${asset.fileUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
        type="application/pdf"
        className="w-full h-full pointer-events-none"
        aria-label={meta.label}
      >
        <IconTile icon={meta.icon} label={`${meta.label} (PDF)`} />
      </object>
    );
  }

  if (asset.type === "QUIZ" && Array.isArray(c.questions) && c.questions.length > 0) {
    const first = c.questions[0] as { question?: string };
    return (
      <TextTile
        chip={`${c.questions.length} שאלות`}
        text={first.question ?? ""}
        icon={meta.icon}
      />
    );
  }

  if (asset.type === "FLASHCARDS" && Array.isArray(c.cards) && c.cards.length > 0) {
    const first = c.cards[0] as { front?: string };
    return (
      <TextTile
        chip={`${c.cards.length} כרטיסיות`}
        text={first.front ?? ""}
        icon={meta.icon}
      />
    );
  }

  if (asset.type === "PRESENTATION" && Array.isArray(c.slides) && c.slides.length > 0) {
    const first = c.slides[0] as { title?: string };
    return (
      <TextTile chip={`${c.slides.length} שקפים`} text={first.title ?? ""} icon={meta.icon} />
    );
  }

  return <IconTile icon={meta.icon} label={meta.label} />;
}

function TextTile({ chip, text, icon }: { chip: string; text: string; icon: string }) {
  return (
    <div className="w-full h-full p-4 flex flex-col gap-2 bg-neutral-50">
      <span className="self-start rounded-full bg-accent/10 text-accent px-3 py-1 text-xs font-medium">
        {icon} {chip}
      </span>
      <p className="text-sm text-neutral-700 leading-snug overflow-hidden">{text}</p>
    </div>
  );
}

function IconTile({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-neutral-50">
      <span className="text-4xl">{icon}</span>
      <span className="text-sm text-neutral-500">{label}</span>
    </div>
  );
}

/* ---------- פופאפ תצוגה מלאה ---------- */

function AssetModal({
  asset,
  meta,
  notebookId,
  onClose,
}: {
  asset: AssetForCard;
  meta: { label: string; icon: string };
  notebookId?: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const c = (asset.content ?? {}) as Record<string, unknown>;
  const prompt = c.promptUsed ?? c.editPromptUsed;
  const notebookLink =
    notebookId && !notebookId.startsWith("dry-run")
      ? `https://notebooklm.google.com/notebook/${notebookId}`
      : null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full h-full flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 px-5 py-3 border-b border-neutral-100 shrink-0">
          <h3 className="font-bold">
            {meta.icon} {meta.label}
            {asset.version > 1 && (
              <span className="text-xs text-neutral-400 font-normal mr-2">
                גרסה {asset.version}
              </span>
            )}
          </h3>
          <div className="flex items-center gap-4">
            {notebookLink && (
              <a
                href={notebookLink}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-accent underline"
              >
                🔗 פתיחה ב-NotebookLM
              </a>
            )}
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-700 text-2xl leading-none px-1"
              aria-label="סגירה"
            >
              ✕
            </button>
          </div>
        </header>
        <div className="overflow-y-auto p-5 flex-1">
          <FullAssetView type={asset.type} content={asset.content} fileUrl={asset.fileUrl} />
          {typeof prompt === "string" && (
            <details className="mt-4 text-xs text-neutral-400 border-t border-neutral-100 pt-3">
              <summary className="cursor-pointer">הפרומפט שנשלח ל-NotebookLM</summary>
              <p className="mt-1 whitespace-pre-wrap">{prompt}</p>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
