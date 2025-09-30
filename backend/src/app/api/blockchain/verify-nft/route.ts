import { NextRequest } from "next/server";
import { ApiResponseBuilder } from "@/utils/api-response";
import { validateRequestBody, getClientIP } from "@/utils/validation";
import { verifySessionToken } from "@/utils/crypto";
import { blockchainService } from "@/services/blockchain";

/**
 * Verify NFT ownership for a wallet address
 * This endpoint handles blockchain verification on the server side
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = validateRequestBody(body, ["walletAddress"]);
    if (!validation.valid) {
      return ApiResponseBuilder.validationError(validation.errors);
    }

    const { walletAddress } = body;

    // Get session token from headers
    const sessionToken = request.headers.get("x-session-token");
    if (!sessionToken) {
      return ApiResponseBuilder.unauthorized("Session token required");
    }

    // Verify session token
    const tokenValidation = await verifySessionToken(sessionToken);
    if (!tokenValidation.valid) {
      return ApiResponseBuilder.unauthorized(
        "Invalid or expired session token"
      );
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return ApiResponseBuilder.error(
        "INVALID_WALLET_ADDRESS",
        "Invalid wallet address format"
      );
    }

    console.log(`🔍 Verifying NFT ownership for wallet: ${walletAddress}`);

    // Check NFT ownership using blockchain service
    const nftResult = await blockchainService.checkLegionNFTOwnership(
      walletAddress
    );

    // Get additional wallet info
    const balance = await blockchainService.getBalance(walletAddress);
    const networkInfo = await blockchainService.getNetworkInfo();

    return ApiResponseBuilder.success({
      walletAddress: nftResult.userAddress,
      hasLegionNFT: nftResult.hasNFT,
      contractAddress: nftResult.contractAddress,
      networkName: nftResult.networkName,
      balance: balance,
      chainId: networkInfo.chainId,
      verifiedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ NFT verification error:", error);
    return ApiResponseBuilder.internalError(
      "Failed to verify NFT ownership",
      process.env.NODE_ENV === "development" ? error : undefined
    );
  }
}
