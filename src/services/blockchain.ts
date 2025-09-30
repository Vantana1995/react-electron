/**
 * Blockchain service for NFT verification
 */

import { ethers } from "ethers";

// Contract ABI for ERC-721 (NFT) balance check and metadata
const ERC721_ABI = [
  {
    constant: true,
    inputs: [
      {
        name: "_owner",
        type: "address",
      },
    ],
    name: "balanceOf",
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "baseTokenURI",
    outputs: [
      {
        name: "",
        type: "string",
      },
    ],
    type: "function",
  },
  {
    constant: true,
    inputs: [
      {
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "tokenURI",
    outputs: [
      {
        name: "",
        type: "string",
      },
    ],
    type: "function",
  },
];

// Configuration
const LEGION_NFT_CONTRACT = "0x9991Ef85B711Bc91B3ABbe62bD4eD10394C399BA";
const SEPOLIA_RPC =
  "https://eth-sepolia.g.alchemy.com/v2/OrVnzsLq4Nnt8B0SIP5471lFMfw0OnYA";

/**
 * Check if wallet address has Legion NFT
 * @param walletAddress - Ethereum wallet address
 * @returns Promise<boolean> - True if wallet has Legion NFT
 */
export async function hasLegionNFT(walletAddress: string): Promise<boolean> {
  try {
    if (!walletAddress) {
      console.log("❌ No wallet address provided for NFT check");
      return false;
    }

    console.log(
      `🔍 Checking NFT ownership for wallet: ${walletAddress.substring(
        0,
        8
      )}...`
    );

    // Create provider
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);

    // Create contract instance
    const contract = new ethers.Contract(
      LEGION_NFT_CONTRACT,
      ERC721_ABI,
      provider
    );

    // Check balance
    const balance = await contract.balanceOf(walletAddress);
    const hasNFT = balance > 0;

    if (hasNFT) {
      console.log(
        `✅ NFT ownership verified: ${balance.toString()} NFT(s) found`
      );
    } else {
      console.log(`❌ No NFT ownership found`);
    }

    return hasNFT;
  } catch (error) {
    console.error("Error checking Legion NFT:", error);
    return false;
  }
}

/**
 * Get Legion NFT balance for wallet
 * @param walletAddress - Ethereum wallet address
 * @returns Promise<number> - Number of Legion NFTs owned
 */
export async function getLegionNFTBalance(
  walletAddress: string
): Promise<number> {
  try {
    if (!walletAddress) {
      return 0;
    }

    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
    const contract = new ethers.Contract(
      LEGION_NFT_CONTRACT,
      ERC721_ABI,
      provider
    );

    const balance = await contract.balanceOf(walletAddress);
    return Number(balance);
  } catch (error) {
    console.error("Error getting Legion NFT balance:", error);
    return 0;
  }
}

/**
 * Get base URI from Legion NFT contract
 * @returns Promise<string> - Base URI for NFT metadata
 */
export async function getLegionNFTBaseURI(): Promise<string> {
  try {
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
    const contract = new ethers.Contract(
      LEGION_NFT_CONTRACT,
      ERC721_ABI,
      provider
    );

    const baseURI = await contract.baseTokenURI();
    console.log(`📋 NFT metadata URI retrieved`);
    return baseURI;
  } catch (error) {
    console.error("Error getting Legion NFT base URI:", error);
    return "";
  }
}

/**
 * Get Legion NFT metadata and image
 * @param walletAddress - Ethereum wallet address
 * @returns Promise<{image: string, metadata: any} | null> - NFT image and metadata
 */
export async function getLegionNFTMetadata(
  walletAddress: string
): Promise<{ image: string; metadata: any } | null> {
  try {
    if (!walletAddress) {
      return null;
    }

    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
    const contract = new ethers.Contract(
      LEGION_NFT_CONTRACT,
      ERC721_ABI,
      provider
    );

    // Get base URI
    const baseURI = await contract.baseTokenURI();

    // Get token URI (should be baseURI + "legion.json")
    const tokenURI = await contract.tokenURI(1); // All tokens have same metadata

    // Fetch metadata from IPFS
    const response = await fetch(tokenURI);
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.status}`);
    }

    const metadata = await response.json();
    console.log(`📋 NFT metadata loaded successfully`);

    // Extract image URL
    const imageUrl = metadata.image || metadata.image_url || "";

    return {
      image: imageUrl,
      metadata: metadata,
    };
  } catch (error) {
    console.error("Error getting Legion NFT metadata:", error);
    return null;
  }
}
