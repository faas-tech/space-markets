.PHONY: clean build test testAll testContract deploy createEquityToken updateEquityToken setRoles create install deps-check clean-deps fmt

# Check if dependencies are installed
FORGE_STD_EXISTS := $(wildcard lib/forge-std/src/console.sol)

# Build the project - automatically installs dependencies if needed
build: deps-check
	clear && forge clean && forge build

# Check and install dependencies if needed
deps-check:
	@if [ ! -f "lib/forge-std/src/console.sol" ]; then \
		echo "📦 Dependencies not found. Installing..."; \
		$(MAKE) install; \
	fi

# Install dependencies
install:
	@echo "📥 Installing dependencies..."
	@# Remove problematic pyth-sdk-solidity if it exists
	@git rm --cached lib/pyth-sdk-solidity 2>/dev/null || true
	@rm -rf lib/pyth-sdk-solidity 2>/dev/null || true
	@# Initialize and update submodules
	@git submodule update --init --recursive
	@echo "✅ Dependencies installed!"

# Clean dependencies (for testing fresh installs)
clean-deps:
	@echo "🗑️  Removing all dependencies..."
	@rm -rf lib/forge-std lib/openzeppelin-contracts lib/openzeppelin-contracts-upgradeable lib/openzeppelin-foundry-upgrades lib/verifications lib/pyth-sdk-solidity
	@git config --file .git/config --remove-section submodule.lib/forge-std 2>/dev/null || true
	@git config --file .git/config --remove-section submodule.lib/openzeppelin-contracts 2>/dev/null || true
	@git config --file .git/config --remove-section submodule.lib/openzeppelin-contracts-upgradeable 2>/dev/null || true
	@git config --file .git/config --remove-section submodule.lib/openzeppelin-foundry-upgrades 2>/dev/null || true
	@git config --file .git/config --remove-section submodule.lib/verifications 2>/dev/null || true
	@git config --file .git/config --remove-section submodule.lib/pyth-sdk-solidity 2>/dev/null || true
	@rm -rf .git/modules/lib
	@echo "✅ Dependencies removed!"

# Clean everything including dependencies
clean-all: clean-deps
	@forge clean
	@echo "✅ Everything cleaned!"

# Format Solidity code using forge fmt
fmt:
	@echo "🎨 Formatting Solidity code..."
	@forge fmt
	@echo "✅ Code formatted!"

testAll:
	clear && forge clean && forge test

test:
	clear && forge clean && forge test --match-test $(t) $(v)

testContract:
	clear && forge test --match-path $(c)