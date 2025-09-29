#!/bin/bash

# Integration Test Runner for Asset Leasing Protocol
# This script ensures proper setup and teardown of the test environment

set -e  # Exit on error

echo "================================================"
echo "Asset Leasing Protocol - Integration Test Suite"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "Checking prerequisites..."

# Check if Anvil is installed
if ! command -v anvil &> /dev/null; then
    echo -e "${RED}Error: Anvil is not installed${NC}"
    echo "Please install Foundry: curl -L https://foundry.paradigm.xyz | bash"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Not in the test/offchain directory${NC}"
    echo "Please run this script from: test/offchain/"
    exit 1
fi

# Check if contracts are compiled
CONTRACTS_DIR="../../out"
if [ ! -d "$CONTRACTS_DIR" ]; then
    echo -e "${YELLOW}Warning: Contracts not compiled. Compiling now...${NC}"
    cd ../..
    forge build
    cd test/offchain
fi

echo -e "${GREEN}✓ Prerequisites satisfied${NC}"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Kill any existing Anvil instances on our test ports
echo "Cleaning up any existing Anvil instances..."
for PORT in 8546 8547; do
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "  Killing process on port $PORT..."
        kill $(lsof -Pi :$PORT -sTCP:LISTEN -t) 2>/dev/null || true
        sleep 1
    fi
done

echo ""
echo "Starting Integration Tests..."
echo "================================"
echo ""

# Run the tests with proper environment
export NODE_ENV=test
export FORCE_COLOR=1

# Run tests with Vitest
npx vitest run tests/integration.test.ts \
    --reporter=verbose \
    --bail 1

TEST_EXIT_CODE=$?

echo ""
echo "================================"

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ All integration tests passed!${NC}"
else
    echo -e "${RED}✗ Some tests failed${NC}"
fi

echo ""
echo "Cleaning up..."

# Kill any Anvil instances that might still be running
for PORT in 8546 8547; do
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        kill $(lsof -Pi :$PORT -sTCP:LISTEN -t) 2>/dev/null || true
    fi
done

echo "Done!"
exit $TEST_EXIT_CODE