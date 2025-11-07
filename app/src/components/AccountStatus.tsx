'use client';

import { FC } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { showTxToast } from '../hooks/useToast';
import toast from 'react-hot-toast';

interface AccountStatusProps {
  balance: number;
  gpuBalance: number;
}

export const AccountStatus: FC<AccountStatusProps> = ({ balance, gpuBalance }) => {
  const { publicKey, disconnect } = useWallet();
  
  if (!publicKey) return null;
  
  const copyAddress = () => {
    navigator.clipboard.writeText(publicKey.toBase58());
    toast.success('Address copied to clipboard!');
  };
  
  const shortenAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };
  
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm text-gray-400">Connected to Devnet</span>
        </div>
        <button
          onClick={disconnect}
          className="text-xs text-red-400 hover:text-red-300"
        >
          Disconnect
        </button>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Wallet</span>
          <button
            onClick={copyAddress}
            className="font-mono text-sm hover:text-blue-400 transition-colors flex items-center gap-1"
          >
            {shortenAddress(publicKey.toBase58())}
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded px-3 py-2">
            <div className="text-xs text-blue-400">SOL Balance</div>
            <div className="font-bold">{balance.toFixed(4)}</div>
          </div>
          <div className="bg-purple-500/10 border border-purple-500/20 rounded px-3 py-2">
            <div className="text-xs text-purple-400">gGPU Balance</div>
            <div className="font-bold">{gpuBalance.toFixed(2)}</div>
          </div>
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-800">
        <a
          href="https://faucet.solana.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
        >
          Get Devnet SOL
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  );
};
