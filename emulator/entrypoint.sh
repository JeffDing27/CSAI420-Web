#!/bin/sh
set -eu

mkdir -p "${STEDI_SIM_STATE_DIR:-/app/emulator/.stedi-sim}"

node /app/emulator/src/daemon.js &
DAEMON_PID=$!

cleanup() {
  kill "$DAEMON_PID" 2>/dev/null || true
  wait "$DAEMON_PID" 2>/dev/null || true
}

trap cleanup INT TERM EXIT

wait "$DAEMON_PID"
