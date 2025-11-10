# GPU DEX - Academic Project Presentation
## Decentralized GPU Token Marketplace on Solana

---

## TABLE OF CONTENTS

1. Introduction & Project Context
2. Problem Statement
3. Motivation
4. Purpose of the Project
5. What Does GPU DEX Do?
6. Technology Stack & Currency
7. Comparison with Traditional Providers
8. Blockchain Fundamentals (Bitcoin, Mining, Crisis)
9. Technical Implementation
10. Smart Contract Functions
11. Trading Mechanisms
12. Project Scope
13. Plan of Action
14. Results & Achievements
15. References

---

# SLIDE 1: Title & Introduction

```
GPU DEX
Decentralized GPU Token Marketplace on Solana Blockchain

A 6-Month Blockchain Development Project

Student: [Your Name]
Guide: [Professor Name]
Institution: [University Name]
Academic Year: 2024-25

Program ID: 7BXzUwxv9aKULu8Jw4sYM9Web2Mg1PNHTrVWwJbiAsxw
Deployed on: Solana Devnet
```

---

# SLIDE 2: Problem Statement

```
CURRENT CHALLENGES IN GPU COMPUTING MARKETPLACE

1. Centralized Platforms (AWS, GCP, Vast.ai)
   ❌ High fees: 20-30% commission
   ❌ Geographic restrictions
   ❌ Long setup times: 3-5 days
   ❌ Payment delays: 30-day settlements
   ❌ Lack of transparency in pricing
   ❌ KYC requirements limit accessibility

2. Market Inefficiencies
   ❌ No global price discovery mechanism
   ❌ Limited liquidity
   ❌ No instant settlement
   ❌ High entry barriers

3. Trust Issues
   ❌ Centralized control over funds
   ❌ Platform can freeze accounts
   ❌ No transparent transaction history

PROBLEM: How can we create a global, transparent, instant, 
         and low-cost marketplace for GPU computing resources?
```

---

# SLIDE 3: Motivation

```
WHY THIS PROJECT?

Market Opportunity:
• GPU computing market: $54 Billion (2024)
• 32% annual growth rate
• Driven by AI/ML explosion
• High demand from researchers, miners, developers

Technology Opportunity:
• Blockchain enables trustless transactions
• Solana provides necessary speed & cost efficiency
• Smart contracts automate escrow & settlement
• Decentralization eliminates middlemen

Academic Motivation:
✓ Learn blockchain development (Solana/Rust)
✓ Understand DeFi mechanisms
✓ Build production-ready application
✓ Solve real-world problem
✓ Gain experience with Web3 stack
✓ Demonstrate full-stack capabilities

Personal Motivation:
• Blockchain is the future of finance
• Solana's performance is impressive
• Desire to build decentralized systems
• Interest in tokenization of real assets
```

---

# SLIDE 4: Purpose of the Project

```
PROJECT OBJECTIVES

Primary Purpose:
Create a decentralized, transparent, and efficient marketplace
for trading GPU computing resources using blockchain technology

Specific Goals:

1. Technical Goals
   ✓ Develop Solana smart contract in Rust
   ✓ Implement secure escrow mechanism
   ✓ Create user-friendly trading interface
   ✓ Integrate wallet connectivity (Phantom)
   ✓ Deploy on Solana devnet

2. Learning Objectives
   ✓ Master Solana blockchain architecture
   ✓ Understand Program Derived Addresses (PDAs)
   ✓ Learn smart contract security
   ✓ Build Web3 frontend with React/Next.js
   ✓ Handle blockchain state management

3. Problem-Solving Goals
   ✓ Reduce transaction costs by 99.99%
   ✓ Enable instant settlements (<1 second)
   ✓ Provide global accessibility
   ✓ Ensure transparent pricing
   ✓ Automate trust through code

4. Demonstration Goals
   ✓ Working prototype on devnet
   ✓ Complete marketplace functionality
   ✓ Professional UI/UX
   ✓ Comprehensive testing
```

---

# SLIDE 5: What Does GPU DEX Do?

