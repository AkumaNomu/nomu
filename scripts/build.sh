#!/bin/bash
set -e

echo "Installing system dependencies..."
apt-get update -qq
apt-get install -y -qq python3 python3-pip ffmpeg > /dev/null 2>&1

echo "Installing yt-dlp..."
pip3 install -q yt-dlp

echo "Building Next.js app..."
pnpm --filter web build

echo "Build complete!"
