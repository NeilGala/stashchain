"use client";

import { useState } from "react";
import Image from "next/image";
import { useWallet } from "@/context/WalletContext";
import { getWriteContract } from "@/lib/contract";
import { uploadImageToIPFS, uploadMetadataToIPFS, getIPFSUrl } from "@/lib/pinata";
import Link from "next/link";

// Transaction status enum
const STATUS = {
  IDLE: "idle",
  UPLOADING: "uploading",
  WAITING: "waiting",
  CONFIRMING: "confirming",
  SUCCESS: "success",
  ERROR: "error",
};

export default function RegisterProduct() {
  const { account, isCorrectNetwork } = useWallet();

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [origin, setOrigin] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Transaction state
  const [status, setStatus] = useState(STATUS.IDLE);
  const [errorMessage, setErrorMessage] = useState("");
  const [txHash, setTxHash] = useState("");
  const [productId, setProductId] = useState(null);

  // ── Handle Image Selection ─────────────────────
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please select a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Image must be smaller than 5MB.");
      return;
    }

    setImageFile(file);
    setErrorMessage("");

    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  // ── Handle Form Submit ─────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      setErrorMessage("Product name is required.");
      return;
    }
    if (!imageFile) {
      setErrorMessage("Product image is required.");
      return;
    }
    if (!account) {
      setErrorMessage("Please connect your wallet first.");
      return;
    }
    if (!isCorrectNetwork) {
      setErrorMessage("Please switch to Sepolia network.");
      return;
    }

    try {
      setErrorMessage("");

      // ── Step 1: Upload image to IPFS ──────────
      setStatus(STATUS.UPLOADING);
      const imageHash = await uploadImageToIPFS(imageFile);
      const imageUrl = getIPFSUrl(imageHash);

      // ── Step 2: Upload metadata to IPFS ──────
      const metadata = {
        name: name.trim(),
        description: description.trim(),
        origin: origin.trim(),
        image: imageUrl,
        imageHash,
        registeredBy: account,
        registeredAt: new Date().toISOString(),
        platform: "StashChain",
      };

      const metadataHash = await uploadMetadataToIPFS(metadata);

      // ── Step 3: Call smart contract ───────────
      setStatus(STATUS.WAITING);
      const contract = await getWriteContract();

      const tx = await contract.registerProduct(
        name.trim(),
        metadataHash
      );

      // ── Step 4: Wait for confirmation ─────────
      setStatus(STATUS.CONFIRMING);
      setTxHash(tx.hash);

      const receipt = await tx.wait();

      // ── Step 5: Extract product ID from event ─
      const event = receipt.logs.find(
        (log) => {
          try {
            const parsed = contract.interface.parseLog(log);
            return parsed?.name === "ProductRegistered";
          } catch {
            return false;
          }
        }
      );

      if (event) {
        const parsed = contract.interface.parseLog(event);
        setProductId(parsed.args[0].toString());
      }

      setStatus(STATUS.SUCCESS);

    } catch (err) {
      console.error(err);
      if (err.code === 4001 || err.code === "ACTION_REJECTED") {
        setErrorMessage("Transaction rejected. You cancelled the request.");
      } else if (err.message?.includes("Pinata")) {
        setErrorMessage("Failed to upload to IPFS. Check your Pinata keys.");
      } else {
        setErrorMessage(err.message || "Something went wrong.");
      }
      setStatus(STATUS.ERROR);
    }
  };

  const handleReset = () => {
    setName("");
    setDescription("");
    setOrigin("");
    setImageFile(null);
    setImagePreview(null);
    setStatus(STATUS.IDLE);
    setErrorMessage("");
    setTxHash("");
    setProductId(null);
  };

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-6xl">🔒</div>
        <h2 className="text-2xl font-bold text-white">Wallet Not Connected</h2>
        <p className="text-gray-400">Please connect your MetaMask wallet to register products.</p>
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

  if (status === STATUS.SUCCESS) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center space-y-6">
        <div className="text-7xl">🎉</div>
        <h2 className="text-3xl font-bold text-white">Product Registered!</h2>
        <p className="text-gray-400">Your product has been permanently recorded on the Ethereum blockchain.</p>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-left space-y-3">
          {productId && (
            <div>
              <span className="text-gray-400 text-sm">Product ID</span>
              <p className="text-white font-bold text-2xl">#{productId}</p>
            </div>
          )}
          <div>
            <span className="text-gray-400 text-sm">Transaction Hash</span>
            {/* FIX: Added missing <a> tag */}
            <a
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-blue-400 hover:text-blue-300 font-mono text-xs mt-1 break-all"
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
            Track This Product
          </Link>
          <button
            onClick={handleReset}
            className="bg-gray-800 hover:bg-gray-700 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200"
          >
            Register Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Register Product</h1>
        <p className="text-gray-400 mt-2">Add a new product to the StashChain blockchain registry.</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Product Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. iPhone 15 Pro — Batch #4421"
              disabled={status !== STATUS.IDLE && status !== STATUS.ERROR}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 disabled:opacity-50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the product..."
              rows={3}
              disabled={status !== STATUS.IDLE && status !== STATUS.ERROR}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 disabled:opacity-50 transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Origin</label>
            <input
              type="text"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="e.g. Shenzhen, China"
              disabled={status !== STATUS.IDLE && status !== STATUS.ERROR}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 disabled:opacity-50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Product Image <span className="text-red-400">*</span>
            </label>
            {imagePreview ? (
              <div className="relative">
                <Image src={imagePreview} alt="Preview" width={500} height={192} className="w-full h-48 object-cover rounded-lg border border-gray-700" />
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-blue-500 transition-colors bg-gray-800/50">
                <div className="text-4xl mb-2">📸</div>
                <p className="text-gray-400 text-sm">Click to upload image</p>
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
            )}
          </div>

          {errorMessage && (
            <div className="bg-red-900/30 border border-red-700/50 rounded-lg px-4 py-3">
              <p className="text-red-400 text-sm">⚠️ {errorMessage}</p>
            </div>
          )}

          {status === STATUS.UPLOADING && (
            <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg px-4 py-3 flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-blue-400 text-sm">Uploading to IPFS via Pinata...</p>
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
                {/* FIX: Added missing <a> tag */}
                <a
                  href={`https://sepolia.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-300 text-xs hover:underline"
                >
                  View on Etherscan ↗
                </a>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={status !== STATUS.IDLE && status !== STATUS.ERROR}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all duration-200 text-lg"
          >
            {status === STATUS.IDLE || status === STATUS.ERROR ? "Register Product on Blockchain" : "Processing..."}
          </button>
        </form>
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
        <h3 className="text-gray-300 font-medium mb-3">What happens when you register?</h3>
        <div className="space-y-2">
          {[
            "Your image is uploaded to IPFS (decentralized storage)",
            "Product metadata is pinned to Pinata",
            "Product is registered on Ethereum Sepolia blockchain",
            "You become the verified manufacturer and first owner",
            "A MANUFACTURED event is automatically recorded",
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-blue-400 text-sm mt-0.5">✓</span>
              <p className="text-gray-400 text-sm">{step}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}