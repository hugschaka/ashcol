"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Credentials } from "@/components/credentials-box";

export function CreateOrgForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    slug: "",
    domain: "",
    adminName: "",
    adminEmail: "",
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    orgName: string;
    slug: string;
    adminEmail: string;
    tempPassword: string;
  } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/superadmin/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "משהו השתבש");
        return;
      }
      setResult({
        orgName: data.org.name,
        slug: data.org.slug,
        adminEmail: data.adminEmail,
        tempPassword: data.tempPassword,
      });
      setForm({ name: "", slug: "", domain: "", adminName: "", adminEmail: "" });
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
        <h3 className="font-bold text-green-800">
          ✅ הארגון &quot;{result.orgName}&quot; נוצר!
        </h3>
        <p className="text-sm text-neutral-600">
          מסרו את פרטי הכניסה לאדמין של הארגון. הם ידרשו לבחור סיסמה חדשה בכניסה הראשונה.
        </p>
        <Credentials
          orgName={result.orgName}
          slug={result.slug}
          email={result.adminEmail}
          password={result.tempPassword}
        />
        <button
          onClick={() => setResult(null)}
          className="text-sm text-accent underline"
        >
          הקמת ארגון נוסף
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
          <label className="block text-sm font-medium text-neutral-700 mb-1">שם הארגון</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="מכללת כהלת"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            מזהה באנגלית (לכתובת)
          </label>
          <input
            type="text"
            required
            dir="ltr"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            placeholder="kohelet"
            className={`${inputCls} text-left`}
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">תחום (רשות)</label>
        <input
          type="text"
          value={form.domain}
          onChange={(e) => setForm({ ...form, domain: e.target.value })}
          placeholder="חינוך / הנדסה / מחשבה..."
          className={inputCls}
        />
      </div>
      <hr className="border-neutral-100" />
      <p className="text-sm font-medium text-neutral-700">האדמין הראשון של הארגון:</p>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">שם</label>
          <input
            type="text"
            required
            value={form.adminName}
            onChange={(e) => setForm({ ...form, adminName: e.target.value })}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">מייל</label>
          <input
            type="email"
            required
            dir="ltr"
            value={form.adminEmail}
            onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
            className={`${inputCls} text-left`}
          />
        </div>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={sending}
        className="w-full rounded-xl bg-accent text-white py-3 font-medium disabled:opacity-40"
      >
        {sending ? "מקים..." : "הקמת ארגון + אדמין"}
      </button>
    </form>
  );
}
