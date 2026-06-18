import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { AssetPrompts } from "./claude";

export type AssetTypeName = "PRESENTATION" | "QUIZ" | "FLASHCARDS" | "INFOGRAPHIC";

export type GeneratedAsset = {
  type: AssetTypeName;
  content: unknown;
  fileUrl?: string;
};

export type GenerateArgs = {
  orgSlug: string;
  lecturerId: string;
  lessonId: string;
  lessonTitle: string;
  sourceText: string;
  prompts: AssetPrompts;
  existingNotebookId?: string | null;
};

export type GenerateResult = {
  notebookId: string;
  assets: GeneratedAsset[];
};

export type EditAssetArgs = {
  orgSlug: string;
  lecturerId: string;
  lessonTitle: string;
  assetType: AssetTypeName;
  editPrompt: string;
  baseContent: unknown;
  notebookId?: string | null;
};

// dry_run = תוצרי דמה לבדיקת הצינור; real = notebooklm-py אמיתי (דורש התחברות גוגל)
function workerMode(): "dry_run" | "real" {
  return process.env.WORKER_MODE === "real" ? "real" : "dry_run";
}

/* ---------- גשר לפייתון ---------- */

type BridgeAsset = { type: AssetTypeName; content: unknown; fileName?: string };
type BridgeResult = { notebookId: string; assets: BridgeAsset[]; error?: string };

const BRIDGE_TIMEOUT_MS = 20 * 60 * 1000;

function generatedFilesDir(): string {
  const dir = path.join(process.cwd(), "public", "generated");
  mkdirSync(dir, { recursive: true });
  return dir;
}

