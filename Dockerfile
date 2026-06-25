# Stage 1: Build dependencies and app
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install all dependencies (required for Next.js build)
RUN npm ci

# Copy all source files
COPY . .

# Build the Next.js application
RUN npm run build

# Stage 2: Runner image
FROM node:20-alpine

WORKDIR /app

# Copy node_modules and package descriptors from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copy Next.js build output and configuration
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/pages ./pages
COPY --from=builder /app/components ./components
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/utils ./utils

# Switch to the non-root node user
RUN chown -R node:node /app
USER node

# Default Environment Variables
ENV PORT=4000
ENV NODE_ENV=production

# Expose the API port (package.json start script defaults to 4000)
EXPOSE 4000

# Start the application
CMD ["npm", "run", "start"]
