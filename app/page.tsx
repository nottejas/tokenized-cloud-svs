'use client';
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButtonDynamic as WalletMultiButton } from "./src/components/WalletButton";
import { useState, useEffect, useRef } from "react";
import { createChart, ColorType } from 'lightweight-charts';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
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
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [tradeMode, setTradeMode] = useState<'buy' | 'sell'>('buy');
  const [tradeAmount, setTradeAmount] = useState('');
  const [tradePrice, setTradePrice] = useState('');
  const [chartTimeframe, setChartTimeframe] = useState<'1H' | '24H' | '7D' | '30D'>('24H');
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const [recentTrades, setRecentTrades] = useState<Array<{
    type: 'buy' | 'sell' | 'cancel',
    price: number,
    amount: number,
    timestamp: number,
    buyer?: string,
    seller?: string
  }>>([]);

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

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!program || !autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchListings();
      if (publicKey) {
        fetchGpuBalance();
        connection.getBalance(publicKey).then((bal) => {
          setBalance(bal / 1e9);
        });
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [program, autoRefresh, publicKey]);

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
      setLastUpdate(Date.now());
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

  // Find best price for buying a specific amount
  const getBestPrice = () => {
    if (listings.length === 0) return null;
    const sorted = [...listings].sort((a, b) => a.price.toNumber() - b.price.toNumber());
    return (sorted[0].price.toNumber() / 1e9).toFixed(6);
  };

  // Calculate market depth for order book visualization
  const getOrderBookDepth = () => {
    const userListings = listings.filter(l => publicKey && l.seller.equals(publicKey));
    const otherListings = listings.filter(l => !publicKey || !l.seller.equals(publicKey));
    
    const sortedBuySide = otherListings.sort((a, b) => a.price.toNumber() - b.price.toNumber());
    const sortedSellSide = userListings.sort((a, b) => b.price.toNumber() - a.price.toNumber());
    
    return { buySide: sortedBuySide, sellSide: sortedSellSide };
  };

  // Calculate total for a trade
  const calculateTradeTotal = () => {
    const amount = parseFloat(tradeAmount);
    const price = parseFloat(tradePrice);
    if (isNaN(amount) || isNaN(price)) return '0.0000';
    return (amount * price).toFixed(4);
  };

  // Get market stats
  const getMarketStats = () => {
    if (listings.length === 0) return { high: 0, low: 0, volume: 0, avgPrice: 0 };
    
    const prices = listings.map(l => l.price.toNumber() / 1e9);
    const high = Math.max(...prices);
    const low = Math.min(...prices);
    const volume = listings.reduce((sum, l) => sum + (l.amount.toNumber() / 1e9), 0);
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    
    return { high, low, volume, avgPrice };
  };

  // Generate historical price data for chart
  const generateChartData = () => {
    const currentPrice = getBestPrice() ? parseFloat(getBestPrice()!) : 0.01;
    const now = Math.floor(Date.now() / 1000);
    const data = [];
    
    // Generate data points based on timeframe
    let intervals = 0;
    let intervalSeconds = 0;
    
    switch (chartTimeframe) {
      case '1H':
        intervals = 60;
        intervalSeconds = 60;
        break;
      case '24H':
        intervals = 96;
        intervalSeconds = 900;
        break;
      case '7D':
        intervals = 168;
        intervalSeconds = 3600;
        break;
      case '30D':
        intervals = 120;
        intervalSeconds = 21600;
        break;
    }
    
    // Generate realistic-looking candles
    let price = currentPrice * 0.95;
    
    for (let i = intervals; i >= 0; i--) {
      const time = now - (i * intervalSeconds);
      const change = (Math.random() - 0.5) * price * 0.04;
      price = Math.max(price + change, currentPrice * 0.8);
      
      const open = price;
      const close = price + (Math.random() - 0.5) * price * 0.02;
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);
      const volume = Math.random() * 1000 + 100;
      
      price = close;
      
      data.push({
        time,
        open: parseFloat(open.toFixed(6)),
        high: parseFloat(high.toFixed(6)),
        low: parseFloat(low.toFixed(6)),
        close: parseFloat(close.toFixed(6)),
        volume: parseFloat(volume.toFixed(2))
      });
    }
    
    // Make last candle match current price
    if (data.length > 0) {
      const last = data[data.length - 1];
      last.close = currentPrice;
      last.high = Math.max(last.high, currentPrice);
      last.low = Math.min(last.low, currentPrice);
    }
    
    return data;
  };

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current || listings.length === 0) return;
    
    if (!chartRef.current) {
      try {
        const chart = createChart(chartContainerRef.current, {
          layout: {
            background: { type: ColorType.Solid, color: '#1a1a1a' },
            textColor: '#9ca3af',
          },
          grid: {
            vertLines: { color: '#2a2a2a' },
            horzLines: { color: '#2a2a2a' },
          },
          width: chartContainerRef.current.clientWidth,
          height: 400,
          timeScale: {
            timeVisible: true,
            secondsVisible: false,
            borderColor: '#2a2a2a',
          },
          rightPriceScale: {
            borderColor: '#2a2a2a',
          },
        });
        
        // Type assertion for chart methods
        const chartAny = chart as any;
        
        const candlestickSeries = chartAny.addCandlestickSeries({
          upColor: '#10b981',
          downColor: '#ef4444',
          borderUpColor: '#10b981',
          borderDownColor: '#ef4444',
          wickUpColor: '#10b981',
          wickDownColor: '#ef4444',
        });
        
        const volumeSeries = chartAny.addHistogramSeries({
          color: '#6366f1',
          priceFormat: {
            type: 'volume',
          },
          priceScaleId: '',
        });
        
        if (volumeSeries && volumeSeries.priceScale) {
          volumeSeries.priceScale().applyOptions({
            scaleMargins: {
              top: 0.8,
              bottom: 0,
            },
          });
        }
        
        chartRef.current = chart;
        candlestickSeriesRef.current = candlestickSeries;
        volumeSeriesRef.current = volumeSeries;
        
        const handleResize = () => {
          if (chartContainerRef.current && chartRef.current) {
            chartRef.current.applyOptions({ 
              width: chartContainerRef.current.clientWidth 
            });
          }
        };
        
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
      } catch (error) {
        console.error('Failed to initialize chart:', error);
      }
    }
  }, [chartContainerRef.current, listings.length]);

  // Update chart data
  useEffect(() => {
    if (!candlestickSeriesRef.current || !volumeSeriesRef.current || listings.length === 0) return;
    
    const data = generateChartData();
    
    candlestickSeriesRef.current.setData(data.map(d => ({
      time: d.time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    })));
    
    volumeSeriesRef.current.setData(data.map(d => ({
      time: d.time,
      value: d.volume,
      color: d.close >= d.open ? '#10b98166' : '#ef444466',
    })));
    
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [listings, chartTimeframe]);

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
      // CRITICAL: Fetch fresh listing data to avoid stale state
      console.log('Fetching latest listing data...');
      const freshListing = await program.account.listing.fetch(listing.address);
      
      if (!freshListing.isActive) {
        alert('❌ This listing is no longer active. Refreshing...');
        await fetchListings();
        setLoading(false);
        return;
      }
      
      const currentAvailable = freshListing.amount.toNumber() / 1e9;
      if (buyAmountTokens > currentAvailable) {
        alert(`❌ Only ${currentAvailable.toFixed(3)} gGPU available now (someone else bought some). Refreshing...`);
        await fetchListings();
        setLoading(false);
        return;
      }
      
      console.log(`Fresh listing check passed. Available: ${currentAvailable} gGPU`);
      
      const gpuMint = await marketplace.getGpuMintPDA(program);
      const buyerTokenAccount = await getAssociatedTokenAddress(gpuMint, publicKey);
      const escrowPDA = await marketplace.getEscrowPDA(program, listing.address);

      // Check if buyer has sufficient SOL for transaction
      const buyerBalance = await connection.getBalance(publicKey);
      const totalCost = (freshListing.price.toNumber() * buyAmountTokens * 1e9) / 1e18;
      
      const accountInfo = await connection.getAccountInfo(buyerTokenAccount);
      
      const instructions = [];
      let additionalCost = 0;
      if (!accountInfo) {
        additionalCost = 0.00203928; // Token account creation cost
        instructions.push(
          createAssociatedTokenAccountInstruction(
            publicKey,
            buyerTokenAccount,
            publicKey,
            gpuMint
          )
        );
        console.log('Will create token account: +0.00203928 SOL');
      }
      
      const totalRequired = totalCost + additionalCost + 0.001; // Buffer for fees
      const buyerBalanceSOL = buyerBalance / 1e9;
      
      if (buyerBalanceSOL < totalRequired) {
        alert(`❌ Insufficient SOL\n\nRequired: ${totalRequired.toFixed(6)} SOL\n- Purchase: ${totalCost.toFixed(6)} SOL\n- Account creation: ${additionalCost.toFixed(6)} SOL\n- Network fees: ~0.001 SOL\n\nYour balance: ${buyerBalanceSOL.toFixed(6)} SOL\nShortfall: ${(totalRequired - buyerBalanceSOL).toFixed(6)} SOL`);
        setLoading(false);
        return;
      }
      
      console.log(`Balance check passed: ${buyerBalanceSOL.toFixed(6)} SOL >= ${totalRequired.toFixed(6)} SOL required`);
      console.log(`Purchase cost: ${totalCost.toFixed(6)} SOL for ${buyAmountTokens} gGPU`);
      if (additionalCost > 0) {
        console.log(`Additional account creation: ${additionalCost} SOL`);
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
      
      // totalCost already calculated above
      alert(`✅ Purchase successful! Bought ${buyAmountTokens.toFixed(2)} gGPU for ${totalCost.toFixed(4)} SOL`);
      console.log(`Transaction signature: ${tx}`);
      console.log(`Total paid: ${totalCost.toFixed(6)} SOL`);;
      
      setBuyAmounts(prev => ({ ...prev, [listingIndex]: '' }));
      
      await fetchListings();
      await fetchGpuBalance();
      const newBalance = await connection.getBalance(publicKey);
      setBalance(newBalance / 1e9);
    } catch (error: any) {
      console.error('Error buying listing:', error);
      
      // Parse specific error types
      let errorMessage = '❌ Purchase failed: ';
      
      if (error.message?.includes('0x1') || error.message?.includes('InsufficientAmount')) {
        errorMessage += 'Listing no longer has enough tokens (someone else bought them first). Refreshing...';
        await fetchListings();
      } else if (error.message?.includes('0x0') || error.message?.includes('ListingNotActive')) {
        errorMessage += 'Listing is no longer active. Refreshing...';
        await fetchListings();
      } else if (error.message?.includes('insufficient funds') || error.message?.includes('not enough SOL')) {
        errorMessage += 'Not enough SOL in your wallet for this transaction and fees.';
      } else if (error.message?.includes('User rejected')) {
        errorMessage = 'Transaction cancelled by user.';
      } else {
        errorMessage += error.message;
      }
      
      alert(errorMessage);
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
            {/* Collapsible Setup Section */}
            <details className="mb-6 bg-yellow-900/20 border border-yellow-600/50 rounded-xl overflow-hidden">
              <summary className="cursor-pointer px-6 py-4 font-bold text-lg hover:bg-yellow-900/30 transition">
                ⚙️ First Time Setup (Click to expand)
              </summary>
              <div className="px-6 pb-4">
                <p className="text-sm text-gray-400 mb-4">Run these once to initialize:</p>
                <div className="flex gap-4">
                  <button
                    onClick={initializeMarketplace}
                    disabled={loading}
                    className="bg-yellow-600 hover:bg-yellow-700 px-6 py-2 rounded-lg font-semibold transition disabled:opacity-50"
                  >
                    {loading ? '⏳' : '1. Init Marketplace'}
                  </button>
                  <button
                    onClick={initializeGpuMint}
                    disabled={loading}
                    className="bg-yellow-600 hover:bg-yellow-700 px-6 py-2 rounded-lg font-semibold transition disabled:opacity-50"
                  >
                    {loading ? '⏳' : '2. Init GPU Mint'}
                  </button>
                  <button
                    onClick={mintGpuTokens}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg font-semibold transition disabled:opacity-50"
                  >
                    {loading ? '⏳' : `3. Mint ${mintAmount} gGPU`}
                  </button>
                  <input
                    type="number"
                    value={mintAmount}
                    onChange={(e) => setMintAmount(e.target.value)}
                    className="w-24 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </details>

            {/* Price Chart */}
            {listings.length > 0 && (
              <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-xl font-bold">📈 gGPU/SOL</h3>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-2xl font-bold text-green-400">
                        {getBestPrice() || '0.0000'} SOL
                      </span>
                      <span className="text-sm text-gray-500">
                        Vol: {getMarketStats().volume.toFixed(2)} gGPU
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {(['1H', '24H', '7D', '30D'] as const).map((tf) => (
                      <button
                        key={tf}
                        onClick={() => setChartTimeframe(tf)}
                        className={`px-4 py-2 rounded-lg font-semibold transition ${
                          chartTimeframe === tf
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>
                <div ref={chartContainerRef} className="w-full" />
              </div>
            )}

            {/* TradingView 3-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-8">
              
              {/* LEFT: Order Book with Depth */}
              <div className="lg:col-span-3 bg-gray-900/50 rounded-xl border border-gray-800 p-4">
                <h3 className="text-lg font-bold mb-4 flex items-center justify-between">
                  📊 Order Book
                  <span className="text-xs text-gray-500">{listings.length} orders</span>
                </h3>
                
                <div className="space-y-1 text-xs">
                  {/* SELL ORDERS (Red) - My Listings */}
                  {listings.filter(l => publicKey && l.seller.equals(publicKey)).length > 0 && (
                    <div className="mb-3">
                      <div className="text-gray-500 mb-2 text-[10px] uppercase">Sell Orders (Yours)</div>
                      {listings
                        .filter(l => publicKey && l.seller.equals(publicKey))
                        .sort((a, b) => b.price.toNumber() - a.price.toNumber())
                        .slice(0, 8)
                        .map((listing, idx) => {
                          const price = (listing.price.toNumber() / 1e9).toFixed(4);
                          const amount = (listing.amount.toNumber() / 1e9).toFixed(2);
                          const total = ((listing.price.toNumber() * listing.amount.toNumber()) / 1e18).toFixed(3);
                          const maxAmount = Math.max(...listings.map(l => l.amount.toNumber()));
                          const widthPercent = (listing.amount.toNumber() / maxAmount) * 100;
                          
                          return (
                            <div key={idx} className="relative hover:bg-red-900/20 transition cursor-pointer py-1 px-2 rounded">
                              <div 
                                className="absolute right-0 top-0 bottom-0 bg-red-900/20" 
                                style={{ width: `${widthPercent}%` }}
                              ></div>
                              <div className="relative flex justify-between items-center">
                                <span className="text-red-400 font-semibold">{price}</span>
                                <span className="text-gray-400">{amount}</span>
                                <span className="text-gray-500">{total}</span>
                              </div>
                            </div>
                          );
                        })
                      }
                    </div>
                  )}
                  
                  {/* Spread Indicator */}
                  {listings.length > 0 && (
                    <div className="my-2 py-2 border-y border-gray-800 text-center">
                      <span className="text-green-400 font-bold">{getBestPrice()} SOL</span>
                      <span className="text-gray-600 text-[10px] ml-2">BEST PRICE</span>
                    </div>
                  )}
                  
                  {/* BUY ORDERS (Green) - Other Listings */}
                  {listings.filter(l => !publicKey || !l.seller.equals(publicKey)).length > 0 && (
                    <div>
                      <div className="text-gray-500 mb-2 text-[10px] uppercase">Buy Opportunities</div>
                      {listings
                        .filter(l => !publicKey || !l.seller.equals(publicKey))
                        .sort((a, b) => a.price.toNumber() - b.price.toNumber())
                        .slice(0, 8)
                        .map((listing, idx) => {
                          const price = (listing.price.toNumber() / 1e9).toFixed(4);
                          const amount = (listing.amount.toNumber() / 1e9).toFixed(2);
                          const total = ((listing.price.toNumber() * listing.amount.toNumber()) / 1e18).toFixed(3);
                          const maxAmount = Math.max(...listings.map(l => l.amount.toNumber()));
                          const widthPercent = (listing.amount.toNumber() / maxAmount) * 100;
                          
                          return (
                            <div key={idx} className="relative hover:bg-green-900/20 transition cursor-pointer py-1 px-2 rounded">
                              <div 
                                className="absolute right-0 top-0 bottom-0 bg-green-900/20" 
                                style={{ width: `${widthPercent}%` }}
                              ></div>
                              <div className="relative flex justify-between items-center">
                                <span className="text-green-400 font-semibold">{price}</span>
                                <span className="text-gray-400">{amount}</span>
                                <span className="text-gray-500">{total}</span>
                              </div>
                            </div>
                          );
                        })
                      }
                    </div>
                  )}
                  
                  {listings.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">No orders yet</p>
                      <p className="text-xs mt-1">Be the first to create a listing!</p>
                    </div>
                  )}
                </div>
              </div>

              {/* CENTER: Trading Panel */}
              <div className="lg:col-span-6 bg-gray-900/50 rounded-xl border border-gray-800 p-6">
                {/* Buy/Sell Tabs */}
                <div className="flex gap-2 mb-6">
                  <button
                    onClick={() => setTradeMode('buy')}
                    className={`flex-1 py-3 rounded-lg font-bold transition ${
                      tradeMode === 'buy'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    BUY gGPU
                  </button>
                  <button
                    onClick={() => setTradeMode('sell')}
                    className={`flex-1 py-3 rounded-lg font-bold transition ${
                      tradeMode === 'sell'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    SELL gGPU
                  </button>
                </div>

                {/* Trade Form */}
                <div className="space-y-4">
                  {tradeMode === 'buy' ? (
                    // BUY MODE
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-gray-400 mb-2 block">Available to buy from market</label>
                        <div className="bg-gray-800 rounded-lg p-4">
                          <p className="text-2xl font-bold text-green-400">
                            {listings.filter(l => !publicKey || !l.seller.equals(publicKey))
                              .reduce((sum, l) => sum + (l.amount.toNumber() / 1e9), 0)
                              .toFixed(2)} gGPU
                          </p>
                          <p className="text-xs text-gray-500 mt-1">at best price: {getBestPrice() || '—'} SOL</p>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm text-gray-400 mb-2 block">Amount to buy (gGPU)</label>
                        <input
                          type="number"
                          value={tradeAmount}
                          onChange={(e) => setTradeAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-4 text-white text-lg font-semibold"
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm text-gray-400 mb-2 block">At price (SOL per gGPU)</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={tradePrice}
                            onChange={(e) => setTradePrice(e.target.value)}
                            placeholder="0.00"
                            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-4 text-white text-lg font-semibold"
                          />
                          <button
                            onClick={() => setTradePrice(getBestPrice() || '')}
                            className="px-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition"
                          >
                            Best
                          </button>
                        </div>
                      </div>
                      
                      <div className="bg-gray-800/50 rounded-lg p-4">
                        <div className="flex justify-between mb-2">
                          <span className="text-gray-400">Total Cost</span>
                          <span className="text-xl font-bold text-white">{calculateTradeTotal()} SOL</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Your SOL Balance</span>
                          <span className="text-gray-300">{balance.toFixed(4)} SOL</span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => {
                          // Find listing at specified price and buy
                          const targetListing = listings.find(l => 
                            (l.price.toNumber() / 1e9).toFixed(4) === parseFloat(tradePrice).toFixed(4)
                          );
                          if (targetListing) {
                            const idx = listings.indexOf(targetListing);
                            setBuyAmounts({ ...buyAmounts, [idx]: tradeAmount });
                            buyListing(targetListing, idx);
                          } else {
                            alert('❌ No listing found at that price');
                          }
                        }}
                        disabled={loading || !tradeAmount || !tradePrice}
                        className="w-full bg-green-600 hover:bg-green-700 py-4 rounded-lg font-bold text-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? '⏳ Processing...' : 'BUY gGPU'}
                      </button>
                    </div>
                  ) : (
                    // SELL MODE
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-gray-400 mb-2 block">Your gGPU Balance</label>
                        <div className="bg-gray-800 rounded-lg p-4">
                          <p className="text-2xl font-bold text-red-400">{gpuBalance.toFixed(2)} gGPU</p>
                          <p className="text-xs text-gray-500 mt-1">available to sell</p>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm text-gray-400 mb-2 block">Amount to sell (gGPU)</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={listAmount}
                            onChange={(e) => setListAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-4 text-white text-lg font-semibold"
                          />
                          <button
                            onClick={() => setListAmount(gpuBalance.toString())}
                            className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition"
                          >
                            MAX
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm text-gray-400 mb-2 block">Price (SOL per gGPU)</label>
                        <input
                          type="number"
                          value={listPrice}
                          onChange={(e) => setListPrice(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-4 text-white text-lg font-semibold"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          Market best: {getBestPrice() || '—'} SOL
                        </p>
                      </div>
                      
                      <div className="bg-gray-800/50 rounded-lg p-4">
                        <div className="flex justify-between mb-2">
                          <span className="text-gray-400">You'll Receive</span>
                          <span className="text-xl font-bold text-white">
                            {(parseFloat(listAmount || '0') * parseFloat(listPrice || '0')).toFixed(4)} SOL
                          </span>
                        </div>
                      </div>
                      
                      <button
                        onClick={createListing}
                        disabled={loading || !listAmount || !listPrice}
                        className="w-full bg-red-600 hover:bg-red-700 py-4 rounded-lg font-bold text-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? '⏳ Processing...' : 'CREATE SELL ORDER'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT: My Orders */}
              <div className="lg:col-span-3 bg-gray-900/50 rounded-xl border border-gray-800 p-4">
                <h3 className="text-lg font-bold mb-4">My Orders</h3>
                
                {listings.filter(l => publicKey && l.seller.equals(publicKey)).length > 0 ? (
                  <div className="space-y-2">
                    {listings
                      .filter(l => publicKey && l.seller.equals(publicKey))
                      .map((listing, idx) => (
                        <div key={idx} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="text-sm font-semibold text-red-400">
                                {(listing.price.toNumber() / 1e9).toFixed(4)} SOL
                              </p>
                              <p className="text-xs text-gray-500">
                                {(listing.amount.toNumber() / 1e9).toFixed(2)} gGPU
                              </p>
                            </div>
                            <span className="text-[10px] bg-green-600/20 text-green-400 px-2 py-1 rounded">
                              ACTIVE
                            </span>
                          </div>
                          <button
                            onClick={() => cancelListing(listing)}
                            disabled={loading}
                            className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-400 py-2 rounded text-xs font-semibold transition disabled:opacity-50"
                          >
                            {loading ? '⏳' : 'Cancel Order'}
                          </button>
                        </div>
                      ))
                    }
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No active orders</p>
                    <p className="text-xs mt-1">Create a sell order to see it here</p>
                  </div>
                )}
              </div>
            </div>

          </>
        )}
      </div>
    </div>
  );
}
