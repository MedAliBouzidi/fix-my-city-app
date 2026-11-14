#!/usr/bin/env bash
# ==============================================================================
# FixMyCity — Build Container Images (Docker / Podman) with Versioning
# ==============================================================================
# Builds production-optimized multi-stage backend and frontend images.
#
# Usage:
#   ./scripts/build-images.sh [VERSION] [OPTIONS]
#
# Examples:
#   ./scripts/build-images.sh 1.0.0
#   ./scripts/build-images.sh 0.1.0 --no-cache
#   ./scripts/build-images.sh 0.1.0 --backend-only
#   ./scripts/build-images.sh 0.1.0 --frontend-only
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

# Enable BuildKit for faster, cache-optimized Docker builds
if [ "${CLI}" = "docker" ]; then
  export DOCKER_BUILDKIT=1
fi

# ──────────────────────────────────────────────────────────────────────────────
# 2. Parse Arguments
# ──────────────────────────────────────────────────────────────────────────────
VERSION="0.1.0"
BUILD_BACKEND=true
BUILD_FRONTEND=true
EXTRA_BUILD_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      echo -e "${BOLD}FixMyCity — Container Image Build Pipeline${NC}"
      echo ""
      echo "Usage:"
      echo "  $0 [VERSION] [OPTIONS]"
      echo ""
      echo "Arguments:"
      echo "  VERSION             Version tag to apply (default: 0.1.0)"
      echo ""
      echo "Options:"
      echo "  -b, --backend-only  Build only the backend image"
      echo "  -f, --frontend-only Build only the frontend image"
      echo "  --no-cache          Do not use cache when building images"
      echo "  --pull              Always attempt to pull newer base images"
      echo "  -h, --help          Show this help message and exit"
      echo ""
      echo "Environment Overrides:"
      echo "  CONTAINER_CLI       Container engine to use (podman or docker)"
      echo "  NEXT_PUBLIC_API_URL Override backend API URL baked into frontend"
      exit 0
      ;;
    -b|--backend-only)
      BUILD_FRONTEND=false
      shift
      ;;
    -f|--frontend-only)
      BUILD_BACKEND=false
      shift
      ;;
    --no-cache)
      EXTRA_BUILD_ARGS+=("--no-cache")
      shift
      ;;
    --pull)
      EXTRA_BUILD_ARGS+=("--pull")
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

BACKEND_IMAGE="fixmycity-backend"
FRONTEND_IMAGE="fixmycity-frontend"

# Extract API URL: check env override -> frontend/.env.prod -> frontend/.env -> fallback
API_URL="${NEXT_PUBLIC_API_URL:-}"
if [ -z "${API_URL}" ] && [ -f "${ROOT_DIR}/frontend/.env.prod" ]; then
  API_URL=$(grep -E "^[[:space:]]*NEXT_PUBLIC_API_URL=" "${ROOT_DIR}/frontend/.env.prod" 2>/dev/null | tail -n 1 | cut -d '=' -f 2- | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
fi
if [ -z "${API_URL}" ] && [ -f "${ROOT_DIR}/frontend/.env" ]; then
  API_URL=$(grep -E "^[[:space:]]*NEXT_PUBLIC_API_URL=" "${ROOT_DIR}/frontend/.env" 2>/dev/null | tail -n 1 | cut -d '=' -f 2- | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
fi
API_URL="${API_URL:-http://localhost:4000/api/v1}"

echo -e "${BLUE}${BOLD}================================================================${NC}"
echo -e "${BLUE}${BOLD}   FixMyCity — Container Image Build Pipeline                   ${NC}"
echo -e "${BLUE}${BOLD}================================================================${NC}"
echo -e "  Container Engine:    ${GREEN}${CLI}${NC}"
echo -e "  Target Version:      ${GREEN}${VERSION}${NC} (and :latest)"
echo -e "  Build Backend:       ${GREEN}${BUILD_BACKEND}${NC}"
echo -e "  Build Frontend:      ${GREEN}${BUILD_FRONTEND}${NC}"
if [ "${BUILD_FRONTEND}" = true ]; then
  echo -e "  Frontend API URL:    ${GREEN}${API_URL}${NC}"
fi
if [ ${#EXTRA_BUILD_ARGS[@]} -gt 0 ]; then
  echo -e "  Extra Build Flags:   ${YELLOW}${EXTRA_BUILD_ARGS[*]}${NC}"
fi
echo -e "${BLUE}----------------------------------------------------------------${NC}"

# ──────────────────────────────────────────────────────────────────────────────
# 3. Build Backend Image
# ──────────────────────────────────────────────────────────────────────────────
if [ "${BUILD_BACKEND}" = true ]; then
  echo -e "\n${YELLOW}[BUILD] Compiling Backend Image (${BACKEND_IMAGE}:${VERSION})...${NC}"
  "${CLI}" build \
    ${EXTRA_BUILD_ARGS[@]+"${EXTRA_BUILD_ARGS[@]}"} \
    -t "localhost/${BACKEND_IMAGE}:${VERSION}" \
    -t "localhost/${BACKEND_IMAGE}:latest" \
    -t "${BACKEND_IMAGE}:${VERSION}" \
    -t "${BACKEND_IMAGE}:latest" \
    -f "${ROOT_DIR}/backend/Dockerfile" \
    "${ROOT_DIR}/backend"

  echo -e "${GREEN}✓ Successfully built and tagged ${BACKEND_IMAGE}:${VERSION} and ${BACKEND_IMAGE}:latest${NC}"
fi

# ──────────────────────────────────────────────────────────────────────────────
# 4. Build Frontend Image
# ──────────────────────────────────────────────────────────────────────────────
if [ "${BUILD_FRONTEND}" = true ]; then
  echo -e "\n${YELLOW}[BUILD] Compiling Frontend Image (${FRONTEND_IMAGE}:${VERSION})...${NC}"
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
fi

# ──────────────────────────────────────────────────────────────────────────────
# 5. Summary
# ──────────────────────────────────────────────────────────────────────────────
echo -e "\n${BLUE}${BOLD}================================================================${NC}"
echo -e "${GREEN}${BOLD}   Image Build Complete!                                        ${NC}"
echo -e "${BLUE}${BOLD}================================================================${NC}"
echo -e "Built Images:"
if [ "${BUILD_BACKEND}" = true ]; then
  echo -e "  • ${BOLD}${BACKEND_IMAGE}:${VERSION}${NC} (and :latest)"
fi
if [ "${BUILD_FRONTEND}" = true ]; then
  echo -e "  • ${BOLD}${FRONTEND_IMAGE}:${VERSION}${NC} (and :latest)"
fi
echo ""
echo -e "Next steps:"
echo -e "  • Provision individual containers: ${CYAN}./scripts/create-containers.sh ${VERSION}${NC}"
echo -e "  • Or run the full stack compose:    ${CYAN}docker compose up -d${NC}"
echo -e "  • Clean old images/containers:     ${CYAN}./scripts/clean-containers.sh${NC}"
echo -e "${BLUE}================================================================${NC}"
