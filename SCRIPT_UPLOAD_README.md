# 🚀 Script Upload System - Quick Start

## TL;DR

Upload scripts to your Twitter Automation Platform in one command:

```bash
# Public script (free for everyone)
node upload-script.js ./backend/scripts/twitter-gm-commenter --public

# NFT-gated script (premium)
node upload-script.js ./backend/scripts/premium-bot --nft 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

---

## 📋 Prerequisites

1. **Backend server running:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Admin IP configured** in `backend/.env`:
   ```env
   ADMIN_IPS=127.0.0.1,::1,localhost
   ```

3. **Script structure:**
   ```
   your-script/
   ├── script.json   # Metadata
   └── index.js      # Code
   ```

---

## 🎯 Core Concepts

### Access Control

| Type | NFT Addresses | Who Can Access |
|------|---------------|----------------|
| **Public** | `[]` (empty) | Everyone (free + premium) |
| **NFT-Gated** | `["0x742d..."]` | Only NFT holders |
| **Multi-NFT** | `["0x742d...", "0x1234..."]` | Holders of ANY listed NFT |

### script.json - Minimal

```json
{
  "id": "my-script",
  "name": "My Script",
  "version": "1.0.0",
  "nft_addresses": []
}
```

### script.json - Recommended

```json
{
  "id": "twitter-bot",
  "name": "Twitter Bot",
  "description": "What it does",
  "version": "1.0.0",
  "author": "Your Name",
  "category": "twitter-automation",
  "nft_addresses": [],
  "features": ["Feature 1", "Feature 2"],
  "entry_point": "index.js"
}
```

---

## 📖 Common Commands

### Upload Public Script

```bash
node upload-script.js ./backend/scripts/my-script --public
```

### Upload NFT-Gated Script

```bash
# Single NFT collection
node upload-script.js ./backend/scripts/premium-script \
  --nft 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb

# Multiple NFT collections (comma-separated, no spaces)
node upload-script.js ./backend/scripts/vip-script \
  --nft 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb,0x1234567890123456789012345678901234567890
```

### Update Existing Script

```bash
# 1. Bump version in script.json
# "version": "1.0.0" → "1.1.0"

# 2. Upload with --update
node upload-script.js ./backend/scripts/my-script --update
```

### Override Category

```bash
node upload-script.js ./backend/scripts/my-script \
  --category premium-automation \
  --public
```

---

## 🎨 CLI Flags Reference

| Flag | Short | Description | Example |
|------|-------|-------------|---------|
| `--public` | `-p` | Make script public (free) | `--public` |
| `--nft <addr>` | `-n` | Set NFT gating | `--nft 0x742d...` |
| `--category <name>` | `--cat` | Set category | `--category premium` |
| `--update` | `-u` | Update existing | `--update` |
| `--json <path>` | `-j` | Custom JSON path | `--json ./custom.json` |
| `--code <path>` | `-c` | Custom code path | `--code ./script.js` |
| `--help` | `-h` | Show help | `--help` |

---

## ⚡ Quick Examples

### Example 1: Create Free-Tier Script

```bash
# 1. Create folder
mkdir backend/scripts/free-bot

# 2. Create script.json
cat > backend/scripts/free-bot/script.json << 'EOF'
{
  "id": "free-bot",
  "name": "Free Bot",
  "version": "1.0.0"
}
EOF

# 3. Write your code in index.js
# ...

# 4. Upload
node upload-script.js ./backend/scripts/free-bot --public
```

### Example 2: Create Premium NFT-Gated Script

```bash
# 1. Create folder
mkdir backend/scripts/premium-bot

# 2. Create minimal script.json (no nft_addresses needed)
cat > backend/scripts/premium-bot/script.json << 'EOF'
{
  "id": "premium-bot",
  "name": "Premium Bot",
  "version": "1.0.0"
}
EOF

# 3. Write your code in index.js
# ...

# 4. Upload with NFT gating via CLI
node upload-script.js ./backend/scripts/premium-bot \
  --nft 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb \
  --category premium
