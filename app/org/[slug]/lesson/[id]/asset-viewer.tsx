"use client";

import { useState } from "react";

type Asset = { type: string; content: unknown; fileUrl?: string | null };

const TYPE_META: Record<string, { label: string; icon: string }> = {
  PRESENTATION: { label: "מצגת", icon: "📊" },
  QUIZ: { label: "שאלון", icon: "📝" },
  FLASHCARDS: { label: "כרטיסיות", icon: "🃏" },
  INFOGRAPHIC: { label: "אינפוגרפיה", icon: "🎨" },
};

export function AssetViewer({ assets }: { assets: Asset[] }) {
  const [activeType, setActiveType] = useState(assets[0]?.type);
  const active = assets.find((a) => a.type === activeType);

  return (
    <div className="space-y-4">
      <nav className="flex gap-2 flex-wrap">
        {assets.map((asset) => {
          const meta = TYPE_META[asset.type] ?? { label: asset.type, icon: "📄" };
          const isActive = asset.type === activeType;
          return (
            <button
              key={asset.type}
              onClick={() => setActiveType(asset.type)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-accent text-white"
                  : "border border-neutral-300 text-neutral-600 hover:border-accent"
              }`}
            >
              {meta.icon} {meta.label}
            </button>
          );
        })}
      </nav>

      {active && (
        <div className="rounded-2xl border border-neutral-200 p-4">
          <Viewer type={active.type} content={active.content} fileUrl={active.fileUrl} />
        </div>
      )}
    </div>
  );
}

function Viewer({
  type,
  content,
  fileUrl,
}: {
  type: string;
  content: unknown;
  fileUrl?: string | null;
}) {
  // תוצרים שהם קבצים (מ-NotebookLM האמיתי): PDF מוטמע / תמונה
  if (fileUrl) {
    if (type === "INFOGRAPHIC") {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={fileUrl} alt="אינפוגרפיה" className="w-full rounded-xl" />
      );
    }
    if (type === "PRESENTATION") {
      return (
        <div className="space-y-2">
          <object data={fileUrl} type="application/pdf" className="w-full h-[70vh] rounded-xl">
            <p className="text-sm text-neutral-500 p-4">
              הדפדפן לא מציג PDF מוטמע —{" "}
              <a href={fileUrl} target="_blank" rel="noreferrer" className="text-accent underline">
                פתחו את המצגת בחלון חדש
              </a>
            </p>
          </object>
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-sm text-accent underline"
          >
            📎 פתיחה בחלון חדש / הורדה
          </a>
        </div>
      );
    }
  }

  const c = content as Record<string, unknown> | null;
  if (!c || typeof c !== "object") {
    return <p className="text-neutral-400 text-center py-8">אין תוכן להצגה</p>;
  }
  switch (type) {
    case "PRESENTATION":
      return <SlidesViewer c={c} />;
    case "QUIZ":
      return <QuizViewer c={c} />;
    case "FLASHCARDS":
      return <FlashcardsViewer c={c} />;
    case "INFOGRAPHIC":
      return <InfographicViewer c={c} />;
    default:
      return <RawViewer c={c} />;
  }
}

function SlidesViewer({ c }: { c: Record<string, unknown> }) {
  const slides = Array.isArray(c.slides) ? c.slides : [];
  if (slides.length === 0) return <RawViewer c={c} />;
  return (
    <div className="space-y-3">
      {slides.map((slide: { title?: string; bullets?: string[] }, i) => (
        <div key={i} className="rounded-xl bg-neutral-50 p-4">
          <p className="text-xs text-neutral-400 mb-1">
            שקף {i + 1} מתוך {slides.length}
          </p>
          <h3 className="font-bold text-lg">{slide.title}</h3>
          {Array.isArray(slide.bullets) && (
            <ul className="list-disc pr-5 mt-2 space-y-1 text-neutral-700">
              {slide.bullets.map((bullet, j) => (
                <li key={j}>{bullet}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

function QuizViewer({ c }: { c: Record<string, unknown> }) {
  const questions = Array.isArray(c.questions) ? c.questions : [];
  if (questions.length === 0) return <RawViewer c={c} />;
  return (
    <div className="space-y-4">
      {questions.map(
        (
          q: {
            question?: string;
            options?: string[];
            correctIndex?: number;
            explanation?: string;
          },
          i
        ) => (
          <QuizQuestion key={i} index={i} q={q} />
        )
      )}
    </div>
  );
}

function QuizQuestion({
  index,
  q,
}: {
  index: number;
  q: { question?: string; options?: string[]; correctIndex?: number; explanation?: string };
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const answered = selected !== null;

  return (
    <div className="rounded-xl bg-neutral-50 p-4">
      <p className="font-medium mb-3">
        {index + 1}. {q.question}
      </p>
      <div className="space-y-2">
        {(q.options ?? []).map((option, j) => {
          let cls = "border-neutral-300 hover:border-accent";
          if (answered) {
            if (j === q.correctIndex) cls = "border-green-500 bg-green-50 text-green-800";
            else if (j === selected) cls = "border-red-400 bg-red-50 text-red-700";
            else cls = "border-neutral-200 text-neutral-400";
          }
          return (
            <button
              key={j}
              onClick={() => !answered && setSelected(j)}
              disabled={answered}
              className={`block w-full text-right rounded-lg border px-3 py-2 text-sm transition-colors ${cls}`}
            >
              {option}
            </button>
          );
        })}
      </div>
      {answered && q.explanation && (
        <p className="mt-3 text-sm text-neutral-600 bg-white rounded-lg p-3">
          💡 {q.explanation}
        </p>
      )}
    </div>
  );
}

function FlashcardsViewer({ c }: { c: Record<string, unknown> }) {
  const cards = Array.isArray(c.cards) ? c.cards : [];
  if (cards.length === 0) return <RawViewer c={c} />;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {cards.map((card: { front?: string; back?: string }, i) => (
        <Flashcard key={i} front={card.front ?? ""} back={card.back ?? ""} />
      ))}
    </div>
  );
}

function Flashcard({ front, back }: { front: string; back: string }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      onClick={() => setFlipped(!flipped)}
      className={`rounded-xl p-4 min-h-24 text-center flex items-center justify-center transition-colors ${
        flipped
          ? "bg-accent text-white"
          : "bg-neutral-50 hover:bg-neutral-100 border border-neutral-200"
      }`}
    >
      <span className="text-sm">{flipped ? back : front}</span>
    </button>
  );
}

function InfographicViewer({ c }: { c: Record<string, unknown> }) {
  const sections = Array.isArray(c.sections) ? c.sections : [];
  if (sections.length === 0) return <RawViewer c={c} />;
  return (
    <div className="space-y-3">
      {typeof c.title === "string" && (
        <h3 className="text-xl font-bold text-center text-accent">{c.title}</h3>
      )}
      {sections.map(
        (s: { heading?: string; text?: string; items?: string[] }, i) => (
          <div key={i} className="rounded-xl bg-neutral-50 p-4">
            <h4 className="font-bold">{s.heading}</h4>
            {s.text && <p className="text-neutral-700 mt-1">{s.text}</p>}
            {Array.isArray(s.items) && (
              <ul className="list-disc pr-5 mt-1 space-y-0.5 text-neutral-700">
                {s.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        )
      )}
    </div>
  );
}

function RawViewer({ c }: { c: Record<string, unknown> }) {
  return (
    <pre dir="ltr" className="text-xs whitespace-pre-wrap break-all text-neutral-600">
      {JSON.stringify(c, null, 2).slice(0, 3000)}
    </pre>
  );
}
