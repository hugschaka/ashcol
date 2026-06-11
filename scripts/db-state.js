// בדיקת מצב DB מהירה לפיתוח: ספירת jobs ושיעורים לפי סטטוס
const { Client } = require("pg");

(async () => {
  const c = new Client({
    connectionString:
      "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable",
  });
  await c.connect();
  const jobs = await c.query(
    'select type, status, count(*)::int as n from "Job" group by type, status'
  );
  console.log("jobs:", JSON.stringify(jobs.rows));
  const lessons = await c.query(
    'select status, count(*)::int as n from "Lesson" group by status'
  );
  console.log("lessons:", JSON.stringify(lessons.rows));
  await c.end();
})();
