"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const INTERESTS = [
  { value: "CONTENT", label: "הרשמה למסלול תוכן למרצים" },
  { value: "PARTNERSHIP", label: "שיתופי פעולה" },
  { value: "AI_INTEGRATION", label: "הטמעת כלי AI ישירות בארגון" },
] as const;

export default function Home() {
  const router = useRouter();
  const [orgName, setOrgName] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leadOpen, setLeadOpen] = useState(false);

  async function checkOrg(e: FormEvent) {
    e.preventDefault();
    const name = orgName.trim().replace(/\s+/g, " ");
    if (!name) return;
    setChecking(true);
    setError(null);
    try {
      const res = await fetch(`/api/orgs/check?name=${encodeURIComponent(name)}`);
      const data = await res.json();
      if (data.exists) {
        router.push(`/org/${data.slug}`);
      } else {
        setLeadOpen(true);
      }
    } catch {
      setError("משהו השתבש, נסו שוב");
    } finally {
      setChecking(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-8 p-6">
      <div className="text-center space-y-3">
        <h1 className="text-5xl font-bold text-accent">אשכול</h1>
        <p className="text-lg text-neutral-600 max-w-md">
          מעלים תוכן שיעור — ומקבלים מצגת, שאלון, כרטיסיות ואינפוגרפיה,
          מוכנים לשיתוף עם הסטודנטים.
        </p>
      </div>

      <form onSubmit={checkOrg} className="w-full max-w-sm space-y-3">
        <label htmlFor="org" className="block text-sm font-medium text-neutral-700">
          שם הארגון שלך
        </label>
        <input
          id="org"
          type="text"
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          placeholder="לדוגמה: מכללת הדגמה"
          className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-accent"
          autoFocus
        />
        <button
          type="submit"
          disabled={checking || !orgName.trim()}
          className="w-full rounded-xl bg-accent text-white py-3 text-lg font-medium disabled:opacity-40 transition-opacity"
        >
          {checking ? "בודקים..." : "כניסה"}
        </button>
        {error && <p className="text-red-600 text-sm">{error}</p>}
      </form>

      <p className="text-sm text-neutral-500">
        כבר יש לכם חשבון?{" "}
        <Link href="/login" className="text-accent font-medium">
          התחברות
        </Link>
      </p>

      {leadOpen && (
        <LeadModal
          initialOrgName={orgName.trim().replace(/\s+/g, " ")}
          onClose={() => setLeadOpen(false)}
        />
      )}
    </main>
  );
}

function LeadModal({
  initialOrgName,
  onClose,
}: {
  initialOrgName: string;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    orgName: initialOrgName,
    domain: "",
    interest: "",
    email: "",
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.interest) {
      setError("בחרו מה תרצו לשמוע מאיתנו");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "משהו השתבש, נסו שוב");
      } else {
        setSent(true);
      }
    } catch {
      setError("משהו השתבש, נסו שוב");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {sent ? (
          <div className="text-center space-y-4 py-6">
            <p className="text-2xl">🙏</p>
            <p className="text-lg font-medium">תודה רבה, נחזור אליכם בהקדם</p>
            <button
              onClick={onClose}
              className="rounded-xl bg-accent text-white px-6 py-2.5 font-medium"
            >
              סגירה
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-bold leading-snug">
              שלום, עדיין לא הספקנו לעבוד עם הארגון הזה, בואו נכיר.
            </h2>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  שם הארגון
                </label>
                <input
                  type="text"
                  required
                  value={form.orgName}
                  onChange={(e) => setForm({ ...form, orgName: e.target.value })}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  תחום
                </label>
                <input
                  type="text"
                  required
                  placeholder="במה הארגון עוסק?"
                  value={form.domain}
                  onChange={(e) => setForm({ ...form, domain: e.target.value })}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <fieldset>
                <legend className="block text-sm font-medium text-neutral-700 mb-2">
                  מה תרצו לשמוע מאיתנו?
                </legend>
                <div className="space-y-2">
                  {INTERESTS.map((opt) => (
                    <label
                      key={opt.value}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="interest"
                        value={opt.value}
                        checked={form.interest === opt.value}
                        onChange={() => setForm({ ...form, interest: opt.value })}
                        className="accent-accent"
                      />
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  מייל
                </label>
                <input
                  type="email"
                  required
                  dir="ltr"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-left focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={sending}
                  className="flex-1 rounded-xl bg-accent text-white py-2.5 font-medium disabled:opacity-40"
                >
                  {sending ? "שולחים..." : "שלח"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-neutral-300 px-5 py-2.5 font-medium"
                >
                  ביטול
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
