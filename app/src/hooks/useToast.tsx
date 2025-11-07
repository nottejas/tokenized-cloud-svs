import toast, { Toaster } from 'react-hot-toast';

// Custom toast styles matching your dark theme
export const toastConfig = {
  duration: 4000,
  style: {
    background: '#1f2937',
    color: '#fff',
    border: '1px solid #374151',
  },
  success: {
    iconTheme: {
      primary: '#10b981',
      secondary: '#fff',
    },
  },
  error: {
    iconTheme: {
      primary: '#ef4444',
      secondary: '#fff',
    },
  },
};

// Helper functions for common toasts
export const showTxToast = (signature: string, message: string = 'Transaction successful!') => {
  toast.success(
    <div className="flex flex-col gap-1">
      <span>{message}</span>
      <a 
        href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 hover:text-blue-300 text-xs"
      >
        View on Explorer →
      </a>
    </div>,
    { duration: 6000 }
  );
};

export const showErrorToast = (error: any) => {
  const message = error?.message || 'Transaction failed';
  toast.error(message.slice(0, 100)); // Limit length
};

export const showLoadingToast = (message: string = 'Processing...') => {
  return toast.loading(message);
};

// Export the Toaster component with config
export const ToasterProvider = () => (
  <Toaster 
    position="bottom-right"
    toastOptions={toastConfig}
  />
);
