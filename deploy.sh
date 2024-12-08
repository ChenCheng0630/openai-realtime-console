#!/bin/bash

# Build and push the images
docker-compose build

# Deploy the stack
docker-compose up -d
