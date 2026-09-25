#!/usr/bin/env bash
# Deploys TrueHue (web app + API) to Azure Container Apps.
#
# Requirements: Azure CLI (`brew install azure-cli`) and an Azure subscription.
# The image is built in the cloud by Azure Container Registry, so no local
# Docker is needed (this also avoids ARM vs x86 issues on Apple Silicon Macs).
#
# Usage: ./deploy/azure-deploy.sh
# Override defaults with environment variables, e.g. LOCATION=westus2 ./deploy/azure-deploy.sh
set -euo pipefail

APP_NAME="${APP_NAME:-truehue}"
RESOURCE_GROUP="${RESOURCE_GROUP:-truehue-rg}"
LOCATION="${LOCATION:-eastus}"
ENVIRONMENT="${ENVIRONMENT:-truehue-env}"

cd "$(dirname "$0")/.."

if ! az account show > /dev/null 2>&1; then
  echo "Signing in to Azure..."
  az login > /dev/null
fi

echo "Registering required resource providers (first run only)..."
az extension add --name containerapp --upgrade --only-show-errors
az provider register --namespace Microsoft.App --wait
az provider register --namespace Microsoft.OperationalInsights --wait
az provider register --namespace Microsoft.ContainerRegistry --wait

echo "Building and deploying '$APP_NAME' to $LOCATION..."
az containerapp up \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --environment "$ENVIRONMENT" \
  --source . \
  --ingress external \
  --target-port 8000

az containerapp update \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --cpu 1 --memory 2Gi \
  --min-replicas 0 --max-replicas 3 \
  --output none

URL="https://$(az containerapp show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" \
  --query properties.configuration.ingress.fqdn --output tsv)"

echo "Waiting for the app to respond..."
for _ in $(seq 1 30); do
  if curl -fsS "$URL/api/health" > /dev/null 2>&1; then
    echo
    echo "TrueHue is live at: $URL"
    exit 0
  fi
  sleep 10
done
echo "Deployed, but $URL/api/health is not responding yet. Check logs with:"
echo "  az containerapp logs show --name $APP_NAME --resource-group $RESOURCE_GROUP --follow"
exit 1
