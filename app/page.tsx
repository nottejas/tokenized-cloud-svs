'use client';
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButtonDynamic as WalletMultiButton } from "./src/components/WalletButton";
import { useState, useEffect } from "react";
import { useProgram } from "./src/hooks/useProgram";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import * as marketplace from "./src/lib/marketplace";
import { BN } from "@coral-xyz/anchor";


export default function Home() {
  const { connection } = useConnection();
  const { publicKey, connected, sendTransaction } = useWallet();
  const program = useProgram();

  const [balance, setBalance] = useState<number>(0);
  const [gpuBalance, setGpuBalance] = useState<number>(0);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [mintAmount, setMintAmount] = useState('100');
  const [listAmount, setListAmount] = useState('');
  const [listPrice, setListPrice] = useState('');

  // Fetch SOL balance
  useEffect(() => {
    if (publicKey) {
      connection.getBalance(publicKey).then((bal) => {
        setBalance(bal / 1e9);
      });
    }
  }, [publicKey, connection]);

  // Fetch GPU token balance
  useEffect(() => {
    if (publicKey && program) {
      fetchGpuBalance();
    }
  }, [publicKey, program]);

  // Fetch listings
  useEffect(() => {
    if (program) fetchListings();
  }, [program]);

  async function fetchGpuBalance() {
    if (!publicKey || !program) return;

    try {
      const gpuMint = await marketplace.getGpuMintPDA(program);
      const userTokenAccount = await getAssociatedTokenAddress(gpuMint, publicKey);

      const balance = await connection.getTokenAccountBalance(userTokenAccount);
      setGpuBalance(Number(balance.value.amount) / 1e9);
    } catch {
      setGpuBalance(0);
    }
  }

  async function fetchListings() {
    if (!program) return;

    try {
      const marketplacePDA = await marketplace.getMarketplacePDA(program);
      const marketplaceAccount = await program.account.marketplace.fetch(marketplacePDA);

      const allListings = [];
      for (let i = 0; i < marketplaceAccount.listingCount; i++) {
        try {
          const listingPDA = await marketplace.getListingPDA(
            program,
            marketplaceAccount.authority,
            i
          );
          const listing = await program.account.listing.fetch(listingPDA);
          if (listing.isActive) {
            allListings.push({ ...listing, address: listingPDA });
          }
        } catch (e) {
          // Listing may not exist
        }
      }

      setListings(allListings);
    } catch (error) {
      console.error('Error fetching listings:', error);
    }
  }

  async function initializeMarketplace() {
    if (!publicKey || !program) return;

    setLoading(true);
    try {
      const marketplacePDA = await marketplace.getMarketplacePDA(program);

      const tx = await program.methods
        .initializeMarketplace()
        .accounts({
          marketplace: marketplacePDA,
          authority: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('Marketplace initialized:', tx);
      alert('✅ Marketplace initialized successfully!');
    } catch (error: any) {
      console.error('Error:', error);
      alert('❌ Error: ' + error.message);
    }
    setLoading(false);
  }

  async function initializeGpuMint() {
    if (!publicKey || !program) return;

    setLoading(true);
    try {
      const gpuMint = await marketplace.getGpuMintPDA(program);
      const mintAuthority = await marketplace.getMintAuthorityPDA(program);

      const tx = await program.methods
        .initializeGpuMint()
        .accounts({
          gpuMint,
          mintAuthority,
          authority: publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      console.log('GPU Mint initialized:', tx);
      alert('✅ GPU Mint initialized successfully!');
    } catch (error: any) {
      console.error('Error:', error);
      alert('❌ Error: ' + error.message);
    }
    setLoading(false);
  }

  async function mintGpuTokens() {
    if (!publicKey || !program) return;

    setLoading(true);
    try {
      const gpuMint = await marketplace.getGpuMintPDA(program);
      const mintAuthority = await marketplace.getMintAuthorityPDA(program);
      const userTokenAccount = await getAssociatedTokenAddress(gpuMint, publicKey);

      // Check if token account exists, if not create it
      const accountInfo = await connection.getAccountInfo(userTokenAccount);
      
      if (!accountInfo) {
        // Create associated token account
        const transaction = await program.methods
          .mintGpuTokens(new BN(Number(mintAmount) * 1e9))
          .accounts({
            gpuMint,
            userTokenAccount,
            mintAuthority,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .preInstructions([
            createAssociatedTokenAccountInstruction(
              publicKey,
              userTokenAccount,
              publicKey,
              gpuMint
            )
          ])
          .rpc();

        console.log('Created token account and minted:', transaction);
      } else {
        // Just mint
        const tx = await program.methods
          .mintGpuTokens(new BN(Number(mintAmount) * 1e9))
          .accounts({
            gpuMint,
            userTokenAccount,
            mintAuthority,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc();

        console.log('Minted tokens:', tx);
      }

      alert(`✅ Minted ${mintAmount} gGPU tokens!`);
      await fetchGpuBalance();
    } catch (error: any) {
      console.error('Error:', error);
      alert('❌ Error: ' + error.message);
    }
    setLoading(false);
  }

  async function createListing() {
    if (!publicKey || !program || !listAmount || !listPrice) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const marketplacePDA = await marketplace.getMarketplacePDA(program);
      const marketplaceAccount = await program.account.marketplace.fetch(marketplacePDA);

      const listingPDA = await marketplace.getListingPDA(
        program,
        publicKey,
        marketplaceAccount.listingCount
      );
      const escrowPDA = await marketplace.getEscrowPDA(program, listingPDA);
      const gpuMint = await marketplace.getGpuMintPDA(program);
      const sellerTokenAccount = await getAssociatedTokenAddress(gpuMint, publicKey);

      const price = new BN(Number(listPrice) * 1e9); // Convert SOL to lamports
      const amount = new BN(Number(listAmount) * 1e9); // Convert tokens to smallest unit

      const tx = await program.methods
        .createListing(price, amount)
        .accounts({
          listing: listingPDA,
          marketplace: marketplacePDA,
          escrowTokenAccount: escrowPDA,
          sellerTokenAccount,
          gpuMint,
          seller: publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      console.log('Created listing:', tx);
      alert(`✅ Listing created! ${listAmount} gGPU at ${listPrice} SOL each`);
      setListAmount('');
      setListPrice('');
      await fetchListings();
      await fetchGpuBalance();
    } catch (error: any) {
      console.error('Error:', error);
      alert('❌ Error: ' + error.message);
    }
    setLoading(false);
  }

  async function buyListing(listing: any) {
    if (!publicKey || !program) return;

    setLoading(true);
    try {
      const gpuMint = await marketplace.getGpuMintPDA(program);
      const buyerTokenAccount = await getAssociatedTokenAddress(gpuMint, publicKey);
      const escrowPDA = await marketplace.getEscrowPDA(program, listing.address);

      // Check if buyer token account exists
      const accountInfo = await connection.getAccountInfo(buyerTokenAccount);
      
      const instructions = [];
      if (!accountInfo) {
        instructions.push(
          createAssociatedTokenAccountInstruction(
            publicKey,
            buyerTokenAccount,
            publicKey,
            gpuMint
          )
        );
      }

      const tx = await program.methods
        .buyListing(listing.amount)
        .accounts({
          listing: listing.address,
          escrowTokenAccount: escrowPDA,
          buyerTokenAccount,
          buyer: publicKey,
          sellerSolAccount: listing.seller,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .preInstructions(instructions)
        .rpc();

      console.log('Bought listing:', tx);
      
      const totalCost = (listing.price.toNumber() * listing.amount.toNumber()) / 1e18;
      alert(`✅ Purchase successful! Bought ${(listing.amount.toNumber() / 1e9).toFixed(2)} gGPU for ${totalCost.toFixed(4)} SOL`);
      
      await fetchListings();
      await fetchGpuBalance();
      const newBalance = await connection.getBalance(publicKey);
      setBalance(newBalance / 1e9);
    } catch (error: any) {
      console.error('Error:', error);
      alert('❌ Error: ' + error.message);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      {/* Header */}
      <nav className="border-b border-gray-800 bg-black/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center font-bold text-xl">
              G
            </div>
            <span className="text-2xl font-bold">GPU DEX</span>
          </div>
          <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700" />
        </div>
      </nav>

      <div className="container mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Trade GPU Compute Power
          </h1>
          <p className="text-xl text-gray-400 mb-8">
            The first decentralized exchange for cloud computing resources
          </p>
          {connected && (
            <div className="flex gap-4 justify-center">
              <div className="bg-gray-800 rounded-lg px-6 py-3">
                <p className="text-sm text-gray-400">SOL Balance</p>
                <p className="text-2xl font-bold">{balance.toFixed(4)}</p>
              </div>
              <div className="bg-gray-800 rounded-lg px-6 py-3">
                <p className="text-sm text-gray-400">gGPU Balance</p>
                <p className="text-2xl font-bold">{gpuBalance.toFixed(2)}</p>
              </div>
            </div>
          )}
        </div>

        {!connected ? (
          <div className="max-w-2xl mx-auto bg-gray-800/50 backdrop-blur-xl rounded-2xl p-12 text-center border border-gray-700">
            <h2 className="text-3xl font-bold mb-4">Connect Your Wallet</h2>
            <p className="text-gray-400 mb-8">
              Connect your Phantom wallet to start trading GPU tokens
            </p>
            <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700 !text-lg !px-8 !py-4" />
          </div>
        ) : (
          <>
            {/* Setup Section */}
            <div className="mb-8 bg-yellow-900/20 border border-yellow-600/50 rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-4">⚙️ First Time Setup</h3>
              <p className="text-sm text-gray-400 mb-4">Run these once to initialize the marketplace:</p>
              <div className="flex gap-4">
                <button
                  onClick={initializeMarketplace}
                  disabled={loading}
                  className="bg-yellow-600 hover:bg-yellow-700 px-6 py-2 rounded-lg font-semibold transition disabled:opacity-50"
                >
                  {loading ? '⏳ Processing...' : '1. Initialize Marketplace'}
                </button>
                <button
                  onClick={initializeGpuMint}
                  disabled={loading}
                  className="bg-yellow-600 hover:bg-yellow-700 px-6 py-2 rounded-lg font-semibold transition disabled:opacity-50"
                >
                  {loading ? '⏳ Processing...' : '2. Initialize GPU Mint'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Mint Section */}
              <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700">
                <h3 className="text-xl font-bold mb-4">🪙 Mint GPU Tokens</h3>
                <p className="text-gray-400 mb-4 text-sm">Get gGPU tokens to start trading</p>
                <input
                  type="number"
                  value={mintAmount}
                  onChange={(e) => setMintAmount(e.target.value)}
                  placeholder="Amount"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 mb-4 text-white"
                />
                <button
                  onClick={mintGpuTokens}
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700 py-3 rounded-lg font-semibold transition disabled:opacity-50"
                >
                  {loading ? '⏳ Processing...' : `Mint ${mintAmount} gGPU`}
                </button>
              </div>

              {/* Sell Section */}
              <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700">
                <h3 className="text-xl font-bold mb-4">📝 Create Listing</h3>
                <input
                  type="number"
                  value={listAmount}
                  onChange={(e) => setListAmount(e.target.value)}
                  placeholder="Amount (gGPU)"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 mb-3 text-white"
                />
                <input
                  type="number"
                  value={listPrice}
                  onChange={(e) => setListPrice(e.target.value)}
                  placeholder="Price per token (SOL)"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 mb-4 text-white"
                />
                <button
                  onClick={createListing}
                  disabled={loading || !listAmount || !listPrice}
                  className="w-full bg-red-600 hover:bg-red-700 py-3 rounded-lg font-semibold transition disabled:opacity-50"
                >
                  {loading ? '⏳ Processing...' : 'List for Sale'}
                </button>
              </div>
            </div>

            {/* Order Book */}
            <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700">
              <h3 className="text-2xl font-bold mb-6">📊 Order Book</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-700">
                    <tr>
                      <th className="text-left py-3 text-gray-400 font-medium">Seller</th>
                      <th className="text-left py-3 text-gray-400 font-medium">Price (SOL)</th>
                      <th className="text-left py-3 text-gray-400 font-medium">Amount (gGPU)</th>
                      <th className="text-left py-3 text-gray-400 font-medium">Total (SOL)</th>
                      <th className="text-right py-3 text-gray-400 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listings.length === 0 ? (
                      <tr className="border-b border-gray-700/50">
                        <td colSpan={5} className="py-8 text-center text-gray-500">
                          No active listings yet. Create the first one!
                        </td>
                      </tr>
                    ) : (
                      listings.map((listing, idx) => (
                        <tr key={idx} className="border-b border-gray-700/50 hover:bg-gray-700/20 transition">
                          <td className="py-4 text-sm font-mono">
                            {listing.seller.toString().slice(0, 4)}...{listing.seller.toString().slice(-4)}
                          </td>
                          <td className="py-4 font-semibold text-green-400">
                            {(listing.price.toNumber() / 1e9).toFixed(4)}
                          </td>
                          <td className="py-4">
                            {(listing.amount.toNumber() / 1e9).toFixed(2)}
                          </td>
                          <td className="py-4 font-semibold">
                            {((listing.price.toNumber() * listing.amount.toNumber()) / 1e18).toFixed(4)}
                          </td>
                          <td className="py-4 text-right">
                            <button
                              onClick={() => buyListing(listing)}
                              disabled={loading}
                              className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                            >
                              {loading ? '⏳' : 'Buy'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}