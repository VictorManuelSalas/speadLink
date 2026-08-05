FROM node:20-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 4200
CMD ["npm", "start", "--", "--host", "0.0.0.0", "--poll", "1000"]

FROM development AS build
ENV NG_CLI_ANALYTICS=false
RUN npm run build

FROM nginx:1.29-alpine AS production
ENV PORT=80
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/speedlink-crm/browser /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD wget -qO- http://127.0.0.1:${PORT}/health || exit 1
CMD ["nginx", "-g", "daemon off;"]