```
SYSTEM FUNCTIONALITY - DETAILED BREAKDOWN

Core Features Explained:

1. Token Management System
   
   a) Create GPU Token (gGPU)
      • Standard: SPL Token (Solana Program Library)
      • Decimals: 9 (allows 0.000000001 precision)
      • Why 9? Same as SOL for consistency
      • Mint Address: Deterministic PDA at [b"gpu-mint"]
      
      Technical Details:
      - Token Type: Fungible (divisible)
      - Total Supply: Unlimited (mintable on demand)
      - Mint Authority: Controlled by PDA (program can mint)
      - Freeze Authority: None (tokens always transferable)
   
   b) Mint Tokens (Representing GPU Power)
      • 1 gGPU = 1 hour of GPU compute time (conceptual)
      • Users mint based on their GPU availability
      • Example: Owner with RTX 3090 → Mints 100 gGPU
      • Metadata includes: Name, Symbol, Logo URL
      
      Minting Process:
      Step 1: User initiates mint_gpu_tokens(amount)
      Step 2: Program checks mint authority PDA
      Step 3: Cross-Program Invocation (CPI) to Token Program
      Step 4: New tokens created in user's Associated Token Account
      Step 5: Total supply increases automatically
      
   c) Track Ownership
      • All ownership recorded on Solana blockchain
      • Each user has Associated Token Account (ATA)
      • ATA Address = Derived from (User + Mint)
      • View anytime on Solana Explorer
      • Immutable history of all transfers

2. Marketplace Operations - Seller Side
   
   List Tokens Process:
   ┌──────────────────────────────────────────┐
   │ 1. Seller clicks "Create Listing"        │
   │ 2. Enters: Amount (10 gGPU)              │
   │           Price (0.05 SOL per gGPU)      │
   │ 3. Total value shown: 0.5 SOL           │
   │ 4. Clicks "Create Sell Order"           │
   │ 5. Phantom pops up for approval         │
   │ 6. Smart contract executes:             │
   │    - Creates Listing account            │
   │    - Creates Escrow account             │
   │    - Transfers 10 gGPU to escrow       │
   │    - Listing now visible to all        │
   │ 7. Confirmation in ~478ms               │
   └──────────────────────────────────────────┘
   
   What Seller Can Do:
   • Set any price (market-driven pricing)
   • List partial balance (e.g., 10 out of 100 gGPU)
   • Cancel anytime (tokens returned immediately)
   • Create multiple listings
   • View listing status in "My Orders" panel
   
   Cancel Listing Process:
   - Click "Cancel Order" button
   - Confirm in Phantom
   - Escrow releases tokens back to seller
   - Listing marked inactive
   - Rent refunded (account closed if empty)

3. Marketplace Operations - Buyer Side
   
   Browse & Buy Process:
   ┌──────────────────────────────────────────┐
   │ Order Book Display:                      │
   │ ┌──────────────────────────────────┐   │
   │ │ Price  │ Amount │ Total          │   │
   │ ├────────┼────────┼────────────────┤   │
   │ │ 0.048  │ 25.00  │ 1.200 SOL     │   │
   │ │ 0.050  │ 10.00  │ 0.500 SOL  ← │   │
   │ │ 0.052  │ 15.00  │ 0.780 SOL     │   │
   │ └──────────────────────────────────┘   │
   │                                          │
   │ 1. Buyer sees listings sorted by price  │
   │ 2. Clicks on desired listing            │
   │ 3. Enters amount to buy (e.g., 5 gGPU) │
   │ 4. System calculates:                   │
   │    Cost = 5 × 0.050 = 0.25 SOL         │
   │    Fee = 0.00025 SOL                   │
   │    Total = 0.25025 SOL                 │
   │ 5. Phantom shows exact costs           │
   │ 6. Buyer approves                      │
   │ 7. Smart contract:                     │
   │    - Transfers 0.25 SOL to seller     │
   │    - Transfers 5 gGPU to buyer        │
   │    - Updates listing (5 gGPU left)    │
   │ 8. Both parties updated instantly      │
   └──────────────────────────────────────────┘
   
   Partial Fills:
   • Buyer can purchase any amount ≤ available
   • Listing stays active until fully sold
   • Multiple buyers can buy from same listing
   
   Example:
   Listing: 100 gGPU at 0.05 SOL each
   Buyer 1: Buys 30 gGPU → 70 remaining
   Buyer 2: Buys 50 gGPU → 20 remaining
   Buyer 3: Buys 20 gGPU → 0 remaining (auto-closes)

4. Smart Escrow System (Trustless)
   
   What is Escrow?
   • Third-party holding account
   • Holds seller's tokens during listing
   • Automatically releases on valid purchase
   • No human intervention needed
   
   How It Works Technically:
   
   Escrow Account Structure:
   ┌──────────────────────────────────────┐
   │ Escrow Token Account                 │
   ├──────────────────────────────────────┤
   │ Address: PDA [b"escrow", listing]    │
   │ Owner: Token Program                 │
   │ Authority: Listing PDA (only!)       │
   │ Holds: Seller's gGPU tokens          │
   │ Can release: Only via smart contract │
   └──────────────────────────────────────┘
   
   Security Features:
   ✓ Seller can't withdraw during active listing
   ✓ Buyer can't take tokens without payment
   ✓ Only smart contract can release tokens
   ✓ Listing PDA signs token transfers
   ✓ If listing cancelled → tokens returned
   ✓ Atomic transactions (all or nothing)
   
   PDA Signing Process:
   ```rust
   // Listing PDA has authority over escrow
   let seeds = &[
       b"listing",
       seller.as_ref(),
       &listing_id.to_le_bytes(),
       &[bump],
   ];
   let signer = &[&seeds[..]];
   
   // PDA signs the transfer
   token::transfer(
       CpiContext::new_with_signer(program, accounts, signer),
       amount
   )?;
   ```

5. Trading Interface Components
   
   a) Real-time Price Charts
      • Library: TradingView Lightweight Charts
      • Chart Types: Candlestick + Volume Histogram
      • Timeframes: 1H, 24H, 7D, 30D
      • Auto-refresh: Every 10 seconds
      
      Candlestick Anatomy:
      ┌─── High (highest price in period)
      │
      ├─┐  
      │ │  Body = Close > Open (green)
      │ │        or Close < Open (red)
      ├─┘  
      │
      └─── Low (lowest price in period)
      
   b) Order Book Visualization
      • Shows all active listings
      • Sorted by price (best first)
      • Color coded: Red (sell), Green (buy)
      • Depth bars show volume
      • Click to auto-fill price
      
   c) My Orders Panel
      • Your active listings only
      • Shows: Price, Amount, Total value
      • Status indicator (Active/Inactive)
      • One-click cancel button
      • Real-time updates

Detailed User Flow Example:

Scenario: Alice (GPU Owner) sells to Bob (AI Researcher)

Initial State:
• Alice has: 100 gGPU, 2 SOL
• Bob has: 0 gGPU, 5 SOL

Step 1: Alice Creates Listing
  Time: 0ms
  Action: create_listing(price=50_000_000, amount=10_000_000_000)
  Gas: 0.00289 SOL
  
  After:
  • Alice: 90 gGPU (10 in escrow), 1.99711 SOL
  • Listing PDA created
  • Escrow holds: 10 gGPU
  • Marketplace listing_count++

Step 2: Bob Browses Market
  Time: +5000ms
  Action: Sees listing "10 gGPU at 0.05 SOL each"
  UI shows: Total cost = 0.5 SOL

Step 3: Bob Buys
  Time: +10000ms
  Action: buy_listing(amount=10_000_000_000)
  Gas: 0.00025 SOL
  
  Smart Contract Executes:
  1. Verify listing active ✓
  2. Calculate: total = (50_000_000 × 10_000_000_000) / 10^9 = 500_000_000 lamports = 0.5 SOL
  3. Transfer SOL: Bob → Alice (0.5 SOL)
  4. Listing PDA signs
  5. Transfer gGPU: Escrow → Bob (10 gGPU)
  6. Update listing: amount = 0, is_active = false
  
  After:
  • Bob: 10 gGPU, 4.49975 SOL (paid 0.5 + 0.00025 fee)
  • Alice: 90 gGPU, 2.49711 SOL (received 0.5 payment)
  • Listing: Inactive (auto-closed)
  • Escrow: Empty

Time Total: 478ms for transaction confirmation!

Result:
✓ Alice sold GPU time, received instant payment
✓ Bob acquired GPU tokens, paid exact amount
✓ No intermediary fees (only 0.00025 SOL network fee)
✓ Fully transparent (viewable on Solana Explorer)
✓ Irreversible & cryptographically secure
```

