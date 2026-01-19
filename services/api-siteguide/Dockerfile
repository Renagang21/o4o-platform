# SiteGuide Core API - Cloud Run Dockerfile
#
# WO-SITEGUIDE-CLOUD-RUN-V1
# Domain: siteguide.co.kr
#
# Build: docker build -t siteguide-core .
# Run:   docker run -p 8080:8080 siteguide-core

FROM node:22-slim

# Set working directory
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --prod=false

# Copy source code
COPY . .

# Build TypeScript
RUN pnpm run build

# Remove dev dependencies after build
RUN pnpm prune --prod

# Set environment variables
ENV NODE_ENV=production
ENV SERVICE_NAME=siteguide
ENV SERVICE_DOMAIN=siteguide.co.kr

# Cloud Run uses PORT environment variable (default 8080)
ENV PORT=8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 8080) + '/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start the service
CMD ["node", "dist/main.js"]
