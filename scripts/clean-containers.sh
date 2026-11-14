#!/usr/bin/env bash
# ==============================================================================
# FixMyCity — Container & Image Cleanup Utility
# ==============================================================================
# Safely stops and cleans up FixMyCity containers, images, dangling build layers,
# and networks. Preserves database data by default unless explicitly requested.
#
# Usage:
#   ./scripts/clean-containers.sh [OPTIONS]
#
# Examples:
#   ./scripts/clean-containers.sh                 # Clean app containers & images (protects DB)
#   ./scripts/clean-containers.sh --containers   # Clean only containers, keep images
#   ./scripts/clean-containers.sh --images       # Clean only images
#   ./scripts/clean-containers.sh --all          # Full purge (including database & volumes)
#   ./scripts/clean-containers.sh -y             # Non-interactive / force mode
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
CLEAN_CONTAINERS=true
CLEAN_IMAGES=true
CLEAN_NETWORKS=true
CLEAN_DATABASE=false
CLEAN_VOLUMES=false
FORCE=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      echo -e "${BOLD}FixMyCity — Container & Image Cleanup Utility${NC}"
      echo ""
      echo "Usage:"
      echo "  $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  -c, --containers    Remove only application containers (keep images)"
      echo "  -i, --images        Remove only application images (stops dependent containers first)"
      echo "  -d, --include-db    Also stop and remove the database container (fixmycity-mysql)"
      echo "  -v, --volumes       Also remove database persistent storage volumes (DATA LOSS!)"
      echo "  -a, --all           Full reset: containers, images, networks, DB & volumes"
      echo "  -y, --yes, --force  Skip interactive confirmation prompt"
      echo "  -h, --help          Show this help message and exit"
      echo ""
      echo "Safety Note:"
      echo "  By default, database data and volumes are preserved."
      exit 0
      ;;
    -c|--containers|--containers-only)
      CLEAN_CONTAINERS=true
      CLEAN_IMAGES=false
      shift
      ;;
    -i|--images|--images-only)
      CLEAN_CONTAINERS=true # Containers must be stopped to remove their backing images
      CLEAN_IMAGES=true
      shift
      ;;
    -d|--include-db)
      CLEAN_DATABASE=true
      shift
      ;;
    -v|--volumes)
      CLEAN_VOLUMES=true
      CLEAN_DATABASE=true
      shift
      ;;
    -a|--all)
      CLEAN_CONTAINERS=true
      CLEAN_IMAGES=true
      CLEAN_NETWORKS=true
      CLEAN_DATABASE=true
      CLEAN_VOLUMES=true
      shift
      ;;
    -y|--yes|--force|-f)
      FORCE=true
      shift
      ;;
    *)
      echo -e "${RED}[ERROR] Unknown option: $1${NC}" >&2
      echo "Use -h or --help for available options."
      exit 1
      ;;
  esac
done

echo -e "${BLUE}${BOLD}================================================================${NC}"
echo -e "${BLUE}${BOLD}   FixMyCity — Resource Cleanup Utility                         ${NC}"
echo -e "${BLUE}${BOLD}================================================================${NC}"
echo -e "  Container Engine:    ${GREEN}${CLI}${NC}"
echo -e "  Clean Containers:    ${GREEN}${CLEAN_CONTAINERS}${NC}"
echo -e "  Clean Images:        ${GREEN}${CLEAN_IMAGES}${NC}"
echo -e "  Clean Networks:      ${GREEN}${CLEAN_NETWORKS}${NC}"
echo -e "  Clean Database:      $([ "${CLEAN_DATABASE}" = true ] && echo -e "${RED}YES (Destructive)${NC}" || echo -e "${GREEN}NO (Protected)${NC}")"
echo -e "  Clean Volumes:       $([ "${CLEAN_VOLUMES}" = true ] && echo -e "${RED}YES (Data will be erased!)${NC}" || echo -e "${GREEN}NO (Protected)${NC}")"
echo -e "${BLUE}----------------------------------------------------------------${NC}"

