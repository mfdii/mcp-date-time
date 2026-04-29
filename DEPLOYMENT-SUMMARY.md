# MCP Date-Time Server - Deployment Summary

## What Was Created

Complete deployment artifacts for running the [MCP Date-Time Server](https://github.com/dennisonbertram/mcp-date-time) in OpenShift/Kubernetes with an HTTP API wrapper for n8n integration.

### Directory Structure

```
mcp-date-time/
├── README.md                           # Complete documentation
├── QUICKSTART.md                       # 5-minute deployment guide
├── DEPLOYMENT-SUMMARY.md              # This file
├── .gitignore                         # Git ignore rules
│
├── build.sh                           # Build container locally
├── deploy.sh                          # Deploy to OpenShift (one-command)
├── test-api.sh                        # Test all API endpoints
│
├── docker/
│   ├── Dockerfile                     # Multi-stage container build
│   └── http-wrapper.js                # Express HTTP API wrapper
│
├── k8s/                               # Kubernetes/OpenShift manifests
│   ├── imagestream.yaml              # Image storage
│   ├── buildconfig.yaml              # Automatic image builds
│   ├── deployment.yaml               # 2 replica deployment
│   ├── service.yaml                  # ClusterIP service
│   └── route.yaml                    # External HTTPS route
│
└── examples/
    └── n8n-workflow-example.json     # Sample n8n workflow
```

## Architecture

### Components

1. **MCP Date-Time Server** (Node.js)
   - Original stdio-based MCP server
   - Provides 5 date/time tools
   - Standalone bundle (no dependencies)

2. **HTTP Wrapper** (Express.js)
   - Wraps stdio protocol in HTTP endpoints
   - JSON request/response
   - RESTful API design
   - Health checks for Kubernetes

3. **Container Image**
   - Multi-stage build
   - Alpine Linux base (~50MB)
   - Non-root user (UID 1001)
   - Security-hardened

4. **Kubernetes Deployment**
   - 2 replicas (high availability)
   - Resource limits set
   - Liveness and readiness probes
   - Auto-restart on failure

### Network Flow

```
External Request
    ↓
OpenShift Route (HTTPS)
    ↓
Service (ClusterIP)
    ↓
Deployment (2 pods)
    ↓
HTTP Wrapper (Express) :8080
    ↓
MCP Server (stdio)
    ↓
Response
```

### Internal n8n Flow

```
n8n Workflow Node
    ↓
HTTP Request: http://mcp-date-time.n8n.svc.cluster.local/api/...
    ↓
Service (ClusterIP)
    ↓
Deployment Pod
    ↓
JSON Response
```

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/ready` | GET | Readiness check |
| `/api/tools` | GET | List all tools |
| `/api/datetime/current` | GET | Get current datetime |
| `/api/datetime/parse` | POST | Parse date string |
| `/api/datetime/format` | POST | Format date |
| `/api/datetime/difference` | POST | Calculate date difference |
| `/api/datetime/add` | POST | Add time to date |

## Deployment Options

### Option 1: One-Command Deploy (Recommended)

```bash
cd ~/dev/nuclab/mcp-date-time
./deploy.sh
```

This runs:
1. `oc create namespace n8n`
2. `oc apply -f k8s/imagestream.yaml`
3. `oc apply -f k8s/buildconfig.yaml`
4. `oc start-build mcp-date-time --follow`
5. `oc apply -f k8s/service.yaml`
6. `oc apply -f k8s/deployment.yaml`
7. `oc apply -f k8s/route.yaml`

### Option 2: Step-by-Step

```bash
# 1. Create namespace
oc create namespace n8n

# 2. Build image
oc apply -f k8s/imagestream.yaml
oc apply -f k8s/buildconfig.yaml
oc start-build mcp-date-time -n n8n --follow

# 3. Deploy service
oc apply -f k8s/service.yaml
oc apply -f k8s/deployment.yaml

# 4. (Optional) Expose externally
oc apply -f k8s/route.yaml
```

### Option 3: Local Container Build

```bash
# Build locally with Podman/Docker
./build.sh

# Test locally
podman run --rm -p 8080:8080 mcp-date-time:latest

# Test API
./test-api.sh localhost:8080

# Push to registry and deploy
# (manual steps - see README.md)
```

## Configuration

### Environment Variables

Set in `k8s/deployment.yaml`:

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | 8080 | HTTP server port |
| `NODE_ENV` | production | Node.js environment |
| `TZ` | UTC | Default timezone |

### Resource Limits

Default settings in `k8s/deployment.yaml`:

```yaml
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 256Mi
```

Adjust based on load:
- Light usage: 100m/128Mi
- Medium usage: 250m/256Mi
- Heavy usage: 500m/512Mi

### Replicas

Default: 2 replicas for high availability

Scale as needed:
```bash
oc scale deployment mcp-date-time -n n8n --replicas=3
```

## Security Features

### Container Security

- ✅ Non-root user (UID 1001)
- ✅ No privilege escalation
- ✅ All capabilities dropped
- ✅ Minimal Alpine base image
- ✅ Standalone bundle (no npm install at runtime)

### Network Security

- ✅ ClusterIP service (internal only by default)
- ✅ TLS termination at route
- ✅ NetworkPolicy support ready
- ✅ RBAC compatible

### OpenShift Security

Passes OpenShift restricted SCC (Security Context Constraint):
- Runs as non-root
- Uses assigned UID
- No host access required
- No special capabilities needed

## Testing

### 1. Test Container Locally

```bash
./build.sh
podman run --rm -p 8080:8080 mcp-date-time:latest
./test-api.sh localhost:8080
```

### 2. Test in OpenShift

```bash
# After deployment
./test-api.sh

# Or manually
ROUTE=$(oc get route mcp-date-time -n n8n -o jsonpath='{.spec.host}')
curl -k "https://${ROUTE}/api/datetime/current"
```

### 3. Test from n8n

Import `examples/n8n-workflow-example.json` and run.

## Monitoring

### Check Deployment Status

```bash
# Pod status
oc get pods -n n8n -l app=mcp-date-time

# Deployment status
oc get deployment mcp-date-time -n n8n

# Service endpoints
oc get endpoints mcp-date-time -n n8n
```

### View Logs

```bash
# All pods
oc logs -n n8n -l app=mcp-date-time --tail=100 -f

# Specific pod
oc logs -n n8n <pod-name> -f

# Previous pod (if crashed)
oc logs -n n8n <pod-name> --previous
```

### Check Health

```bash
# Health endpoint
curl -k "https://$(oc get route mcp-date-time -n n8n -o jsonpath='{.spec.host}')/health"

# Readiness endpoint
curl -k "https://$(oc get route mcp-date-time -n n8n -o jsonpath='{.spec.host}')/ready"
```

## Troubleshooting

### Build Failures

**Problem**: BuildConfig fails to build

**Solution**:
```bash
# Check build logs
oc logs -f bc/mcp-date-time -n n8n

# Common issues:
# - GitHub rate limit: Wait and retry
# - Network timeout: Retry build
# - npm install fails: Check Node version in Dockerfile

# Retry build
oc start-build mcp-date-time -n n8n --follow
```

### Pods Not Starting

**Problem**: Pods stuck in CrashLoopBackOff

**Solution**:
```bash
# Check pod events
oc describe pod <pod-name> -n n8n

# Check logs
oc logs <pod-name> -n n8n

# Common issues:
# - Image pull failure: Check ImageStream
# - OOM killed: Increase memory limits
# - Startup timeout: Increase initialDelaySeconds
```

### Service Unreachable from n8n

**Problem**: n8n can't reach service

**Solution**:
```bash
# 1. Verify service exists
oc get svc mcp-date-time -n n8n

# 2. Check endpoints
oc get endpoints mcp-date-time -n n8n

# 3. Test from debug pod
oc run -it --rm debug --image=alpine -n n8n -- sh
apk add curl
curl http://mcp-date-time.n8n.svc.cluster.local/health

# 4. Verify namespace
# Ensure n8n and mcp-date-time are in same namespace
# Or use FQDN: mcp-date-time.n8n.svc.cluster.local
```

### API Returns Errors

**Problem**: HTTP 500 errors from API

**Solution**:
```bash
# Check logs for MCP server errors
oc logs -n n8n -l app=mcp-date-time | grep -i error

# Common issues:
# - Invalid date format: Check request body
# - Timezone not recognized: Use valid IANA timezone
# - MCP server crash: Check logs, restart pod
```

## Updating

### Update Image

```bash
# Trigger new build
oc start-build mcp-date-time -n n8n --follow

# Deployment will auto-update when build completes
```

### Update Configuration

```bash
# Edit deployment
oc edit deployment mcp-date-time -n n8n

# Or update manifest and apply
vi k8s/deployment.yaml
oc apply -f k8s/deployment.yaml
```

### Rollback

```bash
# View history
oc rollout history deployment/mcp-date-time -n n8n

# Rollback to previous version
oc rollout undo deployment/mcp-date-time -n n8n

# Rollback to specific revision
oc rollout undo deployment/mcp-date-time -n n8n --to-revision=2
```

## Performance

### Expected Metrics

- **Latency**: <50ms (internal), <200ms (external)
- **Throughput**: 100+ req/s per pod
- **Memory**: 80-150Mi per pod
- **CPU**: <0.1 core idle, <0.3 core under load

### Load Testing

```bash
# Install hey (HTTP load generator)
# https://github.com/rakyll/hey

# Test with 100 concurrent requests
hey -n 1000 -c 100 http://mcp-date-time.n8n.svc.cluster.local/api/datetime/current

# Monitor during test
oc adm top pods -n n8n -l app=mcp-date-time
```

### Scaling

Horizontal scaling (add more pods):
```bash
oc scale deployment mcp-date-time -n n8n --replicas=5
```

Vertical scaling (more resources per pod):
```yaml
# Edit k8s/deployment.yaml
resources:
  requests:
    cpu: 250m
    memory: 256Mi
  limits:
    cpu: 1000m
    memory: 512Mi
```

## Integration with n8n

### Internal Service URL (Recommended)

Use from n8n workflows:
```
http://mcp-date-time.n8n.svc.cluster.local
```

### External URL (if needed)

```bash
# Get external URL
EXTERNAL_URL=$(oc get route mcp-date-time -n n8n -o jsonpath='{.spec.host}')
echo "https://${EXTERNAL_URL}"
```

Use for:
- External testing
- Webhooks from outside cluster
- Development/debugging

## Maintenance

### Backup

Backup manifests are already in git:
```bash
cd ~/dev/nuclab/mcp-date-time
git add .
git commit -m "MCP date-time deployment"
```

### Updates

Watch for updates to upstream MCP server:
- https://github.com/dennisonbertram/mcp-date-time

Rebuild when updated:
```bash
oc start-build mcp-date-time -n n8n --follow
```

### Cleanup

Remove deployment:
```bash
oc delete all -l app=mcp-date-time -n n8n
oc delete imagestream mcp-date-time -n n8n
oc delete buildconfig mcp-date-time -n n8n
```

Complete cleanup including namespace:
```bash
oc delete namespace n8n
```

## Next Steps

1. ✅ Deploy: Run `./deploy.sh`
2. ✅ Test: Run `./test-api.sh`
3. ✅ Use: Import `examples/n8n-workflow-example.json` into n8n
4. ✅ Monitor: Check logs and metrics
5. ✅ Scale: Adjust replicas based on load

## Resources

- **Upstream**: https://github.com/dennisonbertram/mcp-date-time
- **Documentation**: [README.md](README.md)
- **Quick Start**: [QUICKSTART.md](QUICKSTART.md)
- **Location**: `~/dev/nuclab/mcp-date-time/`

## Support

For issues:
1. Check logs: `oc logs -n n8n -l app=mcp-date-time`
2. Run tests: `./test-api.sh`
3. Check README.md troubleshooting section
4. Verify OpenShift resources: `oc get all -n n8n -l app=mcp-date-time`
