// הפיכת/יצירת משתמש למנהל פלטפורמה:
//   node scripts/make-superadmin.js <email> <password> <orgSlug>
// משתמש ב-pg ישירות (לא Prisma client) כדי לרוץ ב-node רגיל בתוך ה-container.
const { Client } = require("pg");
const bcrypt = require("bcryptjs");

(async () => {
  const [emailArg, password, orgSlug] = process.argv.slice(2);
  if (!emailArg || !password || !orgSlug) {
    console.error("usage: node scripts/make-superadmin.js <email> <password> <orgSlug>");
    process.exit(1);
  }
  const email = emailArg.toLowerCase();
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  const org = await c.query('SELECT id FROM "Organization" WHERE slug=$1', [orgSlug]);
  if (!org.rows[0]) {
    console.error(`לא נמצא ארגון עם slug ${orgSlug}`);
    process.exit(1);
  }
  const orgId = org.rows[0].id;
  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await c.query('SELECT id FROM "User" WHERE email=$1', [email]);
  if (existing.rows[0]) {
    await c.query(
      `UPDATE "User" SET "isSuperAdmin"=true, role='ADMIN', "passwordHash"=$1,
       "mustChangePassword"=false, "deletedAt"=NULL WHERE email=$2`,
      [passwordHash, email]
    );
  } else {
    await c.query(
      `INSERT INTO "User" (id, email, "passwordHash", "displayName", role, "orgId",
       "isSuperAdmin", "acceptedTerms", "acceptedCookies")
       VALUES (gen_random_uuid()::text, $1, $2, $3, 'ADMIN', $4, true, true, true)`,
      [email, passwordHash, "מנהל פלטפורמה", orgId]
    );
  }
  console.log(`✓ ${email} הוא מנהל פלטפורמה (דרך ארגון ${orgSlug})`);
  await c.end();
})();
