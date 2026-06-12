// תיקון חד-פעמי: נרמול content של תוצרי QUIZ/FLASHCARDS שנשמרו לפני הוספת הממפה
const { Client } = require("pg");

function normalize(type, content) {
  if (!content || typeof content !== "object") return null;
  const raw = content.notebooklm;
  if (!raw || typeof raw !== "object") return null;

  if (type === "QUIZ" && Array.isArray(raw.questions)) {
    const questions = raw.questions.map((q) => {
      const opts = Array.isArray(q.answerOptions) ? q.answerOptions : [];
      const correctIndex = opts.findIndex((o) => o && o.isCorrect);
      return {
        question: q.question ?? "",
        options: opts.map((o) => (o && o.text) || ""),
        correctIndex: correctIndex >= 0 ? correctIndex : 0,
        explanation:
          (correctIndex >= 0 && opts[correctIndex].rationale) || q.hint || "",
      };
    });
    return { ...content, questions };
  }
  if (type === "FLASHCARDS" && Array.isArray(raw.cards)) {
    return { ...content, cards: raw.cards };
  }
  return null;
}

(async () => {
  const c = new Client({
    connectionString:
      "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable",
  });
  await c.connect();
  const rows = await c.query(
    `select id, type, content from "LessonAsset" where type in ('QUIZ','FLASHCARDS')`
  );
  let fixed = 0;
  for (const row of rows.rows) {
    // מדלגים על מה שכבר תקין (יש questions/cards ברמה העליונה)
    const has =
      row.type === "QUIZ"
        ? Array.isArray(row.content?.questions)
        : Array.isArray(row.content?.cards);
    if (has) continue;
    const next = normalize(row.type, row.content);
    if (!next) continue;
    await c.query(`update "LessonAsset" set content = $1 where id = $2`, [
      JSON.stringify(next),
      row.id,
    ]);
    fixed++;
    console.log(`normalized ${row.type} ${row.id}`);
  }
  console.log(`done, fixed ${fixed}`);
  await c.end();
})();
