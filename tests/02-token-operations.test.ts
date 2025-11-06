import * as anchor from "@coral-xyz/anchor";
import { SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAccount } from "@solana/spl-token";
import { assert } from "chai";
import { 
  setupTestContext, 
  TestContext, 
  TOKEN_METADATA_PROGRAM_ID,
  createTokenAccount,
  createTestUser,
  TEST_CONSTANTS,
} from "./helpers/test-utils";

describe("2. Token Operations", () => {
  let ctx: TestContext;

  before("Setup test context", async () => {
    ctx = await setupTestContext();
  });

  describe("GPU Mint Initialization", () => {
    it("✓ Should initialize GPU mint successfully", async () => {
      const tx = await ctx.program.methods
        .initializeGpuMint()
        .accounts({
          gpuMint: ctx.gpuMintPDA,
          mintAuthority: ctx.mintAuthorityPDA,
          authority: ctx.authority.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      console.log("  └─ GPU mint initialized:", tx.slice(0, 8) + "...");

      // Verify mint was created
      const mintInfo = await ctx.provider.connection.getAccountInfo(ctx.gpuMintPDA);
      assert.ok(mintInfo !== null, "Mint account should exist");
      assert.ok(mintInfo.data.length > 0, "Mint should have data");
    });

    it("✗ Should fail to initialize GPU mint twice", async () => {
      try {
        await ctx.program.methods
          .initializeGpuMint()
          .accounts({
            gpuMint: ctx.gpuMintPDA,
            mintAuthority: ctx.mintAuthorityPDA,
            authority: ctx.authority.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
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
  });

  describe("Token Metadata", () => {
    it("✓ Should add metadata to GPU token", async function() {
      try {
        const tx = await ctx.program.methods
          .addGpuMetadata()
          .accounts({
            gpuMint: ctx.gpuMintPDA,
            metadata: ctx.metadataPDA,
            mintAuthority: ctx.mintAuthorityPDA,
            authority: ctx.authority.publicKey,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
            tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          })
          .rpc();

        console.log("  └─ Metadata added:", tx.slice(0, 8) + "...");

        // Verify metadata account exists
        const metadataInfo = await ctx.provider.connection.getAccountInfo(ctx.metadataPDA);
        assert.ok(metadataInfo !== null, "Metadata account should exist");
        assert.ok(metadataInfo.data.length > 0, "Metadata should have data");
      } catch (error: any) {
        if (error.message?.includes("Unsupported program id")) {
          console.log("  └─ ⚠ Skipped: Metaplex not loaded on localnet");
          this.skip();
        } else {
          throw error;
        }
      }
    });

    it("✗ Should fail to add metadata twice", async function() {
      try {
        await ctx.program.methods
          .addGpuMetadata()
          .accounts({
            gpuMint: ctx.gpuMintPDA,
            metadata: ctx.metadataPDA,
            mintAuthority: ctx.mintAuthorityPDA,
            authority: ctx.authority.publicKey,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
            tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          })
          .rpc();
        
        assert.fail("Should have thrown an error");
      } catch (error: any) {
        const errorMsg = error.message || error.toString();
        if (errorMsg.includes("Unsupported program id")) {
          console.log("  └─ ⚠ Skipped: Metaplex not loaded on localnet");
          this.skip();
        } else {
          assert.ok(
            errorMsg.includes("already in use") ||
            errorMsg.includes("already initialized") ||
            errorMsg.includes("Expected account to be uninitialized"),
            `Expected metadata error but got: ${errorMsg}`
          );
        }
      }
    });
  });

  describe("Token Minting", () => {
    let userTokenAccount: anchor.web3.PublicKey;
    let testUser: anchor.web3.Keypair;

    before("Create test user and token account", async () => {
      testUser = await createTestUser(ctx.provider);
      userTokenAccount = await createTokenAccount(
        ctx.provider,
        ctx.gpuMintPDA,
        testUser.publicKey,
        testUser
      );
    });

    it("✓ Should mint tokens successfully", async () => {
      const mintAmount = TEST_CONSTANTS.MINT_AMOUNT;

      const tx = await ctx.program.methods
        .mintGpuTokens(mintAmount)
        .accounts({
          gpuMint: ctx.gpuMintPDA,
          userTokenAccount: userTokenAccount,
          mintAuthority: ctx.mintAuthorityPDA,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      console.log(
        "  └─ Minted",
        mintAmount.toNumber() / 1e9,
        "tokens:",
        tx.slice(0, 8) + "..."
      );

      // Verify balance
      const tokenAccount = await getAccount(ctx.provider.connection, userTokenAccount);
      assert.equal(
        tokenAccount.amount.toString(),
        mintAmount.toString(),
        "Token balance should match minted amount"
      );
    });

    it("✓ Should mint additional tokens to same account", async () => {
      const additionalAmount = TEST_CONSTANTS.MINT_AMOUNT;

      await ctx.program.methods
        .mintGpuTokens(additionalAmount)
        .accounts({
          gpuMint: ctx.gpuMintPDA,
          userTokenAccount: userTokenAccount,
          mintAuthority: ctx.mintAuthorityPDA,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      // Verify balance increased
      const tokenAccount = await getAccount(ctx.provider.connection, userTokenAccount);
      assert.equal(
        tokenAccount.amount.toString(),
        TEST_CONSTANTS.MINT_AMOUNT.mul(new anchor.BN(2)).toString(),
        "Token balance should be doubled"
      );
    });

    it("✓ Should mint tokens to multiple users", async () => {
      const user2 = await createTestUser(ctx.provider);
      const user2TokenAccount = await createTokenAccount(
        ctx.provider,
        ctx.gpuMintPDA,
        user2.publicKey,
        user2
      );

      await ctx.program.methods
        .mintGpuTokens(TEST_CONSTANTS.MINT_AMOUNT)
        .accounts({
          gpuMint: ctx.gpuMintPDA,
          userTokenAccount: user2TokenAccount,
          mintAuthority: ctx.mintAuthorityPDA,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      const tokenAccount = await getAccount(ctx.provider.connection, user2TokenAccount);
      assert.equal(
        tokenAccount.amount.toString(),
        TEST_CONSTANTS.MINT_AMOUNT.toString(),
        "Second user should have minted tokens"
      );
    });

    it("✓ Should mint small amounts", async () => {
      const smallAmount = TEST_CONSTANTS.MIN_AMOUNT;

      const user3 = await createTestUser(ctx.provider);
      const user3TokenAccount = await createTokenAccount(
        ctx.provider,
        ctx.gpuMintPDA,
        user3.publicKey,
        user3
      );

      await ctx.program.methods
        .mintGpuTokens(smallAmount)
        .accounts({
          gpuMint: ctx.gpuMintPDA,
          userTokenAccount: user3TokenAccount,
          mintAuthority: ctx.mintAuthorityPDA,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      const tokenAccount = await getAccount(ctx.provider.connection, user3TokenAccount);
      assert.equal(
        tokenAccount.amount.toString(),
        smallAmount.toString(),
        "Should mint small amounts correctly"
      );
    });
  });
});
