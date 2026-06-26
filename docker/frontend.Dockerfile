FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package.json and lockfile
COPY package*.json ./
COPY tsconfig.base.json ./

# Copy package.json files for all workspaces to allow caching of npm install
COPY apps/frontend/package*.json ./apps/frontend/
COPY apps/backend/package*.json ./apps/backend/
COPY packages/mcp-server/package*.json ./packages/mcp-server/
COPY packages/policy-engine/package*.json ./packages/policy-engine/
COPY packages/shared/package*.json ./packages/shared/

# Install all dependencies across workspaces
RUN npm install

# Copy the rest of the workspace
COPY . .

# Build the shared packages and frontend
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=apps/frontend

FROM node:20-alpine

WORKDIR /app

# Next.js standalone output needs specific handling if enabled, but we are using workspaces.
# Copying the built app.
COPY --from=builder /app /app

EXPOSE 3000

# Next.js server port configuration
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "run", "start", "--workspace=apps/frontend"]
