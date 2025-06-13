# Stage 1: Build the client, server, and plugin
FROM quay.apps.ocpt.jrc.ec.europa.eu/public/redhat/ubi9/nodejs-20:latest

# Set working directory for the main project
WORKDIR /app

USER 0
RUN chown 1001:0 /app

COPY . ./
RUN npm i -g pnpm lerna && pnpm install

RUN lerna run build

USER 1001

ENV AUTHENTICATION_PLUGIN=/app/plugins/ecas/lib/plugin.js
ENV CLIENT_DIR=/app/packages/client/dist/
ENV NODE_ENV=production
ENV SERVER_PORT=8080

# Expose the port the app runs on
EXPOSE 8080

# Command to run the server
CMD ["node", "/app/packages/server/dist/server.js"]