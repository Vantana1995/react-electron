/**
 * Next.js Instrumentation Hook
 * Runs once when the server starts
 * Perfect for initializing services like NFT Event Listener
 *
 * IMPORTANT: Only runs in Node.js runtime (not Edge Runtime)
 */

export async function register() {
  // Only run in Node.js runtime (not Edge Runtime)
  if (process.env.NEXT_RUNTIME === "nodejs" || !process.env.NEXT_RUNTIME) {
    console.log("\n🚀 Server Instrumentation: Initializing services...");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Dynamically import Dynamic NFT Listener Manager (Node.js only)
    try {
      console.log("🎨 Starting Dynamic NFT Listener Manager...");
      const { dynamicNFTListenerManager } = await import(
        "./src/services/dynamic-nft-listener-manager"
      );
      await dynamicNFTListenerManager.start();
      console.log("✅ Dynamic NFT Listener Manager started successfully");
    } catch (error) {
      console.error("❌ Failed to start Dynamic NFT Listener Manager:", error);
      // Don't crash the server, just log the error
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Server instrumentation complete\n");
  } else {
    console.log("⚠️ Instrumentation skipped (Edge Runtime detected)");
  }
}
