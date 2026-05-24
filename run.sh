#!/usr/bin/env bash

set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$APP_DIR/.run.pid"
LOG_FILE="$APP_DIR/.run.log"
PORT="${PORT:-3000}"

is_running() {
  if [[ ! -f "$PID_FILE" ]]; then
    return 1
  fi

  local pid
  pid="$(cat "$PID_FILE")"
  if [[ -z "$pid" ]]; then
    return 1
  fi

  if kill -0 "$pid" >/dev/null 2>&1; then
    return 0
  fi

  rm -f "$PID_FILE"
  return 1
}

start_app() {
  if is_running; then
    echo "gear-metrics already running (PID: $(cat "$PID_FILE"))."
    exit 0
  fi

  echo "Starting gear-metrics on port $PORT ..."
  cd "$APP_DIR"
  nohup env PORT="$PORT" npm run dev >>"$LOG_FILE" 2>&1 &
  echo $! >"$PID_FILE"
  sleep 1

  if is_running; then
    echo "Started (PID: $(cat "$PID_FILE")). Logs: $LOG_FILE"
  else
    echo "Failed to start. Check logs: $LOG_FILE"
    exit 1
  fi
}

stop_app() {
  if ! is_running; then
    echo "gear-metrics is not running."
    exit 0
  fi

  local pid
  pid="$(cat "$PID_FILE")"
  echo "Stopping gear-metrics (PID: $pid) ..."
  kill "$pid" >/dev/null 2>&1 || true

  for _ in {1..20}; do
    if kill -0 "$pid" >/dev/null 2>&1; then
      sleep 0.5
    else
      break
    fi
  done

  if kill -0 "$pid" >/dev/null 2>&1; then
    echo "Force killing PID: $pid"
    kill -9 "$pid" >/dev/null 2>&1 || true
  fi

  rm -f "$PID_FILE"
  echo "Stopped."
}

status_app() {
  if is_running; then
    echo "gear-metrics is running (PID: $(cat "$PID_FILE"))."
  else
    echo "gear-metrics is not running."
  fi
}

case "${1:-}" in
  start)
    start_app
    ;;
  stop)
    stop_app
    ;;
  restart)
    stop_app
    start_app
    ;;
  status)
    status_app
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status}"
    exit 1
    ;;
esac
