FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && corepack prepare pnpm@11.10.0 --activate
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY emulator ./emulator

RUN chmod +x /app/emulator/entrypoint.sh /app/emulator/src/cli.js /app/emulator/stedi-sim
RUN ln -sf /app/emulator/stedi-sim /usr/local/bin/stedi-sim

ENV STEDI_SIM_CONTROL_PORT=4010
ENV STEDI_SIM_STATE_DIR=/app/emulator/.stedi-sim

ENTRYPOINT ["/app/emulator/entrypoint.sh"]
