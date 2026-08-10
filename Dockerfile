FROM oven/bun:1.3.14 AS build

WORKDIR /opt/node_app

COPY . .

RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

ARG NODE_ENV=production

RUN bun run build:app:docker

FROM nginx:stable-alpine-slim@sha256:2c605dbeab79a6b2a63340474fe58119d0ef95bdc4b1f41df0aa689659b3d13b

COPY --from=build /opt/node_app/excalimove-app/build /usr/share/nginx/html

HEALTHCHECK CMD wget -q -O /dev/null http://localhost || exit 1
