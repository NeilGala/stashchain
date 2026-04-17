"use client";

import { useState } from "react";
import { useWallet } from "@/context/WalletContext";
import { getWriteContract, getReadContract, formatTimestamp } from "@/lib/contract";
import Link from "next/link"; // Added missing import

const STATUS = {
  IDLE: "idle",
  LOADING: "loading",
  WAITING: "waiting",
  CONFIRMING: "confirming",
  SUCCESS: "success",
  ERROR: "error",
};

const EVENT_TYPES = [
  { value: 1, label: "📦 Shipped", description: "Product has been shipped" },
  { value: 2, label: "🚚 In Transit", description: "Product is in transit" },
  { value: 3, label: "✅ Delivered", description: "Product has been delivered" },
  { value: 4, label: "↩️ Returned", description: "Product has been returned" },
];

export default function LogEvent() {
  const { account, isCorrectNetwork } = useWallet();

  // Form state
  const [productId, setProductId] = useState("");
  const [eventType, setEventType] = useState(1);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  // Product lookup state
  const [product, setProduct] = useState(null);
  const [lookupStatus, setLookupStatus] = useState(STATUS.IDLE);
  const [lookupError, setLookupError] = useState("");

  // Transaction state
  const [status, setStatus] = useState(STATUS.IDLE);
  const [errorMessage, setErrorMessage] = useState("");
  const [txHash, setTxHash] = useState("");

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
        ipfsHash: result.ipfsHash,
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

  // ── Submit Event ───────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!product) {
      setErrorMessage("Please look up a product first.");
      return;
    }
    if (!location.trim()) {
      setErrorMessage("Location is required.");
      return;
    }

    // Check ownership
    if (product.currentOwner.toLowerCase() !== account.toLowerCase()) {
      setErrorMessage(
        "You are not the current owner of this product. Only the owner can log events."
      );
      return;
    }

    try {
      setErrorMessage("");
      setStatus(STATUS.WAITING);

      const contract = await getWriteContract();
      const tx = await contract.logEvent(
        Number(productId),
        eventType,
        location.trim(),
        notes.trim()
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

  const handleReset = () => {
    setProductId("");
    setLocation("");
    setNotes("");
    setEventType(1);
    setProduct(null);
    setStatus(STATUS.IDLE);
    setLookupStatus(STATUS.IDLE);
    setErrorMessage("");
    setLookupError("");
    setTxHash("");
  };

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-6xl">🔒</div>
        <h2 className="text-2xl font-bold text-white">Wallet Not Connected</h2>
        <p className="text-gray-400">Connect your wallet to log events.</p>
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
        <div className="text-7xl">✅</div>
        <h2 className="text-3xl font-bold text-white">Event Logged!</h2>
        <p className="text-gray-400">
          Supply chain event permanently recorded on Ethereum.
        </p>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-left">
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
            Log Another Event
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Log Supply Chain Event</h1>
        <p className="text-gray-400 mt-2">
          Record a new event for a product you own.
        </p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 space-y-6">
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

        {product && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">{product.name}</h3>
              <span className="bg-green-900/30 border border-green-700/50 text-green-400 text-xs px-3 py-1 rounded-full">
                ✅ Found
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500">Product ID</p>
                <p className="text-gray-200">#{product.id}</p>
              </div>
              <div>
                <p className="text-gray-500">Registered</p>
                <p className="text-gray-200">{product.createdAt}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-500">Current Owner</p>
                <p className="text-gray-200 font-mono text-xs break-all">
                  {product.currentOwner}
                </p>
                {product.currentOwner.toLowerCase() === account.toLowerCase() ? (
                  <span className="text-green-400 text-xs">✅ You are the owner</span>
                ) : (
                  <span className="text-red-400 text-xs">❌ You are not the owner</span>
                )}
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Event Type <span className="text-red-400">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {EVENT_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setEventType(type.value)}
                className={`p-4 rounded-xl border text-left transition-all duration-200
                  ${eventType === type.value
                    ? "border-blue-500 bg-blue-900/30 text-white"
                    : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                  }`}
              >
                <p className="font-medium">{type.label}</p>
                <p className="text-xs mt-1 opacity-70">{type.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Location <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Mumbai Warehouse, India"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional information about this event..."
            rows={3}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>

        {errorMessage && (
          <div className="bg-red-900/30 border border-red-700/50 rounded-lg px-4 py-3">
            <p className="text-red-400 text-sm">⚠️ {errorMessage}</p>
          </div>
        )}

        {status === STATUS.WAITING && (
          <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg px-4 py-3 flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-yellow-400 text-sm">Waiting for MetaMask approval...</p>
          </div>
        )}

        {status === STATUS.CONFIRMING && (
          <div className="bg-purple-900/30 border border-purple-700/50 rounded-lg px-4 py-3 flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            <div>
              <p className="text-purple-400 text-sm">Confirming on blockchain...</p>
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

        <form onSubmit={handleSubmit}>
          <button
            type="submit"
            disabled={!product || (status !== STATUS.IDLE && status !== STATUS.ERROR)}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all duration-200 text-lg"
          >
            {status === STATUS.IDLE || status === STATUS.ERROR
              ? "Log Event on Blockchain"
              : "Processing..."}
          </button>
        </form>
      </div>
    </div>
  );
}