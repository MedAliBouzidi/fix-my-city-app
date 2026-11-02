#!/usr/bin/env bash
# ==============================================================================
# FixMyCity — Create Containers from .env.prod Configurations
# ==============================================================================
# 1. Verifies the existence of backend/.env.prod and frontend/.env.prod
# 2. Verifies that all required environment variables are set and non-empty
# 3. Ensures the container network exists and can resolve the database
# 4. Provisions backend and frontend containers using the verified .env.prod files
#
# Usage:
#   ./scripts/create-containers.sh [VERSION] [OPTIONS]
#
# Examples:
#   ./scripts/create-containers.sh 0.1.0
#   ./scripts/create-containers.sh latest --no-start
# ==============================================================================

set -euo pipefail

# ANSI color codes
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Determine project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

# ──────────────────────────────────────────────────────────────────────────────
# 1. Detect Container Runtime (podman or docker)
# ──────────────────────────────────────────────────────────────────────────────
if [ -n "${CONTAINER_CLI:-}" ]; then
  CLI="${CONTAINER_CLI}"
elif command -v podman >/dev/null 2>&1; then
  CLI="podman"
elif command -v docker >/dev/null 2>&1; then
  CLI="docker"
else
  echo -e "${RED}[ERROR] Neither 'podman' nor 'docker' CLI was found on PATH.${NC}" >&2
  exit 1
fi

# ──────────────────────────────────────────────────────────────────────────────
# 2. Parse Arguments
# ──────────────────────────────────────────────────────────────────────────────
VERSION="0.1.0"
AUTO_START=true
NETWORK_NAME="fixmycity-net"

for arg in "$@"; do
  case "${arg}" in
    -h|--help)
      echo -e "${BOLD}FixMyCity — Container Provisioning Tool${NC}"
      echo ""
      echo "Usage:"
      echo "  $0 [VERSION] [OPTIONS]"
      echo ""
      echo "Arguments:"
      echo "  VERSION             Image version tag to deploy (default: 0.1.0)"
      echo ""
      echo "Options:"
      echo "  --no-start          Create containers without starting them"
      echo "  --network <name>    Specify custom container network name"
      echo "  -h, --help          Show this help message and exit"
      echo ""
      echo "Config Files Used:"
      echo "  Backend:   ${ROOT_DIR}/backend/.env.prod"
      echo "  Frontend:  ${ROOT_DIR}/frontend/.env.prod"
      exit 0
      ;;
    --no-start)
      AUTO_START=false
      ;;
    --network)
      shift
      NETWORK_NAME="$1"
      ;;
    *)
      if [[ ! "${arg}" =~ ^-- ]]; then
        VERSION="${arg}"
      fi
      ;;
  esac
done

BACKEND_IMAGE_BASE="fixmycity-backend"
FRONTEND_IMAGE_BASE="fixmycity-frontend"
BACKEND_CONTAINER="fixmycity-backend"
FRONTEND_CONTAINER="fixmycity-frontend"

BACKEND_ENV_FILE="${ROOT_DIR}/backend/.env.prod"
FRONTEND_ENV_FILE="${ROOT_DIR}/frontend/.env.prod"

echo -e "${BLUE}${BOLD}================================================================${NC}"
echo -e "${BLUE}${BOLD}   FixMyCity — Container Provisioning (.env.prod)              ${NC}"
echo -e "${BLUE}${BOLD}================================================================${NC}"
echo -e "  Container Engine:    ${GREEN}${CLI}${NC}"
echo -e "  Image Tag:           ${GREEN}${VERSION}${NC}"
echo -e "  Network:             ${GREEN}${NETWORK_NAME}${NC}"
echo -e "  Auto-Start:          ${GREEN}${AUTO_START}${NC}"
echo -e "${BLUE}----------------------------------------------------------------${NC}"

# ──────────────────────────────────────────────────────────────────────────────
# 3. Verify .env.prod Files and Environment Variables
# ──────────────────────────────────────────────────────────────────────────────
echo -e "\n${YELLOW}[1/4] Verifying .env.prod files and required variables...${NC}"

