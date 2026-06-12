"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
}: {
  lessonId: string;
  asset: AssetForCard;
  disabled: boolean;
}) {
  const router = useRouter();
  const meta = TYPE_META[asset.type] ?? { label: asset.type, icon: "📄" };
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
    <div className="rounded-2xl border border-neutral-200 p-4 space-y-3 flex flex-col">
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
          <span className="rounded-full bg-green-50 text-green-700 px-3 py-1 text-xs font-medium">
            ✓ מאושר
          </span>
        ) : (
          <span className="rounded-full bg-yellow-50 text-yellow-700 px-3 py-1 text-xs font-medium">
            ממתין לאישור
          </span>
        )}
      </header>

      <div className="flex-1 rounded-xl bg-neutral-50 p-3 text-sm max-h-64 overflow-y-auto">
        {asset.fileUrl &&
          (asset.type === "INFOGRAPHIC" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={asset.fileUrl} alt={meta.label} className="rounded-lg w-full mb-2" />
          ) : (
            <a
              href={asset.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="block text-accent underline mb-2"
            >
              📎 פתיחת הקובץ המלא
            </a>
          ))}
        <AssetPreview type={asset.type} content={asset.content} />
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="flex gap-2">
        {!asset.approved && (
          <button
            onClick={approve}
            disabled={busy || disabled}
            className="flex-1 rounded-xl bg-green-600 text-white py-2 text-sm font-medium disabled:opacity-40"
          >
            ✅ אשר
          </button>
        )}
        <button
          onClick={() => setEditOpen(!editOpen)}
          disabled={busy || disabled}
          className="flex-1 rounded-xl border border-neutral-300 py-2 text-sm font-medium disabled:opacity-40"
        >
          ✏️ שלח לעריכה
        </button>
      </div>

      {editOpen && (
        <div className="space-y-2">
          <textarea
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="מה לשנות? לדוגמה: תוסיף עוד שאלות על הנושא השני, תפשט את השפה..."
            className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
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
    </div>
  );
}

/* ---------- תצוגות מקדימות לפי סוג תוצר ---------- */

function AssetPreview({ type, content }: { type: string; content: unknown }) {
  const c = content as Record<string, unknown> | null;
  if (!c || typeof c !== "object") {
    return <p className="text-neutral-400">אין תצוגה מקדימה</p>;
  }

  switch (type) {
    case "PRESENTATION":
      return <PresentationPreview c={c} />;
    case "QUIZ":
      return <QuizPreview c={c} />;
    case "FLASHCARDS":
      return <FlashcardsPreview c={c} />;
    case "INFOGRAPHIC":
      return <InfographicPreview c={c} />;
    default:
      return <RawPreview c={c} />;
  }
}

function PromptDetails({ c }: { c: Record<string, unknown> }) {
  const prompt = c.promptUsed ?? c.editPromptUsed;
  if (typeof prompt !== "string") return null;
  return (
    <details className="mt-2 text-xs text-neutral-400">
      <summary className="cursor-pointer">הפרומפט שנשלח ל-NotebookLM</summary>
      <p className="mt-1 whitespace-pre-wrap">{prompt}</p>
    </details>
  );
}

function PresentationPreview({ c }: { c: Record<string, unknown> }) {
  const slides = Array.isArray(c.slides) ? c.slides : [];
  if (slides.length === 0) return <RawPreview c={c} />;
  return (
    <div className="space-y-2">
      {slides.slice(0, 3).map((slide: { title?: string; bullets?: string[] }, i) => (
        <div key={i} className="rounded-lg bg-white border border-neutral-200 p-2">
          <p className="font-medium">{slide.title ?? `שקף ${i + 1}`}</p>
          {Array.isArray(slide.bullets) && (
            <ul className="list-disc pr-5 text-neutral-600 mt-1">
              {slide.bullets.slice(0, 3).map((b, j) => (
                <li key={j}>{b}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
      {slides.length > 3 && (
        <p className="text-xs text-neutral-400">ועוד {slides.length - 3} שקפים…</p>
      )}
      <PromptDetails c={c} />
    </div>
  );
}

function QuizPreview({ c }: { c: Record<string, unknown> }) {
  const questions = Array.isArray(c.questions) ? c.questions : [];
  if (questions.length === 0) return <RawPreview c={c} />;
  return (
    <div className="space-y-2">
      {questions
        .slice(0, 2)
        .map(
          (
            q: { question?: string; options?: string[]; correctIndex?: number },
            i
          ) => (
            <div key={i} className="rounded-lg bg-white border border-neutral-200 p-2">
              <p className="font-medium">
                {i + 1}. {q.question}
              </p>
              {Array.isArray(q.options) && (
                <ul className="mt-1 space-y-0.5 text-neutral-600">
                  {q.options.map((opt, j) => (
                    <li key={j} className={j === q.correctIndex ? "font-bold text-green-700" : ""}>
                      {j === q.correctIndex ? "✓ " : "· "}
                      {opt}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        )}
      {questions.length > 2 && (
        <p className="text-xs text-neutral-400">ועוד {questions.length - 2} שאלות…</p>
      )}
      <PromptDetails c={c} />
    </div>
  );
}

function FlashcardsPreview({ c }: { c: Record<string, unknown> }) {
  const cards = Array.isArray(c.cards) ? c.cards : [];
  if (cards.length === 0) return <RawPreview c={c} />;
  return (
    <div className="space-y-1.5">
      {cards.slice(0, 4).map((card: { front?: string; back?: string }, i) => (
        <div key={i} className="rounded-lg bg-white border border-neutral-200 p-2 flex gap-2">
          <span className="font-medium shrink-0">{card.front}</span>
          <span className="text-neutral-400 shrink-0">←</span>
          <span className="text-neutral-600">{card.back}</span>
        </div>
      ))}
      {cards.length > 4 && (
        <p className="text-xs text-neutral-400">ועוד {cards.length - 4} כרטיסיות…</p>
      )}
      <PromptDetails c={c} />
    </div>
  );
}

function InfographicPreview({ c }: { c: Record<string, unknown> }) {
  const sections = Array.isArray(c.sections) ? c.sections : [];
  if (sections.length === 0) return <RawPreview c={c} />;
  return (
    <div className="space-y-1.5">
      {sections.map(
        (s: { heading?: string; text?: string; items?: string[] }, i) => (
          <div key={i} className="rounded-lg bg-white border border-neutral-200 p-2">
            <p className="font-medium">{s.heading}</p>
            {s.text && <p className="text-neutral-600">{s.text}</p>}
            {Array.isArray(s.items) && (
              <ul className="list-disc pr-5 text-neutral-600">
                {s.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        )
      )}
      <PromptDetails c={c} />
    </div>
  );
}

function RawPreview({ c }: { c: Record<string, unknown> }) {
  return (
    <pre dir="ltr" className="text-xs whitespace-pre-wrap break-all text-neutral-600">
      {JSON.stringify(c, null, 2).slice(0, 1500)}
    </pre>
  );
}