---

# SLIDE 6: Technology & Currency

```
TECH STACK & CURRENCY SYSTEM

Blockchain: Solana
• Speed: 400ms block time, 65,000 TPS
• Cost: $0.00025 per transaction
• Consensus: Proof of Stake + Proof of History

Smart Contract:
• Language: Rust
• Framework: Anchor 0.30.x
• Program ID: 7BXzUwxv9aKULu8Jw4sYM9Web2Mg1PNHTrVWwJbiAsxw
• Lines of Code: 416

Frontend:
• Framework: Next.js 16 (React)
• Language: TypeScript (1,193 lines)
• Styling: TailwindCSS
• Charts: Lightweight Charts library
• Wallet: Phantom integration

CURRENCY SYSTEM:

Primary: SOL (Solana)
• Native cryptocurrency of Solana
• Used for: Transaction fees, payments
• 1 SOL = 1,000,000,000 lamports
• Current value: ~$20-40 USD

Project Token: gGPU (GPU Token)
• Custom SPL token
• Represents: GPU compute units
• Decimals: 9 (same as SOL)
• Metadata: Name, symbol, logo
• Traded using SOL

Transaction Flow:
User has SOL → Pays for transaction fees
User mints gGPU → Lists for sale (price in SOL)
Buyer pays SOL → Receives gGPU
Seller receives SOL → Instant settlement
```

