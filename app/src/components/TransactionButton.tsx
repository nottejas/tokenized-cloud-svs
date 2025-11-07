'use client';

import { FC, ReactNode, useState } from 'react';
import { showTxToast, showErrorToast, showLoadingToast } from '../hooks/useToast';
import toast from 'react-hot-toast';

interface TransactionButtonProps {
  onClick: () => Promise<string | void>;
  className?: string;
  disabled?: boolean;
  children: ReactNode;
  successMessage?: string;
  loadingMessage?: string;
}

export const TransactionButton: FC<TransactionButtonProps> = ({
  onClick,
  className = '',
  disabled = false,
  children,
  successMessage = 'Transaction successful!',
  loadingMessage = 'Please approve in wallet...',
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (isLoading || disabled) return;
    
    setIsLoading(true);
    const toastId = showLoadingToast(loadingMessage);
    
    try {
      const signature = await onClick();
      toast.dismiss(toastId);
      
      if (signature) {
        showTxToast(signature, successMessage);
      }
    } catch (error: any) {
      toast.dismiss(toastId);
      showErrorToast(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading || disabled}
      className={`relative ${className} ${
        isLoading || disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>
      )}
      <span className={isLoading ? 'invisible' : ''}>{children}</span>
    </button>
  );
};
