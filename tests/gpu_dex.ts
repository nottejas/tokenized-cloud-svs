/**
 * GPU DEX Test Suite Entry Point
 * 
 * This is a legacy file. The comprehensive test suite has been reorganized into modular files:
 * 
 * - helpers/test-utils.ts - Shared utilities and helpers
 * - 01-marketplace-init.test.ts - Marketplace initialization
 * - 02-token-operations.test.ts - Token minting and metadata
 * - 03-listing-operations.test.ts - Listing CRUD operations
 * - 04-error-cases.test.ts - Error scenarios and edge cases
 * 
 * Run tests with:
 *   anchor test
 * 
 * Or run specific test suites:
 *   anchor test -- --grep "Marketplace Initialization"
 *   anchor test -- --grep "Token Operations"
 *   anchor test -- --grep "Listing Operations"
 *   anchor test -- --grep "Error Cases"
 * 
 * See tests/README.md for detailed documentation.
 */

// Import all test suites to ensure they run
import "./01-marketplace-init.test";
import "./02-token-operations.test";
import "./03-listing-operations.test";
import "./04-error-cases.test";
