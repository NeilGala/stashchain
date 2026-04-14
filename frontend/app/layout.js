import { Inter } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/context/WalletContext";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "StashChain — Decentralized Supply Chain",
  description:
    "Track products from origin to delivery on the Ethereum blockchain",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-950 text-white min-h-screen`}>
        <WalletProvider>
          <Navbar />
          <main className="max-w-7xl mx-auto px-6 py-8">
            {children}
          </main>
        </WalletProvider>
      </body>
    </html>
  );
}