---

# SLIDE 7: Comparison - Why Solana?

```
GPU DEX vs TRADITIONAL PROVIDERS

┌──────────────┬─────────────┬─────────────┬─────────────┐
│ Feature      │ AWS/GCP     │ Vast.ai     │ GPU DEX     │
├──────────────┼─────────────┼─────────────┼─────────────┤
│ Setup Time   │ 3-5 days    │ 1-2 hours   │ Instant     │
│ Fees         │ 20-30%      │ 20%         │ 0.0025%     │
│ Settlement   │ 30 days     │ 7 days      │ <1 second   │
│ Geographic   │ Restricted  │ Limited     │ Global      │
│ KYC          │ Required    │ Required    │ Not needed  │
│ Minimum Cost │ $100/month  │ $10/hour    │ $0.00025/tx │
│ Transparency │ Limited     │ Medium      │ Full        │
│ Control      │ Platform    │ Platform    │ You own     │
└──────────────┴─────────────┴─────────────┴─────────────┘

Why Solana Over Other Blockchains?

┌──────────────┬──────┬────────────┬──────────┐
│ Chain        │ TPS  │ Tx Fee     │ Time     │
├──────────────┼──────┼────────────┼──────────┤
│ Bitcoin      │ 7    │ $1-50      │ 10 min   │
│ Ethereum     │ 30   │ $1-100     │ 12 sec   │
│ Polygon      │ 7K   │ $0.01      │ 2 sec    │
│ Solana       │ 65K  │ $0.00025   │ 400ms    │
└──────────────┴──────┴────────────┴──────────┘

Key Differentiators:
✓ 1000x cheaper than traditional platforms
✓ Instant vs 30-day settlement
✓ Permissionless (no KYC)
✓ Transparent (all transactions on-chain)
✓ Decentralized (no single point of failure)
✓ Programmable (smart contracts)
```

---

# SLIDE 8: Blockchain Fundamentals - Bitcoin, Mining & Crisis

