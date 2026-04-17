"use client";

import { useState } from "react";
import Link from "next/link"; // Added missing import
import { useWallet } from "@/context/WalletContext";
import {
  getWriteContract,
  getReadContract,
  formatTimestamp,
  shortenAddress,
} from "@/lib/contract";
import { ethers } from "ethers";

const STATUS = {
  IDLE: "idle",
  LOADING: "loading",
  WAITING: "waiting",
  CONFIRMING: "confirming",
  SUCCESS: "success",
  ERROR: "error",
};

export default function TransferOwnership() {
  const { account, isCorrectNetwork } = useWallet();

  const [productId, setProductId] = useState("");
  const [newOwner, setNewOwner] = useState("");
  const [product, setProduct] = useState(null);
  const [lookupStatus, setLookupStatus] = useState(STATUS.IDLE);
  const [lookupError, setLookupError] = useState("");
  const [status, setStatus] = useState(STATUS.IDLE);
  const [errorMessage, setErrorMessage] = useState("");
  const [txHash, setTxHash] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  // ── Look Up Product ────────────────────────────
  const handleLookup = async () => {
    if (!productId || isNaN(productId) || Number(productId) <= 0) {
      setLookupError("Please enter a valid product ID.");
      return;
    }

    try {
      setLookupStatus(STATUS.LOADING);
      setLookupError("");
      setProduct(null);

      const contract = getReadContract();
      const result = await contract.getProduct(Number(productId));

      setProduct({
        id: result.id.toString(),
        name: result.name,
        manufacturer: result.manufacturer,
        currentOwner: result.currentOwner,
        isVerified: result.isVerified,
        createdAt: formatTimestamp(result.createdAt),
      });

      setLookupStatus(STATUS.SUCCESS);
    } catch (err) {
      setLookupError("Product not found. Check the ID and try again.");
      setLookupStatus(STATUS.ERROR);
    }
  };

  // ── Validate Ethereum Address ──────────────────
  const isValidAddress = (addr) => {
    try {
      return ethers.isAddress(addr);
    } catch {
      return false;
    }
  };

  // ── Submit Transfer ────────────────────────────
  const handleTransfer = async (e) => {
    e.preventDefault();

    if (!product) {
      setErrorMessage("Please look up a product first.");
      return;
    }

    if (!isValidAddress(newOwner)) {
      setErrorMessage("Please enter a valid Ethereum wallet address.");
      return;
    }

    if (newOwner.toLowerCase() === account.toLowerCase()) {
      setErrorMessage("You cannot transfer to yourself.");
      return;
    }

    if (product.currentOwner.toLowerCase() !== account.toLowerCase()) {
      setErrorMessage("You are not the current owner of this product.");
      return;
    }

    if (!confirmed) {
      setErrorMessage("Please confirm the transfer by checking the box.");
      return;
    }

    try {
      setErrorMessage("");
      setStatus(STATUS.WAITING);

      const contract = await getWriteContract();
      const tx = await contract.transferOwnership_SC(
        Number(productId),
        newOwner
      );

      setStatus(STATUS.CONFIRMING);
      setTxHash(tx.hash);
      await tx.wait();

      setStatus(STATUS.SUCCESS);
    } catch (err) {
      console.error(err);
      if (err.code === 4001 || err.code === "ACTION_REJECTED") {
        setErrorMessage("Transaction rejected. You cancelled the request.");
      } else if (err.message?.includes("Not the product owner")) {
        setErrorMessage("You are not the owner of this product.");
      } else {
        setErrorMessage(err.message || "Transaction failed.");
      }
      setStatus(STATUS.ERROR);
    }
  };

  // ── Reset ──────────────────────────────────────
  const handleReset = () => {
    setProductId("");
    setNewOwner("");
    setProduct(null);
    setStatus(STATUS.IDLE);
    setLookupStatus(STATUS.IDLE);
    setErrorMessage("");
    setLookupError("");
    setTxHash("");
    setConfirmed(false);
  };

  // ── Guards ─────────────────────────────────────
  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-6xl">🔒</div>
        <h2 className="text-2xl font-bold text-white">Wallet Not Connected</h2>
        <p className="text-gray-400">Connect your wallet to transfer ownership.</p>
      </div>
    );
  }

  if (!isCorrectNetwork) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-6xl">⚠️</div>
        <h2 className="text-2xl font-bold text-yellow-400">Wrong Network</h2>
        <p className="text-gray-400">Please switch to Sepolia testnet.</p>
      </div>
    );
  }

  // ── Success State ──────────────────────────────
  if (status === STATUS.SUCCESS) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center space-y-6">
        <div className="text-7xl">🤝</div>
        <h2 className="text-3xl font-bold text-white">Ownership Transferred!</h2>
        <p className="text-gray-400">
          Product #{productId} now belongs to a new owner on the blockchain.
        </p>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-left space-y-4">
          <div>
            <p className="text-gray-400 text-sm">Previous Owner</p>
            <p className="text-white font-mono text-xs break-all">
              {product?.currentOwner}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">New Owner</p>
            <p className="text-white font-mono text-xs break-all">{newOwner}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Transaction Hash</p>
            <a
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 font-mono text-xs break-all"
            >
              {txHash}
            </a>
          </div>
        </div>
        <div className="flex gap-3 justify-center">
          <Link
            href={`/track?id=${productId}`}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200"
          >
            View Product History
          </Link>
          <button
            onClick={handleReset}
            className="bg-gray-800 hover:bg-gray-700 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200"
          >
            Transfer Another
          </button>
        </div>
      </div>
    );
  }

  // ── Main Form ──────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Transfer Ownership</h1>
        <p className="text-gray-400 mt-2">
          Transfer a product you own to a new wallet address.
        </p>
      </div>

      {/* Warning Banner */}
      <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-xl p-5 flex items-start gap-3">
        <span className="text-2xl">⚠️</span>
        <div>
          <p className="text-yellow-400 font-medium">This action is irreversible</p>
          <p className="text-yellow-300/70 text-sm mt-1">
            Once transferred, you will no longer be the owner. 
            You cannot undo this on the blockchain.
          </p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 space-y-6">
        {/* Product ID Lookup */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Product ID <span className="text-red-400">*</span>
          </label>
          <div className="flex gap-3">
            <input
              type="number"
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                setProduct(null);
                setLookupStatus(STATUS.IDLE);
              }}
              placeholder="Enter product ID (e.g. 1)"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={handleLookup}
              disabled={lookupStatus === STATUS.LOADING}
              className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white px-5 py-3 rounded-lg font-medium transition-all duration-200 whitespace-nowrap"
            >
              {lookupStatus === STATUS.LOADING ? "Looking up..." : "Look Up"}
            </button>
          </div>
          {lookupError && (
            <p className="text-red-400 text-sm mt-2">⚠️ {lookupError}</p>
          )}
        </div>

        {/* Product Info Card */}
        {product && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">{product.name}</h3>
              <span className="bg-blue-900/30 border border-blue-700/50 text-blue-400 text-xs px-3 py-1 rounded-full">
                #{product.id}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-gray-500">Manufacturer</p>
                <p className="text-gray-200 font-mono text-xs">
                  {shortenAddress(product.manufacturer)}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Current Owner</p>
                <p className="text-gray-200 font-mono text-xs break-all">
                  {product.currentOwner}
                </p>
                {product.currentOwner.toLowerCase() === account.toLowerCase() ? (
                  <span className="text-green-400 text-xs">
                    ✅ You are the owner
                  </span>
                ) : (
                  <span className="text-red-400 text-xs">
                    ❌ You are not the owner
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* New Owner Address */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            New Owner Wallet Address <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={newOwner}
            onChange={(e) => setNewOwner(e.target.value)}
            placeholder="0x..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 font-mono focus:outline-none focus:border-blue-500 text-sm"
          />
          {newOwner && !isValidAddress(newOwner) && (
            <p className="text-red-400 text-xs mt-1">
              ⚠️ Invalid Ethereum address format
            </p>
          )}
          {newOwner && isValidAddress(newOwner) && (
            <p className="text-green-400 text-xs mt-1">
              ✅ Valid Ethereum address
            </p>
          )}
        </div>

        {/* Confirmation Checkbox */}
        <div className="flex items-start gap-3 bg-gray-800 border border-gray-700 rounded-xl p-4">
          <input
            type="checkbox"
            id="confirm"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-1 w-4 h-4 accent-blue-500"
          />
          <label htmlFor="confirm" className="text-gray-300 text-sm">
            I understand this transfer is{" "}
            <span className="text-red-400 font-semibold">permanent</span> and
            cannot be reversed. I confirm I want to transfer Product #
            {productId || "?"} to{" "}
            <span className="font-mono text-blue-400">
              {newOwner ? shortenAddress(newOwner) : "the address above"}
            </span>
            .
          </label>
        </div>

        {/* Error */}
        {errorMessage && (
          <div className="bg-red-900/30 border border-red-700/50 rounded-lg px-4 py-3">
            <p className="text-red-400 text-sm">⚠️ {errorMessage}</p>
          </div>
        )}

        {/* Status Messages */}
        {status === STATUS.WAITING && (
          <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg px-4 py-3 flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-yellow-400 text-sm">
              Waiting for MetaMask approval...
            </p>
          </div>
        )}

        {status === STATUS.CONFIRMING && (
          <div className="bg-purple-900/30 border border-purple-700/50 rounded-lg px-4 py-3 flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            <div>
              <p className="text-purple-400 text-sm">
                Confirming on blockchain...
              </p>
              {txHash && (
                <a
                  href={`https://sepolia.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-300 text-xs hover:underline"
                >
                  View on Etherscan ↗
                </a>
              )}
            </div>
          </div>
        )}

        {/* Submit */}
        <form onSubmit={handleTransfer}>
          <button
            type="submit"
            disabled={
              !product ||
              !confirmed ||
              !isValidAddress(newOwner) ||
              (status !== STATUS.IDLE && status !== STATUS.ERROR)
            }
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all duration-200 text-lg"
          >
            {status === STATUS.IDLE || status === STATUS.ERROR
              ? "Transfer Ownership"
              : "Processing..."}
          </button>
        </form>
      </div>
    </div>
  );
}