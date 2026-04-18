"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  getReadContract,
  getEventTypeName,
  formatTimestamp,
  shortenAddress,
} from "@/lib/contract";
import { getIPFSUrl } from "@/lib/pinata";

// ── Event Type Visual Config ───────────────────
const EVENT_CONFIG = {
  0: { icon: "🏭", label: "Manufactured", color: "blue" },
  1: { icon: "📦", label: "Shipped", color: "yellow" },
  2: { icon: "🚚", label: "In Transit", color: "orange" },
  3: { icon: "✅", label: "Delivered", color: "green" },
  4: { icon: "↩️", label: "Returned", color: "red" },
};

const COLOR_CLASSES = {
  blue: {
    bg: "bg-blue-900/30",
    border: "border-blue-700/50",
    text: "text-blue-400",
    dot: "bg-blue-400",
    line: "bg-blue-900",
  },
  yellow: {
    bg: "bg-yellow-900/30",
    border: "border-yellow-700/50",
    text: "text-yellow-400",
    dot: "bg-yellow-400",
    line: "bg-yellow-900",
  },
  orange: {
    bg: "bg-orange-900/30",
    border: "border-orange-700/50",
    text: "text-orange-400",
    dot: "bg-orange-400",
    line: "bg-orange-900",
  },
  green: {
    bg: "bg-green-900/30",
    border: "border-green-700/50",
    text: "text-green-400",
    dot: "bg-green-400",
    line: "bg-green-900",
  },
  red: {
    bg: "bg-red-900/30",
    border: "border-red-700/50",
    text: "text-red-400",
    dot: "bg-red-400",
    line: "bg-red-900",
  },
};

