#!/usr/bin/env node
/**
 * ============================================
 * Script Upload Utility
 * ============================================
 * CLI tool to upload automation scripts to the backend server
 *
 * Usage:
 *   node upload-script.js <script-folder-path>
 *   node upload-script.js --json <path> --code <path>
 *   node upload-script.js <script-folder-path> --update
 *
 * Examples:
 *   node upload-script.js ./backend/scripts/twitter-gm-commenter
 *   node upload-script.js --json ./script.json --code ./index.js
 *   node upload-script.js ./backend/scripts/twitter-gm-commenter --update
 *
 * Environment:
 *   API_URL - Backend API URL (default: http://localhost:3000)
 *   API_PORT - Backend port (default: 3000)
 */

const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
require('dotenv').config();

// ============================================
// Configuration
// ============================================

const API_HOST = process.env.API_HOST || "localhost";
const API_PORT = process.env.API_PORT || 3000;
const API_ENDPOINT = "/api/admin/scripts/add";

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

// ============================================
// Helper Functions
// ============================================

/**
 * Print colored message
 */
function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Print error message
 */
function logError(message) {
  log(`❌ ERROR: ${message}`, "red");
}

/**
 * Print success message
 */
function logSuccess(message) {
  log(`✅ SUCCESS: ${message}`, "green");
}

/**
 * Print info message
 */
function logInfo(message) {
  log(`ℹ️  INFO: ${message}`, "cyan");
}

/**
 * Print warning message
 */
function logWarning(message) {
  log(`⚠️  WARNING: ${message}`, "yellow");
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    return { help: true };
  }

  const result = {
    folderPath: null,
    jsonPath: null,
    codePath: null,
    update: false,
    help: false,
    nftAddresses: [],
    category: null,
    makePublic: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else if (arg === "--update" || arg === "-u") {
      result.update = true;
    } else if (arg === "--json" || arg === "-j") {
      result.jsonPath = args[++i];
    } else if (arg === "--code" || arg === "-c") {
      result.codePath = args[++i];
    } else if (arg === "--nft" || arg === "-n") {
      // Support comma-separated NFT addresses
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith("--")) {
        i++; // Move to next argument
        const addresses = nextArg.split(",").map((a) => a.trim());
        result.nftAddresses.push(...addresses);
      }
      // If no value provided, we'll use NFT addresses from metadata.json
    } else if (arg === "--category" || arg === "--cat") {
      result.category = args[++i];
    } else if (arg === "--public" || arg === "-p") {
      result.makePublic = true;
    } else if (!arg.startsWith("-")) {
      result.folderPath = arg;
    }
  }

  return result;
}

/**
 * Print help message
 */
