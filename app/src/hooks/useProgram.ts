import { useMemo } from "react";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import rawIdl from "../idl/gpu_dex.json";

const PROGRAM_ID = new PublicKey('7BXzUwxv9aKULu8Jw4sYM9Web2Mg1PNHTrVWwJbiAsxw');

export function useProgram() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const program = useMemo(() => {
    if (!wallet) return null;
    
    try {
      const provider = new AnchorProvider(connection, wallet, {
        commitment: "confirmed",
      });

      return new Program(rawIdl as any, provider);
    } catch (e) {
      console.error("Failed to instantiate Program:", e);
      return null;
    }
  }, [connection, wallet]);

  return program;
}
