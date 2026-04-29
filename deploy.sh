#!/bin/bash
set -e

NAMESPACE="${NAMESPACE:-n8n}"

echo "Deploying MCP Date-Time Server to OpenShift..."
echo "Namespace: $NAMESPACE"
echo ""

# Create namespace if it doesn't exist
oc create namespace $NAMESPACE 2>/dev/null || echo "Namespace $NAMESPACE already exists"

# Apply manifests
echo "Creating ImageStream..."
oc apply -f k8s/imagestream.yaml

echo "Creating BuildConfig..."
oc apply -f k8s/buildconfig.yaml

echo "Waiting for build to start..."
sleep 5

# Start build
echo "Starting build..."
oc start-build mcp-date-time -n $NAMESPACE --follow

echo "Creating Service..."
oc apply -f k8s/service.yaml

echo "Creating Deployment..."
oc apply -f k8s/deployment.yaml

echo "Creating Route (optional)..."
oc apply -f k8s/route.yaml

echo ""
echo "Deployment complete!"
echo ""
echo "Check deployment status:"
echo "  oc get pods -n $NAMESPACE -l app=mcp-date-time"
echo ""
echo "Get service URL:"
echo "  oc get route mcp-date-time -n $NAMESPACE -o jsonpath='{.spec.host}'"
echo ""
echo "Test the API:"
echo "  curl -k https://\$(oc get route mcp-date-time -n $NAMESPACE -o jsonpath='{.spec.host}')/api/datetime/current"
