#!/bin/bash
# =============================================================================
# O4O API Server - Cloud Run Deployment Script
# =============================================================================
# Prerequisites:
#   1. gcloud CLI installed and authenticated
#   2. dist/main.js built via `pnpm run build:api`
#   3. Docker installed (for local build) OR use Cloud Build
#
# Usage:
#   ./deploy-cloudrun.sh [build|push|deploy|all]
# =============================================================================

set -e

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
PROJECT_ID="${GCP_PROJECT_ID:-netureyoutube}"
REGION="asia-northeast3"
SERVICE_NAME="neture-api"
REPOSITORY_NAME="o4o-api"
IMAGE_NAME="api-server"
IMAGE_TAG="${IMAGE_TAG:-latest}"

# Full image path
ARTIFACT_REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY_NAME}/${IMAGE_NAME}"
FULL_IMAGE="${ARTIFACT_REGISTRY}:${IMAGE_TAG}"

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "[ERROR] $1" >&2
    exit 1
}

check_prerequisites() {
    log "Checking prerequisites..."

    # Check gcloud
    if ! command -v gcloud &> /dev/null; then
        error "gcloud CLI not found. Please install Google Cloud SDK."
    fi

    # Check if logged in
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
        error "Not logged in to gcloud. Run: gcloud auth login"
    fi

    # Check dist/main.js
    if [[ ! -f "dist/main.js" ]]; then
        error "dist/main.js not found. Run: pnpm run build:api"
    fi

    log "Prerequisites OK"
}

# -----------------------------------------------------------------------------
# Step 1: Create Artifact Registry (if not exists)
# -----------------------------------------------------------------------------
setup_artifact_registry() {
    log "Setting up Artifact Registry..."

    # Check if repository exists
    if gcloud artifacts repositories describe "${REPOSITORY_NAME}" \
        --location="${REGION}" \
        --project="${PROJECT_ID}" &> /dev/null; then
        log "Artifact Registry repository already exists"
    else
        log "Creating Artifact Registry repository..."
        gcloud artifacts repositories create "${REPOSITORY_NAME}" \
            --repository-format=docker \
            --location="${REGION}" \
            --project="${PROJECT_ID}" \
            --description="O4O Platform API Server images"
    fi

    # Configure Docker to use Artifact Registry
    log "Configuring Docker authentication..."
    gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet
}

# -----------------------------------------------------------------------------
# Step 2: Build Docker Image
# -----------------------------------------------------------------------------
build_image() {
    log "Building Docker image..."

    docker build \
        --platform linux/amd64 \
        --tag "${FULL_IMAGE}" \
        --file Dockerfile \
        .

    log "Image built: ${FULL_IMAGE}"
}

# -----------------------------------------------------------------------------
# Step 3: Push to Artifact Registry
# -----------------------------------------------------------------------------
push_image() {
    log "Pushing image to Artifact Registry..."

    docker push "${FULL_IMAGE}"

    log "Image pushed: ${FULL_IMAGE}"
}

# -----------------------------------------------------------------------------
# Step 4: Deploy to Cloud Run
# -----------------------------------------------------------------------------
deploy_cloudrun() {
    log "Deploying to Cloud Run..."

    gcloud run deploy "${SERVICE_NAME}" \
        --image="${FULL_IMAGE}" \
        --region="${REGION}" \
        --project="${PROJECT_ID}" \
        --platform=managed \
        --allow-unauthenticated \
        --port=8080 \
        --memory=1Gi \
        --cpu=1 \
        --min-instances=0 \
        --max-instances=10 \
        --concurrency=80 \
        --timeout=300 \
        --set-env-vars="NODE_ENV=production" \
        --set-env-vars="PORT=8080" \
        --set-env-vars="EMAIL_SERVICE_ENABLED=false"

    # Get service URL
    SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
        --region="${REGION}" \
        --project="${PROJECT_ID}" \
        --format="value(status.url)")

    log "Deployment complete!"
    log "Service URL: ${SERVICE_URL}"
    log "Health check: ${SERVICE_URL}/health"
}

# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------
main() {
    local command="${1:-all}"

    cd "$(dirname "$0")"

    case "${command}" in
        build)
            check_prerequisites
            build_image
            ;;
        push)
            push_image
            ;;
        deploy)
            deploy_cloudrun
            ;;
        all)
            check_prerequisites
            setup_artifact_registry
            build_image
            push_image
            deploy_cloudrun
            ;;
        *)
            echo "Usage: $0 [build|push|deploy|all]"
            exit 1
            ;;
    esac
}

main "$@"
