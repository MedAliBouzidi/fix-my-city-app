#!/usr/bin/env bash
# ==============================================================================
# FixMyCity — Build Docker/Podman Images with Versioning
# ==============================================================================
# Builds both backend and frontend images and tags them with a version number
# and :latest.
#
# Usage:
#   ./scripts/build-images.sh [VERSION] [OPTIONS]
#
# Examples:
#   ./scripts/build-images.sh 1.0.0
#   ./scripts/build-images.sh 0.1.0 --no-cache
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
EXTRA_BUILD_ARGS=()

for arg in "$@"; do
  case "${arg}" in
    -h|--help)
      echo -e "${BOLD}FixMyCity — Image Build Tool${NC}"
      echo ""
      echo "Usage:"
      echo "  $0 [VERSION] [OPTIONS]"
      echo ""
      echo "Arguments:"
      echo "  VERSION             Version tag to apply (default: 0.1.0)"
      echo ""
      echo "Options:"
      echo "  --no-cache          Do not use cache when building images"
      echo "  -h, --help          Show this help message and exit"
      echo ""
      echo "Environment Overrides:"
      echo "  CONTAINER_CLI       Container engine to use (podman or docker)"
      echo "  NEXT_PUBLIC_API_URL Override backend API URL baked into frontend"
      exit 0
      ;;
    --no-cache)
      EXTRA_BUILD_ARGS+=("--no-cache")
      ;;
    *)
      if [[ ! "${arg}" =~ ^-- ]]; then
        VERSION="${arg}"
      fi
      ;;
  esac
done

BACKEND_IMAGE="fixmycity-backend"
FRONTEND_IMAGE="fixmycity-frontend"

# Extract API URL from frontend/.env.prod if present, else fallback
API_URL="${NEXT_PUBLIC_API_URL:-}"
if [ -z "${API_URL}" ] && [ -f "${ROOT_DIR}/frontend/.env.prod" ]; then
  API_URL=$(grep -E "^[[:space:]]*NEXT_PUBLIC_API_URL=" "${ROOT_DIR}/frontend/.env.prod" | tail -n 1 | cut -d '=' -f 2- | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
fi
API_URL="${API_URL:-http://localhost:4000/api/v1}"

echo -e "${BLUE}${BOLD}================================================================${NC}"
echo -e "${BLUE}${BOLD}   FixMyCity — Image Build Pipeline                             ${NC}"
echo -e "${BLUE}${BOLD}================================================================${NC}"
echo -e "  Container Engine:    ${GREEN}${CLI}${NC}"
echo -e "  Target Version:      ${GREEN}${VERSION}${NC} (and :latest)"
echo -e "  Frontend API URL:    ${GREEN}${API_URL}${NC}"
if [ ${#EXTRA_BUILD_ARGS[@]} -gt 0 ]; then
  echo -e "  Extra Build Flags:   ${YELLOW}${EXTRA_BUILD_ARGS[*]}${NC}"
fi
echo -e "${BLUE}----------------------------------------------------------------${NC}"

# ──────────────────────────────────────────────────────────────────────────────
# 3. Build Backend Image
# ──────────────────────────────────────────────────────────────────────────────
echo -e "\n${YELLOW}[1/2] Building Backend Image (${BACKEND_IMAGE}:${VERSION})...${NC}"
"${CLI}" build \
  ${EXTRA_BUILD_ARGS[@]+"${EXTRA_BUILD_ARGS[@]}"} \
  -t "localhost/${BACKEND_IMAGE}:${VERSION}" \
  -t "localhost/${BACKEND_IMAGE}:latest" \
  -t "${BACKEND_IMAGE}:${VERSION}" \
  -t "${BACKEND_IMAGE}:latest" \
  -f "${ROOT_DIR}/backend/Dockerfile" \
  "${ROOT_DIR}/backend"

echo -e "${GREEN}✓ Successfully built and tagged ${BACKEND_IMAGE}:${VERSION} and ${BACKEND_IMAGE}:latest${NC}"

# ──────────────────────────────────────────────────────────────────────────────
# 4. Build Frontend Image
# ──────────────────────────────────────────────────────────────────────────────
echo -e "\n${YELLOW}[2/2] Building Frontend Image (${FRONTEND_IMAGE}:${VERSION})...${NC}"
"${CLI}" build \
  ${EXTRA_BUILD_ARGS[@]+"${EXTRA_BUILD_ARGS[@]}"} \
  --build-arg NEXT_PUBLIC_API_URL="${API_URL}" \
  -t "localhost/${FRONTEND_IMAGE}:${VERSION}" \
  -t "localhost/${FRONTEND_IMAGE}:latest" \
  -t "${FRONTEND_IMAGE}:${VERSION}" \
  -t "${FRONTEND_IMAGE}:latest" \
  -f "${ROOT_DIR}/frontend/Dockerfile" \
  "${ROOT_DIR}/frontend"

echo -e "${GREEN}✓ Successfully built and tagged ${FRONTEND_IMAGE}:${VERSION} and ${FRONTEND_IMAGE}:latest${NC}"

# ──────────────────────────────────────────────────────────────────────────────
# 5. Summary
# ──────────────────────────────────────────────────────────────────────────────
echo -e "\n${BLUE}${BOLD}================================================================${NC}"
echo -e "${GREEN}${BOLD}   Image Build Complete!                                        ${NC}"
echo -e "${BLUE}${BOLD}================================================================${NC}"
echo -e "Built Images:"
echo -e "  • ${BOLD}localhost/${BACKEND_IMAGE}:${VERSION}${NC} (and :latest)"
echo -e "  • ${BOLD}localhost/${FRONTEND_IMAGE}:${VERSION}${NC} (and :latest)"
echo ""
echo -e "Next step: Run containers with:"
echo -e "  ${CYAN}./scripts/create-containers.sh ${VERSION}${NC}"
echo -e "${BLUE}================================================================${NC}"
