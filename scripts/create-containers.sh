#!/usr/bin/env bash
# ==============================================================================
# FixMyCity — Create & Provision Containers from Environment Configurations
# ==============================================================================
# 1. Validates backend and frontend environment files (.env.prod or .env)
# 2. Ensures the dedicated container bridge network exists
# 3. Connects the database container if detected
# 4. Removes legacy containers and provisions fresh backend & frontend instances
#
# Usage:
#   ./scripts/create-containers.sh [VERSION] [OPTIONS]
#
# Examples:
#   ./scripts/create-containers.sh 0.1.0
#   ./scripts/create-containers.sh latest --no-start
#   ./scripts/create-containers.sh 0.1.0 --local
#   ./scripts/create-containers.sh 0.1.0 --network my-custom-net
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
  echo -e "${RED}[ERROR] Neither 'docker' nor 'podman' CLI was found on PATH.${NC}" >&2
  exit 1
fi

# ──────────────────────────────────────────────────────────────────────────────
# 2. Parse Arguments
# ──────────────────────────────────────────────────────────────────────────────
VERSION="0.1.0"
AUTO_START=true
NETWORK_NAME="fixmycity-net"
USE_LOCAL_ENV=false
CUSTOM_BACKEND_ENV=""
CUSTOM_FRONTEND_ENV=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      echo -e "${BOLD}FixMyCity — Container Provisioning Tool${NC}"
      echo ""
      echo "Usage:"
      echo "  $0 [VERSION] [OPTIONS]"
      echo ""
      echo "Arguments:"
      echo "  VERSION                 Image version tag to deploy (default: 0.1.0)"
      echo ""
      echo "Options:"
      echo "  --local                 Use local .env instead of .env.prod"
      echo "  --no-start              Create containers without starting them"
      echo "  --network <name>        Specify custom container network (default: fixmycity-net)"
      echo "  --backend-env <file>    Path to backend env file"
      echo "  --frontend-env <file>   Path to frontend env file"
      echo "  -h, --help              Show this help message and exit"
      exit 0
      ;;
    --local)
      USE_LOCAL_ENV=true
      shift
      ;;
    --no-start)
      AUTO_START=false
      shift
      ;;
    --network)
      shift
      NETWORK_NAME="$1"
      shift
      ;;
    --backend-env)
      shift
      CUSTOM_BACKEND_ENV="$1"
      shift
      ;;
    --frontend-env)
      shift
      CUSTOM_FRONTEND_ENV="$1"
      shift
      ;;
    *)
      if [[ ! "$1" =~ ^-- ]]; then
        VERSION="$1"
      fi
      shift
      ;;
  esac
done

BACKEND_IMAGE_BASE="fixmycity-backend"
FRONTEND_IMAGE_BASE="fixmycity-frontend"
BACKEND_CONTAINER="fixmycity-backend"
FRONTEND_CONTAINER="fixmycity-frontend"

# Resolve Environment Files
if [ -n "${CUSTOM_BACKEND_ENV}" ]; then
  BACKEND_ENV_FILE="${CUSTOM_BACKEND_ENV}"
elif [ "${USE_LOCAL_ENV}" = true ] || [ ! -f "${ROOT_DIR}/backend/.env.prod" ]; then
  BACKEND_ENV_FILE="${ROOT_DIR}/backend/.env"
else
  BACKEND_ENV_FILE="${ROOT_DIR}/backend/.env.prod"
fi

if [ -n "${CUSTOM_FRONTEND_ENV}" ]; then
  FRONTEND_ENV_FILE="${CUSTOM_FRONTEND_ENV}"
elif [ "${USE_LOCAL_ENV}" = true ] || [ ! -f "${ROOT_DIR}/frontend/.env.prod" ]; then
  FRONTEND_ENV_FILE="${ROOT_DIR}/frontend/.env"
else
  FRONTEND_ENV_FILE="${ROOT_DIR}/frontend/.env.prod"
fi

echo -e "${BLUE}${BOLD}================================================================${NC}"
echo -e "${BLUE}${BOLD}   FixMyCity — Container Provisioning Pipeline                  ${NC}"
echo -e "${BLUE}${BOLD}================================================================${NC}"
echo -e "  Container Engine:    ${GREEN}${CLI}${NC}"
echo -e "  Target Tag:          ${GREEN}${VERSION}${NC}"
echo -e "  Network:             ${GREEN}${NETWORK_NAME}${NC}"
echo -e "  Auto-Start:          ${GREEN}${AUTO_START}${NC}"
echo -e "  Backend Env:         ${CYAN}${BACKEND_ENV_FILE}${NC}"
echo -e "  Frontend Env:        ${CYAN}${FRONTEND_ENV_FILE}${NC}"
echo -e "${BLUE}----------------------------------------------------------------${NC}"

# ──────────────────────────────────────────────────────────────────────────────
# 3. Verify Environment Files and Variables
# ──────────────────────────────────────────────────────────────────────────────
echo -e "\n${YELLOW}[1/4] Auditing environment configurations...${NC}"

