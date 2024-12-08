FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy relay server code
COPY relay-server ./relay-server

# Copy .env file if it exists
COPY .env* ./

# Expose WebSocket port
EXPOSE 8081

# Start the relay server
CMD ["npm", "run", "relay"]