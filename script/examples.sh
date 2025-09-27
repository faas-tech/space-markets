#!/bin/bash

# Asset Leasing Protocol - Deployment Examples
# This file contains example commands for deploying the protocol on different networks

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if .env file exists
check_env() {
    if [ ! -f .env ]; then
        print_error ".env file not found!"
        echo "Please copy .env.example to .env and fill in your values"
        exit 1
    fi
    print_success ".env file found"
}

# Load environment variables
load_env() {
    source .env
    if [ -z "$PRIVATE_KEY" ] || [ -z "$RPC_URL" ]; then
        print_error "PRIVATE_KEY and RPC_URL must be set in .env file"
        exit 1
    fi
    print_success "Environment variables loaded"
}

# ============================================================================
# EXAMPLE 1: Local Development with Anvil
# ============================================================================
deploy_local() {
    print_header "DEPLOYING TO LOCAL ANVIL"

    # Start anvil in background if not running
    if ! curl -s -X POST --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' http://localhost:8545 > /dev/null 2>&1; then
        print_warning "Starting Anvil..."
        anvil --host 0.0.0.0 --port 8545 --chain-id 31337 &
        ANVIL_PID=$!
        sleep 3
    fi

    export RPC_URL="http://localhost:8545"
    export PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"  # Anvil default key

    echo "1. Deploying core contracts..."
    forge script script/Deploy.s.sol:Deploy \
        --rpc-url $RPC_URL \
        --broadcast \
        --gas-estimate-multiplier 120

    echo "2. Running post-deployment setup..."
    forge script script/PostDeploy.s.sol:PostDeploy \
        --rpc-url $RPC_URL \
        --broadcast

    echo "3. Creating test assets..."
    forge script script/CreateTestAssets.s.sol:CreateTestAssets \
        --rpc-url $RPC_URL \
        --broadcast

    echo "4. Verifying deployment..."
    forge script script/VerifyDeployment.s.sol:VerifyDeployment \
        --rpc-url $RPC_URL

    print_success "Local deployment completed!"
    echo "Deployment artifacts saved to: ./deployments/31337-anvil-localhost.json"

    # Kill anvil if we started it
    if [ ! -z "$ANVIL_PID" ]; then
        print_warning "Stopping Anvil (PID: $ANVIL_PID)"
        kill $ANVIL_PID
    fi
}

# ============================================================================
# EXAMPLE 2: Ethereum Sepolia Testnet
# ============================================================================
deploy_sepolia() {
    print_header "DEPLOYING TO ETHEREUM SEPOLIA"

    check_env
    load_env

    if [ -z "$ETHERSCAN_API_KEY" ]; then
        print_warning "ETHERSCAN_API_KEY not set - contracts will not be verified"
        VERIFY_FLAG=""
    else
        VERIFY_FLAG="--verify --etherscan-api-key $ETHERSCAN_API_KEY"
    fi

    echo "1. Deploying core contracts..."
    forge script script/Deploy.s.sol:Deploy \
        --rpc-url $RPC_URL \
        --broadcast \
        $VERIFY_FLAG \
        --gas-estimate-multiplier 120

    echo "2. Running post-deployment setup..."
    forge script script/PostDeploy.s.sol:PostDeploy \
        --rpc-url $RPC_URL \
        --broadcast

    echo "3. Verifying deployment..."
    forge script script/VerifyDeployment.s.sol:VerifyDeployment \
        --rpc-url $RPC_URL

    print_success "Sepolia deployment completed!"
    echo "Deployment artifacts saved to: ./deployments/11155111-ethereum-sepolia.json"
}

