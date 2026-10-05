# Keep the official Node base immutable in every stage.
FROM node:22-bookworm-slim@sha256:43ac6c60b8f89723f746e8a92ce91abd5017e627ce1ddfe4238355d3a30b772c AS build
WORKDIR /build
COPY package.json package-lock.json npm-shrinkwrap.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.json tsconfig.generate.json ./
COPY scripts/build.mjs scripts/generate-catalogue.ts ./scripts/
COPY src/ ./src/
COPY openapi/darktrace-threat-visualizer.yaml ./openapi/
COPY docs/operation-inventory.json ./docs/
RUN npm run build
RUN printf '{"type":"module"}\n' > /build/runtime-package.json

FROM node:22-bookworm-slim@sha256:43ac6c60b8f89723f746e8a92ce91abd5017e627ce1ddfe4238355d3a30b772c AS production-deps
WORKDIR /install
COPY package.json package-lock.json npm-shrinkwrap.json ./
RUN npm ci --ignore-scripts --omit=dev && npm cache clean --force

FROM gcr.io/distroless/cc-debian13:nonroot@sha256:e792ab3d241a468a4fd7519ddbbebe66b49b5f365771716ea688ad40b6c6f1c2 AS runtime-rootfs

FROM scratch AS runtime
COPY --from=runtime-rootfs / /
ENV PATH="/nodejs/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
WORKDIR /app
COPY --from=build /usr/local/bin/node /nodejs/bin/node
COPY --from=build /usr/local/LICENSE /licenses/node/LICENSE
COPY --from=production-deps /install/node_modules ./node_modules
COPY --from=build /build/dist/src ./dist/src
COPY --from=build /build/runtime-package.json ./package.json
COPY LICENSE ./LICENSE
LABEL org.opencontainers.image.title="Darktrace MCP" \
      org.opencontainers.image.description="Private stdio MCP server for Darktrace Threat Visualizer" \
      org.opencontainers.image.licenses="Apache-2.0"
USER 1000:1000
ENTRYPOINT ["/nodejs/bin/node", "/app/dist/src/index.js"]
