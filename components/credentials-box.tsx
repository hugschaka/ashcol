"use client";

import { useState } from "react";

// מציג פרטי כניסה ראשוניים שהאדמין מוסר למשתמש (מוצג פעם אחת)
export function Credentials({
  orgName,
  slug,
  email,
  password,
}: {
  orgName: string;
  slug: string;
  email: string;
  password: string;
}) {
  const [copied, setCopied] = useState(false);
  const loginUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/org/${slug}/login`
      : `/org/${slug}/login`;

  const fullText = `פרטי כניסה ל${orgName}:
כתובת: ${loginUrl}
שם הארגון: ${orgName}
מייל: ${email}
סיסמה ראשונית: ${password}

(בכניסה הראשונה תתבקש/י לבחור סיסמה אישית)`;

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore
    }
  }

  const Row = ({ label, value }: { label: string; value: string }) => (
    <div className="flex justify-between gap-3 py-1.5 border-b border-neutral-100 last:border-0">
      <span className="text-neutral-500 shrink-0">{label}</span>
      <span className="font-mono text-left break-all" dir="ltr">
        {value}
      </span>
    </div>
  );

  return (
    <div className="rounded-xl bg-white border border-neutral-200 p-4 text-sm space-y-1">
      <Row label="כתובת כניסה" value={loginUrl} />
      <Row label="שם הארגון" value={orgName} />
      <Row label="מייל" value={email} />
      <Row label="סיסמה ראשונית" value={password} />
      <button
        onClick={copyAll}
        className="mt-3 w-full rounded-lg bg-accent text-white py-2 text-sm font-medium"
      >
        {copied ? "✓ הועתק!" : "📋 העתקת כל הפרטים"}
      </button>
    </div>
  );
}
