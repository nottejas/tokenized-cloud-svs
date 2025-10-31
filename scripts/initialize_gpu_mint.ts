import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

(async () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.GpuDex;

  const [gpuMintPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("gpu-mint")],
    program.programId
  );

  const [mintAuthorityPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("mint-authority")],
    program.programId
  );

  console.log("GPU Mint PDA:", gpuMintPda.toBase58());
  console.log("Mint Authority PDA:", mintAuthorityPda.toBase58());

  // Initialize the GPU mint
  await program.methods
    .initializeGpuMint()
    .accounts({
      gpuMint: gpuMintPda,
      mintAuthority: mintAuthorityPda,
      authority: provider.wallet.publicKey,
      tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    })
    .rpc();

  console.log("✅ GPU Mint initialized successfully!");
})();
