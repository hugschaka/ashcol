import { Resend } from "resend";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const RESEND_KEY = process.env.RESEND_API_KEY;

const INTEREST_LABELS: Record<string, string> = {
  CONTENT: "הרשמה למסלול תוכן למרצים",
  PARTNERSHIP: "שיתופי פעולה",
  AI_INTEGRATION: "הטמעת כלי AI בארגון",
};

// מונע הזרקת HTML מקלט המשתמש לתוך גוף המייל
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function notifyNewLead(lead: {
  orgName: string;
  domain: string;
  interest: string;
  email: string;
}): Promise<void> {
  // בלי הגדרת מייל — לא מפילים את הבקשה, רק מתעדים שלא נשלחה התראה
  if (!RESEND_KEY || !ADMIN_EMAIL) {
    console.log("[email] RESEND_API_KEY/ADMIN_EMAIL לא מוגדרים — דילוג על התראה.", {
      orgName: lead.orgName,
    });
    return;
  }

  try {
    const resend = new Resend(RESEND_KEY);
    const { error } = await resend.emails.send({
      from: "אשכול <onboarding@resend.dev>",
      to: ADMIN_EMAIL,
      replyTo: lead.email,
      subject: `פנייה חדשה לאשכול: ${lead.orgName}`,
      html: `<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.7;color:#171717">
        <h2 style="color:#6d28d9">🎉 ארגון חדש מתעניין באשכול</h2>
        <p><b>שם הארגון:</b> ${esc(lead.orgName)}</p>
        <p><b>תחום:</b> ${esc(lead.domain)}</p>
        <p><b>מתעניינים ב:</b> ${esc(INTEREST_LABELS[lead.interest] ?? lead.interest)}</p>
        <p><b>ליצירת קשר:</b> <a href="mailto:${esc(lead.email)}">${esc(lead.email)}</a></p>
        <hr style="border:none;border-top:1px solid #eee;margin:16px 0">
        <p style="color:#888;font-size:13px">אפשר להשיב ישירות למייל הזה כדי לחזור אליהם.</p>
      </div>`,
    });
    if (error) {
      console.log(`[email] שליחת התראה נכשלה: ${error.message}`);
    } else {
      console.log(`[email] התראת ליד נשלחה ל-${ADMIN_EMAIL} (${lead.orgName})`);
    }
  } catch (e) {
    console.log(`[email] שגיאת שליחה: ${e instanceof Error ? e.message : e}`);
  }
}
