"use client";

import { useWallet } from "@/context/WalletContext";
import { shortenAddress } from "@/lib/contract";

export default function WalletButton() {
  const {
    account,
    isConnecting,
    isCorrectNetwork,
    error,
    connectWallet,
    disconnectWallet,
    switchToSepolia,
  } = useWallet();

  // Not connected
  if (!account) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={connectWallet}
          disabled={isConnecting}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 
                     text-white font-semibold px-5 py-2 rounded-lg 
                     transition-all duration-200 text-sm"
        >
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </button>
        {error && (
          <span className="text-red-400 text-xs">{error}</span>
        )}
      </div>
    );
  }

  // Connected but wrong network
  if (!isCorrectNetwork) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={switchToSepolia}
          className="bg-yellow-500 hover:bg-yellow-600 text-white 
                     font-semibold px-5 py-2 rounded-lg text-sm
                     transition-all duration-200"
        >
          ⚠️ Switch to Sepolia
        </button>
        <span className="text-yellow-400 text-xs">Wrong network detected</span>
      </div>
    );
  }

  // Connected and correct network
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 bg-gray-800 
                      px-4 py-2 rounded-lg border border-gray-700">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        <span className="text-gray-200 text-sm font-mono">
          {shortenAddress(account)}
        </span>
      </div>
      <button
        onClick={disconnectWallet}
        className="text-gray-400 hover:text-red-400 text-sm 
                   transition-colors duration-200"
      >
        Disconnect
      </button>
    </div>
  );
}