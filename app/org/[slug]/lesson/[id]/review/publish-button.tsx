"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PublishButton({
  lessonId,
  enabled,
}: {
  lessonId: string;
  enabled: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function publish() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/publish`, { method: "POST" });
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

  return (
    <div className="space-y-2">
      <button
        onClick={publish}
        disabled={!enabled || busy}
        className="w-full rounded-2xl bg-green-600 text-white py-4 text-lg font-bold disabled:opacity-40 transition-opacity"
      >
        {busy ? "מפרסמים..." : "✅ פרסם שיעור"}
      </button>
      {!enabled && (
        <p className="text-center text-sm text-neutral-400">
          אשרו את כל ארבעת התוצרים כדי לפרסם את השיעור לסטודנטים
        </p>
      )}
      {error && <p className="text-center text-red-600 text-sm">{error}</p>}
    </div>
  );
}
