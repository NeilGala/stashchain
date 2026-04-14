"use client";

import Link from "next/link";
import WalletButton from "./WalletButton";

export default function Navbar() {
  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">⛓️</span>
          <span className="text-white font-bold text-xl tracking-tight">
            Stash<span className="text-blue-400">Chain</span>
          </span>
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-6">
          <Link
            href="/"
            className="text-gray-400 hover:text-white text-sm 
                       transition-colors duration-200"
          >
            Dashboard
          </Link>
          <Link
            href="/register"
            className="text-gray-400 hover:text-white text-sm 
                       transition-colors duration-200"
          >
            Register Product
          </Link>
          <Link
            href="/track"
            className="text-gray-400 hover:text-white text-sm 
                       transition-colors duration-200"
          >
            Track Product
          </Link>
        </div>

        {/* Wallet Button */}
        <WalletButton />

      </div>
    </nav>
  );
}