get_env_val() {
  local file="$1"
  local key="$2"
  local val
  val=$(grep -E "^[[:space:]]*${key}=" "${file}" 2>/dev/null | tail -n 1 | cut -d '=' -f 2- | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
  echo "${val}"
}

ERRORS_FOUND=0

# Verify backend environment
if [ ! -f "${BACKEND_ENV_FILE}" ]; then
  echo -e "  ${RED}✗ Backend env file not found at: ${BACKEND_ENV_FILE}${NC}" >&2
  ERRORS_FOUND=$((ERRORS_FOUND + 1))
else
  echo -e "  ${CYAN}Backend Environment (${BACKEND_ENV_FILE}):${NC}"
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

# Verify frontend environment
if [ ! -f "${FRONTEND_ENV_FILE}" ]; then
  echo -e "  ${RED}✗ Frontend env file not found at: ${FRONTEND_ENV_FILE}${NC}" >&2
  ERRORS_FOUND=$((ERRORS_FOUND + 1))
else
  echo -e "\n  ${CYAN}Frontend Environment (${FRONTEND_ENV_FILE}):${NC}"
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
        echo -e "    ${RED}✗ ${var}${NC}: must start with http:// or https:// (got: '${val}')"
        ERRORS_FOUND=$((ERRORS_FOUND + 1))
      else
        echo -e "    ${GREEN}✓ ${var}${NC}=${val}"
      fi
    fi
  done
fi

if [ ${ERRORS_FOUND} -gt 0 ]; then
  echo -e "\n${RED}[ERROR] Environment validation failed with ${ERRORS_FOUND} error(s).${NC}" >&2
  exit 1
fi

echo -e "\n${GREEN}✓ Environment configurations validated successfully.${NC}"

# Extract ports and database host
BACKEND_PORT=$(get_env_val "${BACKEND_ENV_FILE}" "PORT")
FRONTEND_PORT=$(get_env_val "${FRONTEND_ENV_FILE}" "PORT")
BACKEND_PORT="${BACKEND_PORT:-4000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
DB_HOST=$(get_env_val "${BACKEND_ENV_FILE}" "DATABASE_HOST")

# Helper to find image tag in local engine
resolve_image() {
  local base="$1"
  local tag="$2"
  if "${CLI}" image inspect "${base}:${tag}" >/dev/null 2>&1; then
    echo "${base}:${tag}"
  elif "${CLI}" image inspect "localhost/${base}:${tag}" >/dev/null 2>&1; then
    echo "localhost/${base}:${tag}"
  elif "${CLI}" image inspect "${base}:latest" >/dev/null 2>&1; then
    echo "${base}:latest"
  elif "${CLI}" image inspect "localhost/${base}:latest" >/dev/null 2>&1; then
    echo "localhost/${base}:latest"
  else
    echo ""
  fi
}

BACKEND_IMAGE_REF=$(resolve_image "${BACKEND_IMAGE_BASE}" "${VERSION}")
FRONTEND_IMAGE_REF=$(resolve_image "${FRONTEND_IMAGE_BASE}" "${VERSION}")

if [ -z "${BACKEND_IMAGE_REF}" ] || [ -z "${FRONTEND_IMAGE_REF}" ]; then
  echo -e "\n${YELLOW}[WARNING] One or more images could not be located in local ${CLI} store:${NC}"
  [ -z "${BACKEND_IMAGE_REF}" ] && echo -e "  • Missing: ${BOLD}${BACKEND_IMAGE_BASE}:${VERSION}${NC}"
  [ -z "${FRONTEND_IMAGE_REF}" ] && echo -e "  • Missing: ${BOLD}${FRONTEND_IMAGE_BASE}:${VERSION}${NC}"
  echo -e "Run the image build tool first:"
  echo -e "  ${CYAN}./scripts/build-images.sh ${VERSION}${NC}"
  echo ""
  # Fallback to tagged references if user plans to pull from registry
  BACKEND_IMAGE_REF="${BACKEND_IMAGE_BASE}:${VERSION}"
  FRONTEND_IMAGE_REF="${FRONTEND_IMAGE_BASE}:${VERSION}"
fi

# ──────────────────────────────────────────────────────────────────────────────
# 4. Network Configuration
# ──────────────────────────────────────────────────────────────────────────────
echo -e "\n${YELLOW}[2/4] Ensuring container network '${NETWORK_NAME}' exists...${NC}"
if ! "${CLI}" network inspect "${NETWORK_NAME}" >/dev/null 2>&1; then
  echo -e "Creating bridge network ${BOLD}${NETWORK_NAME}${NC}..."
  "${CLI}" network create "${NETWORK_NAME}"
  echo -e "${GREEN}✓ Network '${NETWORK_NAME}' created.${NC}"
else
  echo -e "${GREEN}✓ Network '${NETWORK_NAME}' already exists.${NC}"
fi

# If DATABASE_HOST matches a running container name, attach it to the network
for db_candidate in "${DB_HOST}" "fixmycity-mysql" "mysql"; do
  if [ -n "${db_candidate}" ] && "${CLI}" ps --format "{{.Names}}" 2>/dev/null | grep -Eq "^${db_candidate}\$"; then
    echo -e "Detected database container '${db_candidate}'. Ensuring connection to '${NETWORK_NAME}'..."
    "${CLI}" network connect "${NETWORK_NAME}" "${db_candidate}" 2>/dev/null || true
    break
  fi
done

# ──────────────────────────────────────────────────────────────────────────────
# 5. Clean Previous Containers
# ──────────────────────────────────────────────────────────────────────────────
echo -e "\n${YELLOW}[3/4] Removing existing FixMyCity containers...${NC}"
clean_container() {
  local name="$1"
  if "${CLI}" ps -a --format "{{.Names}}" 2>/dev/null | grep -Eq "^${name}\$"; then
    echo -e "Removing container '${name}'..."
    "${CLI}" rm -f "${name}" >/dev/null 2>&1 || true
    echo -e "${GREEN}✓ Container '${name}' removed.${NC}"
  fi
}
clean_container "${BACKEND_CONTAINER}"
clean_container "${FRONTEND_CONTAINER}"

# ──────────────────────────────────────────────────────────────────────────────
# 6. Create & Launch Containers
# ──────────────────────────────────────────────────────────────────────────────
echo -e "\n${YELLOW}[4/4] Provisioning containers...${NC}"

# Backend Container
echo -e "Provisioning ${BOLD}${BACKEND_CONTAINER}${NC} using ${BACKEND_IMAGE_REF}..."
if [ "${AUTO_START}" = true ]; then
  "${CLI}" run -d \
    --name "${BACKEND_CONTAINER}" \
    --network "${NETWORK_NAME}" \
    --restart unless-stopped \
    --env-file "${BACKEND_ENV_FILE}" \
    -p "${BACKEND_PORT}:${BACKEND_PORT}" \
    "${BACKEND_IMAGE_REF}"
  echo -e "${GREEN}✓ Container ${BACKEND_CONTAINER} running on port ${BACKEND_PORT}.${NC}"
else
  "${CLI}" create \
    --name "${BACKEND_CONTAINER}" \
    --network "${NETWORK_NAME}" \
    --restart unless-stopped \
    --env-file "${BACKEND_ENV_FILE}" \
    -p "${BACKEND_PORT}:${BACKEND_PORT}" \
    "${BACKEND_IMAGE_REF}"
  echo -e "${GREEN}✓ Container ${BACKEND_CONTAINER} created (stopped).${NC}"
fi

# Frontend Container
echo -e "Provisioning ${BOLD}${FRONTEND_CONTAINER}${NC} using ${FRONTEND_IMAGE_REF}..."
if [ "${AUTO_START}" = true ]; then
  "${CLI}" run -d \
    --name "${FRONTEND_CONTAINER}" \
    --network "${NETWORK_NAME}" \
    --restart unless-stopped \
    --env-file "${FRONTEND_ENV_FILE}" \
    -p "${FRONTEND_PORT}:${FRONTEND_PORT}" \
    "${FRONTEND_IMAGE_REF}"
  echo -e "${GREEN}✓ Container ${FRONTEND_CONTAINER} running on port ${FRONTEND_PORT}.${NC}"
else
  "${CLI}" create \
    --name "${FRONTEND_CONTAINER}" \
    --network "${NETWORK_NAME}" \
    --restart unless-stopped \
    --env-file "${FRONTEND_ENV_FILE}" \
    -p "${FRONTEND_PORT}:${FRONTEND_PORT}" \
    "${FRONTEND_IMAGE_REF}"
  echo -e "${GREEN}✓ Container ${FRONTEND_CONTAINER} created (stopped).${NC}"
fi

# ──────────────────────────────────────────────────────────────────────────────
# 7. Summary & Service Endpoints
# ──────────────────────────────────────────────────────────────────────────────
echo -e "\n${BLUE}${BOLD}================================================================${NC}"
echo -e "${GREEN}${BOLD}   Containers Successfully Provisioned!                         ${NC}"
echo -e "${BLUE}${BOLD}================================================================${NC}"
echo -e "Container Status:"
"${CLI}" ps -a --filter "name=fixmycity-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}"

echo -e "\nService Endpoints:"
echo -e "  • Frontend Web UI:  ${BOLD}http://localhost:${FRONTEND_PORT}${NC}"
echo -e "  • Backend API:      ${BOLD}http://localhost:${BACKEND_PORT}/api/v1${NC}"
echo -e "  • Health Endpoint:  ${BOLD}http://localhost:${BACKEND_PORT}/api/v1/health${NC}"
echo -e "  • Swagger API Docs: ${BOLD}http://localhost:${BACKEND_PORT}/api/docs${NC}"
echo -e "${BLUE}================================================================${NC}"
