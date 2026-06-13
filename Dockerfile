# האתר (Next.js) — image פשוט ואמין: build + start עם כל ה-deps
FROM node:20-slim AS base
WORKDIR /app
ENV NODE_ENV=production

# התקנת תלויות (כולל dev — צריך ל-build ול-prisma generate)
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

# runtime
FROM base AS runner
COPY --from=build /app ./
EXPOSE 3000
CMD ["npm", "run", "start"]
