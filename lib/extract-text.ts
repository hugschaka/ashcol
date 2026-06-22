import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// מקבל את שם הקובץ ואת התוכן כ-Buffer (ה-route מפענח base64 ל-Buffer).
export async function extractText(
  fileName: string,
  buffer: Buffer
): Promise<{ text: string } | { error: string }> {
  const name = fileName.toLowerCase();

  if (name.endsWith(".txt") || name.endsWith(".md")) {
    return { text: buffer.toString("utf-8") };
  }

  if (name.endsWith(".pdf")) {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      const text = result.text ?? "";
      // PDF סרוק (תמונה ללא שכבת טקסט): pdf-parse מסמן עמודים ב-"-- N of M --"
      // ומחזיר רק את הסימונים בלי טקסט אמיתי. מסירים אותם ובודקים מה נשאר.
      const meaningful = text
        .replace(/--\s*\d+\s*of\s*\d+\s*--/gi, "")
        .replace(/\s+/g, " ")
        .trim();
      if (meaningful.length < 30) {
        return {
          error:
            "ה-PDF כנראה סרוק (תמונה של דף, בלי טקסט שאפשר להעתיק). " +
            "פתחו אותו, סמנו והעתיקו את הטקסט להדבקה כאן, או העלו קובץ Word/טקסט.",
        };
      }
      return { text };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // לוג לאבחון (stderr → docker logs)
      console.error(`[extract-text] PDF "${fileName}" נכשל: ${msg}`);
      if (/password/i.test(msg)) {
        return { error: "ה-PDF מוגן בסיסמה — הסירו את ההגנה ונסו שוב" };
      }
      return { error: "לא הצלחנו לקרוא את ה-PDF — ודאו שהקובץ תקין" };
    } finally {
      await parser.destroy().catch(() => {});
    }
  }

  if (name.endsWith(".docx")) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return { text: result.value };
    } catch {
      return { error: "לא הצלחנו לקרוא את קובץ ה-Word — ודאו שהקובץ תקין" };
    }
  }

  return { error: "פורמט לא נתמך — אפשר להעלות PDF, DOCX או TXT" };
}