function runBridge(payload: Record<string, unknown>): Promise<BridgeResult> {
  return new Promise((resolve, reject) => {
    const bridgePath = path.join(process.cwd(), "worker", "notebooklm_bridge.py");
    const child = spawn("python", [bridgePath], {
      cwd: process.cwd(),
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("notebooklm bridge עבר את מגבלת הזמן"));
    }, BRIDGE_TIMEOUT_MS);

    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => {
      stderr += d;
      // לוגים חיים מהגשר — שקיפות בתהליך שלוקח דקות
      for (const line of String(d).split("\n")) {
        if (line.trim()) console.log(`  [bridge] ${line.trim()}`);
      }
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      try {
        const parsed = JSON.parse(stdout.trim()) as BridgeResult;
        if (parsed.error) {
          reject(new Error(`NotebookLM: ${parsed.error}`));
        } else {
          resolve(parsed);
        }
      } catch {
        reject(
          new Error(
            `notebooklm bridge נכשל (exit ${code}): ${stderr.slice(-400) || "ללא פלט"}`
          )
        );
      }
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

type NotebookQuizOption = { text?: string; isCorrect?: boolean; rationale?: string };
type NotebookQuizQuestion = {
  question?: string;
  hint?: string;
  answerOptions?: NotebookQuizOption[];
};

// ממפה את ה-JSON של NotebookLM למבנה הקנוני שהתצוגות מצפות לו;
// הגולמי נשאר תחת content.notebooklm
export function normalizeContent(type: AssetTypeName, content: unknown): unknown {
  if (!content || typeof content !== "object") return content;
  const c = content as Record<string, unknown>;
  const raw = c.notebooklm;
  if (!raw || typeof raw !== "object") return content;
  const nb = raw as Record<string, unknown>;

  if (type === "QUIZ" && Array.isArray(nb.questions)) {
    const questions = (nb.questions as NotebookQuizQuestion[]).map((q) => {
      const opts = Array.isArray(q.answerOptions) ? q.answerOptions : [];
      // NotebookLM מחזיר את התשובה הנכונה תמיד ראשונה — מערבבים
      const indexed = opts.map((o) => ({
        text: o?.text ?? "",
        wasCorrect: Boolean(o?.isCorrect),
        rationale: o?.rationale,
      }));
      for (let i = indexed.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
      }
      const correctIndex = indexed.findIndex((o) => o.wasCorrect);
      return {
        question: q.question ?? "",
        options: indexed.map((o) => o.text),
        correctIndex: correctIndex >= 0 ? correctIndex : 0,
        explanation:
          (correctIndex >= 0 ? indexed[correctIndex]?.rationale : undefined) ??
          q.hint ??
          "",
      };
    });
    return { ...c, questions };
  }

  if (type === "FLASHCARDS" && Array.isArray(nb.cards)) {
    return { ...c, cards: nb.cards };
  }

  return content;
}

function toGeneratedAsset(asset: BridgeAsset): GeneratedAsset {
  let content = normalizeContent(asset.type, asset.content);
  // קובץ PPTX נוסף (מצגת) → URL ציבורי
  if (content && typeof content === "object" && "pptxFile" in content) {
    const { pptxFile, ...rest } = content as Record<string, unknown>;
    if (typeof pptxFile === "string") {
      content = { ...rest, pptxUrl: `/generated/${pptxFile}` };
    }
  }
  return {
    type: asset.type,
    content,
    fileUrl: asset.fileName ? `/generated/${asset.fileName}` : undefined,
  };
}

/* ---------- dry run ---------- */

function dryRunAssets(lessonTitle: string, prompts: AssetPrompts): GeneratedAsset[] {
  return [
    {
      type: "PRESENTATION",
      content: {
        dryRun: true,
        promptUsed: prompts.presentation,
        slides: [
          { title: `${lessonTitle} — פתיחה`, bullets: ["מטרות השיעור", "מבנה השיעור", "מה נלמד היום"] },
          { title: "נושא מרכזי 1", bullets: ["נקודה ראשונה", "נקודה שנייה", "נקודה שלישית"] },
          { title: "נושא מרכזי 2", bullets: ["נקודה ראשונה", "נקודה שנייה"] },
          { title: "סיכום", bullets: ["עיקרי הדברים", "לקריאה נוספת"] },
        ],
      },
    },
    {
      type: "QUIZ",
      content: {
        dryRun: true,
        promptUsed: prompts.quiz,
        questions: [
          {
            question: `שאלה לדוגמה על ${lessonTitle}?`,
            options: ["תשובה א", "תשובה ב", "תשובה ג", "תשובה ד"],
            correctIndex: 0,
            explanation: "הסבר קצר לתשובה הנכונה",
          },
          {
            question: "שאלה שנייה לדוגמה?",
            options: ["תשובה א", "תשובה ב", "תשובה ג", "תשובה ד"],
            correctIndex: 2,
            explanation: "הסבר קצר",
          },
        ],
      },
    },
    {
      type: "FLASHCARDS",
      content: {
        dryRun: true,
        promptUsed: prompts.flashcards,
        cards: [
          { front: "מושג מרכזי 1", back: "הגדרה תמציתית של המושג" },
          { front: "מושג מרכזי 2", back: "הגדרה תמציתית של המושג" },
          { front: "מושג מרכזי 3", back: "הגדרה תמציתית של המושג" },
        ],
      },
    },
    {
      type: "INFOGRAPHIC",
      content: {
        dryRun: true,
        promptUsed: prompts.infographic,
        title: lessonTitle,
        sections: [
          { heading: "הרעיון המרכזי", text: "תקציר של רעיון השיעור במשפט" },
          { heading: "3 נקודות מפתח", items: ["נקודה 1", "נקודה 2", "נקודה 3"] },
          { heading: "למה זה חשוב", text: "משפט סיכום" },
        ],
      },
    },
  ];
}

/* ---------- API ציבורי של המודול ---------- */

export async function generateLessonAssets(args: GenerateArgs): Promise<GenerateResult> {
  if (workerMode() === "dry_run") {
    return {
      notebookId: args.existingNotebookId ?? `dry-run-${args.orgSlug}-${args.lecturerId}`,
      assets: dryRunAssets(args.lessonTitle, args.prompts),
    };
  }

  const result = await runBridge({
    command: "generate",
    // מחברת נפרדת לכל שיעור — בידוד מלא: מצגת נקייה ותוצרים מבוססים רק על השיעור הזה
    notebookTitle: `${args.orgSlug}-${args.lessonId}`,
    sourceTitle: args.lessonTitle,
    sourceText: args.sourceText,
    prompts: args.prompts,
    filesDir: generatedFilesDir(),
  });

  return {
    notebookId: result.notebookId,
    assets: result.assets.map(toGeneratedAsset),
  };
}

// עריכת תוצר קיים: יצירה מחדש עם הוראות ממוקדות באותה מחברת
export async function generateEditedAsset(
  args: EditAssetArgs
): Promise<{ content: unknown; fileUrl?: string }> {
  if (workerMode() === "dry_run") {
    const base =
      args.baseContent && typeof args.baseContent === "object"
        ? (args.baseContent as Record<string, unknown>)
        : {};
    return {
      content: {
        ...base,
        dryRun: true,
        revisionNote: "גרסה מעודכנת (dry-run) בעקבות בקשת עריכה",
        editPromptUsed: args.editPrompt,
        editedAt: new Date().toISOString(),
      },
    };
  }

  if (!args.notebookId) {
    throw new Error("לשיעור אין מחברת NotebookLM — אי אפשר לערוך לפני ייצור ראשוני");
  }

  const result = await runBridge({
    command: "edit",
    notebookId: args.notebookId,
    assetType: args.assetType,
    prompt: args.editPrompt,
    filesDir: generatedFilesDir(),
  });

  const asset = result.assets[0];
  if (!asset) throw new Error("NotebookLM לא החזיר תוצר");
  const generated = toGeneratedAsset(asset);
  return { content: generated.content, fileUrl: generated.fileUrl };
}