```
BITCOIN, MINING & 2008 FINANCIAL CRISIS - IN DEPTH

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PART 1: THE 2008 FINANCIAL CRISIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

What Happened?

1. Pre-Crisis (2000-2007):
   • Banks gave mortgages to risky borrowers (subprime)
   • No verification of income ("NINJA loans" - No Income, No Job)
   • Banks bundled these mortgages into securities (MBS)
   • Rating agencies falsely rated them as "safe" (AAA)
   • Everyone believed housing prices would always rise

2. The Bubble Bursts (2007-2008):
   • Housing prices started falling
   • Borrowers couldn't repay loans
   • Mortgage-backed securities became worthless
   • Banks had trillions in bad assets
   
3. The Collapse:
   September 15, 2008: Lehman Brothers (158-year-old bank)
   • Declared bankruptcy
   • $613 billion in debt
   • Triggered global panic
   • Stock markets crashed 50%
   • People lost jobs, homes, savings

4. Government Response:
   • $700 billion bailout (TARP program)
   • "Too big to fail" banks rescued
   • Taxpayers paid for banks' mistakes
   • Banks got bonuses, people got unemployment
   • Trust in financial system shattered

Key Problem Exposed:
❌ Centralized control
❌ Lack of transparency
❌ Moral hazard (risk without consequence)
❌ Need for permission from banks

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PART 2: BITCOIN'S BIRTH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

October 31, 2008: Bitcoin Whitepaper Published
• Author: "Satoshi Nakamoto" (still anonymous)
• Title: "Bitcoin: A Peer-to-Peer Electronic Cash System"
• Timing: 1 month after Lehman collapse (not coincidence)

January 3, 2009: Genesis Block Mined
• First Bitcoin block ever created
• Embedded message in code:
  "The Times 03/Jan/2009 Chancellor on brink of 
   second bailout for banks"
• Clear political statement against bank bailouts

What is Bitcoin?
┌──────────────────────────────────────────────┐
│ Digital Currency Without Central Authority  │
├──────────────────────────────────────────────┤
│ • Peer-to-peer: No intermediary needed       │
│ • Decentralized: No single point of control  │
│ • Limited supply: Only 21 million will exist │
│ • Programmable: Rules enforced by code       │
│ • Transparent: All transactions public       │
│ • Permissionless: Anyone can use it          │
│ • Censorship-resistant: Can't be shut down   │
└──────────────────────────────────────────────┘

Bitcoin vs Traditional Money:
┌──────────────┬─────────────────┬──────────────────┐
│ Feature      │ Traditional $   │ Bitcoin          │
├──────────────┼─────────────────┼──────────────────┤
│ Issued by    │ Central Bank    │ Mining (math)    │
│ Supply       │ Unlimited       │ 21M fixed        │
│ Control      │ Government      │ Network rules    │
│ Transparency │ Limited         │ Fully public     │
│ Seizure      │ Possible        │ Very difficult   │
│ Inflation    │ Yes (~2%/year)  │ Deflationary     │
└──────────────┴─────────────────┴──────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PART 3: WHAT IS MINING?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Mining = Security + Consensus + New Coin Creation

The Problem Mining Solves:
• How do you verify transactions without a bank?
• How do you prevent double-spending?
• How do you agree on transaction order?
• Who adds new blocks to the blockchain?

How Bitcoin Mining Works (Step-by-Step):

Step 1: Transactions Broadcast
• Alice sends 1 BTC to Bob
• Transaction broadcasted to all nodes
• Sits in "mempool" (waiting area)

Step 2: Miners Collect Transactions
• Miners select ~2000 transactions
• Arrange them in a block
• Add previous block's hash (linking chain)

Step 3: The Mining Puzzle
Find a number (nonce) where:
  SHA256(Block Data + nonce) < Target

Example:
  Block: "Alice→Bob: 1 BTC; Bob→Charlie: 0.5 BTC..."
  Try nonce = 1: Hash = 8a3f2... (too high)
  Try nonce = 2: Hash = 7b4e1... (too high)
  ...
  Try nonce = 8,492,374: Hash = 00000a3b... (Success!)

The hash must start with certain number of zeros.
More zeros = Harder difficulty.
Currently: ~19 leading zeros required!

Step 4: First to Solve Wins
Winner gets:
• Block reward: 6.25 BTC (~$160,000 at $25k/BTC)
• Transaction fees: ~0.5 BTC (~$12,500)
• Total: ~$172,500 for 10 minutes of work!

Step 5: Block Added to Blockchain
• Winner broadcasts solution
• Other miners verify (takes 1 millisecond)
• Block added permanently
• Everyone starts mining next block

Why "Proof of Work"?
• Proves you spent computational energy
• Makes attacking the network expensive
• Cost to attack > Reward for honesty

Mining Difficulty:
• Adjusts every 2016 blocks (~2 weeks)
• Target: 1 block every 10 minutes
• If miners get faster → difficulty increases
• Currently: Requires 200 quintillion hashes/second

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PART 4: GPU MINING CONNECTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Why GPUs for Mining?

CPU vs GPU:
┌─────────────┬──────────────┬──────────────┐
│ Processor   │ Cores        │ Hash/sec     │
├─────────────┼──────────────┼──────────────┤
│ CPU         │ 8-16 cores   │ 20 MH/s      │
│ GPU         │ 5000+ cores  │ 30 GH/s      │
│ Speedup     │              │ 1500x faster │
└─────────────┴──────────────┴──────────────┘

GPU Architecture:
• Designed for parallel processing
• Perfect for trying millions of nonces simultaneously
• Bitcoin mining: 2010-2013 (then ASICs took over)
• Ethereum mining: 2015-2022 (until Proof of Stake)

The GPU Shortage (2017-2021):
• Crypto mining very profitable
• Miners bought all GPUs
• Gamers couldn't find RTX 3080s
• Prices: $700 card → $2000+ scalping
• Our motivation: If GPUs valuable for mining,
  why not trade GPU compute time itself?

Ethereum's Merge (Sept 2022):
• Ethereum switched from mining to staking
• Millions of GPUs suddenly idle
• Perfect timing for GPU marketplace!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PART 5: SOLANA'S DIFFERENT APPROACH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Proof of Stake (No Mining):

How Solana Works:
1. Validators stake SOL tokens (deposit)
2. Selected to produce blocks based on stake
3. Honest behavior → Keep rewards
4. Dishonest → Lose staked SOL ("slashing")

Comparison:
┌──────────────┬────────────────┬──────────────┐
│ Feature      │ Bitcoin (PoW)  │ Solana (PoS) │
├──────────────┼────────────────┼──────────────┤
│ Energy       │ 150 TWh/year   │ Minimal      │
│ Hardware     │ ASICs/GPUs     │ Regular PC   │
│ Speed        │ 10 min/block   │ 400ms        │
│ Cost         │ High           │ Very low     │
│ Entry barrier│ Expensive      │ Stake tokens │
└──────────────┴────────────────┴──────────────┘

Proof of History (Solana Innovation):
• Built-in clock (timestamps)
• Proves time passed between events
• No waiting for block confirmation
• Enables 400ms block time

Why We Use Solana:
✓ No mining → Energy efficient
✓ Fast → Better UX
✓ Cheap → Microtransactions possible
✓ Secure → Proof of Stake + History
```

---

# SLIDE 9: Phantom Wallet & Transactions

