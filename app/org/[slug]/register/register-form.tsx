"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function RegisterForm({ orgSlug }: { orgSlug: string }) {
  const router = useRouter();
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    password: "",
    role: "STUDENT" as "LECTURER" | "STUDENT",
    acceptedTerms: false,
    acceptedCookies: false,
    acceptedUpdates: false,
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    form.acceptedTerms &&
    form.acceptedCookies &&
    form.displayName.trim().length >= 2 &&
    form.email.trim().length > 3 &&
    form.password.length >= 8;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "משהו השתבש, נסו שוב");
        return;
      }
      const signed = await signIn("credentials", {
        redirect: false,
        email: form.email,
        password: form.password,
        orgSlug,
      });
      if (signed?.error) {
        router.push(`/org/${orgSlug}/login`);
        return;
      }
      router.push(
        form.role === "LECTURER"
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
        <label className="block text-sm font-medium text-neutral-700 mb-1">שם תצוגה</label>
        <input
          type="text"
          required
          value={form.displayName}
          onChange={(e) => setForm({ ...form, displayName: e.target.value })}
          className={inputCls}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">מייל</label>
        <input
          type="email"
          required
          dir="ltr"
          className={`${inputCls} text-left`}
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          סיסמא (8 תווים לפחות)
        </label>
        <input
          type="password"
          required
          minLength={8}
          dir="ltr"
          className={`${inputCls} text-left`}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
      </div>

      <fieldset>
        <legend className="block text-sm font-medium text-neutral-700 mb-2">אני נרשמ/ת בתור</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { value: "LECTURER", label: "מרצה" },
              { value: "STUDENT", label: "סטודנט/ית" },
            ] as const
          ).map((opt) => (
            <label
              key={opt.value}
              className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
                form.role === opt.value
                  ? "border-accent bg-accent/5 text-accent font-medium"
                  : "border-neutral-300"
              }`}
            >
              <input
                type="radio"
                name="role"
                className="sr-only"
                checked={form.role === opt.value}
                onChange={() => setForm({ ...form, role: opt.value })}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2 text-sm">
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.acceptedTerms}
            onChange={(e) => setForm({ ...form, acceptedTerms: e.target.checked })}
            className="mt-0.5 accent-accent"
          />
          <span>
            קראתי ואני מסכימ/ה ל<b>תנאי השימוש</b> <span className="text-red-600">*</span>
          </span>
        </label>
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.acceptedCookies}
            onChange={(e) => setForm({ ...form, acceptedCookies: e.target.checked })}
            className="mt-0.5 accent-accent"
          />
          <span>
            אני מאשר/ת שימוש ב<b>קוקיז</b> <span className="text-red-600">*</span>
          </span>
        </label>
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.acceptedUpdates}
            onChange={(e) => setForm({ ...form, acceptedUpdates: e.target.checked })}
            className="mt-0.5 accent-accent"
          />
          <span>אשמח לקבל עדכונים במייל (רשות)</span>
        </label>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={!canSubmit || sending}
        className="w-full rounded-xl bg-accent text-white py-3 font-medium disabled:opacity-40 transition-opacity"
      >
        {sending ? "נרשמים..." : "הרשמה"}
      </button>

      <p className="text-center text-sm text-neutral-500">
        כבר רשומים?{" "}
        <Link href={`/org/${orgSlug}/login`} className="text-accent font-medium">
          התחברות
        </Link>
      </p>
    </form>
  );
}
