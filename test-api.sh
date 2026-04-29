#!/bin/bash

# Test script for MCP Date-Time API

# Determine base URL
if [ -z "$1" ]; then
    # Try to get from OpenShift route
    BASE_URL=$(oc get route mcp-date-time -n n8n -o jsonpath='{.spec.host}' 2>/dev/null)
    if [ -z "$BASE_URL" ]; then
        BASE_URL="localhost:8080"
        PROTOCOL="http"
    else
        PROTOCOL="https"
    fi
else
    BASE_URL="$1"
    PROTOCOL="http"
fi

echo "Testing MCP Date-Time API at: ${PROTOCOL}://${BASE_URL}"
echo "=============================================="
echo ""

# Test 1: Health check
echo "1. Health Check"
curl -sk "${PROTOCOL}://${BASE_URL}/health" | jq .
echo ""
echo ""

# Test 2: Current datetime
echo "2. Get Current DateTime (UTC)"
curl -sk "${PROTOCOL}://${BASE_URL}/api/datetime/current?timezone=UTC&format=iso" | jq .
echo ""
echo ""

# Test 3: Current datetime with timezone
echo "3. Get Current DateTime (America/New_York)"
curl -sk "${PROTOCOL}://${BASE_URL}/api/datetime/current?timezone=America/New_York" | jq .
echo ""
echo ""

# Test 4: Parse date
echo "4. Parse Date"
curl -sk -X POST "${PROTOCOL}://${BASE_URL}/api/datetime/parse" \
  -H "Content-Type: application/json" \
  -d '{"dateString": "2024-04-25T10:30:00Z", "timezone": "UTC"}' | jq .
echo ""
echo ""

# Test 5: Format date
echo "5. Format Date"
curl -sk -X POST "${PROTOCOL}://${BASE_URL}/api/datetime/format" \
  -H "Content-Type: application/json" \
  -d '{
    "dateString": "2024-04-25T10:30:00Z",
    "format": "datetime",
    "timezone": "America/Los_Angeles"
  }' | jq .
echo ""
echo ""

# Test 6: Calculate difference
echo "6. Calculate Date Difference"
curl -sk -X POST "${PROTOCOL}://${BASE_URL}/api/datetime/difference" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2024-04-01",
    "endDate": "2024-04-25",
    "unit": "days"
  }' | jq .
echo ""
echo ""

# Test 7: Add time to date
echo "7. Add Time to Date"
curl -sk -X POST "${PROTOCOL}://${BASE_URL}/api/datetime/add" \
  -H "Content-Type: application/json" \
  -d '{
    "dateString": "2024-04-25T10:30:00Z",
    "amount": 7,
    "unit": "days"
  }' | jq .
echo ""
echo ""

# Test 8: List tools
echo "8. List Available Tools"
curl -sk "${PROTOCOL}://${BASE_URL}/api/tools" | jq .
echo ""
echo ""

echo "=============================================="
echo "All tests complete!"
