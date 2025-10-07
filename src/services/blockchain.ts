/**
 * Blockchain service for NFT verification
 * Universal NFT checker for any ERC-721 contract
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
const SEPOLIA_RPC =
  process.env.SEPOLIA_RPC || "https://eth-sepolia.g.alchemy.com/v2/OrVnzsLq4Nnt8B0SIP5471lFMfw0OnYA";
const NETWORK_NAME = "Sepolia Testnet";

export interface NFTOwnershipResult {
  hasNFT: boolean;
  userAddress: string;
  contractAddress: string;
  networkName: string;
  nftCount: number;
}

/**
 * Universal NFT ownership checker
 * Works with any ERC-721 contract
 * @param walletAddress - Ethereum wallet address
 * @param contractAddress - NFT contract address
 * @returns Promise with ownership details
 */
export async function checkNFTOwnership(
  walletAddress: string,
  contractAddress: string
): Promise<NFTOwnershipResult> {
  try {
    console.log(
      `🔍 Checking NFT ownership: wallet ${walletAddress.substring(0, 8)}... contract ${contractAddress.substring(0, 8)}...`
    );

    // Create provider
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);

    // Create contract instance
    const contract = new ethers.Contract(
      contractAddress,
      ERC721_ABI,
      provider
    );

    // Check balance
    const balance = await contract.balanceOf(walletAddress);
    const nftCount = Number(balance);
    const hasNFT = nftCount > 0;

    if (hasNFT) {
      console.log(
        `✅ NFT ownership verified: ${nftCount} NFT(s) found for ${contractAddress.substring(0, 8)}...`
      );
    } else {
      console.log(`❌ No NFT ownership found for ${contractAddress.substring(0, 8)}...`);
    }

    return {
      hasNFT,
      userAddress: walletAddress,
      contractAddress,
      networkName: NETWORK_NAME,
      nftCount,
    };
  } catch (error) {
    console.error(`Error checking NFT ownership for ${contractAddress}:`, error);
    return {
      hasNFT: false,
      userAddress: walletAddress,
      contractAddress,
      networkName: NETWORK_NAME,
      nftCount: 0,
    };
  }
}

/**
 * Check multiple NFT contracts ownership in parallel
 * @param walletAddress - Ethereum wallet address
 * @param contractAddresses - Array of NFT contract addresses
 * @returns Promise with array of ownership results
 */
export async function checkMultipleNFTOwnership(
  walletAddress: string,
  contractAddresses: string[]
): Promise<NFTOwnershipResult[]> {
  if (contractAddresses.length === 0) {
    console.log("⚠️ No NFT contracts to check");
    return [];
  }

  console.log(
    `🔍 Checking ownership of ${contractAddresses.length} NFT contract(s) for wallet ${walletAddress.substring(0, 8)}...`
  );

  // Check all NFTs in parallel for performance
  const promises = contractAddresses.map((contractAddress) =>
    checkNFTOwnership(walletAddress, contractAddress)
  );

  const results = await Promise.all(promises);

  const ownedCount = results.filter((r) => r.hasNFT).length;
  console.log(
    `✅ Ownership check complete: ${ownedCount}/${contractAddresses.length} NFTs owned`
  );

  return results;
}

/**
 * Get NFT balance for specific contract
 * @param walletAddress - Ethereum wallet address
 * @param contractAddress - NFT contract address
 * @returns Promise<number> - Number of NFTs owned
 */
export async function getNFTBalance(
  walletAddress: string,
  contractAddress: string
): Promise<number> {
  try {
    if (!walletAddress || !contractAddress) {
      return 0;
    }

    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
    const contract = new ethers.Contract(
      contractAddress,
      ERC721_ABI,
      provider
    );

    const balance = await contract.balanceOf(walletAddress);
    return Number(balance);
  } catch (error) {
    console.error(`Error getting NFT balance for ${contractAddress}:`, error);
    return 0;
  }
}

/**
 * Get NFT metadata (universal function for any ERC-721 contract)
 * @param contractAddress - NFT contract address
 * @param tokenId - Token ID
 * @returns NFT metadata with image URL
 */
export async function getNFTMetadata(
  contractAddress: string,
  tokenId: string
): Promise<{ image: string; metadata: any } | null> {
  try {
    console.log(`🔍 Getting metadata for NFT ${contractAddress}:${tokenId}`);

    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
    const contract = new ethers.Contract(
      contractAddress,
      ERC721_ABI,
      provider
    );

    // Get token URI
    const tokenURI = await contract.tokenURI(tokenId);
    console.log(`📋 Token URI: ${tokenURI}`);

    // Fetch metadata from IPFS/HTTP
    const response = await fetch(tokenURI);
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.status}`);
    }

    const metadata = await response.json();
    console.log(`✅ NFT metadata loaded successfully`);

    // Extract image URL
    const imageUrl = metadata.image || metadata.image_url || "";

    return {
      image: imageUrl,
      metadata: metadata,
    };
  } catch (error) {
    console.error("Error getting NFT metadata:", error);
    return null;
  }
}

/**
 * Get wallet balance in ETH
 * @param walletAddress - Ethereum wallet address
 * @returns Promise<string> - Balance in ETH
 */
export async function getBalance(walletAddress: string): Promise<string> {
  try {
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
    const balance = await provider.getBalance(walletAddress);
    return ethers.formatEther(balance);
  } catch (error) {
    console.error("Error getting balance:", error);
    return "0";
  }
}

/**
 * Get network information
 * @returns Promise<{chainId: number, name: string}>
 */
export async function getNetworkInfo(): Promise<{
  chainId: number;
  name: string;
}> {
  try {
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
    const network = await provider.getNetwork();
    return {
      chainId: Number(network.chainId),
      name: network.name,
    };
  } catch (error) {
    console.error("Error getting network info:", error);
    return { chainId: 11155111, name: NETWORK_NAME };
  }
}

/**
 * Validate Ethereum address format
 * @param address - Address to validate
 * @returns boolean - True if valid
 */
export function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Blockchain Service - exported singleton
 */
export const blockchainService = {
  // Universal NFT functions
  checkNFTOwnership,
  checkMultipleNFTOwnership,
  getNFTBalance,
  getNFTMetadata,

  // Utility functions
  getBalance,
  getNetworkInfo,
  isValidEthereumAddress,

  // Constants
  SEPOLIA_RPC,
  NETWORK_NAME,
  ERC721_ABI,
};

/**
 * DEPRECATED: Legacy functions for backward compatibility
 * These will be removed in future versions
 * Use checkNFTOwnership() instead
 */

// For backward compatibility with existing code
export async function hasLegionNFT(walletAddress: string): Promise<boolean> {
  console.warn("⚠️ hasLegionNFT() is deprecated. Use checkNFTOwnership() instead.");
  // This function is now useless without hardcoded contract
  // Return false and log warning
  return false;
}

export async function checkLegionNFTOwnership(walletAddress: string): Promise<NFTOwnershipResult> {
  console.warn("⚠️ checkLegionNFTOwnership() is deprecated. Use checkNFTOwnership() instead.");
  // Return empty result
  return {
    hasNFT: false,
    userAddress: walletAddress,
    contractAddress: "",
    networkName: NETWORK_NAME,
    nftCount: 0,
  };
}
