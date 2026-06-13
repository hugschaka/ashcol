import { spawn } from "node:child_process";

// רענון תקופתי של חיבור NotebookLM כדי שה-session לא יפוג.
// רץ בתוך ה-worker — המערכת אוטונומית, בלי cron חיצוני.
const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000; // כל 6 שעות

function refreshOnce(): Promise<void> {
  return new Promise((resolve) => {
    const child = spawn("notebooklm", ["auth", "refresh", "--quiet"], {
      env: process.env,
    });
    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", (err) => {
      console.log(`[keepalive] לא ניתן להריץ notebooklm: ${err.message}`);
      resolve();
    });
    child.on("close", (code) => {
      if (code === 0) {
        console.log("[keepalive] חיבור NotebookLM רוענן");
      } else {
        // כשל רענון = ה-session כנראה פג ודורש notebooklm login ידני
        console.log(
          `[keepalive] רענון נכשל (code ${code}) — ייתכן שצריך התחברות מחדש. ${stderr.slice(-200)}`
        );
      }
      resolve();
    });
  });
}

export function startSessionKeepalive(): void {
  // רק בהפקה אמיתית — ב-dry_run אין session
  if (process.env.WORKER_MODE !== "real") return;
  void refreshOnce();
  setInterval(() => void refreshOnce(), REFRESH_INTERVAL_MS);
}
