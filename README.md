# MCP Date-Time Server for n8n

HTTP wrapper and OpenShift deployment for the [MCP Date-Time Server](https://github.com/dennisonbertram/mcp-date-time) to enable n8n workflows to get accurate current dates and times.

## Overview

This deployment wraps the Model Context Protocol (MCP) Date-Time server with an HTTP API that n8n can easily consume. It solves the problem of LLMs and automated workflows using stale or incorrect dates/times.

## Features

- **Current DateTime**: Get accurate current date and time
- **Date Parsing**: Validate and parse date strings
- **Date Formatting**: Convert between different date formats
- **Date Arithmetic**: Calculate differences and add/subtract time
- **Timezone Support**: Handle multiple timezones
- **High Availability**: Runs 2 replicas by default
- **OpenShift Native**: Uses BuildConfig for automatic image builds

## Architecture

```
┌─────────┐    HTTP     ┌──────────────┐    stdio    ┌─────────────┐
│   n8n   │ ────────> │ HTTP Wrapper │ ────────> │ MCP Server  │
│Workflow │            │  (Express)   │            │ (Node.js)   │
└─────────┘            └──────────────┘            └─────────────┘
```

## Quick Start

### Prerequisites

- OpenShift 4.x cluster with `oc` CLI configured
- n8n namespace (or create one)

### Deploy to OpenShift

```bash
# Deploy everything
./deploy.sh

# Or step by step:
oc create namespace n8n
oc apply -f k8s/imagestream.yaml
oc apply -f k8s/buildconfig.yaml
oc start-build mcp-date-time -n n8n --follow
oc apply -f k8s/service.yaml
oc apply -f k8s/deployment.yaml
oc apply -f k8s/route.yaml
```

### Verify Deployment

```bash
# Check pods
oc get pods -n n8n -l app=mcp-date-time

# Get service URL
oc get route mcp-date-time -n n8n

# Test health endpoint
curl -k https://$(oc get route mcp-date-time -n n8n -o jsonpath='{.spec.host}')/health
```

## API Reference

### Base URL

**Internal (within cluster):** `http://mcp-date-time.n8n.svc.cluster.local`  
**External (via Route):** `https://mcp-date-time-n8n.apps.<cluster-domain>`

### Endpoints

#### 1. Get Current Date/Time

```bash
GET /api/datetime/current?timezone=UTC&format=iso
```

**Query Parameters:**
- `timezone` (optional): Timezone name (default: UTC)
- `format` (optional): Output format (default: iso)

**Example:**
```bash
curl "http://mcp-date-time.n8n.svc.cluster.local/api/datetime/current?timezone=America/New_York"
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1234567890,
  "result": {
    "datetime": "2024-04-25T13:45:00-04:00",
    "timezone": "America/New_York"
  }
}
```

#### 2. Parse Date

```bash
POST /api/datetime/parse
Content-Type: application/json

{
  "dateString": "2024-04-25T10:30:00Z",
  "timezone": "UTC"
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1234567890,
  "result": {
    "valid": true,
    "parsed": "2024-04-25T10:30:00.000Z"
  }
}
```

#### 3. Format Date

```bash
POST /api/datetime/format
Content-Type: application/json

{
  "dateString": "2024-04-25T10:30:00Z",
  "format": "YYYY-MM-DD HH:mm:ss",
  "timezone": "America/Los_Angeles"
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1234567890,
  "result": {
    "formatted": "2024-04-25 03:30:00"
  }
}
```

#### 4. Calculate Date Difference

```bash
POST /api/datetime/difference
Content-Type: application/json

{
  "startDate": "2024-04-01",
  "endDate": "2024-04-25",
  "unit": "days"
}
```

**Units:** `years`, `months`, `weeks`, `days`, `hours`, `minutes`, `seconds`

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1234567890,
  "result": {
    "difference": 24,
    "unit": "days"
  }
}
```

#### 5. Add Time to Date

```bash
POST /api/datetime/add
Content-Type: application/json

{
  "dateString": "2024-04-25T10:30:00Z",
  "amount": 7,
  "unit": "days"
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1234567890,
  "result": {
    "newDate": "2024-05-02T10:30:00.000Z"
  }
}
```

#### 6. List Available Tools

```bash
GET /api/tools
```

Returns documentation for all available endpoints.

## Usage in n8n

### Example 1: Get Current Timestamp in Workflow

1. Add **HTTP Request** node
2. Configure:
   - **Method:** GET
   - **URL:** `http://mcp-date-time.n8n.svc.cluster.local/api/datetime/current`
   - **Query Parameters:** 
     - `timezone`: `UTC`
     - `format`: `iso`

### Example 2: Calculate Days Until Deadline

1. Add **HTTP Request** node
2. Configure:
   - **Method:** POST
   - **URL:** `http://mcp-date-time.n8n.svc.cluster.local/api/datetime/difference`
   - **Body:**
     ```json
     {
       "startDate": "{{ $now }}",
       "endDate": "{{ $node["Set"].json.deadline }}",
       "unit": "days"
     }
     ```

### Example 3: Schedule Future Task

