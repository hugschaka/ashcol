import "./env";
import { prisma } from "./db";
import { handleGenerateLesson } from "./handlers/generate-lesson";

const POLL_INTERVAL_MS = 10_000;
const JOB_TIMEOUT_MS = 10 * 60 * 1000; // 10 דקות לכל job
const MAX_ATTEMPTS = 3;

function log(msg: string) {
  console.log(`[worker ${new Date().toISOString()}] ${msg}`);
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`job עבר את מגבלת הזמן (${ms / 60000} דקות)`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

// claim אטומי: רק מי שהצליח לעדכן PENDING→RUNNING מחזיק את ה-job
async function claimNextJob() {
  const candidate = await prisma.job.findFirst({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!candidate) return null;

  const claimed = await prisma.job.updateMany({
    where: { id: candidate.id, status: "PENDING" },
    data: { status: "RUNNING", attempts: { increment: 1 } },
  });
  if (claimed.count === 0) return null;

  return prisma.job.findUnique({ where: { id: candidate.id } });
}

async function markLessonFailed(payload: unknown, errorMessage: string) {
  const lessonId = (payload as { lessonId?: string })?.lessonId;
  if (!lessonId) return;
  await prisma.lesson
    .update({
      where: { id: lessonId },
      data: { status: "FAILED", errorMessage },
    })
    .catch(() => {});
}

async function processJob(job: NonNullable<Awaited<ReturnType<typeof claimNextJob>>>) {
  log(`job ${job.id} (${job.type}) | ניסיון ${job.attempts}/${MAX_ATTEMPTS}`);
  try {
    switch (job.type) {
      case "generate_lesson":
        await withTimeout(handleGenerateLesson(job.payload), JOB_TIMEOUT_MS);
        break;
      case "edit_asset":
        // ימומש בשלב 6 (Review ועריכות)
        throw new Error("edit_asset עוד לא ממומש");
      default:
        throw new Error(`סוג job לא מוכר: ${job.type}`);
    }

    await prisma.job.update({
      where: { id: job.id },
      data: { status: "DONE", error: null },
    });
    log(`job ${job.id} | ✓ הושלם`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log(`job ${job.id} | ✗ שגיאה: ${message}`);

    if (job.attempts >= MAX_ATTEMPTS) {
      await prisma.job.update({
        where: { id: job.id },
        data: { status: "FAILED", error: message },
      });
      await markLessonFailed(
        job.payload,
        "הייצור נכשל אחרי כמה ניסיונות. אפשר ליצור את השיעור מחדש או לפנות לתמיכה."
      );
      log(`job ${job.id} | סומן FAILED אחרי ${job.attempts} ניסיונות`);
    } else {
      // חוזר לתור לניסיון נוסף
      await prisma.job.update({
        where: { id: job.id },
        data: { status: "PENDING", error: message },
      });
    }
  }
}

async function mainLoop() {
  log(`worker עלה | mode=${process.env.WORKER_MODE ?? "dry_run"} | claude=${process.env.ANTHROPIC_API_KEY ? "yes" : "no (fallback prompts)"}`);
  for (;;) {
    try {
      const job = await claimNextJob();
      if (job) {
        await processJob(job);
        continue; // יש עבודה — לא מחכים
      }
    } catch (err) {
      log(`שגיאת לולאה: ${err instanceof Error ? err.message : err}`);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

mainLoop().catch((err) => {
  console.error("worker קרס:", err);
  process.exit(1);
});
