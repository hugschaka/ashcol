// מדפיס את ה-content של תוצר לפי שיעור+סוג — לבדיקת מבנה ה-JSON של NotebookLM
const { Client } = require("pg");

(async () => {
  const [lessonId, type] = process.argv.slice(2);
  const c = new Client({
    connectionString:
      "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable",
  });
  await c.connect();
  const r = await c.query(
    `select content from "LessonAsset" where "lessonId"=$1 and type=$2 order by version desc limit 1`,
    [lessonId, type]
  );
  const content = r.rows[0]?.content;
  console.log(JSON.stringify(content, null, 1).slice(0, 2500));
  await c.end();
})();
