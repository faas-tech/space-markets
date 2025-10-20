#!/bin/bash
#
# Run Demo Script
# Ensures clean Anvil state before running the demo
#

set -e

echo "🧹 Cleaning up any existing Anvil processes..."
killall -9 anvil 2>/dev/null || true
sleep 1

echo "🚀 Starting fresh Anvil instance..."
anvil > /tmp/anvil-demo.log 2>&1 &
ANVIL_PID=$!

# Wait for Anvil to be ready
sleep 3

echo "📦 Running demo..."
echo ""

npx tsx test/offchain/src/simple-demo.ts

# Keep Anvil running or kill it
echo ""
echo "Press Ctrl+C to stop Anvil, or it will continue running..."
wait $ANVIL_PID
