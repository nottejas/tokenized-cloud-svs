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
  const { publicKey, connected } = useWallet();
  const program = useProgram();

  const [balance, setBalance] = useState<number>(0);
  const [gpuBalance, setGpuBalance] = useState<number>(0);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc' | 'amount-asc' | 'amount-desc'>('price-asc');

  // Form states
  const [mintAmount, setMintAmount] = useState('100');
  const [listAmount, setListAmount] = useState('');
  const [listPrice, setListPrice] = useState('');
  const [buyAmounts, setBuyAmounts] = useState<{[key: number]: string}>({});

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

  // Get sorted listings
  const getSortedListings = () => {
    const sorted = [...listings];
    switch (sortBy) {
      case 'price-asc':
        return sorted.sort((a, b) => a.price.toNumber() - b.price.toNumber());
      case 'price-desc':
        return sorted.sort((a, b) => b.price.toNumber() - a.price.toNumber());
      case 'amount-asc':
        return sorted.sort((a, b) => a.amount.toNumber() - b.amount.toNumber());
      case 'amount-desc':
        return sorted.sort((a, b) => b.amount.toNumber() - a.amount.toNumber());
      default:
        return sorted;
    }
  };

  // Find best price
  const getBestPrice = () => {
    if (listings.length === 0) return null;
    const sorted = [...listings].sort((a, b) => a.price.toNumber() - b.price.toNumber());
    return (sorted[0].price.toNumber() / 1e9).toFixed(6);
  };

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
        .rpc({ skipPreflight: false, commitment: 'confirmed' });

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
        .rpc({ skipPreflight: false, commitment: 'confirmed' });

      console.log('GPU Mint initialized:', tx);
      alert('✅ GPU Mint initialized successfully!');
    } catch (error: any) {
      console.error('Error:', error);
      alert('❌ Error: ' + error.message);
    }
    setLoading(false);
  }

  // NEW: Add GPU Metadata function
  async function addGpuMetadata() {
    if (!publicKey || !program) return;

    setLoading(true);
    try {
      const gpuMint = await marketplace.getGpuMintPDA(program);
      const mintAuthority = await marketplace.getMintAuthorityPDA(program);
      
      // Derive metadata PDA
      const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
      const [metadataPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          gpuMint.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
      );

      const tx = await program.methods
        .addGpuMetadata()
        .accounts({
          gpuMint,
          metadata: metadataPDA,
          mintAuthority,
          authority: publicKey,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        })
        .rpc({ skipPreflight: false, commitment: 'confirmed' });

      console.log('Added GPU metadata:', tx);
      alert('✅ GPU Token metadata added! Tokens will now display properly in Phantom wallet with name, symbol, and logo.');
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

      const accountInfo = await connection.getAccountInfo(userTokenAccount);
      const amount = new BN(Number(mintAmount) * 1e9);
      
      if (!accountInfo) {
        const tx = await program.methods
          .mintGpuTokens(amount)
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
          .rpc({ skipPreflight: false, commitment: 'confirmed' });

        console.log('Created token account and minted:', tx);
      } else {
        const tx = await program.methods
          .mintGpuTokens(amount)
          .accounts({
            gpuMint,
            userTokenAccount,
            mintAuthority,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc({ skipPreflight: false, commitment: 'confirmed' });

        console.log('Minted tokens:', tx);
      }

      alert(`✅ Minted ${mintAmount} gGPU tokens!`);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      await fetchGpuBalance();
      const newBalance = await connection.getBalance(publicKey);
      setBalance(newBalance / 1e9);
    } catch (error: any) {
      console.error('Error:', error);
      
      if (error.message && error.message.includes('unauthorized')) {
        alert('❌ Error: Mint authority issue. The program may need redeployment.');
      } else {
        alert('❌ Error: ' + error.message);
      }
    }
    setLoading(false);
  }

  async function createListing() {
    if (!publicKey || !program || !listAmount || !listPrice) {
      alert('Please fill in all fields');
      return;
    }

    const amount = parseFloat(listAmount);
    const price = parseFloat(listPrice);

    if (isNaN(amount) || amount <= 0) {
      alert('❌ Invalid amount. Must be greater than 0');
      return;
    }

    if (isNaN(price) || price <= 0) {
      alert('❌ Invalid price. Must be greater than 0');
      return;
    }

    if (amount < 0.001) {
      alert('❌ Amount too small. Minimum is 0.001 gGPU');
      return;
    }

    if (amount > gpuBalance) {
      alert(`❌ Insufficient balance. You have ${gpuBalance.toFixed(2)} gGPU`);
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

      const priceInLamports = new BN(Number(listPrice) * 1e9);
      const amountInSmallestUnit = new BN(Number(listAmount) * 1e9);

      const tx = await program.methods
        .createListing(priceInLamports, amountInSmallestUnit)
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
        .rpc({ skipPreflight: false, commitment: 'confirmed' });

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

  async function buyListing(listing: any, listingIndex: number) {
    if (!publicKey || !program) return;

    const buyAmountInput = buyAmounts[listingIndex] || (listing.amount.toNumber() / 1e9).toString();
    const buyAmountTokens = parseFloat(buyAmountInput);
    
    if (isNaN(buyAmountTokens) || buyAmountTokens <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const maxAmount = listing.amount.toNumber() / 1e9;
    if (buyAmountTokens > maxAmount) {
      alert(`Amount exceeds available tokens (${maxAmount.toFixed(2)} gGPU)`);
      return;
    }

    const buyAmountLamports = new BN(buyAmountTokens * 1e9);

    setLoading(true);
    try {
      const gpuMint = await marketplace.getGpuMintPDA(program);
      const buyerTokenAccount = await getAssociatedTokenAddress(gpuMint, publicKey);
      const escrowPDA = await marketplace.getEscrowPDA(program, listing.address);

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
        .buyListing(buyAmountLamports)
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
        .rpc({ skipPreflight: false, commitment: 'confirmed' });

      console.log('Bought listing:', tx);
      
      const totalCost = (listing.price.toNumber() * buyAmountTokens * 1e9) / 1e18;
      alert(`✅ Purchase successful! Bought ${buyAmountTokens.toFixed(2)} gGPU for ${totalCost.toFixed(4)} SOL`);
      
      setBuyAmounts(prev => ({ ...prev, [listingIndex]: '' }));
      
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

  async function cancelListing(listing: any) {
    if (!publicKey || !program) return;

    if (!listing.seller.equals(publicKey)) {
      alert('You can only cancel your own listings');
      return;
    }

    setLoading(true);
    try {
      const gpuMint = await marketplace.getGpuMintPDA(program);
      const sellerTokenAccount = await getAssociatedTokenAddress(gpuMint, publicKey);
      const escrowPDA = await marketplace.getEscrowPDA(program, listing.address);

      const tx = await program.methods
        .cancelListing()
        .accounts({
          listing: listing.address,
          escrowTokenAccount: escrowPDA,
          sellerTokenAccount,
          seller: publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc({ skipPreflight: false, commitment: 'confirmed' });

      console.log('Cancelled listing:', tx);
      alert(`✅ Listing cancelled! ${(listing.amount.toNumber() / 1e9).toFixed(2)} gGPU returned to your wallet`);
      
      await fetchListings();
      await fetchGpuBalance();
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
              <p className="text-sm text-gray-400 mb-4">Run these in order to initialize the marketplace:</p>
              <div className="flex gap-4 flex-wrap">
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
                <button
                  onClick={addGpuMetadata}
                  disabled={loading}
                  className="bg-yellow-600 hover:bg-yellow-700 px-6 py-2 rounded-lg font-semibold transition disabled:opacity-50"
                >
                  {loading ? '⏳ Processing...' : '3. Add GPU Metadata'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                💡 Step 3 adds token name, symbol, and logo so tokens display properly in Phantom wallet
              </p>
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

            {/* My Listings Dashboard */}
            {listings.filter(l => l.seller.equals(publicKey)).length > 0 && (
              <div className="bg-purple-900/20 backdrop-blur-xl rounded-2xl p-6 border border-purple-600/50 mb-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold">📋 My Listings</h3>
                  <div className="flex gap-4">
                    <div className="bg-purple-800/30 rounded-lg px-4 py-2">
                      <p className="text-xs text-gray-400">Active Listings</p>
                      <p className="text-xl font-bold">
                        {listings.filter(l => l.seller.equals(publicKey)).length}
                      </p>
                    </div>
                    <div className="bg-purple-800/30 rounded-lg px-4 py-2">
                      <p className="text-xs text-gray-400">Total Value Locked</p>
                      <p className="text-xl font-bold">
                        {listings
                          .filter(l => l.seller.equals(publicKey))
                          .reduce((sum, l) => sum + ((l.price.toNumber() * l.amount.toNumber()) / 1e18), 0)
                          .toFixed(4)} SOL
                      </p>
                    </div>
                    <div className="bg-purple-800/30 rounded-lg px-4 py-2">
                      <p className="text-xs text-gray-400">Total gGPU Listed</p>
                      <p className="text-xl font-bold">
                        {listings
                          .filter(l => l.seller.equals(publicKey))
                          .reduce((sum, l) => sum + (l.amount.toNumber() / 1e9), 0)
                          .toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-purple-700">
                      <tr>
                        <th className="text-left py-3 text-gray-400 font-medium">Price (SOL)</th>
                        <th className="text-left py-3 text-gray-400 font-medium">Amount (gGPU)</th>
                        <th className="text-left py-3 text-gray-400 font-medium">Total Value (SOL)</th>
                        <th className="text-left py-3 text-gray-400 font-medium">Status</th>
                        <th className="text-right py-3 text-gray-400 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listings
                        .filter(l => l.seller.equals(publicKey))
                        .map((listing, idx) => (
                          <tr key={idx} className="border-b border-purple-700/50 hover:bg-purple-700/20 transition">
                            <td className="py-4 font-semibold text-green-400">
                              {(listing.price.toNumber() / 1e9).toFixed(4)}
                            </td>
                            <td className="py-4">
                              {(listing.amount.toNumber() / 1e9).toFixed(2)}
                            </td>
                            <td className="py-4 font-semibold">
                              {((listing.price.toNumber() * listing.amount.toNumber()) / 1e18).toFixed(4)}
                            </td>
                            <td className="py-4">
                              <span className="bg-green-600/20 text-green-400 px-3 py-1 rounded-full text-xs font-semibold">
                                Active
                              </span>
                            </td>
                            <td className="py-4 text-right">
                              <button
                                onClick={() => cancelListing(listing)}
                                disabled={loading}
                                className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                              >
                                {loading ? '⏳' : 'Cancel'}
                              </button>
                            </td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Order Book */}
            <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">📊 Order Book</h3>
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-gray-900 border border-gray-700 rounded px-4 py-2 text-sm"
                >
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="amount-asc">Amount: Low to High</option>
                  <option value="amount-desc">Amount: High to Low</option>
                </select>
              </div>
              
              {listings.length > 0 && (
                <div className="mb-4 bg-green-900/20 border border-green-600/50 rounded-lg p-4">
                  <p className="text-sm text-gray-400">Best Available Price</p>
                  <p className="text-2xl font-bold text-green-400">{getBestPrice()} SOL per gGPU</p>
                </div>
              )}
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-700">
                    <tr>
                      <th className="text-left py-3 text-gray-400 font-medium">Seller</th>
                      <th className="text-left py-3 text-gray-400 font-medium">Price (SOL)</th>
                      <th className="text-left py-3 text-gray-400 font-medium">Amount (gGPU)</th>
                      <th className="text-left py-3 text-gray-400 font-medium">Total (SOL)</th>
                      <th className="text-left py-3 text-gray-400 font-medium">Buy Amount</th>
                      <th className="text-right py-3 text-gray-400 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listings.length === 0 ? (
                      <tr className="border-b border-gray-700/50">
                        <td colSpan={6} className="py-8 text-center text-gray-500">
                          No active listings yet. Create the first one!
                        </td>
                      </tr>
                    ) : (
                      getSortedListings().map((listing, idx) => {
                        const isOwnListing = listing.seller.equals(publicKey);
                        const maxAmount = (listing.amount.toNumber() / 1e9).toFixed(2);
                        return (
                          <tr key={idx} className="border-b border-gray-700/50 hover:bg-gray-700/20 transition">
                            <td className="py-4 text-sm font-mono">
                              {isOwnListing ? (
                                <span className="text-purple-400 font-semibold">You</span>
                              ) : (
                                <span>{listing.seller.toString().slice(0, 4)}...{listing.seller.toString().slice(-4)}</span>
                              )}
                            </td>
                            <td className="py-4 font-semibold text-green-400">
                              {(listing.price.toNumber() / 1e9).toFixed(4)}
                            </td>
                            <td className="py-4">
                              {maxAmount}
                            </td>
                            <td className="py-4 font-semibold">
                              {((listing.price.toNumber() * listing.amount.toNumber()) / 1e18).toFixed(4)}
                            </td>
                            <td className="py-4">
                              {!isOwnListing && (
                                <input
                                  type="number"
                                  value={buyAmounts[idx] || ''}
                                  onChange={(e) => setBuyAmounts(prev => ({ ...prev, [idx]: e.target.value }))}
                                  placeholder={maxAmount}
                                  className="w-24 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                                  disabled={loading}
                                />
                              )}
                            </td>
                            <td className="py-4 text-right">
                              {isOwnListing ? (
                                <button
                                  onClick={() => cancelListing(listing)}
                                  disabled={loading}
                                  className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                                >
                                  {loading ? '⏳' : 'Cancel'}
                                </button>
                              ) : (
                                <button
                                  onClick={() => buyListing(listing, idx)}
                                  disabled={loading}
                                  className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                                >
                                  {loading ? '⏳' : 'Buy'}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
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
