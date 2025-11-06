#!/bin/bash

# GPU DEX Test Runner
# This script ensures tests run on a fresh localnet instance

echo "🧪 GPU DEX Test Suite Runner"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if solana-test-validator is running
echo -e "${YELLOW}📋 Checking for running validator...${NC}"
if pgrep -f "solana-test-validator" > /dev/null; then
    echo -e "${RED}⚠️  Validator already running. Stopping it...${NC}"
    pkill -9 -f "solana-test-validator"
    sleep 2
fi

# Clean up any existing test ledger
echo -e "${YELLOW}🗑️  Cleaning up old test ledger...${NC}"
rm -rf test-ledger

# Set Solana to localhost
echo -e "${YELLOW}🔧 Configuring Solana CLI to localhost...${NC}"
solana config set --url localhost > /dev/null 2>&1

# Start fresh validator in background (without Metaplex for faster startup)
echo -e "${YELLOW}🚀 Starting fresh local validator...${NC}"
solana-test-validator --reset \
    --quiet \
    --ledger test-ledger \
    > test-validator.log 2>&1 &

VALIDATOR_PID=$!
echo -e "${GREEN}✓ Validator started (PID: $VALIDATOR_PID)${NC}"

# Wait for validator to be ready
echo -e "${YELLOW}⏳ Waiting for validator to be ready...${NC}"
sleep 3

# Check if validator is responsive
MAX_RETRIES=15
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if solana cluster-version > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Validator is ready!${NC}"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -e "${YELLOW}  Attempt $RETRY_COUNT/$MAX_RETRIES...${NC}"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}✗ Validator failed to start${NC}"
    echo -e "${YELLOW}📄 Checking logs...${NC}"
    tail -20 test-validator.log
    kill $VALIDATOR_PID 2>/dev/null
    exit 1
fi

# Run anchor test with skip-local-validator flag
echo -e "${YELLOW}🧪 Running tests...${NC}"
echo ""
anchor test --skip-local-validator

# Capture exit code
TEST_EXIT_CODE=$?

# Cleanup
echo ""
echo -e "${YELLOW}🧹 Cleaning up...${NC}"
kill $VALIDATOR_PID 2>/dev/null
sleep 1

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
else
    echo -e "${RED}✗ Some tests failed (exit code: $TEST_EXIT_CODE)${NC}"
fi

exit $TEST_EXIT_CODE
