FROM node:20-alpine AS development

WORKDIR /app

COPY package*.json ./
RUN npm ci

EXPOSE 4200

CMD ["npx", "ng", "serve", "--host", "0.0.0.0", "--port", "4200", "--poll", "2000"]