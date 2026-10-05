# Official library/node manifest verified against Docker Hub, 2026-10-05.
FROM node:22-bookworm-slim@sha256:43ac6c60b8f89723f746e8a92ce91abd5017e627ce1ddfe4238355d3a30b772c AS build
WORKDIR /build
COPY package.json package-lock.json npm-shrinkwrap.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.json tsconfig.generate.json ./
COPY src ./src
COPY test ./test
COPY scripts ./scripts
COPY openapi/darktrace-threat-visualizer.yaml ./openapi/darktrace-threat-visualizer.yaml
COPY docs/architecture.md docs/operation-inventory.json ./docs/
RUN npm run build

FROM node:22-bookworm-slim@sha256:43ac6c60b8f89723f746e8a92ce91abd5017e627ce1ddfe4238355d3a30b772c AS runtime
WORKDIR /app
COPY package.json package-lock.json npm-shrinkwrap.json ./
RUN npm ci --ignore-scripts --omit=dev && npm cache clean --force
COPY --from=build /build/dist/src ./dist/src
COPY LICENSE README.md SECURITY.md ./
USER 1000:1000
ENTRYPOINT ["node", "/app/dist/src/index.js"]
