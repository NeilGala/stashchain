"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";

const WalletContext = createContext(null);

const SEPOLIA_CHAIN_ID = "0xaa36a7"; // Sepolia chain ID in hex

export function WalletProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [error, setError] = useState(null);

  // ── Check if on correct network ──────────────────
  const checkNetwork = useCallback(async () => {
    if (!window.ethereum) return;
    const chainId = await window.ethereum.request({
      method: "eth_chainId",
    });
    setIsCorrectNetwork(chainId === SEPOLIA_CHAIN_ID);
  }, []);

  // ── Switch to Sepolia ─────────────────────────────
  const switchToSepolia = async () => {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
    } catch (err) {
      setError("Failed to switch network. Please switch to Sepolia manually.");
    }
  };

  // ── Connect Wallet ────────────────────────────────
  const connectWallet = async () => {
    if (!window.ethereum) {
      setError("MetaMask not found. Please install MetaMask.");
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts.length > 0) {
        setAccount(accounts[0]);
        await checkNetwork();
      }
    } catch (err) {
      if (err.code === 4001) {
        setError("Connection rejected. Please try again.");
      } else {
        setError("Failed to connect wallet.");
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // ── Disconnect Wallet ─────────────────────────────
  const disconnectWallet = () => {
    setAccount(null);
    setIsCorrectNetwork(false);
  };

  // ── Auto-reconnect on page reload ─────────────────
  useEffect(() => {
    const checkIfConnected = async () => {
      if (!window.ethereum) return;
      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        await checkNetwork();
      }
    };
    checkIfConnected();
  }, [checkNetwork]);

  // ── Listen for account/network changes ────────────
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountChange = (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        setAccount(accounts[0]);
      }
    };

    const handleChainChange = () => {
      checkNetwork();
      window.location.reload();
    };

    window.ethereum.on("accountsChanged", handleAccountChange);
    window.ethereum.on("chainChanged", handleChainChange);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountChange);
      window.ethereum.removeListener("chainChanged", handleChainChange);
    };
  }, [checkNetwork]);

  return (
    <WalletContext.Provider
      value={{
        account,
        isConnecting,
        isCorrectNetwork,
        error,
        connectWallet,
        disconnectWallet,
        switchToSepolia,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used inside WalletProvider");
  }
  return context;
}