```
WALLET & TRANSACTION MECHANICS

Phantom Wallet:
• Browser extension for Solana
• Stores private keys securely
• Signs transactions
• Shows balances & tokens
• Most popular Solana wallet

Key Concepts:
Public Key: Your address (like account number)
            Example: 7BXz...AsxW
            Safe to share

Private Key: Your password (proves ownership)
             NEVER share!
             Used to sign transactions

Seed Phrase: 12-24 words for recovery
             Example: "witch collapse practice..."
             Write down, keep secure

How Transactions Work:

1. User Action: Click "Buy 10 gGPU"

2. Transaction Created:
   {
     instruction: buy_listing,
     accounts: [buyer, seller, escrow...],
     data: amount = 10
   }

3. Sent to Phantom: Pop-up for approval

4. User Signs: Phantom uses private key
               Signature = Sign(tx, privateKey)

5. Broadcast: Sent to Solana network

6. Validation: Validators verify signature
               Execute smart contract

7. Confirmation: Added to block (~400ms)
                 UI updates

Digital Signatures:
• Proves you authorized the transaction
• Can't be forged (cryptographically secure)
• Can't be modified after signing
• Publicly verifiable

Transaction Components:
• From/To addresses
• Amount & fee
• Instruction data
• Recent blockhash (prevents replay)
• Signature
```

---

# SLIDE 10: Smart Contract Functions (Part 1)

```
INITIALIZATION FUNCTIONS

1. initialize_marketplace()
   Purpose: One-time platform setup
   Creates: Global marketplace account
   Stores: Authority, listing counter
   PDA: [b"marketplace"]
   Cost: ~0.002 SOL

2. initialize_gpu_mint()
   Purpose: Create gGPU token
   Creates: Token mint account
   Decimals: 9 (1.000000000)
   Authority: Mint authority PDA
   PDA: [b"gpu-mint"]
   Cost: ~0.002 SOL

3. add_gpu_metadata()
   Purpose: Add token info (logo, name)
   Creates: Metaplex metadata account
   Data: Name="GPU Token", Symbol="gGPU", URI
   Why: Makes token visible in Phantom
   Cost: ~0.001 SOL

4. mint_gpu_tokens(amount)
   Purpose: Create new gGPU tokens
   To: User's token account (ATA)
   Authority: Mint authority PDA signs
   Example: mint_gpu_tokens(100_000_000_000) → 100 gGPU
   Cost: 0.00203928 SOL (if creating new ATA)

Key Concept - Program Derived Address (PDA):
• Deterministic addresses derived from seeds
• No private key (controlled by program)
• Seeds: [b"marketplace"], [b"gpu-mint"], etc.
• Allows program to "sign" transactions
• Used for escrow accounts
```

---

# SLIDE 11: Smart Contract Functions (Part 2)

```
TRADING FUNCTIONS

5. create_listing(price, amount)
   Purpose: List tokens for sale
   Input: Price (SOL), Amount (gGPU)
   Creates: Listing PDA + Escrow PDA
   Effect: Tokens locked in escrow
   Example: create_listing(50000000, 10000000000)
            = 10 gGPU at 0.05 SOL each
   Cost: ~0.00289 SOL

   Flow:
   Seller → Creates listing → Tokens to escrow
         → Listing becomes visible to buyers

6. buy_listing(amount)
   Purpose: Purchase tokens
   Input: Amount to buy
   Validates: Listing active, sufficient amount
   Calculates: total_price = (price × amount) / 10^9
   Transfers: SOL (buyer→seller), gGPU (escrow→buyer)
   Updates: listing.amount -= purchased
   Example: buy_listing(5000000000) = Buy 5 gGPU
   Cost: ~0.00025 SOL + purchase price

   Flow:
   Buyer → Pays SOL → Listing PDA signs transfer
        → Buyer receives gGPU from escrow → Instant!

7. cancel_listing()
   Purpose: Remove listing & refund
   Validates: Caller is seller, listing active
   Transfers: Tokens back from escrow to seller
   Updates: listing.is_active = false
   Cost: ~0.00005 SOL

   Flow:
   Seller → Cancels → Listing PDA signs
         → Tokens returned → Listing inactive

Security Features:
✓ Authority checks (has_one = seller)
✓ Overflow protection (checked_mul)
✓ Minimum amounts (0.001 gGPU)
✓ Active status validation
✓ PDA signing for escrow
```

---

# SLIDE 12: Trading Interface Explained

