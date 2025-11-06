import * as anchor from "@coral-xyz/anchor";
import { SystemProgram } from "@solana/web3.js";
import { assert } from "chai";
import { setupTestContext, TestContext } from "./helpers/test-utils";

describe("1. Marketplace Initialization", () => {
  let ctx: TestContext;

  before("Setup test context", async () => {
    ctx = await setupTestContext();
  });

  it("✓ Should initialize marketplace successfully", async () => {
    const tx = await ctx.program.methods
      .initializeMarketplace()
      .accounts({
        marketplace: ctx.marketplacePDA,
        authority: ctx.authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("  └─ Marketplace initialized:", tx.slice(0, 8) + "...");

    // Fetch and verify marketplace account
    const marketplace = await ctx.program.account.marketplace.fetch(ctx.marketplacePDA);
    
    assert.ok(
      marketplace.authority.equals(ctx.authority.publicKey),
      "Authority should match"
    );
    assert.equal(
      marketplace.listingCount.toNumber(),
      0,
      "Listing count should be 0"
    );
  });

  it("✗ Should fail to initialize marketplace twice", async () => {
    try {
      await ctx.program.methods
        .initializeMarketplace()
        .accounts({
          marketplace: ctx.marketplacePDA,
          authority: ctx.authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      
      assert.fail("Should have thrown an error");
    } catch (error) {
      assert.include(
        error.message,
        "already in use",
        "Should fail with 'already in use' error"
      );
    }
  });

  it("✓ Should verify marketplace PDA derivation", async () => {
    const marketplace = await ctx.program.account.marketplace.fetch(ctx.marketplacePDA);
    
    // Verify the account exists and has correct data
    assert.ok(marketplace, "Marketplace account should exist");
    assert.ok(
      marketplace.authority.equals(ctx.authority.publicKey),
      "Authority should be persisted correctly"
    );
  });
});