# ============================================================================
# EXAMPLE 3: Ethereum Mainnet (Production)
# ============================================================================
deploy_mainnet() {
    print_header "DEPLOYING TO ETHEREUM MAINNET"
    print_warning "THIS IS A PRODUCTION DEPLOYMENT!"

    echo "Are you sure you want to deploy to mainnet? (yes/no)"
    read confirmation
    if [ "$confirmation" != "yes" ]; then
        print_error "Deployment cancelled"
        exit 1
    fi

    check_env
    load_env

    # Additional checks for mainnet
    if [ -z "$ETHERSCAN_API_KEY" ]; then
        print_error "ETHERSCAN_API_KEY is required for mainnet deployment"
        exit 1
    fi

    # Check deployer balance
    echo "Checking deployer balance..."
    BALANCE=$(cast balance $(cast wallet address $PRIVATE_KEY) --rpc-url $RPC_URL)
    echo "Deployer balance: $BALANCE wei"

    echo "1. Deploying core contracts..."
    forge script script/Deploy.s.sol:Deploy \
        --rpc-url $RPC_URL \
        --broadcast \
        --verify \
        --etherscan-api-key $ETHERSCAN_API_KEY \
        --gas-estimate-multiplier 130 \
        --slow

    echo "2. Running post-deployment setup..."
    forge script script/PostDeploy.s.sol:PostDeploy \
        --rpc-url $RPC_URL \
        --broadcast \
        --gas-estimate-multiplier 130

    echo "3. Verifying deployment..."
    forge script script/VerifyDeployment.s.sol:VerifyDeployment \
        --rpc-url $RPC_URL

    print_success "Mainnet deployment completed!"
    echo "Deployment artifacts saved to: ./deployments/1-ethereum-mainnet.json"

    print_warning "IMPORTANT: Consider transferring admin roles to a multi-sig wallet!"
}

# ============================================================================
# EXAMPLE 4: Base Mainnet
# ============================================================================
deploy_base_mainnet() {
    print_header "DEPLOYING TO BASE MAINNET"
    print_warning "THIS IS A PRODUCTION DEPLOYMENT!"

    echo "Are you sure you want to deploy to Base mainnet? (yes/no)"
    read confirmation
    if [ "$confirmation" != "yes" ]; then
        print_error "Deployment cancelled"
        exit 1
    fi

    check_env
    load_env

    # Additional checks for mainnet
    if [ -z "$BASESCAN_API_KEY" ]; then
        print_error "BASESCAN_API_KEY is required for Base mainnet deployment"
        exit 1
    fi

    echo "1. Deploying core contracts..."
    forge script script/Deploy.s.sol:Deploy \
        --rpc-url $RPC_URL \
        --broadcast \
        --verify \
        --etherscan-api-key $BASESCAN_API_KEY \
        --verifier-url https://api.basescan.org/api \
        --gas-estimate-multiplier 130 \
        --slow

    echo "2. Running post-deployment setup..."
    forge script script/PostDeploy.s.sol:PostDeploy \
        --rpc-url $RPC_URL \
        --broadcast \
        --gas-estimate-multiplier 130

    echo "3. Verifying deployment..."
    forge script script/VerifyDeployment.s.sol:VerifyDeployment \
        --rpc-url $RPC_URL

    print_success "Base mainnet deployment completed!"
    echo "Deployment artifacts saved to: ./deployments/8453-base-mainnet.json"

    print_warning "IMPORTANT: Consider transferring admin roles to a multi-sig wallet!"
}

# ============================================================================
# EXAMPLE 5: Base Sepolia Testnet
# ============================================================================
deploy_base_sepolia() {
    print_header "DEPLOYING TO BASE SEPOLIA"

    check_env
    load_env

    if [ -z "$BASESCAN_API_KEY" ]; then
        print_warning "BASESCAN_API_KEY not set - contracts will not be verified"
        VERIFY_FLAG=""
    else
        VERIFY_FLAG="--verify --etherscan-api-key $BASESCAN_API_KEY --verifier-url https://api-sepolia.basescan.org/api"
    fi

    echo "1. Deploying core contracts..."
    forge script script/Deploy.s.sol:Deploy \
        --rpc-url $RPC_URL \
        --broadcast \
        $VERIFY_FLAG \
        --gas-estimate-multiplier 120

    echo "2. Running post-deployment setup..."
    forge script script/PostDeploy.s.sol:PostDeploy \
        --rpc-url $RPC_URL \
        --broadcast

    echo "3. Creating orbital test assets..."
    forge script script/CreateTestAssets.s.sol:CreateTestAssets \
        --rpc-url $RPC_URL \
        --broadcast

    echo "4. Verifying deployment..."
    forge script script/VerifyDeployment.s.sol:VerifyDeployment \
        --rpc-url $RPC_URL

    print_success "Base Sepolia deployment completed!"
    echo "Deployment artifacts saved to: ./deployments/84532-base-sepolia.json"
}

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