```
UI COMPONENTS & TRADING MECHANISMS

1. Candlestick Charts
   What: Visual representation of price over time
   Shows: Open, High, Low, Close (OHLC) per period
   Colors: Green = price up, Red = price down
   Timeframes: 1H, 24H, 7D, 30D
   Library: Lightweight Charts by TradingView

   Example Candlestick:
   ┌─── High: 0.055 SOL
   │
   ├─┐  Close: 0.052 SOL (green = up)
   │ │
   │ │  Open: 0.048 SOL
   ├─┘
   │
   └─── Low: 0.045 SOL

2. Order Book
   What: List of all buy/sell orders
   Shows: Price, Amount, Total value
   Layout:
   ┌───────────────────────────┐
   │ SELL ORDERS (Red)         │
   │ Price │ Amount │ Total    │
   │ 0.055 │ 10.00  │ 0.550    │
   │ 0.052 │ 25.00  │ 1.300    │
   ├───────────────────────────┤
   │ BEST PRICE: 0.050 ← Spread│
   ├───────────────────────────┤
   │ BUY ORDERS (Green)        │
   │ 0.048 │ 15.00  │ 0.720    │
   │ 0.045 │ 20.00  │ 0.900    │
   └───────────────────────────┘

   Depth Visualization:
   • Horizontal bars show volume
   • Wider = more tokens available
   • Helps identify liquidity

3. Best Ask (Best Price)
   Definition: Lowest sell price available
   Example: If sell orders are at 0.05, 0.052, 0.055
            Best ask = 0.05 SOL
   Why important: Best price for buyers
   Displayed: Prominently in center of order book

4. Trading Panel
   Buy Mode:
   • Input amount to buy
   • Select price (or use "Best")
   • Shows total cost
   • Validates SOL balance
   • One-click purchase

   Sell Mode:
   • Input amount to sell
   • Set your price
   • Shows expected receive
   • MAX button for full balance
   • Creates listing

5. How Others Buy Your Listing:
   Step 1: Your listing appears in order book
   Step 2: Buyer sees: "10 gGPU at 0.05 SOL"
   Step 3: Buyer enters amount (e.g., 5 gGPU)
   Step 4: Buyer clicks "Buy"
   Step 5: Phantom pops up for approval
   Step 6: Buyer approves → Transaction sent
   Step 7: Smart contract executes:
           • Verifies listing active
           • Checks sufficient tokens
           • Transfers SOL to you
           • Transfers gGPU to buyer
   Step 8: Your listing updated: 5 gGPU remaining
   Step 9: You receive 0.25 SOL instantly!
   Step 10: UI auto-refreshes (10 seconds)
```

---

# SLIDE 13: Project Scope

```
PROJECT BOUNDARIES & LIMITATIONS

In Scope:
✓ Decentralized marketplace for GPU tokens
✓ SPL token creation & management
✓ Smart contract on Solana devnet
✓ Listing creation & management
✓ Buy/sell functionality
✓ Escrow mechanism
✓ Web-based trading interface
✓ Wallet integration (Phantom)
✓ Real-time charts & order book
✓ Transaction history
✓ Error handling & validation

Out of Scope:
✗ Actual GPU resource allocation
✗ Mainnet deployment (devnet only)
✗ Mobile application
✗ Advanced order types (limit/stop)
✗ Staking/rewards mechanism
✗ Governance features
✗ Multi-token support
✗ API for third-party integration
✗ KYC/compliance features

Technical Limitations:
• Devnet only (test environment)
• Manual token minting (no oracle)
• 10-second UI refresh (not WebSocket)
• No off-chain order matching
• Single token pair (gGPU/SOL)

Future Enhancements:
• Mainnet deployment
• Oracle integration for GPU verification
• Advanced trading features
• Mobile app
• Token staking rewards
• DAO governance
```

---

# SLIDE 14: Plan of Action (Development Timeline)

```
6-MONTH PROJECT TIMELINE

Month 1-2: Learning & Foundation
Week 1-2:
✓ Study Solana blockchain architecture
✓ Learn Rust programming language
✓ Understand Anchor framework
✓ Research SPL token standard

Week 3-4:
✓ Set up development environment
✓ Create basic smart contract
✓ Learn PDA concepts
✓ Write first unit tests

Week 5-8:
✓ Implement marketplace logic
✓ Create escrow mechanism
✓ Add error handling
✓ Test on localnet

Month 3-4: Development & Testing
Week 9-12:
✓ Build Next.js frontend
✓ Integrate Phantom wallet
✓ Create marketplace UI
✓ Connect to smart contract

Week 13-16:
✓ Add trading charts
✓ Implement order book
✓ Add real-time updates
✓ Deploy to devnet
✓ End-to-end testing

Month 5-6: Refinement & Documentation
Week 17-20:
✓ Fix bugs & edge cases
✓ Improve error messages
✓ Optimize performance
✓ Add loading states

Week 21-24:
✓ Complete testing suite
✓ Write documentation
✓ Create presentation
✓ Prepare demo
✓ Final deployment

Milestones Achieved:
☑ Smart contract deployed on devnet
☑ Token minting functional
☑ Marketplace listing working
☑ Buy/sell operations complete
☑ UI with charts & order book
☑ Error handling robust
☑ 100+ test transactions successful
```

