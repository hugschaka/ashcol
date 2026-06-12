"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "אדמין",
  LECTURER: "מרצה",
  STUDENT: "סטודנט/ית",
};

export function UserRow({
  orgSlug,
  user,
}: {
  orgSlug: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    deleted: boolean;
    isSelf: boolean;
  };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function patch(body: { role?: string; action?: "delete" | "restore" }) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        user.deleted ? "border-neutral-200 bg-neutral-50 opacity-60" : "border-neutral-200"
      }`}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="font-medium truncate">
            {user.name}
            {user.isSelf && <span className="text-xs text-neutral-400 mr-2">(אתם)</span>}
            {user.deleted && <span className="text-xs text-red-500 mr-2">מחוק</span>}
          </p>
          <p className="text-xs text-neutral-400 truncate" dir="ltr">
            {user.email}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={user.role}
            disabled={busy || user.isSelf || user.deleted}
            onChange={(e) => patch({ role: e.target.value })}
            className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm disabled:opacity-50"
          >
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {!user.isSelf &&
            (user.deleted ? (
              <button
                onClick={() => patch({ action: "restore" })}
                disabled={busy}
                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm disabled:opacity-50"
              >
                שחזור
              </button>
            ) : (
              <button
                onClick={() => {
                  if (confirm(`למחוק את ${user.name}? אפשר לשחזר אחר כך.`)) {
                    patch({ action: "delete" });
                  }
                }}
                disabled={busy}
                className="rounded-lg border border-red-200 text-red-600 px-3 py-1.5 text-sm disabled:opacity-50"
              >
                מחיקה
              </button>
            ))}
        </div>
      </div>
      {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
    </div>
  );
}
