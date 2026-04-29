# MCP Date-Time Server - Quick Start Guide

## 5-Minute Deployment

### Step 1: Deploy to OpenShift

```bash
cd ~/dev/nuclab/mcp-date-time
./deploy.sh
```

This will:
1. Create the `n8n` namespace if needed
2. Build the container image
3. Deploy 2 replicas of the service
4. Create a route for external access

### Step 2: Verify Deployment

```bash
# Check pods are running
oc get pods -n n8n -l app=mcp-date-time

# Expected output:
# NAME                            READY   STATUS    RESTARTS   AGE
# mcp-date-time-xxxxxxxxx-xxxxx   1/1     Running   0          2m
# mcp-date-time-xxxxxxxxx-xxxxx   1/1     Running   0          2m
```

### Step 3: Test the API

```bash
# Run test script
./test-api.sh

# Or test manually:
curl -k "https://$(oc get route mcp-date-time -n n8n -o jsonpath='{.spec.host}')/api/datetime/current"
```

### Step 4: Use in n8n

#### Option A: Import Example Workflow

1. Open n8n
2. Go to **Workflows** → **Import from File**
3. Select `examples/n8n-workflow-example.json`
4. Click **Test workflow**

#### Option B: Create Manually

1. Add **HTTP Request** node
2. Set **URL**: `http://mcp-date-time.n8n.svc.cluster.local/api/datetime/current`
3. Add query parameter: `timezone` = `UTC`
4. Execute the node

## Common Use Cases

### 1. Get Current Time

```
HTTP Request Node:
  Method: GET
  URL: http://mcp-date-time.n8n.svc.cluster.local/api/datetime/current
  Query: timezone=UTC
```

### 2. Schedule Future Task (7 days from now)

```
HTTP Request Node 1 - Get Current Time:
  Method: GET
  URL: http://mcp-date-time.n8n.svc.cluster.local/api/datetime/current

HTTP Request Node 2 - Add 7 Days:
  Method: POST
  URL: http://mcp-date-time.n8n.svc.cluster.local/api/datetime/add
  Body JSON:
  {
    "dateString": "{{ $json.result.datetime }}",
    "amount": 7,
    "unit": "days"
  }
```

### 3. Convert Timezone

```
HTTP Request Node:
  Method: POST
  URL: http://mcp-date-time.n8n.svc.cluster.local/api/datetime/format
  Body JSON:
  {
    "dateString": "{{ $json.timestamp }}",
    "format": "YYYY-MM-DD HH:mm:ss",
    "timezone": "Europe/London"
  }
```

## Service URLs

**Internal (from within cluster/n8n):**
```
http://mcp-date-time.n8n.svc.cluster.local
```

**External (from outside cluster):**
```bash
# Get external URL
oc get route mcp-date-time -n n8n -o jsonpath='{.spec.host}'

# Use with https://
https://<route-host>/api/datetime/current
```

## Troubleshooting

### Service Not Responding

```bash
# Check pod status
oc get pods -n n8n -l app=mcp-date-time

# Check logs
oc logs -n n8n -l app=mcp-date-time --tail=50

# Restart deployment
oc rollout restart deployment/mcp-date-time -n n8n
```

### n8n Can't Reach Service

Verify you're using the correct internal URL:
```
http://mcp-date-time.n8n.svc.cluster.local
```

NOT the external route URL when calling from n8n!

### Build Failed

```bash
# Check build logs
oc logs -f bc/mcp-date-time -n n8n

# Retry build
oc start-build mcp-date-time -n n8n --follow
```

## Next Steps

- Read the full [README.md](README.md) for detailed API documentation
- Check [examples/](examples/) for more n8n workflow templates
- Scale deployment: `oc scale deployment mcp-date-time -n n8n --replicas=3`

## Support

For issues with:
- **Deployment**: Check OpenShift logs and events
- **API**: Run `./test-api.sh` to verify endpoints
- **MCP Server**: See [upstream repo](https://github.com/dennisonbertram/mcp-date-time)