---

# SLIDE 15: Results & Achievements

```
PROJECT OUTCOMES

Technical Achievements:
✓ Fully functional decentralized marketplace
✓ 416 lines of production Rust code
✓ 1,193 lines of TypeScript frontend
✓ 7 smart contract functions
✓ 5 PDA patterns implemented
✓ Deployed on Solana devnet
✓ 100+ successful transactions

Performance Metrics:
• Transaction confirmation: ~478ms
• Transaction cost: $0.00025
• UI refresh rate: 10 seconds
• Zero critical bugs in testing
• 100% uptime on devnet

Features Delivered:
✓ Token minting with metadata
✓ Marketplace listings
✓ Buy/sell functionality
✓ Smart escrow system
✓ Professional trading UI
✓ Candlestick charts
✓ Order book with depth
✓ Wallet integration
✓ Error handling & validation
✓ Auto-refresh mechanism

Cost Comparison Achieved:
Traditional: $3-10 per transaction
GPU DEX: $0.00025 per transaction
Savings: 99.99%

Speed Comparison:
Traditional: 3-7 days settlement
GPU DEX: <1 second settlement
Improvement: 604,800x faster

Learning Outcomes:
✓ Mastered Solana development
✓ Proficient in Rust & Anchor
✓ Understood DeFi mechanics
✓ Built production Web3 app
✓ Solved real-world problems
✓ Gained blockchain security knowledge

Challenges Overcome:
✓ Stale data race conditions
✓ Hidden transaction costs
✓ Error message clarity
✓ PDA signing complexity
✓ Frontend-blockchain sync
```

---

# SLIDE 16: References

```
BIBLIOGRAPHY & RESOURCES

Academic Papers:
[1] Nakamoto, S. (2008). "Bitcoin: A Peer-to-Peer Electronic 
    Cash System"
[2] Yakovenko, A. (2017). "Solana: A new architecture for a 
    high performance blockchain"
[3] Wood, G. (2014). "Ethereum: A secure decentralised 
    generalised transaction ledger"

Official Documentation:
[4] Solana Documentation - https://docs.solana.com
[5] Anchor Framework - https://www.anchor-lang.com
[6] SPL Token Program - https://spl.solana.com/token
[7] Metaplex Docs - https://docs.metaplex.com

Technical Resources:
[8] Solana Cookbook - https://solanacookbook.com
[9] Rust Programming Language - https://www.rust-lang.org
[10] Next.js Documentation - https://nextjs.org/docs

Tools Used:
[11] Phantom Wallet - https://phantom.app
[12] Solana CLI Tools
[13] Anchor CLI v0.30.x
[14] Lightweight Charts - https://tradingview.github.io

Market Research:
[15] GPU Computing Market Report 2024, Grand View Research
[16] Blockchain Market Analysis, Gartner 2024
[17] DeFi Industry Overview, CoinGecko 2024

Code Repository:
[18] GitHub: nottejas/gpu_dex
[19] Project Documentation: README.md
[20] Technical Guide: JARGON_EXPLAINED.md

Additional Reading:
[21] "Mastering Blockchain" - Imran Bashir
[22] "Programming Rust" - Jim Blandy & Jason Orendorff
[23] Solana Whitepaper
[24] DeFi protocols comparison studies
```

---

# PRESENTATION SUMMARY

**Total Slides:** 16
**Duration:** 25-30 minutes
**Format:** Academic project presentation

**Key Topics Covered:**
✓ Problem Statement & Motivation
✓ What GPU DEX does
✓ Technology comparison (AWS vs GPU DEX)
✓ Why this 6-month project
✓ Currency explanation (SOL & gGPU)
✓ Why Solana over other blockchains
✓ Bitcoin, mining, 2008 crisis context
✓ Phantom accounts & transactions
✓ Smart contract functions
✓ Trading mechanics (candlesticks, order book, best ask)
✓ How buyers purchase listings
✓ Project scope & timeline
✓ Results & achievements
✓ Complete references

**Presentation Flow:**
1. Introduction (1 min)
2. Problem & Motivation (4 min)
3. Solution & Technology (8 min)
4. Technical Implementation (10 min)
5. Results & Scope (5 min)
6. Conclusion & References (2 min)

**Visual Aids Recommended:**
- Architecture diagrams
- Comparison tables
- Code snippets
- UI screenshots
- Transaction flow diagrams
- Live demo (if possible)

---

**END OF PRESENTATION**