function printHelp() {
  log("\n============================================", "bright");
  log("Script Upload Utility", "bright");
  log("============================================\n", "bright");

  log("Upload automation scripts to the backend server\n", "cyan");

  log("USAGE:", "yellow");
  log("  node upload-script.js <script-folder-path>");
  log("  node upload-script.js --json <path> --code <path>");
  log("  node upload-script.js <script-folder-path> --update\n");

  log("OPTIONS:", "yellow");
  log(
    "  <script-folder-path>  Path to folder containing metadata.json and index.js"
  );
  log("  --json, -j <path>     Path to metadata.json file");
  log("  --code, -c <path>     Path to script code file (index.js)");
  log("  --nft, -n <addresses> NFT contract addresses (comma-separated)");
  log("                        Example: --nft 0x742d...bEb,0x1234...5678");
  log("  --public, -p          Make script public (accessible to all users)");
  log("  --category <name>     Override category from metadata.json");
  log("  --update, -u          Update existing script (uses PUT method)");
  log("  --help, -h            Show this help message\n");

  log("EXAMPLES:", "yellow");
  log("  # Upload public script (free for all users)");
  log(
    "  node upload-script.js ./backend/scripts/twitter-gm-commenter --public"
  );
  log("");
  log("  # Upload NFT-gated script (single NFT)");
  log(
    "  node upload-script.js ./backend/scripts/premium-bot --nft 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  );
  log("");
  log("  # Upload NFT-gated script (multiple NFTs)");
  log(
    "  node upload-script.js ./script-folder --nft 0x742d...bEb,0x1234...5678"
  );
  log("");
  log("  # Upload with custom category");
  log("  node upload-script.js ./script-folder --category premium-automation");
  log("");
  log("  # Update existing script");
  log(
    "  node upload-script.js ./backend/scripts/twitter-gm-commenter --update"
  );
  log("");
  log("  # Upload with explicit files");
  log(
    "  node upload-script.js --json ./metadata.json --code ./index.js --public\n"
  );

  log("ENVIRONMENT:", "yellow");
  log("  API_HOST - Backend host (default: localhost)");
  log("  API_PORT - Backend port (default: 3000)\n");

  log("FOLDER STRUCTURE:", "yellow");
  log("  script-folder/");
  log("  ├── metadata.json # Script metadata and configuration");
  log("  └── index.js      # Script code\n");

  log("============================================\n", "bright");
}

/**
 * Read JSON file
 */
function readJsonFile(filePath) {
  try {
    const absolutePath = path.resolve(filePath);

    if (!fs.existsSync(absolutePath)) {
      logError(`File not found: ${absolutePath}`);
      return null;
    }

    const content = fs.readFileSync(absolutePath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    logError(`Failed to read JSON file: ${error.message}`);
    return null;
  }
}

/**
 * Read text file
 */
function readTextFile(filePath) {
  try {
    const absolutePath = path.resolve(filePath);

    if (!fs.existsSync(absolutePath)) {
      logError(`File not found: ${absolutePath}`);
      return null;
    }

    return fs.readFileSync(absolutePath, "utf8");
  } catch (error) {
    logError(`Failed to read file: ${error.message}`);
    return null;
  }
}

/**
 * Load script from folder
 */
function loadScriptFromFolder(folderPath) {
  const absolutePath = path.resolve(folderPath);

  if (!fs.existsSync(absolutePath)) {
    logError(`Folder not found: ${absolutePath}`);
    return null;
  }

  const jsonPath = path.join(absolutePath, "metadata.json");
  const codePath = path.join(absolutePath, "index.js");

  logInfo(`Reading script from folder: ${absolutePath}`);

  const metadata = readJsonFile(jsonPath);
  if (!metadata) return null;

  const code = readTextFile(codePath);
  if (!code) return null;

  return { metadata, code };
}

/**
 * Load script from individual files
 */
function loadScriptFromFiles(jsonPath, codePath) {
  logInfo(`Reading metadata.json from: ${jsonPath}`);
  const metadata = readJsonFile(jsonPath);
  if (!metadata) return null;

  logInfo(`Reading script code from: ${codePath}`);
  const code = readTextFile(codePath);
  if (!code) return null;

  return { metadata, code };
}

/**
 * Build payload for API
 */
function buildPayload(metadata, code, options = {}) {
  const {
    isUpdate = false,
    nftAddresses = [],
    category = null,
    makePublic = false,
  } = options;

  // Determine NFT addresses priority:
  // 1. CLI --public flag (empty array)
  // 2. CLI --nft flag (explicit addresses)
  // 3. script.json nft_addresses field
  let finalNftAddresses = metadata.nft_addresses || [];

  if (makePublic) {
    finalNftAddresses = [];
  } else if (nftAddresses.length > 0) {
    finalNftAddresses = nftAddresses;
  }

  const payload = {
    script_id: metadata.id,
    name: metadata.name,
    description: metadata.description || "",
    version: metadata.version,
    script_content: code,
    category: category || metadata.category || null,
    nft_addresses: finalNftAddresses,
    config: metadata.config || {},
    metadata: {
      author: metadata.author || "Unknown",
      tags: metadata.tags || [],
      features: metadata.features || [],
      entry_point: metadata.entry_point || "index.js",
    },
  };

  // For updates, add update-specific fields
  if (isUpdate) {
    payload.create_version = true;
    payload.changelog = `Updated to version ${metadata.version}`;
  }

  return payload;
}

/**
 * Validate payload
 */
function validatePayload(payload) {
  const required = ["script_id", "name", "version", "script_content"];
  const missing = required.filter((field) => !payload[field]);

  if (missing.length > 0) {
    logError(`Missing required fields: ${missing.join(", ")}`);
    return false;
  }

  // Validate NFT addresses format if present
  if (payload.nft_addresses && Array.isArray(payload.nft_addresses)) {
    for (const addr of payload.nft_addresses) {
      if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
        logError(`Invalid NFT address format: ${addr}`);
        return false;
      }
    }
  }

  return true;
}

/**
 * Send HTTP request to API
 */
function sendRequest(payload, method = "POST") {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);

    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: API_ENDPOINT,
      method: method,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
    };

    logInfo(
      `Sending ${method} request to http://${API_HOST}:${API_PORT}${API_ENDPOINT}`
    );

    const protocol = API_PORT == 443 ? https : http;
    const req = protocol.request(options, (res) => {
      let responseData = "";

      res.on("data", (chunk) => {
        responseData += chunk;
      });

      res.on("end", () => {
        try {
          const response = JSON.parse(responseData);
          resolve({ statusCode: res.statusCode, data: response });
        } catch (error) {
          resolve({ statusCode: res.statusCode, data: responseData });
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

/**
 * Print response
 */
function printResponse(response) {
  log("\n============================================", "bright");
  log("API Response", "bright");
  log("============================================\n", "bright");

  if (response.statusCode === 200 || response.statusCode === 201) {
    logSuccess(`Status: ${response.statusCode}`);

    if (response.data.success) {
      logSuccess("Script uploaded successfully!");

      if (response.data.data) {
        const script = response.data.data.script || response.data.data;
        log("\nScript Details:", "cyan");
        log(`  ID: ${script.script_id || script.id}`, "cyan");
        log(`  Name: ${script.name}`, "cyan");
        log(`  Version: ${script.version}`, "cyan");
        log(`  Category: ${script.category || "N/A"}`, "cyan");
        log(`  Active: ${script.is_active ? "Yes" : "No"}`, "cyan");

        if (script.nft_addresses && script.nft_addresses.length > 0) {
          log(`  NFT Addresses: ${script.nft_addresses.join(", ")}`, "cyan");
          log(`  Access: NFT Gated`, "yellow");
        } else {
          log(`  Access: Public (Free)`, "green");
        }
      }
    } else {
      logWarning("Unexpected response format");
      console.log(JSON.stringify(response.data, null, 2));
    }
  } else {
    logError(`Status: ${response.statusCode}`);

    if (response.data.error) {
      logError(`Code: ${response.data.error.code || "UNKNOWN"}`);
      logError(`Message: ${response.data.error.message}`);

      if (response.data.error.details) {
        log("\nDetails:", "red");
        console.log(JSON.stringify(response.data.error.details, null, 2));
      }
    } else {
      console.log(JSON.stringify(response.data, null, 2));
    }
  }

  log("\n============================================\n", "bright");
}

// ============================================
// Main Function
// ============================================

async function main() {
  log("\n============================================", "bright");
  log("🚀 Script Upload Utility", "bright");
  log("============================================\n", "bright");

  const args = parseArgs();

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  // Load script data
  let scriptData;

  if (args.folderPath) {
    scriptData = loadScriptFromFolder(args.folderPath);
  } else if (args.jsonPath && args.codePath) {
    scriptData = loadScriptFromFiles(args.jsonPath, args.codePath);
  } else {
    logError("Invalid arguments. Use --help for usage information.");
    process.exit(1);
  }

  if (!scriptData) {
    logError("Failed to load script data");
    process.exit(1);
  }

  // Build and validate payload
  logInfo("Building API payload...");
  const payload = buildPayload(scriptData.metadata, scriptData.code, {
    isUpdate: args.update,
    nftAddresses: args.nftAddresses,
    category: args.category,
    makePublic: args.makePublic,
  });

  if (!validatePayload(payload)) {
    process.exit(1);
  }

  logSuccess("Payload validated successfully");

  // Show NFT addresses info
  if (args.makePublic) {
    logInfo(
      "--public flag detected: Script will be accessible to ALL users (free)"
    );
  } else if (args.nftAddresses.length > 0) {
    logInfo(
      `--nft flag detected: Script will be gated by ${args.nftAddresses.length} NFT contract(s)`
    );
  } else if (payload.nft_addresses.length > 0) {
    logInfo(
      `NFT addresses from script.json: ${payload.nft_addresses.length} contract(s)`
    );
  } else {
    logInfo(
      "No NFT addresses specified: Script will be PUBLIC (free for all users)"
    );
  }

  // Show payload summary
  log("\nScript Summary:", "cyan");
  log(`  Script ID: ${payload.script_id}`, "cyan");
  log(`  Name: ${payload.name}`, "cyan");
  log(`  Version: ${payload.version}`, "cyan");
  log(`  Category: ${payload.category || "N/A"}`, "cyan");
  log(`  Code Length: ${payload.script_content.length} characters`, "cyan");

  if (payload.nft_addresses.length === 0) {
    log(`  Access Type: PUBLIC (Free for all users)`, "green");
  } else {
    log(`  Access Type: NFT-GATED`, "yellow");
    log(`  Required NFTs:`, "yellow");
    payload.nft_addresses.forEach((addr, i) => {
      log(`    ${i + 1}. ${addr}`, "yellow");
    });
  }

  log(`  Action: ${args.update ? "UPDATE" : "CREATE"}`, "cyan");

  // Send request
  try {
    const method = args.update ? "PUT" : "POST";
    const response = await sendRequest(payload, method);
    printResponse(response);

    if (response.statusCode === 200 || response.statusCode === 201) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (error) {
    logError(`Network error: ${error.message}`);
    logInfo("Make sure the backend server is running");
    process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  logError(`Unexpected error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
