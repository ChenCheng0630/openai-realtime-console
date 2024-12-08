# Build stage
FROM node:18-alpine as builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the React app
RUN npm run build

# Production stage
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install production dependencies for relay server
COPY package*.json ./
RUN npm install --production

# Copy built React app and relay server
COPY --from=builder /app/build ./build
COPY relay-server ./relay-server
COPY .env ./.env

# Install serve to host the static files
RUN npm install -g serve

# Expose ports for both frontend and relay server
EXPOSE 3000 8081

# Start both servers using a shell script
COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]