FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src/ ./src/
COPY migrations/ ./migrations/
COPY demo-seed.sql ./demo-seed.sql
# Drop privileges: the node image ships an unprivileged 'node' user.
USER node
EXPOSE 3000
CMD ["node", "src/index.js"]
