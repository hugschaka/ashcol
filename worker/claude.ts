import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const promptsSchema = z.object({
  presentation: z.string().describe("פרומפט ליצירת מצגת פשוטה וברורה"),
  quiz: z.string().describe("פרומפט ליצירת שאלון תרגול"),
  flashcards: z.string().describe("פרומפט ליצירת כרטיסיות זיכרון"),
  infographic: z.string().describe("פרומפט ליצירת אינפוגרפיה"),
});

export type AssetPrompts = z.infer<typeof promptsSchema>;

const MODEL = process.env.CLAUDE_MODEL ?? "claude-opus-4-8";
// מספיק לבניית פרומפטים; המקור המלא מועלה ל-NotebookLM בנפרד
const MAX_CONTENT_CHARS = 150_000;

const SYSTEM_PROMPT = `אתה מומחה להפיכת חומרי שיעור אקדמיים לפרומפטים מדויקים עבור NotebookLM.
המרצה העלה תוכן שיעור, והתוכן המלא כבר הועלה כמקור (Source) למחברת NotebookLM.
תפקידך: לנסח 4 פרומפטים בעברית, אחד לכל תוצר, שיופנו ל-NotebookLM וייצרו תוצרי לימוד מעולים.

כללים לכל פרומפט:
- מתבסס אך ורק על המקור שהועלה (לציין זאת מפורשות)
- ספציפי לתוכן: מזכיר את הנושאים המרכזיים, הדגשים והמבנה של השיעור הזה
- מגדיר מבנה תוצר ברור (כמה שקפים/שאלות/כרטיסיות, סגנון, רמת קושי)
- שפה פשוטה וברורה המתאימה לסטודנטים`;

// פרומפטים גנריים כשאין מפתח API — מאפשר לבדוק את הצינור מקצה לקצה
function fallbackPrompts(title: string): AssetPrompts {
  return {
    presentation: `צור מצגת פשוטה וברורה לשיעור "${title}" על בסיס המקור שהועלה בלבד: 10-15 שקפים, כל שקף עם כותרת ו-3-5 נקודות קצרות, פתיחה עם מטרות השיעור וסיום עם סיכום.`,
    quiz: `צור שאלון תרגול לשיעור "${title}" על בסיס המקור שהועלה בלבד: 10 שאלות אמריקאיות עם 4 אפשרויות, תשובה נכונה אחת והסבר קצר לכל שאלה, מדורגות מקל לקשה.`,
    flashcards: `צור כרטיסיות זיכרון לשיעור "${title}" על בסיס המקור שהועלה בלבד: 15-20 כרטיסיות, צד אחד מושג או שאלה קצרה, צד שני הגדרה או תשובה תמציתית.`,
    infographic: `צור אינפוגרפיה מסכמת לשיעור "${title}" על בסיס המקור שהועלה בלבד: הרעיונות המרכזיים בלבד, מאורגנים ויזואלית עם היררכיה ברורה, מינימום טקסט ומקסימום בהירות.`,
  };
}

const TYPE_LABELS_HE: Record<string, string> = {
  PRESENTATION: "מצגת",
  QUIZ: "שאלון",
  FLASHCARDS: "כרטיסיות",
  INFOGRAPHIC: "אינפוגרפיה",
};

// מנסח בקשת עריכה חופשית של מרצה לפרומפט ממוקד לצ'אט של המחברת
export async function buildEditPrompt(
  title: string,
  assetType: string,
  message: string
): Promise<{ prompt: string; usedClaude: boolean }> {
  const label = TYPE_LABELS_HE[assetType] ?? assetType;

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      prompt: `עדכן את ה${label} של השיעור "${title}" לפי הבקשה הבאה: ${message}. שמור על המבנה והסגנון הקיימים, שנה רק את מה שהתבקש, והתבסס אך ורק על המקור שהועלה.`,
      usedClaude: false,
    };
  }

  const client = new Anthropic();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    thinking: { type: "adaptive" },
    system:
      "אתה מתרגם בקשות עריכה של מרצים לפרומפט אחד ממוקד עבור הצ'אט של NotebookLM, שיעדכן תוצר לימודי קיים. הפרומפט חייב: לציין בדיוק מה לשנות ומה להשאיר, לדרוש הסתמכות על המקור שהועלה בלבד, ולשמור על מבנה התוצר. השב עם הפרומפט בלבד, ללא הסברים.",
    messages: [
      {
        role: "user",
        content: `שיעור: "${title}"\nהתוצר לעריכה: ${label}\nבקשת המרצה: ${message}\n\nנסח את הפרומפט לצ'אט של המחברת.`,
      },
    ],
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
  if (!text) throw new Error("Claude לא החזיר פרומפט עריכה");
  return { prompt: text, usedClaude: true };
}

export async function buildNotebookPrompts(
  title: string,
  rawContent: string
): Promise<{ prompts: AssetPrompts; usedClaude: boolean }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { prompts: fallbackPrompts(title), usedClaude: false };
  }

  const client = new Anthropic();
  const content =
    rawContent.length > MAX_CONTENT_CHARS
      ? rawContent.slice(0, MAX_CONTENT_CHARS) + "\n\n[התוכן קוצר לצורך ניסוח הפרומפטים; המקור המלא נמצא במחברת]"
      : rawContent;

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `כותרת השיעור: ${title}\n\nתוכן השיעור:\n${content}\n\nנסח את 4 הפרומפטים עבור NotebookLM.`,
      },
    ],
    output_config: { format: zodOutputFormat(promptsSchema) },
  });

  if (!response.parsed_output) {
    throw new Error("Claude לא החזיר פרומפטים תקינים");
  }
  return { prompts: response.parsed_output, usedClaude: true };
}