// ── Status Pill Component ──────────────────────
function StatusPill({ eventType }) {
  const config = EVENT_CONFIG[Number(eventType)] || EVENT_CONFIG[0];
  const colors = COLOR_CLASSES[config.color];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full 
                  text-xs font-medium border ${colors.bg} ${colors.border} 
                  ${colors.text}`}
    >
      {config.icon} {config.label}
    </span>
  );
}

export default function TrackProduct() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get("id") || "";

  const [productId, setProductId] = useState(initialId);
  const [inputId, setInputId] = useState(initialId);
  const [product, setProduct] = useState(null);
  const [events, setEvents] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Fetch IPFS Metadata ────────────────────────
const fetchMetadata = async (hash) => {
  try {
    const url = getIPFSUrl(hash);
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    setMetadata(data);
  } catch {
    // Metadata fetch is optional — fail silently
  }
};

// ── Fetch Product + Events ─────────────────────
const fetchProduct = useCallback(async (id) => {
  if (!id || isNaN(id) || Number(id) <= 0) {
    setError("Please enter a valid product ID.");
    return;
  }

  try {
    setLoading(true);
    setError("");
    setProduct(null);
    setEvents([]);
    setMetadata(null);

    const contract = getReadContract();

    const [productData, eventsData] = await Promise.all([
      contract.getProduct(Number(id)),
      contract.getProductEvents(Number(id)),
    ]);

    const formattedProduct = {
      id: productData.id.toString(),
      name: productData.name,
      ipfsHash: productData.ipfsHash,
      manufacturer: productData.manufacturer,
      currentOwner: productData.currentOwner,
      isVerified: productData.isVerified,
      createdAt: formatTimestamp(productData.createdAt),
    };

    const formattedEvents = eventsData.map((e, index) => ({
      index,
      productId: e.productId.toString(),
      eventType: Number(e.eventType),
      actor: e.actor,
      location: e.location,
      notes: e.notes,
      timestamp: formatTimestamp(e.timestamp),
    }));

    setProduct(formattedProduct);
    setEvents(formattedEvents);

    fetchMetadata(productData.ipfsHash);

  } catch (err) {
    console.error(err);
    setError(
      "Product not found. Make sure the ID is correct and you are on Sepolia."
    );
  } finally {
    setLoading(false);
  }
}, []);

// ── Auto-fetch if ID in URL ────────────────────
useEffect(() => {
  if (initialId) {
    fetchProduct(initialId);
  }
}, [initialId, fetchProduct]);

  // ── Fetch IPFS Metadata ────────────────────────
  

  // ── Handle Search ──────────────────────────────
  const handleSearch = (e) => {
    e.preventDefault();
    setProductId(inputId);
    fetchProduct(inputId);
  };

  // ── Get latest event status ────────────────────
  const getLatestStatus = () => {
    if (events.length === 0) return null;
    return events[events.length - 1].eventType;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Track Product</h1>
        <p className="text-gray-400 mt-2">
          View the complete on-chain history of any StashChain product.
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <input
          type="number"
          value={inputId}
          onChange={(e) => setInputId(e.target.value)}
          placeholder="Enter product ID (e.g. 1)"
          className="flex-1 bg-gray-900 border border-gray-700 rounded-xl 
                     px-5 py-4 text-white placeholder-gray-500 text-lg
                     focus:outline-none focus:border-blue-500 transition-colors"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700
                     text-white font-bold px-8 py-4 rounded-xl
                     transition-all duration-200 whitespace-nowrap"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white 
                               border-t-transparent rounded-full animate-spin" />
              Searching...
            </span>
          ) : (
            "🔍 Search"
          )}
        </button>
      </form>

      {/* Error State */}
      {error && (
        <div className="bg-red-900/30 border border-red-700/50 
                        rounded-xl px-6 py-4">
          <p className="text-red-400">⚠️ {error}</p>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-4 animate-pulse">
          <div className="h-48 bg-gray-800 rounded-2xl" />
          <div className="h-24 bg-gray-800 rounded-2xl" />
          <div className="h-24 bg-gray-800 rounded-2xl" />
        </div>
      )}

      {/* Product Found */}
      {product && !loading && (
        <div className="space-y-6">

          {/* Product Card */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl 
                          overflow-hidden">

            {/* Product Image */}
            {metadata?.image && (
  <div className="relative h-56 overflow-hidden">
    <Image
      src={metadata.image}
      alt={product.name}
      fill
      className="object-cover"
      unoptimized
    />
  </div>
)}

            <div className="p-6 space-y-5">

              {/* Name + Status */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {product.name}
                  </h2>
                  <p className="text-gray-400 text-sm mt-1">
                    Product ID #{product.id} · Registered {product.createdAt}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {product.isVerified && (
                    <span className="bg-green-900/30 border border-green-700/50 
                                     text-green-400 text-xs px-3 py-1 rounded-full
                                     whitespace-nowrap">
                      ✅ Verified Authentic
                    </span>
                  )}
                  {getLatestStatus() !== null && (
                    <StatusPill eventType={getLatestStatus()} />
                  )}
                </div>
              </div>

              {/* Description from IPFS */}
              {metadata?.description && (
                <p className="text-gray-300 text-sm leading-relaxed">
                  {metadata.description}
                </p>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 
                              pt-4 border-t border-gray-800">
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">
                    Manufacturer
                  </p>
                  <p className="text-gray-200 font-mono text-sm break-all">
                    {product.manufacturer}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">
                    Current Owner
                  </p>
                  <p className="text-gray-200 font-mono text-sm break-all">
                    {product.currentOwner}
                  </p>
                  {product.manufacturer.toLowerCase() ===
                    product.currentOwner.toLowerCase() && (
                    <p className="text-blue-400 text-xs mt-0.5">
                      Same as manufacturer
                    </p>
                  )}
                </div>
                {metadata?.origin && (
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">
                      Origin
                    </p>
                    <p className="text-gray-200 text-sm">{metadata.origin}</p>
                  </div>
                )}
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">
                    IPFS Hash
                  </p>
                  <a
                    href={getIPFSUrl(product.ipfsHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 font-mono 
                               text-xs break-all"
                  >
                    {product.ipfsHash.slice(0, 20)}...↗
                  </a>
                </div>
              </div>

            </div>
          </div>

          {/* Timeline Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">
              Supply Chain Timeline
            </h3>
            <span className="bg-gray-800 text-gray-400 text-sm 
                             px-3 py-1 rounded-full">
              {events.length} event{events.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Events Timeline */}
          <div className="relative space-y-0">
            {events.map((event, index) => {
              const config =
                EVENT_CONFIG[event.eventType] || EVENT_CONFIG[0];
              const colors = COLOR_CLASSES[config.color];
              const isLast = index === events.length - 1;

              return (
                <div key={index} className="relative flex gap-5">

                  {/* Timeline Line + Dot */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full border-2 flex items-center 
                                  justify-center text-lg shrink-0 z-10
                                  ${colors.border} ${colors.bg}`}
                    >
                      {config.icon}
                    </div>
                    {!isLast && (
                      <div className="w-0.5 flex-1 bg-gray-800 my-1" />
                    )}
                  </div>

                  {/* Event Card */}
                  <div
                    className={`flex-1 mb-4 rounded-xl border p-5 
                                ${colors.bg} ${colors.border}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className={`font-semibold ${colors.text}`}>
                          {config.label}
                        </p>
                        <p className="text-gray-300 text-sm mt-0.5">
                          📍 {event.location}
                        </p>
                      </div>
                      <p className="text-gray-500 text-xs whitespace-nowrap">
                        {event.timestamp}
                      </p>
                    </div>

                    {event.notes && (
                      <p className="text-gray-400 text-sm mt-3 
                                    pt-3 border-t border-white/10">
                        {event.notes}
                      </p>
                    )}

                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-gray-500 text-xs">
                        By{" "}
                        <span className="font-mono text-gray-400">
                          {shortenAddress(event.actor)}
                        </span>
                      </p>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

          {/* Blockchain Proof */}
          <div className="bg-gray-900/50 border border-gray-800 
                          rounded-xl p-5 space-y-2">
            <h4 className="text-gray-300 font-medium text-sm">
              🔐 Blockchain Proof
            </h4>
            <p className="text-gray-500 text-xs leading-relaxed">
              All events above are permanently recorded on the Ethereum Sepolia
              blockchain and cannot be altered or deleted. This record is
              publicly verifiable by anyone.
            </p>
            <a
              href={`https://sepolia.etherscan.io/address/${
                process.env.NEXT_PUBLIC_CONTRACT_ADDRESS
              }`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-xs"
            >
              View Contract on Etherscan ↗
            </a>
          </div>

        </div>
      )}

      {/* Empty State — no search yet */}
      {!product && !loading && !error && (
        <div className="flex flex-col items-center justify-center 
                        min-h-[40vh] gap-4 text-center">
          <div className="text-6xl">🔍</div>
          <h3 className="text-xl font-semibold text-white">
            Search for a Product
          </h3>
          <p className="text-gray-400 max-w-sm">
            Enter a product ID above to view its complete supply chain
            history recorded on the blockchain.
          </p>
        </div>
      )}

    </div>
  );
}