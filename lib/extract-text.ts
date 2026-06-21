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
      return { text: result.text };
    } catch {
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
