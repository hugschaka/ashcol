"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MIN_CONTENT = 100;

// ממיר קובץ ל-base64 (בלי קידומת ה-data URL)
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("read error"));
    reader.readAsDataURL(file);
  });
}

export function NewLessonForm({ orgSlug }: { orgSlug: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileTooBig = !!file && file.size > MAX_FILE_SIZE;
  const contentChars = content.trim().length;
  const canSubmit =
    title.trim().length >= 2 &&
    !fileTooBig &&
    (contentChars >= MIN_CONTENT || !!file) &&
    !sending;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSending(true);
    setError(null);
    try {
      // שולחים כ-JSON (קובץ כ-base64) ולא multipart — Next מיירט
      // multipart-עם-קובץ כ-Server Action ומנתק את החיבור.
      const payload: {
        title: string;
        content: string;
        fileName?: string;
        fileBase64?: string;
      } = { title: title.trim(), content };
      if (file) {
        payload.fileName = file.name;
        payload.fileBase64 = await fileToBase64(file);
      }

      const res = await fetch(`/api/orgs/${orgSlug}/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "משהו השתבש, נסו שוב");
        return;
      }
      router.push(`/org/${orgSlug}/dashboard?created=1`);
    } catch {
      setError("משהו השתבש, נסו שוב");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          כותרת השיעור
        </label>
        <input
          type="text"
          required
          maxLength={150}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="לדוגמה: מבוא לכלכלה התנהגותית"
          className="w-full rounded-xl border border-neutral-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent"
          autoFocus
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          תוכן השיעור
        </label>
        <textarea
          rows={12}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="הדביקו כאן את חומר השיעור — סיכומים, הרצאה כתובה, ראשי פרקים מורחבים..."
          className="w-full rounded-xl border border-neutral-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent resize-y"
        />
        <p
          className={`text-xs mt-1 ${
            contentChars >= MIN_CONTENT || file ? "text-neutral-400" : "text-amber-600"
          }`}
        >
          {contentChars >= MIN_CONTENT || file
            ? `${contentChars.toLocaleString()} תווים`
            : `${contentChars}/${MIN_CONTENT} תווים לפחות (או צירוף קובץ)`}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          או העלאת קובץ (PDF / DOCX / TXT, עד 10MB)
        </label>
        <input
          type="file"
          accept=".pdf,.docx,.txt,.md"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-neutral-600 file:ml-3 file:rounded-lg file:border-0 file:bg-accent/10 file:text-accent file:px-4 file:py-2 file:font-medium file:cursor-pointer"
        />
        {file && (
          <p className={`text-xs mt-1 ${fileTooBig ? "text-red-600" : "text-neutral-400"}`}>
            {file.name} ({(file.size / 1024 / 1024).toFixed(1)}MB)
            {fileTooBig && " — גדול מדי, המגבלה היא 10MB"}
          </p>
        )}
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-xl bg-accent text-white py-3 text-lg font-medium disabled:opacity-40 transition-opacity"
      >
        {sending ? "יוצרים שיעור..." : "צור שיעור"}
      </button>
      <p className="text-center text-xs text-neutral-400">
        אחרי היצירה השיעור יעבור עיבוד אוטומטי שלוקח כמה דקות
      </p>
    </form>
  );
}
