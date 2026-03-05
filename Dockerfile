# Stage 1: Build the client, server, and plugin
FROM docker.io/node:22-alpine as BUILD

# Set working directory for the main project
WORKDIR /app

USER 0

RUN chown 1001:0 /app

COPY ./*.json .
COPY ./*.yml .
COPY ./*.yaml .

COPY ./CHANGELOG.md .
COPY ./packages/aloha-shared/*.json ./packages/aloha-shared/
COPY ./packages/client/*.json ./packages/client/
COPY ./packages/server/*.json ./packages/server/
RUN npm i -g pnpm lerna && pnpm install

COPY ./packages/aloha-shared/src/ ./packages/aloha-shared/src/

COPY ./packages/client/src/ ./packages/client/src/
COPY ./packages/client/public/ ./packages/client/public/
COPY ./packages/client/tailwind.config.js ./packages/client/
COPY ./packages/client/vite.config.ts ./packages/client/
COPY ./packages/client/index.html ./packages/client/

COPY ./packages/server/src/ ./packages/server/src/

RUN lerna run build

RUN rm -rf ./plugins/ecas && \
  rm -rf ./packages/server/src && \
  rm -rf ./packages/aloha-shared/src && \
  rm -rf ./packages/client/src && \
  find . -name node_modules | xargs -n1 -I% rm -rf % || true

FROM docker.io/node:22-alpine as FINAL

USER 0

WORKDIR /app

COPY --from=BUILD /app ./

RUN npm i -g pnpm lerna && cd ./packages/server/ && pnpm install --only=production

# ENV AUTHENTICATION_PLUGIN=/app/plugins/ecas/lib/plugin.js

USER 1001

ENV HTTP_PROXY=
ENV HTTPS_PROXY=
ENV NO_PROXY=
ENV SERVER_PORT=3000
ENV MONGODB_URI=
ENV SERVER_SECRET=
ENV CLIENT_SECRET=
ENV AUTHENTICATION_PLUGIN=
ENV CAS_URL=
ENV OIDC_ENABLED=true
ENV OIDC_CODE_REDIRECT_URI=
ENV OIDC_JWKS=
ENV OIDC_CLIENT_ID=
ENV OIDC_ISSUER_URL=
ENV OIDC_IDENTITY_PROPAGATION_SERVICE_PATH=
ENV OIDC_USE_IDENTITY_PROPAGATION_SERVICE=
ENV OIDC_UNKNOWN_USERS_ALLOW=
ENV OIDC_UNKNOWN_USERS_PERMISSIONS=
ENV CLIENT_DIR=/app/packages/client/dist/
ENV CHANGELOG_PATH=/app/CHANGELOG.md
ENV NODE_ENV=production

# Expose the port the app runs on
EXPOSE 3000

# Command to run the server
CMD ["node", "--max-old-space-size=512", "/app/packages/server/dist/server.js"]
