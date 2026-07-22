# --- build stage: compile the SPA to static assets ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
# npm install (not ci) so the Alpine/musl-native rollup binary resolves
# correctly regardless of the platform the lockfile was generated on.
RUN npm install
COPY . .
RUN npm run build

# --- dev stage: Vite dev server with hot reload (used by docker-compose.dev.yml) ---
FROM node:20-alpine AS dev
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8080
CMD ["npm", "run", "dev", "--", "--host", "--port", "8080"]

# --- production stage: serve static assets via non-root nginx ---
FROM nginxinc/nginx-unprivileged:stable-alpine AS production
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
