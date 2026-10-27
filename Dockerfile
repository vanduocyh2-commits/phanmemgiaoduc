FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.mjs portal-server.mjs supabase-store.mjs tuition.mjs tax-export.mjs tax-template-styles.xml enrollment-word.mjs ./
COPY public ./public
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "portal-server.mjs"]