# ──────────────────────────────────────────────────────────────────────────────
# 3. Confirmation Prompt
# ──────────────────────────────────────────────────────────────────────────────
if [ "${FORCE}" = false ] && [ -t 0 ]; then
  if [ "${CLEAN_VOLUMES}" = true ]; then
    echo -e "${RED}${BOLD}[WARNING] Database volume deletion requested! This will destroy all incident records!${NC}"
    read -r -p "Type 'DESTROY' to confirm volume purge, or anything else to abort: " confirm
    if [ "${confirm}" != "DESTROY" ]; then
      echo -e "${YELLOW}Operation cancelled by user.${NC}"
      exit 0
    fi
  else
    read -r -p "Proceed with removing the selected FixMyCity container resources? [y/N]: " confirm
    case "${confirm}" in
      [yY]|[yY][eE][sS])
        ;;
      *)
        echo -e "${YELLOW}Operation cancelled by user.${NC}"
        exit 0
        ;;
    esac
  fi
fi

# ──────────────────────────────────────────────────────────────────────────────
# 4. Remove Containers
# ──────────────────────────────────────────────────────────────────────────────
if [ "${CLEAN_CONTAINERS}" = true ]; then
  echo -e "\n${YELLOW}[1/4] Scanning and removing FixMyCity containers...${NC}"

  APP_CONTAINERS=("fixmycity-backend" "fixmycity-frontend")
  if [ "${CLEAN_DATABASE}" = true ]; then
    APP_CONTAINERS+=("fixmycity-mysql")
  fi

  REMOVED_COUNT=0
  for container in "${APP_CONTAINERS[@]}"; do
    if "${CLI}" ps -a --format "{{.Names}}" 2>/dev/null | grep -Eq "^${container}\$"; then
      echo -e "  Stopping & removing container: ${BOLD}${container}${NC}..."
      "${CLI}" rm -f "${container}" >/dev/null 2>&1 || true
      echo -e "  ${GREEN}✓ Removed container ${container}${NC}"
      REMOVED_COUNT=$((REMOVED_COUNT + 1))
    fi
  done

  # Also search for any stray containers matching fixmycity-*
  STRAY_CONTAINERS=$("${CLI}" ps -a --filter "name=fixmycity-" --format "{{.Names}}" 2>/dev/null || true)
  if [ -n "${STRAY_CONTAINERS}" ]; then
    for container in ${STRAY_CONTAINERS}; do
      # Avoid removing database container if not requested
      if [ "${container}" = "fixmycity-mysql" ] && [ "${CLEAN_DATABASE}" = false ]; then
        continue
      fi
      echo -e "  Removing extra container: ${BOLD}${container}${NC}..."
      "${CLI}" rm -f "${container}" >/dev/null 2>&1 || true
      REMOVED_COUNT=$((REMOVED_COUNT + 1))
    done
  fi

  if [ ${REMOVED_COUNT} -eq 0 ]; then
    echo -e "  ${CYAN}No active or stopped FixMyCity containers found.${NC}"
  else
    echo -e "  ${GREEN}✓ Successfully removed ${REMOVED_COUNT} container(s).${NC}"
  fi
fi

