import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

const METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

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

  // Derive the metadata account PDA using Metaplex's standard derivation
  const [metadataPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METADATA_PROGRAM_ID.toBuffer(),
      gpuMintPda.toBuffer(),
    ],
    METADATA_PROGRAM_ID
  );

  console.log("GPU Mint:", gpuMintPda.toBase58());
  console.log("Metadata PDA:", metadataPda.toBase58());
  console.log("");
  console.log("Adding metadata to GPU token...");

  await program.methods
    .addGpuMetadata()
    .accounts({
      gpuMint: gpuMintPda,
      metadata: metadataPda,
      mintAuthority: mintAuthorityPda,
      authority: provider.wallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      tokenMetadataProgram: METADATA_PROGRAM_ID,
    })
    .rpc();

  console.log("✅ Metadata added successfully!");
  console.log("Your token will now show as 'GPU Token (gGPU)' in wallets");
})();