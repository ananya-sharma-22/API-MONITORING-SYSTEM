FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY backend ./backend

ENV NODE_ENV=production
ENV API_SERVER_PORT=5001

EXPOSE 5001

CMD ["node", "backend/api-server/server.js"]
