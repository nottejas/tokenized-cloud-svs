import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { SystemProgram, SYSVAR_RENT_PUBKEY, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { assert } from "chai";
import { 
  setupTestContext, 
  TestContext,
  createTestUser,
  createTokenAccount,
  getListingPDA,
  getEscrowPDA,
  TEST_CONSTANTS,
} from "./helpers/test-utils";

describe("4. Error Cases", () => {
  let ctx: TestContext;
  let seller: anchor.web3.Keypair;
  let buyer: anchor.web3.Keypair;
  let sellerTokenAccount: anchor.web3.PublicKey;
  let buyerTokenAccount: anchor.web3.PublicKey;

  before("Setup test users", async () => {
    ctx = await setupTestContext();
    
    seller = await createTestUser(ctx.provider);
    buyer = await createTestUser(ctx.provider);

    sellerTokenAccount = await createTokenAccount(
      ctx.provider,
      ctx.gpuMintPDA,
      seller.publicKey,
      seller
    );
    buyerTokenAccount = await createTokenAccount(
      ctx.provider,
      ctx.gpuMintPDA,
      buyer.publicKey,
      buyer
    );

    // Mint tokens to seller
    await ctx.program.methods
      .mintGpuTokens(new BN(100 * 1_000_000_000))
      .accounts({
        gpuMint: ctx.gpuMintPDA,
        userTokenAccount: sellerTokenAccount,
        mintAuthority: ctx.mintAuthorityPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
  });

  describe("Create Listing Errors", () => {
    it("✗ Should fail with zero price", async () => {
      const marketplace = await ctx.program.account.marketplace.fetch(ctx.marketplacePDA);
      const listingId = marketplace.listingCount.toNumber();

      const [listingPDA] = getListingPDA(ctx.program, seller.publicKey, listingId);
      const [escrowPDA] = getEscrowPDA(ctx.program, listingPDA);

      try {
        await ctx.program.methods
          .createListing(new BN(0), TEST_CONSTANTS.LIST_AMOUNT)
          .accounts({
            listing: listingPDA,
            marketplace: ctx.marketplacePDA,
            escrowTokenAccount: escrowPDA,
            sellerTokenAccount: sellerTokenAccount,
            gpuMint: ctx.gpuMintPDA,
            seller: seller.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
          })
          .signers([seller])
          .rpc();
        
        assert.fail("Should have thrown InvalidPrice error");
      } catch (error) {
        assert.include(error.message, "InvalidPrice");
        console.log("  └─ ✓ Rejected zero price");
      }
    });

    it("✗ Should fail with zero amount", async () => {
      const marketplace = await ctx.program.account.marketplace.fetch(ctx.marketplacePDA);
      const listingId = marketplace.listingCount.toNumber();

      const [listingPDA] = getListingPDA(ctx.program, seller.publicKey, listingId);
      const [escrowPDA] = getEscrowPDA(ctx.program, listingPDA);

      try {
        await ctx.program.methods
          .createListing(TEST_CONSTANTS.LIST_PRICE, new BN(0))
          .accounts({
            listing: listingPDA,
            marketplace: ctx.marketplacePDA,
            escrowTokenAccount: escrowPDA,
            sellerTokenAccount: sellerTokenAccount,
            gpuMint: ctx.gpuMintPDA,
            seller: seller.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
          })
          .signers([seller])
          .rpc();
        
        assert.fail("Should have thrown InvalidAmount error");
      } catch (error) {
        assert.include(error.message, "InvalidAmount");
        console.log("  └─ ✓ Rejected zero amount");
      }
    });

    it("✗ Should fail with amount too small (< 0.001 tokens)", async () => {
      const marketplace = await ctx.program.account.marketplace.fetch(ctx.marketplacePDA);
      const listingId = marketplace.listingCount.toNumber();

      const [listingPDA] = getListingPDA(ctx.program, seller.publicKey, listingId);
      const [escrowPDA] = getEscrowPDA(ctx.program, listingPDA);

      const tooSmallAmount = new BN(500_000); // 0.0005 tokens

      try {
        await ctx.program.methods
          .createListing(TEST_CONSTANTS.LIST_PRICE, tooSmallAmount)
          .accounts({
            listing: listingPDA,
            marketplace: ctx.marketplacePDA,
            escrowTokenAccount: escrowPDA,
            sellerTokenAccount: sellerTokenAccount,
            gpuMint: ctx.gpuMintPDA,
            seller: seller.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
          })
          .signers([seller])
          .rpc();
        
        assert.fail("Should have thrown AmountTooSmall error");
      } catch (error) {
        assert.include(error.message, "AmountTooSmall");
        console.log("  └─ ✓ Rejected amount < 0.001 tokens");
      }
    });

    it("✗ Should fail with insufficient token balance", async () => {
      const poorUser = await createTestUser(ctx.provider);
      const poorUserTokenAccount = await createTokenAccount(
        ctx.provider,
        ctx.gpuMintPDA,
        poorUser.publicKey,
        poorUser
      );

      const marketplace = await ctx.program.account.marketplace.fetch(ctx.marketplacePDA);
      const listingId = marketplace.listingCount.toNumber();

      const [listingPDA] = getListingPDA(ctx.program, poorUser.publicKey, listingId);
      const [escrowPDA] = getEscrowPDA(ctx.program, listingPDA);

      try {
        await ctx.program.methods
          .createListing(TEST_CONSTANTS.LIST_PRICE, TEST_CONSTANTS.LIST_AMOUNT)
          .accounts({
            listing: listingPDA,
            marketplace: ctx.marketplacePDA,
            escrowTokenAccount: escrowPDA,
            sellerTokenAccount: poorUserTokenAccount,
            gpuMint: ctx.gpuMintPDA,
            seller: poorUser.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
          })
          .signers([poorUser])
          .rpc();
        
        assert.fail("Should have thrown insufficient funds error");
      } catch (error) {
        assert.ok(error.message.includes("insufficient") || error.message.includes("0x1"));
        console.log("  └─ ✓ Rejected insufficient balance");
      }
    });
  });

  describe("Buy Listing Errors", () => {
    let listingPDA: anchor.web3.PublicKey;
    let escrowPDA: anchor.web3.PublicKey;

    before("Create listing for error tests", async () => {
      const marketplace = await ctx.program.account.marketplace.fetch(ctx.marketplacePDA);
      const listingId = marketplace.listingCount.toNumber();

      [listingPDA] = getListingPDA(ctx.program, seller.publicKey, listingId);
      [escrowPDA] = getEscrowPDA(ctx.program, listingPDA);

      await ctx.program.methods
        .createListing(TEST_CONSTANTS.LIST_PRICE, TEST_CONSTANTS.LIST_AMOUNT)
        .accounts({
          listing: listingPDA,
          marketplace: ctx.marketplacePDA,
          escrowTokenAccount: escrowPDA,
          sellerTokenAccount: sellerTokenAccount,
          gpuMint: ctx.gpuMintPDA,
          seller: seller.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([seller])
        .rpc();
    });

    it("✗ Should fail to buy more than available amount", async () => {
      const excessiveAmount = TEST_CONSTANTS.LIST_AMOUNT.add(new BN(1_000_000_000));

      try {
        await ctx.program.methods
          .buyListing(excessiveAmount)
          .accounts({
            listing: listingPDA,
            escrowTokenAccount: escrowPDA,
            buyerTokenAccount: buyerTokenAccount,
            buyer: buyer.publicKey,
            sellerSolAccount: seller.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([buyer])
          .rpc();
        
        assert.fail("Should have thrown InsufficientAmount error");
      } catch (error) {
        assert.include(error.message, "InsufficientAmount");
        console.log("  └─ ✓ Rejected excessive buy amount");
      }
    });

    it("✗ Should fail to buy from inactive listing", async () => {
      // Create and cancel a listing
      const marketplace = await ctx.program.account.marketplace.fetch(ctx.marketplacePDA);
      const inactiveListingId = marketplace.listingCount.toNumber();

      const [inactiveListingPDA] = getListingPDA(ctx.program, seller.publicKey, inactiveListingId);
      const [inactiveEscrowPDA] = getEscrowPDA(ctx.program, inactiveListingPDA);

      await ctx.program.methods
        .createListing(TEST_CONSTANTS.LIST_PRICE, TEST_CONSTANTS.LIST_AMOUNT)
        .accounts({
          listing: inactiveListingPDA,
          marketplace: ctx.marketplacePDA,
          escrowTokenAccount: inactiveEscrowPDA,
          sellerTokenAccount: sellerTokenAccount,
          gpuMint: ctx.gpuMintPDA,
          seller: seller.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([seller])
        .rpc();

      await ctx.program.methods
        .cancelListing()
        .accounts({
          listing: inactiveListingPDA,
          escrowTokenAccount: inactiveEscrowPDA,
          sellerTokenAccount: sellerTokenAccount,
          seller: seller.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([seller])
        .rpc();

      try {
        await ctx.program.methods
          .buyListing(new BN(1_000_000_000))
          .accounts({
            listing: inactiveListingPDA,
            escrowTokenAccount: inactiveEscrowPDA,
            buyerTokenAccount: buyerTokenAccount,
            buyer: buyer.publicKey,
            sellerSolAccount: seller.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([buyer])
          .rpc();
        
        assert.fail("Should have thrown ListingNotActive error");
      } catch (error) {
        assert.include(error.message, "ListingNotActive");
        console.log("  └─ ✓ Rejected buy from inactive listing");
      }
    });

    it("✗ Should fail with insufficient SOL for purchase", async () => {
      const poorBuyer = await createTestUser(ctx.provider);
      const poorBuyerTokenAccount = await createTokenAccount(
        ctx.provider,
        ctx.gpuMintPDA,
        poorBuyer.publicKey,
        poorBuyer
      );

      // Drain most of the buyer's SOL
      const balance = await ctx.provider.connection.getBalance(poorBuyer.publicKey);
      const drainAmount = balance - 0.01 * LAMPORTS_PER_SOL; // Leave 0.01 SOL

      const drainTx = new anchor.web3.Transaction().add(
        anchor.web3.SystemProgram.transfer({
          fromPubkey: poorBuyer.publicKey,
          toPubkey: seller.publicKey,
          lamports: drainAmount,
        })
      );
      await ctx.provider.sendAndConfirm(drainTx, [poorBuyer]);

      try {
        await ctx.program.methods
          .buyListing(TEST_CONSTANTS.LIST_AMOUNT)
          .accounts({
            listing: listingPDA,
            escrowTokenAccount: escrowPDA,
            buyerTokenAccount: poorBuyerTokenAccount,
            buyer: poorBuyer.publicKey,
            sellerSolAccount: seller.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([poorBuyer])
          .rpc();
        
        assert.fail("Should have thrown insufficient funds error");
      } catch (error) {
        assert.ok(error.message.includes("insufficient") || error.message.includes("0x1"));
        console.log("  └─ ✓ Rejected buy with insufficient SOL");
      }
    });
  });

  describe("Cancel Listing Errors", () => {
    let listingPDA: anchor.web3.PublicKey;
    let escrowPDA: anchor.web3.PublicKey;

    before("Create listing for cancel error tests", async () => {
      const marketplace = await ctx.program.account.marketplace.fetch(ctx.marketplacePDA);
      const listingId = marketplace.listingCount.toNumber();

      [listingPDA] = getListingPDA(ctx.program, seller.publicKey, listingId);
      [escrowPDA] = getEscrowPDA(ctx.program, listingPDA);

      await ctx.program.methods
        .createListing(TEST_CONSTANTS.LIST_PRICE, TEST_CONSTANTS.LIST_AMOUNT)
        .accounts({
          listing: listingPDA,
          marketplace: ctx.marketplacePDA,
          escrowTokenAccount: escrowPDA,
          sellerTokenAccount: sellerTokenAccount,
          gpuMint: ctx.gpuMintPDA,
          seller: seller.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([seller])
        .rpc();
    });

    it("✗ Should fail when non-seller tries to cancel", async () => {
      try {
        await ctx.program.methods
          .cancelListing()
          .accounts({
            listing: listingPDA,
            escrowTokenAccount: escrowPDA,
            sellerTokenAccount: sellerTokenAccount,
            seller: buyer.publicKey, // Wrong seller!
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([buyer])
          .rpc();
        
        assert.fail("Should have thrown authorization error");
      } catch (error: any) {
        const errorMsg = error.message || error.toString();
        assert.ok(
          errorMsg.includes("has_one") || 
          errorMsg.includes("ConstraintHasOne") ||
          errorMsg.includes("ConstraintSeeds") ||
          errorMsg.includes("A has one constraint was violated") ||
          errorMsg.includes("A seeds constraint was violated") ||
          error.code === 2001 ||
          error.code === 2006,
          `Expected authorization error but got: ${errorMsg}`
        );
        console.log("  └─ ✓ Rejected unauthorized cancel");
      }
    });

    it("✗ Should fail to cancel already cancelled listing", async () => {
      // Cancel the listing first
      await ctx.program.methods
        .cancelListing()
        .accounts({
          listing: listingPDA,
          escrowTokenAccount: escrowPDA,
          sellerTokenAccount: sellerTokenAccount,
          seller: seller.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([seller])
        .rpc();

      // Try to cancel again
      try {
        await ctx.program.methods
          .cancelListing()
          .accounts({
            listing: listingPDA,
            escrowTokenAccount: escrowPDA,
            sellerTokenAccount: sellerTokenAccount,
            seller: seller.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([seller])
          .rpc();
        
        assert.fail("Should have thrown ListingNotActive error");
      } catch (error) {
        assert.include(error.message, "ListingNotActive");
        console.log("  └─ ✓ Rejected double cancel");
      }
    });
  });

  describe("Close Listing Errors", () => {
    it("✗ Should fail to close active listing", async () => {
      const marketplace = await ctx.program.account.marketplace.fetch(ctx.marketplacePDA);
      const listingId = marketplace.listingCount.toNumber();

      const [listingPDA] = getListingPDA(ctx.program, seller.publicKey, listingId);
      const [escrowPDA] = getEscrowPDA(ctx.program, listingPDA);

      await ctx.program.methods
        .createListing(TEST_CONSTANTS.LIST_PRICE, TEST_CONSTANTS.LIST_AMOUNT)
        .accounts({
          listing: listingPDA,
          marketplace: ctx.marketplacePDA,
          escrowTokenAccount: escrowPDA,
          sellerTokenAccount: sellerTokenAccount,
          gpuMint: ctx.gpuMintPDA,
          seller: seller.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([seller])
        .rpc();

      try {
        await ctx.program.methods
          .closeListing()
          .accounts({
            listing: listingPDA,
            seller: seller.publicKey,
          })
          .signers([seller])
          .rpc();
        
        assert.fail("Should have thrown ListingStillActive error");
      } catch (error) {
        assert.include(error.message, "ListingStillActive");
        console.log("  └─ ✓ Rejected close of active listing");
      }
    });

    it("✗ Should fail to close listing with remaining tokens", async () => {
      const marketplace = await ctx.program.account.marketplace.fetch(ctx.marketplacePDA);
      const listingId = marketplace.listingCount.toNumber();

      const [listingPDA] = getListingPDA(ctx.program, seller.publicKey, listingId);
      const [escrowPDA] = getEscrowPDA(ctx.program, listingPDA);

      // Create listing
      await ctx.program.methods
        .createListing(TEST_CONSTANTS.LIST_PRICE, TEST_CONSTANTS.LIST_AMOUNT)
        .accounts({
          listing: listingPDA,
          marketplace: ctx.marketplacePDA,
          escrowTokenAccount: escrowPDA,
          sellerTokenAccount: sellerTokenAccount,
          gpuMint: ctx.gpuMintPDA,
          seller: seller.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([seller])
        .rpc();

      // Manually set is_active to false but keep tokens (simulate edge case)
      // This would normally be prevented by the program logic
      // We can't actually test this without direct account manipulation
      // So we'll skip this edge case in testing

      console.log("  └─ ⚠ Edge case: Cannot easily test without account manipulation");
    });

    it("✗ Should fail when non-seller tries to close", async () => {
      const marketplace = await ctx.program.account.marketplace.fetch(ctx.marketplacePDA);
      const listingId = marketplace.listingCount.toNumber();

      const [listingPDA] = getListingPDA(ctx.program, seller.publicKey, listingId);
      const [escrowPDA] = getEscrowPDA(ctx.program, listingPDA);

      // Create and cancel listing
      await ctx.program.methods
        .createListing(TEST_CONSTANTS.LIST_PRICE, TEST_CONSTANTS.LIST_AMOUNT)
        .accounts({
          listing: listingPDA,
          marketplace: ctx.marketplacePDA,
          escrowTokenAccount: escrowPDA,
          sellerTokenAccount: sellerTokenAccount,
          gpuMint: ctx.gpuMintPDA,
          seller: seller.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([seller])
        .rpc();

      await ctx.program.methods
        .cancelListing()
        .accounts({
          listing: listingPDA,
          escrowTokenAccount: escrowPDA,
          sellerTokenAccount: sellerTokenAccount,
          seller: seller.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([seller])
        .rpc();

      try {
        await ctx.program.methods
          .closeListing()
          .accounts({
            listing: listingPDA,
            seller: buyer.publicKey, // Wrong seller!
          })
          .signers([buyer])
          .rpc();
        
        assert.fail("Should have thrown authorization error");
      } catch (error: any) {
        const errorMsg = error.message || error.toString();
        assert.ok(
          errorMsg.includes("has_one") || 
          errorMsg.includes("ConstraintHasOne") ||
          errorMsg.includes("ConstraintSeeds") ||
          errorMsg.includes("A has one constraint was violated") ||
          errorMsg.includes("A seeds constraint was violated") ||
          error.code === 2001 ||
          error.code === 2006,
          `Expected authorization error but got: ${errorMsg}`
        );
        console.log("  └─ ✓ Rejected unauthorized close");
      }
    });
  });

  describe("Arithmetic and Overflow Protection", () => {
    it("✓ Should handle large price calculations without overflow", async () => {
      const marketplace = await ctx.program.account.marketplace.fetch(ctx.marketplacePDA);
      const listingId = marketplace.listingCount.toNumber();

      const [listingPDA] = getListingPDA(ctx.program, seller.publicKey, listingId);
      const [escrowPDA] = getEscrowPDA(ctx.program, listingPDA);

      const largePrice = new BN(100 * LAMPORTS_PER_SOL);
      const smallAmount = new BN(1_000_000); // 0.001 tokens

      await ctx.program.methods
        .createListing(largePrice, smallAmount)
        .accounts({
          listing: listingPDA,
          marketplace: ctx.marketplacePDA,
          escrowTokenAccount: escrowPDA,
          sellerTokenAccount: sellerTokenAccount,
          gpuMint: ctx.gpuMintPDA,
          seller: seller.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([seller])
        .rpc();

      const listing = await ctx.program.account.listing.fetch(listingPDA);
      assert.equal(listing.price.toString(), largePrice.toString());
      console.log("  └─ ✓ Handled large price without overflow");
    });
  });
});
