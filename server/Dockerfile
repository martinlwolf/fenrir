# --- Stage 1: build ---
FROM node:20-alpine AS build
WORKDIR /app

COPY server/package.json server/package-lock.json* ./server/
COPY shared ./shared
WORKDIR /app/server
RUN npm install

COPY server/ ./
# El Prisma Client se genera contra el schema antes de compilar.
RUN npx prisma generate
RUN npm run build

# --- Stage 2: runtime ---
FROM node:20-alpine AS runtime
WORKDIR /app/server
ENV NODE_ENV=production

COPY --from=build /app/server/package.json ./
COPY --from=build /app/server/node_modules ./node_modules
COPY --from=build /app/server/dist ./dist
COPY --from=build /app/server/prisma ./prisma
COPY --from=build /app/shared ../shared

EXPOSE 4000
CMD ["node", "dist/index.js"]
