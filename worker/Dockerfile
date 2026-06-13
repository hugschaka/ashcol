# ה-worker: Node (tsx) + Python (notebooklm-py) + Chromium אמיתי.
# נבנה מתיקיית השורש של הפרויקט: docker build -f worker/Dockerfile .
FROM node:20-slim

# תלויות מערכת ל-Chromium של Playwright + Python
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-venv \
    ca-certificates fonts-liberation fonts-noto-color-emoji fonts-noto-cjk \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
    libgbm1 libpango-1.0-0 libcairo2 libasound2 libatspi2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python: notebooklm-py + playwright chromium (venv, כי Debian חוסם pip גלובלי)
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"
RUN pip install --no-cache-dir "notebooklm-py[browser]" \
    && playwright install --with-deps chromium

# Node: כל ה-deps (כולל tsx) + Prisma client
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci && npx prisma generate

COPY . .

# ה-session של גוגל מגיע מ-volume; ברירת מחדל הפקה אמיתית
ENV WORKER_MODE=real
ENV PYTHONIOENCODING=utf-8

CMD ["npm", "run", "worker"]
