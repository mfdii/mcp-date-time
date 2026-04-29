#!/bin/bash
set -e

echo "Building MCP Date-Time Server container image..."

# Check if we're in the right directory
if [ ! -f "docker/Dockerfile" ]; then
    echo "Error: Please run this script from the mcp-date-time directory"
    exit 1
fi

# Build container image
podman build -t mcp-date-time:latest -f docker/Dockerfile docker/

echo "Build complete!"
echo "Image: mcp-date-time:latest"
echo ""
echo "To test locally:"
echo "  podman run --rm -p 8080:8080 mcp-date-time:latest"
echo ""
echo "To push to OpenShift registry:"
echo "  ./push-to-openshift.sh"
