/**
 * Test script for Dynamic NFT Listeners System
 * Run with: node test-nft-listeners.js
 */

const BASE_URL = "http://localhost:3000";

async function testNFTListeners() {
  console.log("🧪 Testing Dynamic NFT Listeners System\n");

  try {
    // Test 1: Get system stats
    console.log("1️⃣ Getting system stats...");
    const statsResponse = await fetch(`${BASE_URL}/api/admin/system-stats`);
    const stats = await statsResponse.json();

    if (stats.success) {
      console.log("✅ System stats retrieved");
      console.log(
        `   - NFT Listeners: ${stats.data.nftListeners.activeListeners}/${stats.data.nftListeners.totalListeners} active`
      );
      console.log(
        `   - Total NFT Contracts: ${stats.data.system.totalNFTContracts}`
      );
    } else {
      console.log("❌ Failed to get system stats:", stats.error);
    }

    // Test 2: Get NFT contracts status
    console.log("\n2️⃣ Getting NFT contracts status...");
    const contractsResponse = await fetch(
      `${BASE_URL}/api/admin/nft-contracts`
    );
    const contracts = await contractsResponse.json();

    if (contracts.success) {
      console.log("✅ NFT contracts status retrieved");
      console.log(
        `   - Total listeners: ${contracts.data.summary.totalContracts}`
      );
      console.log(
        `   - Active listeners: ${contracts.data.summary.activeListeners}`
      );

      if (contracts.data.listeners.length > 0) {
        console.log("   - Listener details:");
        contracts.data.listeners.forEach((listener) => {
          console.log(
            `     • ${listener.contractAddress}: ${
              listener.isListening ? "🟢 Active" : "🔴 Inactive"
            } (uptime: ${listener.uptime}s)`
          );
        });
      }
    } else {
      console.log("❌ Failed to get NFT contracts status:", contracts.error);
    }

    // Test 3: Force refresh listeners
    console.log("\n3️⃣ Force refreshing listeners...");
    const refreshResponse = await fetch(
      `${BASE_URL}/api/admin/nft-contracts/refresh`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh" }),
      }
    );
    const refresh = await refreshResponse.json();

    if (refresh.success) {
      console.log("✅ Listeners refreshed successfully");
      console.log(`   - Manager running: ${refresh.data.manager.isRunning}`);
      console.log(
        `   - Total listeners: ${refresh.data.manager.totalListeners}`
      );
    } else {
      console.log("❌ Failed to refresh listeners:", refresh.error);
    }

    // Test 4: Get contracts with scripts
    console.log("\n4️⃣ Getting contracts with scripts...");
    const contractsWithScriptsResponse = await fetch(
      `${BASE_URL}/api/admin/nft-contracts/contracts`,
      {
        method: "PUT",
      }
    );
    const contractsWithScripts = await contractsWithScriptsResponse.json();

    if (contractsWithScripts.success) {
      console.log("✅ Contracts with scripts retrieved");
      console.log(
        `   - Total contracts: ${contractsWithScripts.data.summary.totalContracts}`
      );

      if (contractsWithScripts.data.contracts.length > 0) {
        console.log("   - Contract details:");
        contractsWithScripts.data.contracts.forEach((contract) => {
          console.log(`     • ${contract.contractAddress}:`);
          console.log(
            `       - Scripts: ${
              contract.scriptCount
            } (${contract.scriptNames.join(", ")})`
          );
          console.log(
            `       - Listener: ${
              contract.listener
                ? contract.listener.isListening
                  ? "🟢 Active"
                  : "🔴 Inactive"
                : "❌ Not found"
            }`
          );
        });
      } else {
        console.log("   - No NFT contracts found in active scripts");
      }
    } else {
      console.log(
        "❌ Failed to get contracts with scripts:",
        contractsWithScripts.error
      );
    }

    console.log("\n✅ All tests completed!");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.log(
      "\n💡 Make sure the backend server is running on http://localhost:3000"
    );
  }
}

// Run tests
testNFTListeners();
