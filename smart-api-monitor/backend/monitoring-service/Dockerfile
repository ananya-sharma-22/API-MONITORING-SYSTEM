FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY backend ./backend

ENV NODE_ENV=production
ENV MONITORING_SERVICE_PORT=5002

EXPOSE 5002

CMD ["node", "backend/monitoring-service/server.js"]
