# Build de la SPA y serve estatico (deploy real en Vercel; este Dockerfile es para el
# docker-compose local).
FROM node:20-alpine AS build
WORKDIR /app
# shared/ es dependencia por alias @shared/*; se copia junto al client.
COPY client/package.json client/package-lock.json* ./client/
COPY shared/ ./shared/
WORKDIR /app/client
RUN npm install
COPY client/ ./
RUN npm run build

FROM nginx:alpine AS runtime
COPY --from=build /app/client/dist /usr/share/nginx/html
# SPA fallback a index.html
RUN printf 'server {\n  listen 80;\n  location / {\n    root /usr/share/nginx/html;\n    try_files $uri /index.html;\n  }\n}\n' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
