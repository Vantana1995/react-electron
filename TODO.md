1. disconnect-wallet in electron/main.ts after we doing `  authFlow.getWalletAddress(sessionToken);` cache cleaning on app close, check also `close-app`
   - ` // Viewport setting` need to check this, id like to set it up automatically atm
2. Check NFT classes at frontend ` action: string;
script: {
  id: string;
  name: string;
  version: string;
  features: string[];
  code: string;
  content: string;
  subscriptionRequired: string;
  metadata?: {
    description?: string;
    author?: string;
    created?: string;
    updated?: string;
  };
};` remove unused or not sended by server
3. Move all interfaces at frontend into types/index.ts
4. NFTDisplay.tsx how i understand its work on the nft but we need to take for main scriptId
   - What the difference between `regexTags` and `regexInput`
   - `else if (scriptData) {setShowNFT(true);` do we set any image here? ill create an image for situation like this, or create it with svg(simple card with script name)
   - Here we have `if (!showNFT) {return null;}` so if there no Image its will be null?
   - At `{/* NFT Image Section */}` we need to add image if we dont get it, ill create one, where its must be?
5. ScriptManager.tsx
   - ` // Execute script for specific NFT` this function only run script with NFT? So what if we dont have an NFT on our script? I think we need to separate scripts not by NFTs but by script code availability, so when we execute script we sent directly script and not looking for available NFT with them
6. serverApiService.ts
   - `memory: {
  total: (navigator as any).deviceMemory
    ? (navigator as any).deviceMemory * 1024 * 1024 * 1024
    : 4294967296,
},` how we can pass hardcoding memory here?
   - need to change processing `// Process each NFT+Script pair` first we need to check without pair `if (pair.nft && pair.script)`, then check without script, then check both how its present now, so when without image we will use an image that ill create, with no script so we check maxProfile for update and skip other checks,
     in this case we can remove ` else` from this process with `console.log("ℹ️ No NFT found - using free tier");`
   - Check processPingData what do we really use at `ScriptData` and `NFTData`
   - Remove ` // Handle legacy NFT data (backward compatibility)` with `// Handle legacy script data (backward compatibility)`
7. dynamic-nft-listener-manager.ts
   - `REFRESH_INTERVAL` we dont need to refresh, we need always listening to contracts, lets change a bit this system i want
     this system to auto refresh only at error handling(how many contracts we can listen at the same time?)

