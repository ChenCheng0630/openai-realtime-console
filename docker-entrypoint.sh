#!/bin/sh

# print env
printenv

# Start the relay server in the background
node relay-server/index.js &

# Start the frontend server
serve -s build -l 3000
