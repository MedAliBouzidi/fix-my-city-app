#!/usr/bin/env bash
# ==============================================================================
# FixMyCity - Apply S3 CORS Policy
# ==============================================================================
# Reads AWS_S3_BUCKET_NAME and AWS_REGION from backend/.env (or environment)
# and applies scripts/s3-cors.json as the bucket CORS configuration.
#
# Prerequisites:
#   - AWS CLI installed and authenticated (aws configure, IAM role, or env vars)
#   - Caller must have s3:PutBucketCORS permission on the bucket
#
# Usage:
#   ./scripts/apply-s3-cors.sh
#
# Override bucket / region:
#   AWS_S3_BUCKET_NAME=my-bucket AWS_REGION=eu-west-1 ./scripts/apply-s3-cors.sh
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${ROOT_DIR}/backend/.env"
CORS_FILE="${SCRIPT_DIR}/s3-cors.json"

# Load backend/.env if it exists (skip comments and blank lines)
if [ -f "${ENV_FILE}" ]; then
  while IFS= read -r line; do
    # skip comments and blanks
    [[ "${line}" =~ ^\s*# ]] && continue
    [[ -z "${line// }" ]] && continue
    export "${line?}"
  done < "${ENV_FILE}"
fi

BUCKET="${AWS_S3_BUCKET_NAME:-}"
REGION="${AWS_REGION:-us-east-1}"

if [ -z "${BUCKET}" ]; then
  echo "[ERROR] AWS_S3_BUCKET_NAME is not set. Set it in backend/.env or export it." >&2
  exit 1
fi

if [ ! -f "${CORS_FILE}" ]; then
  echo "[ERROR] CORS file not found: ${CORS_FILE}" >&2
  exit 1
fi

echo "Applying CORS policy..."
echo "  Bucket : s3://${BUCKET}"
echo "  Region : ${REGION}"
echo "  Policy : ${CORS_FILE}"
echo ""

aws s3api put-bucket-cors \
  --bucket "${BUCKET}" \
  --region "${REGION}" \
  --cors-configuration "file://${CORS_FILE}"

echo "Done. Verifying applied policy..."
echo ""
aws s3api get-bucket-cors --bucket "${BUCKET}" --region "${REGION}"
echo ""
echo "CORS policy applied successfully to s3://${BUCKET}"
echo ""
echo "If your frontend runs on a custom domain, add it to AllowedOrigins in:"
echo "  scripts/s3-cors.json  then re-run this script."

