#!/usr/bin/env bash
#
# run-all.sh — Open terminal tabs for all test suites and frontend dev server
#
# Tab 1: forge build + forge test (on-chain Solidity)
# Tab 2: Off-chain unit tests (no Anvil needed — crypto, x402, api-integration)
# Tab 3: Anvil local chain + Anvil-dependent tests (integration, enhanced-flow)
# Tab 4: Frontend dev server (Next.js)
#
# Usage: ./run-all.sh
#
set -euo pipefail

PROJECT_DIR="/Users/shaunmartinak/Documents/SoftwareProjects/Asset-Leasing-Protocol"

# Fish PATH setup for each tab (Foundry + Homebrew + system)
FISH_PATH="set -gx PATH \$HOME/.foundry/bin /opt/homebrew/bin /opt/homebrew/sbin \$PATH"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Asset Leasing Protocol — Full Test & Dev Runner${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Clean stale frontend build cache
echo -e "${YELLOW}Cleaning stale .next cache...${NC}"
rm -rf "$PROJECT_DIR/frontend/.next"

# ---- Tab 1: Forge Build + On-Chain Tests ----
echo -e "${GREEN}[1/4]${NC} Opening tab: On-Chain Tests (forge build + forge test)"
osascript -e "
tell application \"Terminal\"
    activate
    tell application \"System Events\" to keystroke \"t\" using command down
    delay 0.5
    do script \"$FISH_PATH; cd '$PROJECT_DIR'; and echo '━━━ ON-CHAIN: Building + Testing ━━━'; and echo ''; and echo 'Running forge build...'; and forge build; and echo ''; and echo 'Running forge test...'; and forge test -vv\" in front window
end tell
"

sleep 0.3

# ---- Tab 2: Off-Chain Unit Tests (no Anvil needed) ----
echo -e "${GREEN}[2/4]${NC} Opening tab: Off-Chain Unit Tests (no Anvil)"
osascript -e "
tell application \"Terminal\"
    activate
    tell application \"System Events\" to keystroke \"t\" using command down
    delay 0.5
    do script \"$FISH_PATH; cd '$PROJECT_DIR/test/offchain'; and echo '━━━ OFF-CHAIN UNIT TESTS ━━━'; and echo ''; and echo 'Running tests that do NOT require Anvil...'; and echo '(crypto-hash, x402-streaming, api-integration)'; and echo ''; and npx vitest run tests/crypto-hash.test.ts tests/x402-streaming.test.ts tests/api-integration.test.ts\" in front window
end tell
"

sleep 0.3

# ---- Tab 3: Anvil + Anvil-Dependent Tests ----
echo -e "${GREEN}[3/4]${NC} Opening tab: Anvil Chain + Integration Tests"
osascript -e "
tell application \"Terminal\"
    activate
    tell application \"System Events\" to keystroke \"t\" using command down
    delay 0.5
    do script \"$FISH_PATH; cd '$PROJECT_DIR'; and echo '━━━ ANVIL + INTEGRATION TESTS ━━━'; and echo ''; and echo 'Starting Anvil local chain on port 8545...'; and echo 'After Anvil starts, open another tab and run:'; and echo '  cd test/offchain && npm test'; and echo '  cd test/offchain && npx tsx demos/05-complete-system.ts'; and echo ''; and anvil --host 127.0.0.1 --port 8545 --chain-id 31337 --accounts 10 --balance 10000\" in front window
end tell
"

sleep 0.3

# ---- Tab 4: Frontend Dev Server ----
echo -e "${GREEN}[4/4]${NC} Opening tab: Frontend Dev Server (Next.js)"
osascript -e "
tell application \"Terminal\"
    activate
    tell application \"System Events\" to keystroke \"t\" using command down
    delay 0.5
    do script \"$FISH_PATH; cd '$PROJECT_DIR/frontend'; and echo '━━━ FRONTEND DEV SERVER ━━━'; and echo ''; and echo 'Starting Next.js dev server...'; and echo ''; and npm run dev\" in front window
end tell
"

echo ""
echo -e "${YELLOW}4 tabs launched:${NC}"
echo ""
echo "  Tab 1: forge build + forge test  (on-chain Solidity tests)"
echo "  Tab 2: vitest (unit tests)       (crypto, x402, api-integration — no Anvil needed)"
echo "  Tab 3: anvil                     (local chain for integration tests + demos)"
echo "  Tab 4: next dev                  (frontend dev server)"
echo ""
echo -e "${BLUE}Frontend URLs:${NC}"
echo "  Home:          http://localhost:3000"
echo "  Protocol Demo: http://localhost:3000/protocol-demo"
echo "  Assets:        http://localhost:3000/assets"
echo "  Leases:        http://localhost:3000/dashboard/leases"
echo ""
echo -e "${YELLOW}To run Anvil-dependent tests (after Tab 3 Anvil is running):${NC}"
echo "  cd test/offchain && npm test                              # all tests"
echo "  cd test/offchain && npx tsx demos/05-complete-system.ts   # 12-step demo"
echo "  cd test/offchain && npx tsx demos/x402-second-stream.ts   # X402 demo"
echo ""
echo -e "${GREEN}Done.${NC}"
