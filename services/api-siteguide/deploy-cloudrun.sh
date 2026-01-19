#!/bin/bash
#
# SiteGuide Core API - Cloud Run Deployment Script
#
# WO-SITEGUIDE-CLOUD-RUN-V1
# Domain: siteguide.co.kr
#
# Prerequisites:
#   1. gcloud CLI installed and authenticated
#   2. GCP project selected
#   3. Cloud Run API enabled
#
# Usage:
#   ./deploy-cloudrun.sh [--project PROJECT_ID] [--region REGION]
#

set -e

# ============================================================================
# CONFIGURATION
# ============================================================================

SERVICE_NAME="siteguide-core"
REGION="${REGION:-asia-northeast3}"
PROJECT="${PROJECT:-}"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --project)
      PROJECT="$2"
      shift 2
      ;;
    --region)
      REGION="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# ============================================================================
# PRE-DEPLOYMENT CHECKS
# ============================================================================

echo ""
echo "========================================"
echo "  SiteGuide Core - Cloud Run Deploy"
echo "========================================"
echo ""

# Check gcloud
if ! command -v gcloud &> /dev/null; then
  echo "Error: gcloud CLI not found. Please install Google Cloud SDK."
  exit 1
fi

# Get current project if not specified
if [ -z "$PROJECT" ]; then
  PROJECT=$(gcloud config get-value project 2>/dev/null)
fi

if [ -z "$PROJECT" ]; then
  echo "Error: No GCP project specified."
  echo "Use: ./deploy-cloudrun.sh --project YOUR_PROJECT_ID"
  echo "Or:  gcloud config set project YOUR_PROJECT_ID"
  exit 1
fi

echo "Configuration:"
echo "  Service:  $SERVICE_NAME"
echo "  Project:  $PROJECT"
echo "  Region:   $REGION"
echo ""

# ============================================================================
# DEPLOYMENT
# ============================================================================

echo "Deploying to Cloud Run..."
echo ""

gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --project "$PROJECT" \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 60 \
  --set-env-vars "SERVICE_NAME=siteguide,SERVICE_DOMAIN=siteguide.co.kr,NODE_ENV=production,AI_EXECUTION_ENABLED=true"

# ============================================================================
# POST-DEPLOYMENT
# ============================================================================

echo ""
echo "========================================"
echo "  Deployment Complete"
echo "========================================"
echo ""

# Get service URL
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
  --project "$PROJECT" \
  --region "$REGION" \
  --format "value(status.url)" 2>/dev/null)

echo "Service URL: $SERVICE_URL"
echo ""
echo "Health Check: $SERVICE_URL/health"
echo ""
echo "Next Steps:"
echo "  1. Test the service: curl $SERVICE_URL/health"
echo "  2. Map custom domain: gcloud run domain-mappings create --service $SERVICE_NAME --domain siteguide.co.kr --region $REGION"
echo "  3. Update DNS records to point to Cloud Run"
echo ""
