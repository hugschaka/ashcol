// קידום משתמש לאדמין לפי מייל: node scripts/make-admin.js someone@example.com
const { Client } = require("pg");

(async () => {
  const email = (process.argv[2] || "").toLowerCase();
  if (!email) {
    console.error("usage: node scripts/make-admin.js <email>");
    process.exit(1);
  }
  const c = new Client({
    connectionString:
      process.env.DATABASE_URL ||
      "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable",
  });
  await c.connect();
  const r = await c.query(
    `update "User" set role = 'ADMIN' where email = $1 returning id, "displayName"`,
    [email]
  );
  if (r.rowCount === 0) {
    console.error(`לא נמצא משתמש עם המייל ${email}`);
    process.exit(1);
  }
  console.log(`✓ ${r.rows[0].displayName} (${email}) הוא עכשיו אדמין`);
  await c.end();
})();
