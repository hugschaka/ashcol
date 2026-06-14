"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Credentials } from "@/components/credentials-box";

export function CreateUserForm({
  orgSlug,
  orgName,
  canCreateAdmin,
}: {
  orgSlug: string;
  orgName: string;
  canCreateAdmin: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    role: "LECTURER" as "LECTURER" | "ADMIN",
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ email: string; tempPassword: string } | null>(
    null
  );

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "משהו השתבש");
        return;
      }
      setResult({ email: data.email, tempPassword: data.tempPassword });
      setForm({ displayName: "", email: "", role: "LECTURER" });
      router.refresh();
    } catch {
      setError("משהו השתבש, נסו שוב");
    } finally {
      setSending(false);
    }
  }

  if (result) {
    return (
      <div className="rounded-2xl border border-green-300 bg-green-50/50 p-5 space-y-3">
        <h3 className="font-bold text-green-800">✅ המשתמש נוצר!</h3>
        <p className="text-sm text-neutral-600">
          מסרו את הפרטים למשתמש. בכניסה הראשונה הם יבחרו סיסמה אישית.
        </p>
        <Credentials
          orgName={orgName}
          slug={orgSlug}
          email={result.email}
          password={result.tempPassword}
        />
        <button onClick={() => setResult(null)} className="text-sm text-accent underline">
          הוספת משתמש נוסף
        </button>
      </div>
    );
  }

  const inputCls =
    "w-full rounded-xl border border-neutral-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent";

  return (
    <form onSubmit={submit} className="rounded-2xl border border-neutral-200 p-5 space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">שם מלא</label>
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
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={`${inputCls} text-left`}
          />
        </div>
      </div>
      {canCreateAdmin && (
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">תפקיד</label>
          <select
            value={form.role}
            onChange={(e) =>
              setForm({ ...form, role: e.target.value as "LECTURER" | "ADMIN" })
            }
            className={inputCls}
          >
            <option value="LECTURER">מרצה</option>
            <option value="ADMIN">אדמין</option>
          </select>
        </div>
      )}

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={sending}
        className="w-full rounded-xl bg-accent text-white py-3 font-medium disabled:opacity-40"
      >
        {sending ? "יוצר..." : "יצירת משתמש + סיסמה ראשונית"}
      </button>
    </form>
  );
}