# ──────────────────────────────────────────────────────────────────────────────
# 5. Remove Images
# ──────────────────────────────────────────────────────────────────────────────
if [ "${CLEAN_IMAGES}" = true ]; then
  echo -e "\n${YELLOW}[2/4] Scanning and removing FixMyCity images...${NC}"

  # Find all images matching fixmycity-backend or fixmycity-frontend (with or without localhost/ prefix)
  IMAGE_PATTERNS=(
    "fixmycity-backend"
    "fixmycity-frontend"
    "localhost/fixmycity-backend"
    "localhost/fixmycity-frontend"
  )

  REMOVED_IMAGES=0
  for pattern in "${IMAGE_PATTERNS[@]}"; do
    IMAGE_IDS=$("${CLI}" images --format "{{.Repository}}:{{.Tag}} {{.ID}}" 2>/dev/null | grep -E "^${pattern}(:|\ )" | awk '{print $2}' | sort -u || true)
    if [ -n "${IMAGE_IDS}" ]; then
      for img_id in ${IMAGE_IDS}; do
        echo -e "  Removing image: ${BOLD}${pattern}${NC} (${img_id})..."
        "${CLI}" rmi -f "${img_id}" >/dev/null 2>&1 || true
        REMOVED_IMAGES=$((REMOVED_IMAGES + 1))
      done
    fi
  done

  # Prune dangling intermediate build layers
  echo -e "  Pruning dangling untagged build layers (<none>)..."
  "${CLI}" image prune -f >/dev/null 2>&1 || true

  if [ ${REMOVED_IMAGES} -eq 0 ]; then
    echo -e "  ${CYAN}No FixMyCity images found to remove.${NC}"
  else
    echo -e "  ${GREEN}✓ Successfully removed ${REMOVED_IMAGES} image tag(s).${NC}"
  fi
fi

# ──────────────────────────────────────────────────────────────────────────────
# 6. Clean Networks
# ──────────────────────────────────────────────────────────────────────────────
if [ "${CLEAN_NETWORKS}" = true ]; then
  echo -e "\n${YELLOW}[3/4] Checking custom container networks...${NC}"

  NETWORKS=("fixmycity-net" "fixmycity-network")
  for net in "${NETWORKS[@]}"; do
    if "${CLI}" network inspect "${net}" >/dev/null 2>&1; then
      echo -e "  Removing bridge network: ${BOLD}${net}${NC}..."
      "${CLI}" network rm "${net}" >/dev/null 2>&1 || true
      echo -e "  ${GREEN}✓ Removed network '${net}'${NC}"
    fi
  done
fi

# ──────────────────────────────────────────────────────────────────────────────
# 7. Clean Volumes (if requested)
# ──────────────────────────────────────────────────────────────────────────────
if [ "${CLEAN_VOLUMES}" = true ]; then
  echo -e "\n${RED}[4/4] Purging database persistent storage volumes...${NC}"

  VOLUMES=("mysql_data" "fixmycity_mysql_data" "fixmycity-app_mysql_data")
  for vol in "${VOLUMES[@]}"; do
    if "${CLI}" volume inspect "${vol}" >/dev/null 2>&1; then
      echo -e "  Removing volume: ${BOLD}${vol}${NC}..."
      "${CLI}" volume rm -f "${vol}" >/dev/null 2>&1 || true
      echo -e "  ${GREEN}✓ Removed volume '${vol}'${NC}"
    fi
  done
else
  echo -e "\n${CYAN}[4/4] Database volumes kept intact (pass --volumes or --all to purge).${NC}"
fi

# ──────────────────────────────────────────────────────────────────────────────
# 8. Summary
# ──────────────────────────────────────────────────────────────────────────────
echo -e "\n${BLUE}${BOLD}================================================================${NC}"
echo -e "${GREEN}${BOLD}   Cleanup Complete!                                            ${NC}"
echo -e "${BLUE}${BOLD}================================================================${NC}"
echo -e "Remaining FixMyCity resources:"
"${CLI}" ps -a --filter "name=fixmycity-" --format "table {{.Names}}\t{{.Status}}\t{{.Image}}" 2>/dev/null || true
echo ""
echo -e "Next steps to rebuild fresh:"
echo -e "  • Build new images:       ${CYAN}./scripts/build-images.sh 0.1.0${NC}"
echo -e "  • Start containers:       ${CYAN}./scripts/create-containers.sh 0.1.0${NC}"
echo -e "  • Or run via compose:     ${CYAN}docker compose up -d --build${NC}"
echo -e "${BLUE}================================================================${NC}"
