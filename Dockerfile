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

# Copy built React app from builder
COPY --from=builder /app/build ./build

# Install serve to host the static files
RUN npm install -g serve

# Expose port for frontend
EXPOSE 3000

# Start the server
CMD ["serve", "-s", "build", "-l", "3000"]