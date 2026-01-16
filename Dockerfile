FROM node:18-alpine AS builder

# Build frontend (Tailwind CSS + JS bundle)
WORKDIR /build
COPY package.json tailwind.config.js build.mjs ./
COPY src ./src
COPY static ./static
RUN npm install
RUN npm run build

FROM node:18-alpine

# Install git (required for npm to install from GitHub)
RUN apk add --no-cache git

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY server/package.json ./server/
COPY server/server.js ./server/
COPY server/database.js ./server/
COPY server/lib ./server/lib
COPY server/middleware ./server/middleware
COPY server/modules ./server/modules
RUN npm install --prefix server --omit=dev

# Copy static assets (HTML, images, icons, manifest - no source JS)
COPY static/index.html ./static/
COPY static/*.png static/*.ico static/*.svg static/site.webmanifest ./static/

# Copy built assets from builder stage (CSS + JS bundle)
COPY --from=builder /build/static/output.css ./static/output.css
COPY --from=builder /build/static/dist ./static/dist

# Copy changelog for version info
COPY CHANGELOG.md ./

# Create logs and data directories with proper permissions
RUN mkdir -p server/logs server/data && \
    chmod -R 777 server/logs server/data

# Set Docker environment variable for UI warnings
ENV RUNNING_IN_DOCKER=true

# Expose port
EXPOSE 4000

# Start the application
CMD [ "node", "server/server.js" ]