# Quick deployment check
quick_check() {
    print_header "QUICK DEPLOYMENT CHECK"
    forge script script/VerifyDeployment.s.sol:QuickCheck --rpc-url $RPC_URL
}

# Create test assets on existing deployment
create_test_assets() {
    print_header "CREATING TEST ASSETS"
    check_env
    load_env

    forge script script/CreateTestAssets.s.sol:CreateTestAssets \
        --rpc-url $RPC_URL \
        --broadcast

    print_success "Test assets created!"
}

# Grant snapshot role to marketplace for a specific asset token
grant_snapshot_role() {
    if [ -z "$1" ]; then
        print_error "Usage: grant_snapshot_role <asset_token_address>"
        exit 1
    fi

    print_header "GRANTING SNAPSHOT ROLE"
    check_env
    load_env

    forge script script/PostDeploy.s.sol:GrantSnapshotRole \
        --rpc-url $RPC_URL \
        --broadcast \
        --sig "run(address)" $1

    print_success "Snapshot role granted to marketplace for token: $1"
}

# Show deployment status
show_status() {
    print_header "DEPLOYMENT STATUS"

    echo "Available deployment files:"
    ls -la deployments/ 2>/dev/null || echo "No deployments found"

    echo ""
    echo "To check a specific deployment:"
    echo "forge script script/VerifyDeployment.s.sol:QuickCheck --rpc-url <RPC_URL>"
}

# ============================================================================
# MAIN SCRIPT
# ============================================================================

case "$1" in
    "local")
        deploy_local
        ;;
    "sepolia")
        deploy_sepolia
        ;;
    "mainnet")
        deploy_mainnet
        ;;
    "base-mainnet")
        deploy_base_mainnet
        ;;
    "base-sepolia")
        deploy_base_sepolia
        ;;
    "check")
        quick_check
        ;;
    "test-assets")
        create_test_assets
        ;;
    "grant-snapshot")
        grant_snapshot_role $2
        ;;
    "status")
        show_status
        ;;
    *)
        echo "Asset Leasing Protocol - Deployment Examples"
        echo ""
        echo "Usage: $0 {command} [options]"
        echo ""
        echo "Supported Networks (5 networks only):"
        echo "  local              Deploy to local Anvil instance (Chain ID: 31337)"
        echo "  sepolia            Deploy to Ethereum Sepolia testnet (Chain ID: 11155111)"
        echo "  mainnet            Deploy to Ethereum mainnet (Chain ID: 1) - PRODUCTION"
        echo "  base-mainnet       Deploy to Base mainnet (Chain ID: 8453) - PRODUCTION"
        echo "  base-sepolia       Deploy to Base Sepolia testnet (Chain ID: 84532)"
        echo ""
        echo "Utility Commands:"
        echo "  check              Quick deployment health check"
        echo "  test-assets        Create orbital test assets on existing deployment"
        echo "  grant-snapshot     Grant snapshot role: grant-snapshot <token_address>"
        echo "  status             Show deployment status"
        echo ""
        echo "Examples:"
        echo "  $0 local                    # Deploy locally with Anvil + orbital assets"
        echo "  $0 base-sepolia             # Deploy to Base Sepolia testnet"
        echo "  $0 test-assets              # Create orbital test assets"
        echo "  $0 check                    # Check deployment health"
        echo "  $0 grant-snapshot 0x123...  # Grant role to specific token"
        echo ""
        echo "Environment Setup:"
        echo "1. Copy .env.example to .env and fill in your values"
        echo "2. Set RPC_URL, PRIVATE_KEY, and API keys (ETHERSCAN_API_KEY, BASESCAN_API_KEY)"
        echo "3. Ensure sufficient balance in your deployer wallet"
        echo "4. For production: use hardware wallet or secure key management"
        echo ""
        echo "Note: This deployment script now supports only 5 networks as specified."
        exit 1
        ;;
esac