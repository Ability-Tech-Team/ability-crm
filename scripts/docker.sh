#!/usr/bin/env bash
# Ability CRM as a standalone container on this machine (Dockerfile). The
# package.json docker:prod:* scripts call it:
#
#   build   build the image
#   start   (re)start the container from the last image, e.g. after changing
#           the env file
#   update  build, check the new image in a private preview, then switch the
#           port to it; the old container keeps running until then and comes
#           back if the new one doesn't answer
#   logs    follow the container's logs
#   stop    stop and remove the container (the images stay)
#
# Settings come from ENV_FILE (copy .env.example) when the container starts.
# Adapted from Amer CRM's docker-prod*.sh.
set -Eeuo pipefail

# Run from the app's directory, wherever this is called from.
cd "$(dirname "$0")/.."

IMAGE=${IMAGE:-ability-crm}
NAME=${NAME:-ability-crm}
PORT=${PORT:-9994}
ENV_FILE=${ENV_FILE:-.env.production}
HEALTH_PATH=/aws/health-check
STARTUP_TIMEOUT=${STARTUP_TIMEOUT:-60}
STOP_TIMEOUT=${STOP_TIMEOUT:-10}
KEEP_RELEASES=${KEEP_RELEASES:-3}

# The port the server listens on inside the container (Dockerfile).
CONTAINER_PORT=3000

GIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo local)
RELEASE_ID="$(date -u +%Y%m%d%H%M%S)-${GIT_SHA}"
RELEASE_IMAGE="${IMAGE}:${RELEASE_ID}"

fail() {
  echo "==> $*" >&2
  exit 1
}

require() {
  command -v "$1" >/dev/null 2>&1 || fail "$1 is required"
}

check_env_file() {
  [ -f "$ENV_FILE" ] ||
    fail "$ENV_FILE is missing: copy .env.example to $ENV_FILE and set this machine's values"

  # Docker reads the file literally, so quotes would become part of a value.
  if grep -qE "^[[:space:]]*[A-Za-z_][A-Za-z0-9_]*=[\"']" "$ENV_FILE"; then
    fail "$ENV_FILE: write the values without quotes"
  fi
}

container_is_running() {
  [ "$(docker inspect --format '{{.State.Running}}' "$1" 2>/dev/null || true)" = "true" ]
}

wait_until_ready() {
  local container_name=$1
  local url=$2
  local deadline=$((SECONDS + STARTUP_TIMEOUT))

  while [ "$SECONDS" -lt "$deadline" ]; do
    if curl --fail --silent --show-error --max-time 2 "$url" >/dev/null 2>&1; then
      return 0
    fi

    if ! container_is_running "$container_name"; then
      return 1
    fi

    sleep 1
  done

  return 1
}

build_image() {
  echo "==> Building $RELEASE_IMAGE"
  docker build -t "$RELEASE_IMAGE" .
}

# Keeps the newest KEEP_RELEASES release tags for a manual rollback. An image
# that a container still uses stays until that container is removed.
prune_releases() {
  docker image ls "$IMAGE" --format '{{.Tag}}' |
    grep -E '^[0-9]{14}-' |
    sort -r |
    tail -n +$((KEEP_RELEASES + 1)) |
    while IFS= read -r tag; do
      docker image rm "$IMAGE:$tag" >/dev/null 2>&1 || true
    done || true
}

build() {
  build_image
  docker tag "$RELEASE_IMAGE" "$IMAGE"
  prune_releases
  echo "==> Built $RELEASE_IMAGE. Start it with: npm run docker:prod"
}

start() {
  check_env_file
  docker image inspect "$IMAGE" >/dev/null 2>&1 ||
    fail "There is no $IMAGE image yet: run npm run docker:prod:update"

  echo "==> Replacing $NAME on port $PORT"
  docker rm -f "$NAME" >/dev/null 2>&1 || true
  docker run -d \
    --name "$NAME" \
    --restart unless-stopped \
    --env-file "$ENV_FILE" \
    -p "$PORT:$CONTAINER_PORT" \
    "$IMAGE" >/dev/null

  if ! wait_until_ready "$NAME" "http://127.0.0.1:${PORT}${HEALTH_PATH}"; then
    docker logs "$NAME" || true
    fail "$NAME didn't answer $HEALTH_PATH on port $PORT"
  fi

  echo "==> $NAME is up on port $PORT. Follow its logs with: npm run docker:prod:logs"
}

