"use client";

import { useWallet } from "@/context/WalletContext";
import { shortenAddress } from "@/lib/contract";
import Link from "next/link";

export default function Dashboard() {
  const { account, isCorrectNetwork, connectWallet } = useWallet();

  // ── Not Connected State ───────────────────────────
  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-8">
        <div className="text-center">
          <div className="text-7xl mb-6">⛓️</div>
          <h1 className="text-4xl font-bold text-white mb-3">
            Welcome to StashChain
          </h1>
          <p className="text-gray-400 text-lg max-w-md mx-auto">
            A decentralized supply chain management system built on Ethereum.
            Track products from origin to delivery — transparently and tamper-proof.
          </p>
        </div>

        <button
          onClick={connectWallet}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold 
                     px-8 py-4 rounded-xl text-lg transition-all duration-200
                     shadow-lg shadow-blue-600/20"
        >
          Connect Wallet to Get Started
        </button>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 w-full max-w-4xl">
          {[
            {
              icon: "📦",
              title: "Register Products",
              desc: "Add products to the blockchain with IPFS metadata storage",
            },
            {
              icon: "🔍",
              title: "Track Shipments",
              desc: "View real-time supply chain events for any product",
            },
            {
              icon: "🔐",
              title: "Verify Authenticity",
              desc: "Cryptographically verify product origin and ownership history",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="bg-gray-900 border border-gray-800 rounded-xl p-6"
            >
              <div className="text-4xl mb-3">{feature.icon}</div>
              <h3 className="text-white font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Wrong Network State ───────────────────────────
  if (!isCorrectNetwork) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
        <div className="text-6xl">⚠️</div>
        <h2 className="text-2xl font-bold text-yellow-400">Wrong Network</h2>
        <p className="text-gray-400">
          Please switch to the Sepolia testnet to use StashChain.
        </p>
      </div>
    );
  }

  // ── Connected & Correct Network ───────────────────
  return (
    <div className="space-y-8">

      {/* Welcome Banner */}
      <div className="bg-linear-to-r from-blue-900/40 to-purple-900/40 
                      border border-blue-800/50 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">
              Welcome back 👋
            </h1>
            <p className="text-gray-400 text-sm font-mono">
              {account}
            </p>
          </div>
          <div className="flex items-center gap-2 bg-green-900/30 
                          border border-green-700/50 px-4 py-2 rounded-lg">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-green-400 text-sm">Sepolia Testnet</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: "📦",
              title: "Register Product",
              desc: "Add a new product to StashChain",
              href: "/register",
              color: "blue",
            },
            {
              icon: "📋",
              title: "Log Event",
              desc: "Record a supply chain event",
              href: "/log-event",
              color: "purple",
            },
            {
              icon: "🔍",
              title: "Track Product",
              desc: "View full product history",
              href: "/track",
              color: "green",
            },
          ].map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className="bg-gray-900 hover:bg-gray-800 border border-gray-800 
                         hover:border-gray-700 rounded-xl p-6 transition-all 
                         duration-200 group"
            >
              <div className="text-4xl mb-3">{action.icon}</div>
              <h3 className="text-white font-semibold mb-1 group-hover:text-blue-400 
                             transition-colors">
                {action.title}
              </h3>
              <p className="text-gray-400 text-sm">{action.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-gray-400 text-sm mb-1">Your Wallet</h3>
          <p className="text-white font-mono text-sm">{shortenAddress(account)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-gray-400 text-sm mb-1">Network</h3>
          <p className="text-green-400 font-semibold">Sepolia Testnet ✅</p>
        </div>
      </div>

    </div>
  );
}