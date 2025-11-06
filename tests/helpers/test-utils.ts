import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { GpuDex } from "../../target/types/gpu_dex";
import { 
  TOKEN_PROGRAM_ID, 
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { 
  PublicKey, 
  SystemProgram, 
  SYSVAR_RENT_PUBKEY,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

export const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

export interface TestContext {
  provider: anchor.AnchorProvider;
  program: Program<GpuDex>;
  authority: anchor.Wallet;
  marketplacePDA: PublicKey;
  gpuMintPDA: PublicKey;
  mintAuthorityPDA: PublicKey;
  metadataPDA: PublicKey;
}

export async function setupTestContext(): Promise<TestContext> {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.GpuDex as Program<GpuDex>;
  const authority = provider.wallet as anchor.Wallet;

  // Derive PDAs
  const [marketplacePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("marketplace")],
    program.programId
  );

  const [gpuMintPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("gpu-mint")],
    program.programId
  );

  const [mintAuthorityPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("mint-authority")],
    program.programId
  );

  const [metadataPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      gpuMintPDA.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );

  return {
    provider,
    program,
    authority,
    marketplacePDA,
    gpuMintPDA,
    mintAuthorityPDA,
    metadataPDA,
  };
}

export async function airdropSol(
  connection: anchor.web3.Connection,
  publicKey: PublicKey,
  amount: number = 10
): Promise<void> {
  await connection.requestAirdrop(publicKey, amount * LAMPORTS_PER_SOL);
  await new Promise(resolve => setTimeout(resolve, 1000));
}

export async function createTestUser(
  provider: anchor.AnchorProvider
): Promise<Keypair> {
  const user = Keypair.generate();
  await airdropSol(provider.connection, user.publicKey);
  return user;
}

export async function createTokenAccount(
  provider: anchor.AnchorProvider,
  mint: PublicKey,
  owner: PublicKey,
  payer: Keypair
): Promise<PublicKey> {
  const tokenAccount = await getAssociatedTokenAddress(mint, owner);
  
  const createIx = createAssociatedTokenAccountInstruction(
    payer.publicKey,
    tokenAccount,
    owner,
    mint
  );

  const tx = new anchor.web3.Transaction().add(createIx);
  await provider.sendAndConfirm(tx, [payer]);
  
  return tokenAccount;
}

export function getListingPDA(
  program: Program<GpuDex>,
  seller: PublicKey,
  listingId: number
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("listing"),
      seller.toBuffer(),
      new BN(listingId).toArrayLike(Buffer, "le", 8),
    ],
    program.programId
  );
}

export function getEscrowPDA(
  program: Program<GpuDex>,
  listing: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), listing.toBuffer()],
    program.programId
  );
}

export const TEST_CONSTANTS = {
  MINT_AMOUNT: new BN(1000 * 1_000_000_000), // 1000 tokens
  LIST_PRICE: new BN(0.1 * LAMPORTS_PER_SOL), // 0.1 SOL per token
  LIST_AMOUNT: new BN(10 * 1_000_000_000), // 10 tokens
  MIN_AMOUNT: new BN(1_000_000), // 0.001 tokens (minimum)
};
