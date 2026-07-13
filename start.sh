#!/bin/bash
# Railway startup script

# Set default environment variables if not set
export NODE_ENV=${NODE_ENV:-production}
export PORT=${PORT:-3000}

# Navigate to backend and start server
cd backend
npm install
node server.js