# Helper function to get variable value from an env file without sourcing
get_env_val() {
  local file="$1"
  local key="$2"
  local val
  val=$(grep -E "^[[:space:]]*${key}=" "${file}" 2>/dev/null | tail -n 1 | cut -d '=' -f 2- | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
  echo "${val}"
}

ERRORS_FOUND=0

# Verify backend/.env.prod
if [ ! -f "${BACKEND_ENV_FILE}" ]; then
  echo -e "  ${RED}✗ Backend env file missing at: ${BACKEND_ENV_FILE}${NC}" >&2
  ERRORS_FOUND=$((ERRORS_FOUND + 1))
else
  echo -e "  ${CYAN}Auditing backend/.env.prod: ${BOLD}${BACKEND_ENV_FILE}${NC}"
  REQUIRED_BACKEND_VARS=(
    "PORT"
    "NODE_ENV"
    "DATABASE_HOST"
    "DATABASE_PORT"
    "DATABASE_USER"
    "DATABASE_PASSWORD"
    "DATABASE_NAME"
    "JWT_SECRET"
    "JWT_EXPIRATION"
    "AWS_REGION"
    "AWS_S3_BUCKET_NAME"
  )

  for var in "${REQUIRED_BACKEND_VARS[@]}"; do
    val=$(get_env_val "${BACKEND_ENV_FILE}" "${var}")
    if [ -z "${val}" ]; then
      echo -e "    ${RED}✗ ${var}${NC}: missing or empty"
      ERRORS_FOUND=$((ERRORS_FOUND + 1))
    else
      if [[ "${var}" =~ (PASSWORD|SECRET) ]]; then
        echo -e "    ${GREEN}✓ ${var}${NC}=********"
      else
        echo -e "    ${GREEN}✓ ${var}${NC}=${val}"
      fi
    fi
  done
fi

# Verify frontend/.env.prod
if [ ! -f "${FRONTEND_ENV_FILE}" ]; then
  echo -e "  ${RED}✗ Frontend env file missing at: ${FRONTEND_ENV_FILE}${NC}" >&2
  ERRORS_FOUND=$((ERRORS_FOUND + 1))
else
  echo -e "\n  ${CYAN}Auditing frontend/.env.prod: ${BOLD}${FRONTEND_ENV_FILE}${NC}"
  REQUIRED_FRONTEND_VARS=(
    "NEXT_PUBLIC_API_URL"
    "PORT"
  )

  for var in "${REQUIRED_FRONTEND_VARS[@]}"; do
    val=$(get_env_val "${FRONTEND_ENV_FILE}" "${var}")
    if [ -z "${val}" ]; then
      echo -e "    ${RED}✗ ${var}${NC}: missing or empty"
      ERRORS_FOUND=$((ERRORS_FOUND + 1))
    else
      if [ "${var}" = "NEXT_PUBLIC_API_URL" ] && [[ ! "${val}" =~ ^https?:// ]]; then
        echo -e "    ${RED}✗ ${var}${NC}: must include scheme (http:// or https://), got: '${val}'"
        ERRORS_FOUND=$((ERRORS_FOUND + 1))
      else
        echo -e "    ${GREEN}✓ ${var}${NC}=${val}"
      fi
    fi
  done
fi

if [ ${ERRORS_FOUND} -gt 0 ]; then
  echo -e "\n${RED}[ERROR] .env.prod verification failed with ${ERRORS_FOUND} error(s).${NC}" >&2
  echo -e "        Please ensure both backend/.env.prod and frontend/.env.prod exist and are configured." >&2
  exit 1
fi

echo -e "\n${GREEN}✓ Environment files verified successfully!${NC}"

# Extract ports and database host
BACKEND_PORT=$(get_env_val "${BACKEND_ENV_FILE}" "PORT")
FRONTEND_PORT=$(get_env_val "${FRONTEND_ENV_FILE}" "PORT")
BACKEND_PORT="${BACKEND_PORT:-4000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
DB_HOST=$(get_env_val "${BACKEND_ENV_FILE}" "DATABASE_HOST")

# Helper function to resolve local image reference
resolve_image() {
  local base="$1"
  local tag="$2"
  if "${CLI}" image exists "localhost/${base}:${tag}" 2>/dev/null; then
    echo "localhost/${base}:${tag}"
  elif "${CLI}" image exists "${base}:${tag}" 2>/dev/null; then
    echo "${base}:${tag}"
  elif "${CLI}" image exists "localhost/${base}:latest" 2>/dev/null; then
    echo "localhost/${base}:latest"
  else
    echo "localhost/${base}:${tag}"
  fi
}

BACKEND_IMAGE_REF=$(resolve_image "${BACKEND_IMAGE_BASE}" "${VERSION}")
FRONTEND_IMAGE_REF=$(resolve_image "${FRONTEND_IMAGE_BASE}" "${VERSION}")

# ──────────────────────────────────────────────────────────────────────────────
# 4. Network Configuration
# ──────────────────────────────────────────────────────────────────────────────
echo -e "\n${YELLOW}[2/4] Ensuring container network '${NETWORK_NAME}' exists...${NC}"
if ! "${CLI}" network exists "${NETWORK_NAME}" 2>/dev/null && ! "${CLI}" network inspect "${NETWORK_NAME}" >/dev/null 2>&1; then
  echo -e "Creating network ${BOLD}${NETWORK_NAME}${NC}..."
  "${CLI}" network create "${NETWORK_NAME}"
fi

# If DATABASE_HOST refers to a running container (like app_mysql_1), connect it to fixmycity-net
if [ -n "${DB_HOST}" ] && "${CLI}" ps --format "{{.Names}}" 2>/dev/null | grep -Eq "^${DB_HOST}\$"; then
  echo -e "Detected database container '${DB_HOST}'. Ensuring it is connected to '${NETWORK_NAME}'..."
  "${CLI}" network connect "${NETWORK_NAME}" "${DB_HOST}" 2>/dev/null || true
fi

# ──────────────────────────────────────────────────────────────────────────────
# 5. Clean Previous Containers
# ──────────────────────────────────────────────────────────────────────────────
echo -e "\n${YELLOW}[3/4] Removing existing containers if present...${NC}"
clean_container() {
  local name="$1"
  if "${CLI}" ps -a --format "{{.Names}}" 2>/dev/null | grep -Eq "^${name}\$"; then
    echo -e "Removing container '${name}'..."
    "${CLI}" rm -f "${name}" >/dev/null 2>&1 || true
  fi
}
clean_container "${BACKEND_CONTAINER}"
clean_container "${FRONTEND_CONTAINER}"

# ──────────────────────────────────────────────────────────────────────────────
# 6. Create & Launch Containers
# ──────────────────────────────────────────────────────────────────────────────
echo -e "\n${YELLOW}[4/4] Creating containers from .env.prod...${NC}"

# Backend Container
echo -e "Creating container ${BOLD}${BACKEND_CONTAINER}${NC} using ${BACKEND_IMAGE_REF}..."
if [ "${AUTO_START}" = true ]; then
  "${CLI}" run -d \
    --name "${BACKEND_CONTAINER}" \
    --network "${NETWORK_NAME}" \
    --env-file "${BACKEND_ENV_FILE}" \
    -p "${BACKEND_PORT}:${BACKEND_PORT}" \
    "${BACKEND_IMAGE_REF}"
  echo -e "${GREEN}✓ Container ${BACKEND_CONTAINER} started on port ${BACKEND_PORT}.${NC}"
else
  "${CLI}" create \
    --name "${BACKEND_CONTAINER}" \
    --network "${NETWORK_NAME}" \
    --env-file "${BACKEND_ENV_FILE}" \
    -p "${BACKEND_PORT}:${BACKEND_PORT}" \
    "${BACKEND_IMAGE_REF}"
  echo -e "${GREEN}✓ Container ${BACKEND_CONTAINER} created.${NC}"
fi

# Frontend Container
echo -e "Creating container ${BOLD}${FRONTEND_CONTAINER}${NC} using ${FRONTEND_IMAGE_REF}..."
if [ "${AUTO_START}" = true ]; then
  "${CLI}" run -d \
    --name "${FRONTEND_CONTAINER}" \
    --network "${NETWORK_NAME}" \
    --env-file "${FRONTEND_ENV_FILE}" \
    -p "${FRONTEND_PORT}:${FRONTEND_PORT}" \
    "${FRONTEND_IMAGE_REF}"
  echo -e "${GREEN}✓ Container ${FRONTEND_CONTAINER} started on port ${FRONTEND_PORT}.${NC}"
else
  "${CLI}" create \
    --name "${FRONTEND_CONTAINER}" \
    --network "${NETWORK_NAME}" \
    --env-file "${FRONTEND_ENV_FILE}" \
    -p "${FRONTEND_PORT}:${FRONTEND_PORT}" \
    "${FRONTEND_IMAGE_REF}"
  echo -e "${GREEN}✓ Container ${FRONTEND_CONTAINER} created.${NC}"
fi

# ──────────────────────────────────────────────────────────────────────────────
# 7. Summary
# ──────────────────────────────────────────────────────────────────────────────
echo -e "\n${BLUE}${BOLD}================================================================${NC}"
echo -e "${GREEN}${BOLD}   Containers Successfully Provisioned!                         ${NC}"
echo -e "${BLUE}${BOLD}================================================================${NC}"
echo -e "Active Containers:"
"${CLI}" ps -a --filter "name=fixmycity-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}"

echo -e "\nService Endpoints:"
echo -e "  • Frontend Web UI:  ${BOLD}http://localhost:${FRONTEND_PORT}${NC}"
echo -e "  • Backend API:      ${BOLD}http://localhost:${BACKEND_PORT}/api/v1${NC}"
echo -e "  • Health Endpoint:  ${BOLD}http://localhost:${BACKEND_PORT}/api/v1/health${NC}"
echo -e "  • Swagger API Docs: ${BOLD}http://localhost:${BACKEND_PORT}/api/docs${NC}"
echo -e "${BLUE}================================================================${NC}"
