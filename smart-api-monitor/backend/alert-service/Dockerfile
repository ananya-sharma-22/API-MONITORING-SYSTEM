FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY backend ./backend

ENV NODE_ENV=production
ENV ALERT_SERVICE_PORT=5003

EXPOSE 5003

CMD ["node", "backend/alert-service/server.js"]
