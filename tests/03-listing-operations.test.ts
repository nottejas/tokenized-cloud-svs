import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { SystemProgram, SYSVAR_RENT_PUBKEY, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAccount } from "@solana/spl-token";
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

describe("3. Listing Operations", () => {
  let ctx: TestContext;
  let seller: anchor.web3.Keypair;
  let buyer: anchor.web3.Keypair;
  let sellerTokenAccount: anchor.web3.PublicKey;
  let buyerTokenAccount: anchor.web3.PublicKey;

  before("Setup test users", async () => {
    ctx = await setupTestContext();
    
    // Create test users
    seller = await createTestUser(ctx.provider);
    buyer = await createTestUser(ctx.provider);

    // Create token accounts
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
      .mintGpuTokens(new BN(500 * 1_000_000_000))
      .accounts({
        gpuMint: ctx.gpuMintPDA,
        userTokenAccount: sellerTokenAccount,
        mintAuthority: ctx.mintAuthorityPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
  });

  describe("Create Listing", () => {
    it("✓ Should create listing with valid parameters", async () => {
      const marketplace = await ctx.program.account.marketplace.fetch(ctx.marketplacePDA);
      const listingId = marketplace.listingCount.toNumber();

      const [listingPDA] = getListingPDA(ctx.program, seller.publicKey, listingId);
      const [escrowPDA] = getEscrowPDA(ctx.program, listingPDA);

      const sellerBalanceBefore = await getAccount(ctx.provider.connection, sellerTokenAccount);

      const tx = await ctx.program.methods
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

      console.log("  └─ Listing created:", tx.slice(0, 8) + "...");

      // Verify listing data
      const listing = await ctx.program.account.listing.fetch(listingPDA);
      assert.ok(listing.seller.equals(seller.publicKey), "Seller should match");
      assert.equal(
        listing.price.toString(),
        TEST_CONSTANTS.LIST_PRICE.toString(),
        "Price should match"
      );
      assert.equal(
        listing.amount.toString(),
        TEST_CONSTANTS.LIST_AMOUNT.toString(),
        "Amount should match"
      );
      assert.equal(listing.isActive, true, "Listing should be active");
      assert.equal(listing.listingId.toNumber(), listingId, "Listing ID should match");

      // Verify tokens moved to escrow
      const escrowAccount = await getAccount(ctx.provider.connection, escrowPDA);
      assert.equal(
        escrowAccount.amount.toString(),
        TEST_CONSTANTS.LIST_AMOUNT.toString(),
        "Escrow should hold tokens"
      );

      // Verify seller balance decreased
      const sellerBalanceAfter = await getAccount(ctx.provider.connection, sellerTokenAccount);
      assert.equal(
        sellerBalanceAfter.amount.toString(),
        (
          BigInt(sellerBalanceBefore.amount.toString()) -
          BigInt(TEST_CONSTANTS.LIST_AMOUNT.toString())
        ).toString(),
        "Seller balance should decrease"
      );

      // Verify marketplace counter increased
      const marketplaceAfter = await ctx.program.account.marketplace.fetch(ctx.marketplacePDA);
      assert.equal(
        marketplaceAfter.listingCount.toNumber(),
        listingId + 1,
        "Listing count should increment"
      );
    });

    it("✓ Should create multiple listings from same seller", async () => {
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

      const listing = await ctx.program.account.listing.fetch(listingPDA);
      assert.equal(listing.listingId.toNumber(), listingId, "Second listing should have different ID");
    });

    it("✓ Should create listing with different price", async () => {
      const marketplace = await ctx.program.account.marketplace.fetch(ctx.marketplacePDA);
      const listingId = marketplace.listingCount.toNumber();

      const [listingPDA] = getListingPDA(ctx.program, seller.publicKey, listingId);
      const [escrowPDA] = getEscrowPDA(ctx.program, listingPDA);

      const differentPrice = new BN(0.5 * LAMPORTS_PER_SOL);

      await ctx.program.methods
        .createListing(differentPrice, TEST_CONSTANTS.LIST_AMOUNT)
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
      assert.equal(
        listing.price.toString(),
        differentPrice.toString(),
        "Should accept different price"
      );
    });

    it("✓ Should create listing with minimum amount", async () => {
      const marketplace = await ctx.program.account.marketplace.fetch(ctx.marketplacePDA);
      const listingId = marketplace.listingCount.toNumber();

      const [listingPDA] = getListingPDA(ctx.program, seller.publicKey, listingId);
      const [escrowPDA] = getEscrowPDA(ctx.program, listingPDA);

      const minAmount = TEST_CONSTANTS.MIN_AMOUNT;

      await ctx.program.methods
        .createListing(TEST_CONSTANTS.LIST_PRICE, minAmount)
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
      assert.equal(
        listing.amount.toString(),
        minAmount.toString(),
        "Should accept minimum amount"
      );
    });
  });

  describe("Buy Listing - Partial Fill", () => {
    let listingPDA: anchor.web3.PublicKey;
    let escrowPDA: anchor.web3.PublicKey;
    let listingId: number;

    before("Create listing for buy tests", async () => {
      const marketplace = await ctx.program.account.marketplace.fetch(ctx.marketplacePDA);
      listingId = marketplace.listingCount.toNumber();

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

    it("✓ Should buy partial amount from listing", async () => {
      const buyAmount = new BN(3 * 1_000_000_000); // 3 tokens
      const expectedPrice = (TEST_CONSTANTS.LIST_PRICE.toNumber() * buyAmount.toNumber()) / 1_000_000_000;

      const sellerSolBefore = await ctx.provider.connection.getBalance(seller.publicKey);
      const buyerTokensBefore = await getAccount(ctx.provider.connection, buyerTokenAccount);

      const tx = await ctx.program.methods
        .buyListing(buyAmount)
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

      console.log("  └─ Bought", buyAmount.toNumber() / 1e9, "tokens:", tx.slice(0, 8) + "...");

      // Verify listing updated
      const listing = await ctx.program.account.listing.fetch(listingPDA);
      assert.equal(
        listing.amount.toString(),
        (TEST_CONSTANTS.LIST_AMOUNT.toNumber() - buyAmount.toNumber()).toString(),
        "Listing amount should decrease"
      );
      assert.equal(listing.isActive, true, "Listing should still be active");

      // Verify buyer received tokens
      const buyerTokensAfter = await getAccount(ctx.provider.connection, buyerTokenAccount);
      assert.equal(
        buyerTokensAfter.amount.toString(),
        (BigInt(buyerTokensBefore.amount.toString()) + BigInt(buyAmount.toString())).toString(),
        "Buyer should receive tokens"
      );

      // Verify seller received SOL
      const sellerSolAfter = await ctx.provider.connection.getBalance(seller.publicKey);
      assert.ok(sellerSolAfter > sellerSolBefore, "Seller should receive SOL");
      assert.approximately(
        sellerSolAfter - sellerSolBefore,
        expectedPrice,
        100000,
        "Seller should receive correct amount"
      );
    });

    it("✓ Should buy another partial amount", async () => {
      const listing = await ctx.program.account.listing.fetch(listingPDA);
      const amountBefore = listing.amount;
      const buyAmount = new BN(2 * 1_000_000_000);

      await ctx.program.methods
        .buyListing(buyAmount)
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

      const listingAfter = await ctx.program.account.listing.fetch(listingPDA);
      assert.equal(
        listingAfter.amount.toString(),
        amountBefore.sub(buyAmount).toString(),
        "Should support multiple partial fills"
      );
    });
  });

  describe("Buy Listing - Full Fill", () => {
    let listingPDA: anchor.web3.PublicKey;
    let escrowPDA: anchor.web3.PublicKey;

    before("Create listing for full fill test", async () => {
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

    it("✓ Should buy full amount and deactivate listing", async () => {
      const listing = await ctx.program.account.listing.fetch(listingPDA);
      const fullAmount = listing.amount;

      const tx = await ctx.program.methods
        .buyListing(fullAmount)
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

      console.log("  └─ Bought full amount:", tx.slice(0, 8) + "...");

      // Verify listing is inactive
      const listingAfter = await ctx.program.account.listing.fetch(listingPDA);
      assert.equal(listingAfter.amount.toNumber(), 0, "Amount should be 0");
      assert.equal(listingAfter.isActive, false, "Listing should be inactive");

      // Verify escrow is empty
      const escrowAccount = await getAccount(ctx.provider.connection, escrowPDA);
      assert.equal(escrowAccount.amount.toString(), "0", "Escrow should be empty");
    });
  });

  describe("Cancel Listing", () => {
    let listingPDA: anchor.web3.PublicKey;
    let escrowPDA: anchor.web3.PublicKey;

    beforeEach("Create fresh listing", async () => {
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

    it("✓ Should cancel listing and return tokens to seller", async () => {
      const sellerBalanceBefore = await getAccount(ctx.provider.connection, sellerTokenAccount);
      const escrowBalanceBefore = await getAccount(ctx.provider.connection, escrowPDA);

      const tx = await ctx.program.methods
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

      console.log("  └─ Listing cancelled:", tx.slice(0, 8) + "...");

      // Verify listing is inactive
      const listing = await ctx.program.account.listing.fetch(listingPDA);
      assert.equal(listing.isActive, false, "Listing should be inactive");
      assert.equal(listing.amount.toNumber(), 0, "Amount should be 0");

      // Verify tokens returned
      const sellerBalanceAfter = await getAccount(ctx.provider.connection, sellerTokenAccount);
      assert.equal(
        sellerBalanceAfter.amount.toString(),
        (
          BigInt(sellerBalanceBefore.amount.toString()) +
          BigInt(escrowBalanceBefore.amount.toString())
        ).toString(),
        "Tokens should return to seller"
      );

      // Verify escrow is empty
      const escrowBalanceAfter = await getAccount(ctx.provider.connection, escrowPDA);
      assert.equal(escrowBalanceAfter.amount.toString(), "0", "Escrow should be empty");
    });
  });

  describe("Close Listing", () => {
    let listingPDA: anchor.web3.PublicKey;
    let escrowPDA: anchor.web3.PublicKey;

    before("Create and complete a listing", async () => {
      const marketplace = await ctx.program.account.marketplace.fetch(ctx.marketplacePDA);
      const listingId = marketplace.listingCount.toNumber();

      [listingPDA] = getListingPDA(ctx.program, seller.publicKey, listingId);
      [escrowPDA] = getEscrowPDA(ctx.program, listingPDA);

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

      // Cancel to make it inactive
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
    });

    it("✓ Should close inactive listing with zero tokens", async () => {
      const sellerSolBefore = await ctx.provider.connection.getBalance(seller.publicKey);

      const tx = await ctx.program.methods
        .closeListing()
        .accounts({
          listing: listingPDA,
          seller: seller.publicKey,
        })
        .signers([seller])
        .rpc();

      console.log("  └─ Listing closed:", tx.slice(0, 8) + "...");

      // Verify listing account is closed (rent reclaimed)
      const sellerSolAfter = await ctx.provider.connection.getBalance(seller.publicKey);
      assert.ok(
        sellerSolAfter > sellerSolBefore,
        "Seller should reclaim rent"
      );

      // Verify listing account doesn't exist
      try {
        await ctx.program.account.listing.fetch(listingPDA);
        assert.fail("Listing account should not exist");
      } catch (error) {
        assert.include(error.message, "Account does not exist");
      }
    });
  });
});
