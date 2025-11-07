import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";

(async () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.GpuDex;

  const [marketplacePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("marketplace")],
    program.programId
  );

  console.log("Marketplace PDA:", marketplacePDA.toBase58());
  console.log("Authority:", provider.wallet.publicKey.toBase58());
  console.log("");
  
  try {
    // Check if marketplace already exists
    const marketplaceAccount = await program.account.marketplace.fetchNullable(marketplacePDA);
    
    if (marketplaceAccount) {
      console.log("⚠️  Marketplace already initialized!");
      console.log("Authority:", marketplaceAccount.authority.toBase58());
      console.log("Listing count:", marketplaceAccount.listingCount.toString());
      return;
    }

    console.log("Initializing marketplace...");
    
    const tx = await program.methods
      .initializeMarketplace()
      .accounts({
        marketplace: marketplacePDA,
        authority: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Marketplace initialized successfully!");
    console.log("Transaction signature:", tx);
    console.log("");
    console.log("View on Solana Explorer:");
    console.log(`https://explorer.solana.com/tx/${tx}?cluster=devnet`);
  } catch (error) {
    console.error("Error initializing marketplace:", error);
  }
})();
