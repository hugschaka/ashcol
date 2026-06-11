"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function LoginForm({ orgSlug }: { orgSlug: string }) {
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
      const signed = await signIn("credentials", {
        redirect: false,
        email,
        password,
        orgSlug,
      });
      if (signed?.error) {
        setError("המייל או הסיסמא שגויים, או שאינכם רשומים בארגון הזה");
        return;
      }
      const session = await fetch("/api/auth/session").then((r) => r.json());
      const role: string | undefined = session?.user?.role;
      router.push(
        role === "LECTURER" || role === "ADMIN"
          ? `/org/${orgSlug}/dashboard`
          : `/org/${orgSlug}/explore`
      );
      router.refresh();
    } catch {
      setError("משהו השתבש, נסו שוב");
    } finally {
      setSending(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-neutral-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent";

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">מייל</label>
        <input
          type="email"
          required
          dir="ltr"
          className={`${inputCls} text-left`}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">סיסמא</label>
        <input
          type="password"
          required
          dir="ltr"
          className={`${inputCls} text-left`}
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

      <p className="text-center text-sm text-neutral-500">
        עדיין לא רשומים?{" "}
        <Link href={`/org/${orgSlug}/register`} className="text-accent font-medium">
          הרשמה
        </Link>
      </p>
    </form>
  );
}
