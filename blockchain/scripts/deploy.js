import hardhat from "hardhat";

const { ethers } = hardhat;

async function main() {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🚀 Deploying StashChain to Sepolia...");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const [deployer] = await ethers.getSigners();
    console.log("📬 Deploying from wallet:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(
        "💰 Wallet balance:",
        ethers.formatEther(balance),
        "SepoliaETH"
    );

    if (balance === 0n) {
        throw new Error("❌ Wallet has no ETH. Get Sepolia ETH from a faucet.");
    }

    console.log("\n⏳ Deploying SupplyChain contract...");
    const SupplyChain = await ethers.getContractFactory("SupplyChain");
    const supplyChain = await SupplyChain.deploy();
    await supplyChain.waitForDeployment();

    const contractAddress = await supplyChain.getAddress();

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ SupplyChain deployed successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📄 Contract Address:", contractAddress);
    console.log(
        "🔍 Etherscan URL:",
        `https://sepolia.etherscan.io/address/${contractAddress}`
    );
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n⚠️  IMPORTANT: Copy the contract address above!");
    console.log("    Add it to frontend/.env.local as:");
    console.log(
        "    NEXT_PUBLIC_CONTRACT_ADDRESS=" + contractAddress
    );
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
});