# Multi-stage build for MCP Date-Time Server
FROM node:20-alpine AS builder

WORKDIR /app

# Clone the repository
RUN apk add --no-cache git && \
    git clone https://github.com/dennisonbertram/mcp-date-time.git . && \
    npm install && \
    npm run build:standalone

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Copy standalone bundle (includes all dependencies)
COPY --from=builder /app/dist/index.standalone.js /app/index.js

# Install Express for HTTP wrapper
RUN npm install --omit=dev express

# Copy HTTP wrapper
COPY http-wrapper.js /app/http-wrapper.js

# Create non-root user
RUN addgroup -g 1001 mcp && \
    adduser -D -u 1001 -G mcp mcp && \
    chown -R mcp:mcp /app

USER mcp

# Expose port for HTTP wrapper
EXPOSE 8080

# Set environment variables
ENV PORT=8080 \
    NODE_ENV=production

# Default command runs the HTTP wrapper
CMD ["node", "/app/http-wrapper.js"]
