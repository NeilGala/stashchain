import { ethers } from "ethers";
import ABI from "./SupplyChainABI.json";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

export function getReadContract () {
    const provider = new ethers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_ALCHEMY_URL
    );
    return new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
}

export async function getWriteContract () {
    if(!window.ethereum) {
        throw new Error("MetaMask not found. Please install MetaMask.");
    }
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
}

export function getEventTypeName (eventType) {
    const types = {
    0: "Manufactured",
    1: "Shipped",
    2: "In Transit",
    3: "Delivered",
    4: "Returned",
  };
  return types[Number(eventType)] || "Unknown";
}

export function formatTimestamp (timestamp) {
    return new Date(Number(timestamp) * 1000).toLocaleString();
}

export function shortenAddress(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}