// src/lib/marketplace.ts
import { Program } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

export async function getMarketplacePDA(program: Program) {
  const [marketplacePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('marketplace')],
    program.programId
  );
  return marketplacePDA;
}

export async function getGpuMintPDA(program: Program) {
  const [gpuMintPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('gpu-mint')],
    program.programId
  );
  return gpuMintPDA;
}

export async function getMintAuthorityPDA(program: Program) {
  const [mintAuthorityPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('mint-authority')],
    program.programId
  );
  return mintAuthorityPDA;
}

export async function getListingPDA(
  program: Program,
  seller: PublicKey,
  listingId: number
) {
  const [listingPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('listing'),
      seller.toBuffer(),
      Buffer.from(new Uint8Array(new BigUint64Array([BigInt(listingId)]).buffer)),
    ],
    program.programId
  );
  return listingPDA;
}

export async function getEscrowPDA(program: Program, listing: PublicKey) {
  const [escrowPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('escrow'), listing.toBuffer()],
    program.programId
  );
  return escrowPDA;
}