In this logs we can see that we have script pined inside of NFT and separated from its, so the main problem we get same script from two different places
``"nftScriptPairs": [
{
"nft": {
"address": "0x9991Ef85B711Bc91B3ABbe62bD4eD10394C399BA",
"image": "https://bafybeieotaukmh76okpjf4m636nmbcdmbdks5ged46jnxhpvidpne
gxpri.ipfs.w3s.link/logo-discord%20(2).svg",
"metadata": {
"name": "NFT #1",
"description": "Owned NFT from Sepolia Testnet",
"attributes": [
{
"trait_type": "Network",
"value": "Sepolia Testnet"
},
{
"trait_type": "Count",
"value": 1
},
{
"trait_type": "Contract",
"value": "0x9991Ef..."
}
]
},
"timestamp": 1759913425185
},
"script": {
"id": 2,
"name": "Twitter Auto Commenter",
"description": "Automated Twitter tweet commenting script with customiza
ble templates",
"version": "2.0.0",
"category": "twitter-automation",
"features": [],
"usage": {},
"security": {},
"entryPoint": "index.js",
"path": "twitter-commenter",
"code": "/**\r\n \* Twitter GM C... (25929 chars)",
"content": "/**\r\n _ Twitter GM C... (25929 chars)"
},
"maxProfiles": 5,
"nftInfo": {
"count": 1,
"hasNFT": true,
"verifiedAt": "2025-10-07T10:16:02.035Z",
"networkName": "Sepolia Testnet",
"contractAddress": "0x9991Ef85B711Bc91B3ABbe62bD4eD10394C399BA"
}
}
],
"scripts": [
{
"id": 2,
"name": "Twitter Auto Commenter",
"description": "Automated Twitter tweet commenting script with customizabl
e templates",
"version": "2.0.0",
"category": "twitter-automation",
"features": [],
"usage": {},
"security": {},
"entryPoint": "index.js",
"path": "twitter-commenter",
"code": "/\*\*\r\n _ Twitter GM C... (25929 chars)",
"content": "/**\r\n \* Twitter GM C... (25929 chars)"
},
{
"id": 1,
"name": "Twitter Monitor",
"description": "Real-time Twitter monitoring script that detects new tweet
s and sends them to Telegram",
"version": "1.0.0",
"category": "twitter-monitoring",
"features": [],
"usage": {},
"security": {},
"entryPoint": "index.js",
"path": "twitter-monitor",
"code": "/**\r\n _ Twitter Moni... (21963 chars)",
"content": "/\*\*\r\n _ Twitter Moni... (21963 chars)"
}
],
"script": {
"id": 2,
"name": "Twitter Auto Commenter",
"description": "Automated Twitter tweet commenting script with customizable
templates",
"version": "2.0.0",
"category": "twitter-automation",
"features": [],
"usage": {},
"security": {},
"entryPoint": "index.js",
"path": "twitter-commenter",
"code": "/**\r\n \* Twitter GM C... (25929 chars)",
"content": "/**\r\n \* Twitter GM C... (25929 chars)"
},
"nft": {
"address": "0x9991Ef85B711Bc91B3ABbe62bD4eD10394C399BA",
"image": "https://bafybeieotaukmh76okpjf4m636nmbcdmbdks5ged46jnxhpvidpnegxpr
i.ipfs.w3s.link/logo-discord%20(2).svg",
"metadata": {
"name": "NFT #1",
"description": "Owned NFT from Sepolia Testnet",
"attributes": [
{
"trait_type": "Network",
"value": "Sepolia Testnet"
},
{
"trait_type": "Count",
"value": 1
},
{
"trait_type": "Contract",
"value": "0x9991Ef..."
}
]
},
"timestamp": 1759913425185
},
"subscription": {
"level": "nft_holder",
"maxProfiles": 5,
"ownedNFTs": [
{
"count": 1,
"hasNFT": true,
"verifiedAt": "2025-10-07T10:16:02.035Z",
"networkName": "Sepolia Testnet",
"contractAddress": "0x9991Ef85B711Bc91B3ABbe62bD4eD10394C399BA"
}
],
"accessibleScripts": [
"twitter-commenter",
"twitter-monitor"
],
"nftCount": 1,
"scriptCount": 2
},
"type": "user_scripts"
}
==================================================

- Nonce: 1
- Script data present:
  - Script name: Twitter Auto Commenter
  - Script version: 2.0.0
  - Script features: []
  - Has code: true
  - Code length: 25929
  - Code preview: /\*\*

* Twitter GM C...
  ЁЯУЬ Forwarding script to React component
  ==================================================
  ЁЯУ▒ Session data updated from frontend
  ЁЯУЮ Server callback received: verify_connection

- # Nonce: 2
  ЁЯУЮ Server callback received: verify_connection
- # Nonce: 3

  ``

  first need to check at backend how its packed there and why we got same script twice pinned with nft and not, also we get second script and its good, i want to change a bit logic inside of ping handling so when we get call will be`if(data?) { if(data.nft?){ if(data.nft.script?) { here we process actual logic with nft+script for our frontend} else{here we process just NFT and check for maximumProfiles, if it more than we have, increase maximum}if(data.script?){process logic for only script and put it to the frontend with pair of created by me image}}else(for situations where we get only nonce and simple ping to check connection process simple logic to update timer)}`

Its look like we use 2 methods to pack script with nft at backend, i just cant understand what we really pack,

Can we do more than 10 listeners at frontend?
