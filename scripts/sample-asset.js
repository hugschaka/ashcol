// הצצה לתוצר לדוגמה: כמה assets יש ומה הפרומפט שקלוד ניסח
const { Client } = require("pg");

(async () => {
  const c = new Client({
    connectionString:
      "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable",
  });
  await c.connect();

  const counts = await c.query(
    'select type, count(*)::int as n from "LessonAsset" group by type'
  );
  console.log("assets:", JSON.stringify(counts.rows));

  const lessons = await c.query(
    'select status, count(*)::int as n from "Lesson" group by status'
  );
  console.log("lessons:", JSON.stringify(lessons.rows));

  const sample = await c.query(
    `select l.title, a.type, a.content->>'promptUsed' as prompt
     from "LessonAsset" a join "Lesson" l on l.id = a."lessonId"
     where a.type = 'QUIZ' limit 1`
  );
  if (sample.rows[0]) {
    console.log("\n--- דוגמת פרומפט (שאלון) ---");
    console.log("שיעור:", sample.rows[0].title);
    console.log(sample.rows[0].prompt);
  }
  await c.end();
})();