```

### Example 3: Update Script Version

```bash
# 1. Update script.json version
# "version": "1.0.0" → "1.1.0"

# 2. Modify code if needed
# ...

# 3. Upload update
node upload-script.js ./backend/scripts/my-bot --update
```

---

## 🔍 Validation

The upload tool automatically validates:

✅ Required fields (`id`, `name`, `version`)
✅ NFT address format (`0x` + 40 hex chars)
✅ Valid JSON syntax
✅ Code file exists
✅ Admin IP whitelist

---

## 🐛 Common Errors

| Error | Solution |
|-------|----------|
| `Network error: ECONNREFUSED` | Start backend: `cd backend && npm run dev` |
| `Restricted to admin IPs` | Add your IP to `backend/.env` ADMIN_IPS |
| `Script already exists` | Use `--update` flag |
| `Invalid NFT address format` | Use full 42-char address: `0x742d...` |

---

## 📚 Full Documentation

- [SCRIPT_SYSTEM_SUMMARY.md](./SCRIPT_SYSTEM_SUMMARY.md) - Complete system overview
- [SCRIPT_UPLOAD_GUIDE.md](./SCRIPT_UPLOAD_GUIDE.md) - Detailed upload guide
- [SCRIPT_JSON_TEMPLATE.md](./SCRIPT_JSON_TEMPLATE.md) - Field reference

---

## 🎯 Priority Order for NFT Addresses

When determining access control, the system uses this priority:

1. **`--public` flag** → `nft_addresses: []` (public)
2. **`--nft` flag** → CLI addresses
3. **`nft_addresses` in script.json** → JSON addresses
4. **Default** → `[]` (public)

```bash
# This makes script public even if script.json has NFT addresses
node upload-script.js ./script --public

# This overrides script.json nft_addresses with new address
node upload-script.js ./script --nft 0x742d...

# This uses nft_addresses from script.json
node upload-script.js ./script
```

---

## ✅ Success Output Example

```
============================================
🚀 Script Upload Utility
============================================

ℹ️  INFO: Reading script from folder: d:\Twitter app\backend\scripts\twitter-gm-commenter
ℹ️  INFO: Building API payload...
✅ SUCCESS: Payload validated successfully
ℹ️  INFO: --public flag detected: Script will be accessible to ALL users (free)

Script Summary:
  Script ID: twitter-gm-commenter
  Name: Twitter GM Auto Commenter
  Version: 2.0.0
  Category: twitter-automation
  Code Length: 15234 characters
  Access Type: PUBLIC (Free for all users)
  Action: CREATE

ℹ️  INFO: Sending POST request to http://localhost:3000/api/admin/scripts/add

============================================
API Response
============================================

✅ SUCCESS: Status: 200
✅ SUCCESS: Script uploaded successfully!

Script Details:
  ID: twitter-gm-commenter
  Name: Twitter GM Auto Commenter
  Version: 2.0.0
  Category: twitter-automation
  Active: Yes
  Access: Public (Free)

============================================
```

---

## 🚀 Next Steps

1. **Start backend**: `cd backend && npm run dev`
2. **Upload test script**: `node upload-script.js ./backend/scripts/twitter-gm-commenter --public`
3. **Verify in database**: Check `scripts_library` table
4. **Test delivery**: Scripts should reach Electron app via WebSocket

---

## 💡 Pro Tips

- Use `--public` for development/testing (easier access)
- Use semantic versioning: `1.0.0` → `1.1.0` → `2.0.0`
- Keep script IDs in kebab-case: `twitter-gm-commenter`
- Test scripts locally before uploading to production
- Always use `--update` when modifying existing scripts

---

## 🆘 Need Help?

```bash
# Show detailed help
node upload-script.js --help

# Check existing scripts
curl http://localhost:3000/api/admin/scripts/add

# View backend logs
cd backend
npm run dev  # Watch for errors in console
```

---

**That's it!** You're ready to upload scripts. 🎉
