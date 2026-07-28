FROM oven/bun:1.3-alpine

WORKDIR /app

# Install dependencies first so they stay cached across code-only changes.
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY . .

ENV NODE_ENV=production
EXPOSE 3000

CMD ["bun", "run", "index.ts"]
