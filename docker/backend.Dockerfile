FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies required for Prisma
RUN apk add --no-cache openssl

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

# Generate Prisma client
RUN npm run db:generate

# Build the shared dependencies and backend
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=packages/policy-engine
RUN npm run build --workspace=apps/backend

FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

# Copy the built output from the builder stage
COPY --from=builder /app /app

EXPOSE 3001

CMD ["npm", "run", "start", "--workspace=apps/backend"]