1. Add **HTTP Request** node to get current time
2. Add another **HTTP Request** node to add time:
   ```json
   {
     "dateString": "{{ $json.result.datetime }}",
     "amount": 30,
     "unit": "days"
   }
   ```
3. Use result in downstream nodes

### Example 4: Convert Timezone

1. Add **HTTP Request** node
2. Configure:
   - **Method:** POST
   - **URL:** `http://mcp-date-time.n8n.svc.cluster.local/api/datetime/format`
   - **Body:**
     ```json
     {
       "dateString": "{{ $json.timestamp }}",
       "format": "YYYY-MM-DD HH:mm:ss",
       "timezone": "Europe/London"
     }
     ```

## Local Development

### Build Container Locally

```bash
./build.sh
```

### Test Locally

```bash
podman run --rm -p 8080:8080 mcp-date-time:latest
```

### Test API Locally

```bash
# Current datetime
curl http://localhost:8080/api/datetime/current

# Parse date
curl -X POST http://localhost:8080/api/datetime/parse \
  -H "Content-Type: application/json" \
  -d '{"dateString": "2024-04-25T10:30:00Z"}'

# Format date
curl -X POST http://localhost:8080/api/datetime/format \
  -H "Content-Type: application/json" \
  -d '{
    "dateString": "2024-04-25T10:30:00Z",
    "format": "YYYY-MM-DD",
    "timezone": "America/New_York"
  }'
```

## Monitoring

### Health Checks

```bash
# Liveness probe
curl http://mcp-date-time.n8n.svc.cluster.local/health

# Readiness probe
curl http://mcp-date-time.n8n.svc.cluster.local/ready
```

### View Logs

```bash
# All pods
oc logs -n n8n -l app=mcp-date-time --tail=100 -f

# Specific pod
oc logs -n n8n <pod-name> -f
```

### Check Resources

```bash
# Pod status
oc get pods -n n8n -l app=mcp-date-time

# Service endpoints
oc get svc mcp-date-time -n n8n

# Route
oc get route mcp-date-time -n n8n
```

## Scaling

### Horizontal Scaling

```bash
# Scale to 3 replicas
oc scale deployment mcp-date-time -n n8n --replicas=3

# Or edit deployment.yaml and set replicas: 3
```

### Resource Limits

Default resources:
- **Requests:** 100m CPU, 128Mi memory
- **Limits:** 500m CPU, 256Mi memory

Adjust in `k8s/deployment.yaml` if needed.

## Troubleshooting

### Pod Not Starting

```bash
# Check pod events
oc describe pod <pod-name> -n n8n

# Check logs
oc logs <pod-name> -n n8n
```

### Build Failures

```bash
# Check build logs
oc logs -f bc/mcp-date-time -n n8n

# Retry build
oc start-build mcp-date-time -n n8n --follow
```

### Connection Issues from n8n

1. Verify service is running:
   ```bash
   oc get svc mcp-date-time -n n8n
   ```

2. Test from within cluster:
   ```bash
   oc run -it --rm debug --image=alpine -- sh
   apk add curl
   curl http://mcp-date-time.n8n.svc.cluster.local/health
   ```

3. Check n8n namespace can reach service:
   ```bash
   # From n8n pod
   curl http://mcp-date-time.n8n.svc.cluster.local/health
   ```

### API Returns Errors

Check MCP server logs for stdio communication issues:
```bash
oc logs -n n8n -l app=mcp-date-time | grep -i error
```

## Security

### Network Policy (Optional)

If using NetworkPolicies, allow n8n pods to access MCP service:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-n8n-to-mcp
  namespace: n8n
spec:
  podSelector:
    matchLabels:
      app: mcp-date-time
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: n8n
    ports:
    - protocol: TCP
      port: 8080
```

### RBAC

The deployment runs with minimal privileges:
- Non-root user (UID 1001)
- No privilege escalation
- All capabilities dropped
- Read-only root filesystem (where possible)

## Performance

### Expected Performance

- **Latency:** <50ms per request (internal cluster)
- **Throughput:** 100+ req/s per pod
- **Memory:** ~100-150Mi per pod
- **CPU:** Minimal (<0.1 core idle, <0.5 core under load)

### Load Testing

```bash
# Install hey (HTTP load testing tool)
# https://github.com/rakyll/hey

# Test with 100 concurrent requests
hey -n 1000 -c 100 http://mcp-date-time.n8n.svc.cluster.local/api/datetime/current
```

## Files

```
mcp-date-time/
├── README.md                  # This file
├── build.sh                   # Build container image locally
├── deploy.sh                  # Deploy to OpenShift
├── docker/
│   ├── Dockerfile            # Container image definition
│   └── http-wrapper.js       # HTTP API wrapper for MCP server
└── k8s/
    ├── buildconfig.yaml      # OpenShift BuildConfig
    ├── deployment.yaml       # Kubernetes Deployment
    ├── imagestream.yaml      # OpenShift ImageStream
    ├── route.yaml            # OpenShift Route (external access)
    └── service.yaml          # Kubernetes Service
```

## Source

Based on: https://github.com/dennisonbertram/mcp-date-time

## License

See upstream repository for license information.
