FROM node:22-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile --prod=false
COPY . .
RUN pnpm build
EXPOSE 8080
ENV PORT=8080
CMD ["node", "dist/index.js"]
