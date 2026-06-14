"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function ChangePasswordForm({
  orgSlug,
  home,
}: {
  orgSlug: string;
  home: string;
}) {
  const router = useRouter();
  const { update } = useSession();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    newPassword.length >= 8 && newPassword === confirmPassword && !sending;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError("הסיסמה חייבת להיות באורך 8 תווים לפחות");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("הסיסמאות אינן תואמות");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "משהו השתבש");
        return;
      }
      // מרעננים את ה-session כדי שהדגל mustChangePassword יתעדכן בלי re-login
      await update({ mustChangePassword: false });
      router.push(home);
      router.refresh();
    } catch {
      setError("משהו השתבש, נסו שוב");
    } finally {
      setSending(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-left focus:outline-none focus:ring-2 focus:ring-accent";

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          סיסמה חדשה (8 תווים לפחות)
        </label>
        <input
          type="password"
          required
          minLength={8}
          dir="ltr"
          className={inputCls}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoFocus
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          הזן שוב את הסיסמה החדשה
        </label>
        <input
          type="password"
          required
          dir="ltr"
          className={inputCls}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        {confirmPassword.length > 0 && newPassword !== confirmPassword && (
          <p className="text-amber-600 text-xs mt-1">הסיסמאות עדיין לא תואמות</p>
        )}
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-xl bg-accent text-white py-3 font-medium disabled:opacity-40 transition-opacity"
      >
        {sending ? "שומרים..." : "שמירת הסיסמה והמשך"}
      </button>
    </form>
  );
}
