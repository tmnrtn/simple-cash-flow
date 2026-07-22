FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY src/ ./src/
# Drop privileges: the node image ships an unprivileged 'node' user.
USER node
EXPOSE 3000
CMD ["node", "src/index.js"]
