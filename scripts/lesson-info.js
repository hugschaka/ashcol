// מדפיס מצב שיעור: סטטוס, תוצרים (גרסה/אישור), בקשות עריכה — לבדיקות פיתוח
const { Client } = require("pg");

(async () => {
  const lessonId = process.argv[2];
  if (!lessonId) {
    console.error("usage: node lesson-info.js <lessonId>");
    process.exit(1);
  }
  const c = new Client({
    connectionString:
      "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable",
  });
  await c.connect();
  const lesson = await c.query(
    'select id, title, status, "errorMessage" from "Lesson" where id = $1',
    [lessonId]
  );
  const assets = await c.query(
    'select id, type, version, approved from "LessonAsset" where "lessonId" = $1 order by type, version',
    [lessonId]
  );
  const edits = await c.query(
    'select id, "assetType", resolved from "EditRequest" where "lessonId" = $1',
    [lessonId]
  );
  console.log(
    JSON.stringify({
      lesson: lesson.rows[0] ?? null,
      assets: assets.rows,
      editRequests: edits.rows,
    })
  );
  await c.end();
})();
