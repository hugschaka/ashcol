# האתר (Next.js) — image פשוט ואמין: build + start עם כל ה-deps
FROM node:20-slim AS base
WORKDIR /app
# openssl נדרש ל-Prisma (generate + migrate deploy)
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# התקנת תלויות (כולל dev — צריך ל-build: tailwind, typescript) + Prisma client
FROM base AS deps
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate

# build
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/generated ./generated
COPY . .
RUN npm run build

# runtime — רק כאן production
FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3000
CMD ["npm", "run", "start"]