# State for update's rollback, which the exit trap reads.
PREVIEW_NAME="${NAME}-preview-${RELEASE_ID}"
BACKUP_NAME=""
OLD_WAS_RUNNING=false
SWAP_STARTED=false

rollback() {
  echo "==> The new release failed; restoring the previous container"
  docker rm -f "$NAME" >/dev/null 2>&1 || true

  if [ -n "$BACKUP_NAME" ] && docker inspect "$BACKUP_NAME" >/dev/null 2>&1; then
    docker rename "$BACKUP_NAME" "$NAME" >/dev/null
    if [ "$OLD_WAS_RUNNING" = true ] && ! container_is_running "$NAME"; then
      docker start "$NAME" >/dev/null
    fi
    echo "==> Previous container restored"
  else
    echo "==> There was no previous container to restore"
  fi
}

on_update_exit() {
  local status=$?
  trap - EXIT

  docker rm -f "$PREVIEW_NAME" >/dev/null 2>&1 || true

  if [ "$status" -ne 0 ] && [ "$SWAP_STARTED" = true ]; then
    rollback
  fi

  exit "$status"
}

update() {
  check_env_file
  trap on_update_exit EXIT

  echo "==> Building while the current container stays online"
  build_image

  echo "==> Starting a private preview container"
  docker run -d \
    --name "$PREVIEW_NAME" \
    --env-file "$ENV_FILE" \
    -p "127.0.0.1::$CONTAINER_PORT" \
    "$RELEASE_IMAGE" >/dev/null

  local preview_binding preview_port
  preview_binding=$(docker port "$PREVIEW_NAME" "$CONTAINER_PORT/tcp" | head -n 1)
  preview_port=${preview_binding##*:}

  if ! wait_until_ready "$PREVIEW_NAME" "http://127.0.0.1:${preview_port}${HEALTH_PATH}"; then
    echo "==> The preview didn't answer $HEALTH_PATH"
    docker logs "$PREVIEW_NAME" || true
    exit 1
  fi

  echo "==> The preview answered; switching port $PORT to it"
  docker rm -f "$PREVIEW_NAME" >/dev/null

  if docker inspect "$NAME" >/dev/null 2>&1; then
    BACKUP_NAME="${NAME}-rollback-${RELEASE_ID}"
    if container_is_running "$NAME"; then
      OLD_WAS_RUNNING=true
    fi
    docker rename "$NAME" "$BACKUP_NAME"
  fi

  # Creating the container doesn't bind the host port yet, so the old one
  # stays online until just before the new one starts.
  SWAP_STARTED=true
  docker create \
    --name "$NAME" \
    --restart unless-stopped \
    --env-file "$ENV_FILE" \
    -p "$PORT:$CONTAINER_PORT" \
    "$RELEASE_IMAGE" >/dev/null

  if [ -n "$BACKUP_NAME" ] && [ "$OLD_WAS_RUNNING" = true ]; then
    docker stop --time "$STOP_TIMEOUT" "$BACKUP_NAME" >/dev/null
  fi
  docker start "$NAME" >/dev/null

  if ! wait_until_ready "$NAME" "http://127.0.0.1:${PORT}${HEALTH_PATH}"; then
    echo "==> The new release didn't answer on port $PORT"
    docker logs "$NAME" || true
    exit 1
  fi

  SWAP_STARTED=false
  docker tag "$RELEASE_IMAGE" "$IMAGE"

  if [ -n "$BACKUP_NAME" ]; then
    docker rm -f "$BACKUP_NAME" >/dev/null
  fi
  prune_releases

  echo "==> Deployed $RELEASE_IMAGE on port $PORT"
  echo "==> Follow its logs with: npm run docker:prod:logs"
}

case "${1:-}" in
  build)
    require docker
    build
    ;;
  start)
    require docker
    require curl
    start
    ;;
  update)
    require docker
    require curl
    update
    ;;
  logs)
    require docker
    docker logs -f "$NAME"
    ;;
  stop)
    require docker
    docker rm -f "$NAME"
    ;;
  *)
    echo "Usage: bash scripts/docker.sh build|start|update|logs|stop" >&2
    exit 2
    ;;
esac
