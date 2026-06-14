"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { roleHome } from "@/lib/role-home";

// כניסה גלובלית — מייל+סיסמה, המערכת מזהה את הארגון מהמייל
export function GlobalLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setError(null);
    try {
      const signed = await signIn("credentials", { redirect: false, email, password });
      if (signed?.error) {
        setError("המייל או הסיסמה שגויים");
        return;
      }
      const session = await fetch("/api/auth/session").then((r) => r.json());
      const u = session?.user;
      if (!u) {
        setError("משהו השתבש, נסו שוב");
        return;
      }
      // אם נדרשת החלפת סיסמה, ה-middleware יפנה לשם; אחרת ליעד לפי תפקיד
      router.push(
        u.mustChangePassword ? `/org/${u.orgSlug}/change-password` : roleHome(u)
      );
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
        <label className="block text-sm font-medium text-neutral-700 mb-1">מייל</label>
        <input
          type="email"
          required
          dir="ltr"
          className={inputCls}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">סיסמה</label>
        <input
          type="password"
          required
          dir="ltr"
          className={inputCls}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={sending || !email || !password}
        className="w-full rounded-xl bg-accent text-white py-3 font-medium disabled:opacity-40 transition-opacity"
      >
        {sending ? "מתחברים..." : "התחברות"}
      </button>
    </form>
  );
}
