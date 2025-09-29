# Process Cleanup Instructions

## Current Running Processes (Need Manual Cleanup)

### Background Node Processes
Several `node simple-api-demo.cjs` processes are still running from our testing. These need to be manually terminated before starting fresh.

### Cleanup Commands

```bash
# Kill all node processes related to our demo
pkill -f "node.*simple.*demo"

# Kill anvil processes
pkill anvil

# Check for remaining processes on our ports
lsof -ti:8545 | xargs kill  # Anvil blockchain
lsof -ti:3456 | xargs kill  # API server

# Verify cleanup
ps aux | grep -E "(anvil|simple.*demo)"
```

### For Next Session: Enhanced Cleanup Script

The next iteration should include a comprehensive cleanup script:

```typescript
// Future: cleanup.ts
async function cleanup() {
  // Kill processes by PID file
  // Clean up ports 8545, 3456
  // Remove temp files
  // Reset blockchain state
}
```

## Process Management Improvements Needed

1. **PID File Management**: Save process IDs to files for reliable cleanup
2. **Port Detection**: Automatically detect and clean conflicting ports
3. **Graceful Shutdown**: Implement proper signal handling in all scripts
4. **Combined Script**: Single script that handles both deployment and cleanup

## Ready for Fresh Start

After manual cleanup, the system is ready for TypeScript migration and enhanced process management in the next development phase.