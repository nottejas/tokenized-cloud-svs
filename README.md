## GPU DEX

Full-stack Solana dApp with an Anchor program (`programs/gpu_dex`) and a Next.js frontend (`app/`). It implements a simple marketplace for a GPU token: initialize marketplace and mint, create listings, buy, and cancel.

### Stack
- Anchor 0.30.x, Solana Web3, SPL Token
- Rust program at `programs/gpu_dex`
- Next.js App Router at `app/`

### Prerequisites
- Node 18+ and pnpm/yarn/npm
- Rust toolchain (rustup) and `cargo`
- Solana CLI (`solana --version`)
- Anchor CLI (`anchor --version`)
- On Windows: use WSL2 Ubuntu (this repo path indicates WSL)

### 1) Install dependencies
```bash
# from repo root
npm install
# or
yarn
```

### 2) Configure Solana localnet
```bash
solana config set --url localhost
solana-keygen new --no-bip39-passphrase --force
```

### 3) Start a local validator (new terminal)
```bash
solana-test-validator
```

Optional: a ready-made ledger is in `test-ledger/`. The default flow uses an in-memory validator.

### 4) Build and deploy the Anchor program
```bash
anchor build
anchor deploy
```

Program ID is set consistently in:
- `Anchor.toml` → `[programs.localnet].gpu_dex`
- `programs/gpu_dex/src/lib.rs` → `declare_id!(...)`

Current Program ID: `BRpDctiHbH3jC19VpcSBbKgKUJEnAqiuGWNwQEYv8Nzf`

If you redeploy with a new keypair, update both files accordingly.

### 5) Run the frontend
```bash
npm run dev
# or
yarn dev
```

Open http://localhost:3000 and connect a wallet set to Localnet. The frontend uses the generated IDL at `app/src/idl/gpu_dex.json` and the Anchor provider from your wallet.

### Environment
Create `.env.local` if you want to override defaults:
```bash
# Example
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8899
# If you change the program id, also update the IDL address or program usage
```

### Useful commands
```bash
# Lint
npm run lint

# Build frontend
npm run build

# Start production server (after build)
npm start
```

### Project structure
```
programs/gpu_dex/         # Anchor program
app/                      # Next.js frontend (App Router)
app/src/idl/gpu_dex.json  # IDL consumed by frontend
tests/gpu_dex.ts          # (example test entrypoint)
```

### Notes
- Large local validator artifacts are ignored via `.gitignore` (`test-ledger/`, `target/`, etc.).
- Never commit private keys. Keypair patterns are ignored in `.gitignore`.
