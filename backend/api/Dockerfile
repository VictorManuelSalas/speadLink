FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./

# 👇 instala TODO incluyendo devDependencies (incluye nest cli)
RUN npm install

# 👇 instala nest CLI SOLO dentro del contenedor
RUN npm install -g @nestjs/cli

COPY . .

RUN npx prisma generate

RUN npx nest build

RUN ls -la
RUN ls -la dist

EXPOSE 3000

# CMD ["node", "dist/main.js"] # Para producción
CMD ["npm", "run", "start:dev"] # Para desarrollo