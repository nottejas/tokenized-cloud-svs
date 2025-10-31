import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import BN from "bn.js"; // ✅ Fix for 'anchor.BN is not a constructor'

(async () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.GpuDex;

  // Mint + PDAs (must match initialization)
  const [gpuMintPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("gpu-mint")],
    program.programId
  );

  const [mintAuthorityPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("mint-authority")],
    program.programId
  );

  // Get your associated token account (ATA)
  const userAta = await anchor.utils.token.associatedAddress({
    mint: gpuMintPda,
    owner: provider.wallet.publicKey,
  });

  console.log("User ATA:", userAta.toBase58());

  // Check if ATA exists, create it if not
  const ataInfo = await provider.connection.getAccountInfo(userAta);
  if (!ataInfo) {
    console.log("Creating ATA...");
    const createAtaIx = createAssociatedTokenAccountInstruction(
      provider.wallet.publicKey, // payer
      userAta, // ata
      provider.wallet.publicKey, // owner
      gpuMintPda, // mint
      anchor.utils.token.TOKEN_PROGRAM_ID
    );
    const tx = new anchor.web3.Transaction().add(createAtaIx);
    await provider.sendAndConfirm(tx);
    console.log("✅ ATA created!");
  }

  // Call your program method that performs minting
  console.log("Minting 1000 tokens...");
  await program.methods
    .mintGpuTokens(new BN(1000 * 1e9)) // 1000 tokens with 9 decimals = 1000 * 10^9 raw units
    .accounts({
      gpuMint: gpuMintPda,
      userTokenAccount: userAta,
      mintAuthority: mintAuthorityPda,
      tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
    })
    .rpc();

  console.log("✅ Successfully minted 1000 GPU tokens!");
})();
