# פריסת "אשכול" לאוויר — מדריך צעד אחר צעד

המערכת רצה על שרת אחד (VPS) עם Docker: מסד נתונים, האתר, ה-worker (כולל
Chromium ל-NotebookLM), ו-reverse proxy שמנפיק HTTPS אוטומטית.

> כל הפקודות מסומנות. מה שצריך ממך מסומן **🧑 ידני** — השאר Claude יכול לבצע
> מרחוק ברגע שיש גישת SSH לשרת.

---

## מה צריך להכין מראש

1. **🧑 חשבון GitHub** — נעשה ✅ (github.com/hugschaka/ashcol)
2. **🧑 שרת VPS** — Hetzner Cloud (CX22, ~€4/חודש) או DigitalOcean ($6).
   בוחרים Ubuntu 24.04. שומרים את כתובת ה-IP.
3. **🧑 דומיין** — כל דומיין (אפשר זול ב-Namecheap/Cloudflare, ~$10/שנה).
   מפנים רשומת `A` של הדומיין לכתובת ה-IP של השרת.
4. **מפתח Claude API** — כבר יש.
5. **חיבור NotebookLM** — מעלים את ה-session המקומי לשרת (שלב 5 למטה).

---

## שלב 1 — התקנת Docker על השרת

```bash
# מתחברים לשרת
ssh root@<SERVER_IP>

# מתקינים Docker
curl -fsSL https://get.docker.com | sh
```

## שלב 2 — שליפת הקוד

```bash
cd /opt
git clone https://github.com/hugschaka/ashcol.git
cd ashcol
```

## שלב 3 — הגדרת הסביבה

```bash
cp .env.production.example .env
nano .env
```

ממלאים:
- `DB_PASSWORD` — מחרוזת אקראית (`openssl rand -base64 24`)
- `AUTH_SECRET` — `openssl rand -base64 32`
- `ANTHROPIC_API_KEY` — המפתח מ-console.anthropic.com
- `DOMAIN` + `PUBLIC_URL` — הדומיין שלכם

## שלב 4 — עלייה לאוויר

```bash
docker compose up -d --build
```

הבנייה הראשונה לוקחת כמה דקות (מתקינה Chromium). האתר יעלה על הדומיין עם
HTTPS אוטומטי. בדיקת בריאות:

```bash
curl https://<DOMAIN>/api/health    # מצופה {"ok":true,"db":true}
docker compose logs -f web worker   # מעקב אחר לוגים
```

## שלב 5 — חיבור NotebookLM (פעם אחת)

ה-worker צריך session מחובר של גוגל. מעלים את ה-session שכבר נוצר במחשב:

```bash
# מהמחשב המקומי (PowerShell) — אורזים את ה-session
tar -czf nblm.tgz -C $env:USERPROFILE .notebooklm

# מעלים לשרת
scp nblm.tgz root@<SERVER_IP>:/tmp/

# בשרת — פורסים לתוך ה-volume של ה-worker
docker compose cp /tmp/nblm.tgz worker:/tmp/
docker compose exec worker sh -c "cd /data && tar -xzf /tmp/nblm.tgz --strip-components=1 -C notebooklm"
docker compose restart worker

# מאמתים
docker compose exec worker notebooklm auth check --test
```

> **אם גוגל דורשת אימות מחדש** (כי ה-IP של השרת חדש): מריצים
> `docker compose exec worker notebooklm login --no-browser`, מעתיקים את
> ה-URL לדפדפן במחשב, ומדביקים בחזרה את הקוד. רענון ה-session היומי אחרי
> זה אוטומטי (ה-worker מטפל בו).

## שלב 6 — אדמין ראשון

```bash
# רושמים משתמש דרך האתר, ואז מקדמים אותו לאדמין:
docker compose exec web node scripts/make-admin.js you@example.com
```

---

## תפעול שוטף

```bash
# עדכון גרסה אחרי דחיפה ל-GitHub
git pull && docker compose up -d --build

# גיבוי מסד הנתונים
docker compose exec db pg_dump -U eshcol eshcol > backup-$(date +%F).sql

# לוגים
docker compose logs -f worker
```

**רענון חיבור גוגל** — אוטומטי, ה-worker מרענן כל 6 שעות. אם בכל זאת פג
(נדיר), חוזרים על שלב 5 (login).
