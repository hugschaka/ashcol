import type { AssetPrompts } from "./claude";

export type AssetTypeName = "PRESENTATION" | "QUIZ" | "FLASHCARDS" | "INFOGRAPHIC";

export type GeneratedAsset = {
  type: AssetTypeName;
  content: unknown;
};

export type GenerateArgs = {
  orgSlug: string;
  lecturerId: string;
  lessonTitle: string;
  sourceText: string;
  prompts: AssetPrompts;
  existingNotebookId?: string | null;
};

export type GenerateResult = {
  notebookId: string;
  assets: GeneratedAsset[];
};

// dry_run = תוצרי דמה לבדיקת הצינור; real = notebooklm-py אמיתי (דורש התחברות גוגל)
function workerMode(): "dry_run" | "real" {
  return process.env.WORKER_MODE === "real" ? "real" : "dry_run";
}

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

export type EditAssetArgs = {
  orgSlug: string;
  lecturerId: string;
  lessonTitle: string;
  assetType: AssetTypeName;
  editPrompt: string;
  baseContent: unknown;
  notebookId?: string | null;
};

// עריכת תוצר קיים דרך הצ'אט של המחברת; dry_run מסמן את התוכן הקיים כמעודכן
export async function generateEditedAsset(
  args: EditAssetArgs
): Promise<{ content: unknown }> {
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

  throw new Error(
    "מצב real של NotebookLM עוד לא מחובר — נדרשת התחברות גוגל ל-notebooklm-py. בינתיים השתמשו ב-WORKER_MODE=dry_run"
  );
}

export async function generateLessonAssets(args: GenerateArgs): Promise<GenerateResult> {
  if (workerMode() === "dry_run") {
    return {
      notebookId: args.existingNotebookId ?? `dry-run-${args.orgSlug}-${args.lecturerId}`,
      assets: dryRunAssets(args.lessonTitle, args.prompts),
    };
  }

  // מצב real: גשר ל-notebooklm-py (פייתון) דרך child_process.
  // ימומש כשדניאל יתחבר לחשבון הגוגל — ההתחברות אינטראקטיבית וחד-פעמית.
  throw new Error(
    "מצב real של NotebookLM עוד לא מחובר — נדרשת התחברות גוגל ל-notebooklm-py. בינתיים השתמשו ב-WORKER_MODE=dry_run"
  );
}
