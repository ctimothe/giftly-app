#!/bin/bash
set -e

echo "Building Giftly frontend..."
cd client
npm install
npm run build
cd ..

echo "Build completed successfully!"
