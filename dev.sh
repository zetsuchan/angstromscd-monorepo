#!/bin/bash
echo "🚀 Starting AngstromSCD development environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "📦 Installing dependencies..."
bun run setup

echo "🔧 Starting all services..."
bun run dev:services
