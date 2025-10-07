# 📚 Script Upload System - Complete Summary

## 🎯 What Was Done

### 1. Created Upload CLI Tool

**File:** [upload-script.js](./upload-script.js)

A powerful command-line utility to upload automation scripts to the backend database.

**Key Features:**

- ✅ Upload scripts from folder (auto-reads script.json + index.js)
- ✅ Upload with explicit file paths
- ✅ NFT address configuration via CLI (`--nft`)
- ✅ Public/Private script control (`--public`)
- ✅ Category override (`--category`)
- ✅ Update existing scripts (`--update`)
- ✅ Validation (required fields, NFT address format)
- ✅ Beautiful colored console output
- ✅ Detailed error messages

### 2. Simplified script.json Format

**File:** [backend/scripts/twitter-gm-commenter/script.json](./backend/scripts/twitter-gm-commenter/script.json)

Removed unnecessary fields that weren't used by the system:

- ❌ Removed: `requirements`, `config`, `security`, `usage`, `examples`, `error_handling`, `changelog`
- ✅ Kept: `id`, `name`, `version`, `nft_addresses`, `category`, `description`, `features`, `author`, `entry_point`

### 3. Created Documentation

- **[SCRIPT_UPLOAD_GUIDE.md](./SCRIPT_UPLOAD_GUIDE.md)** - Complete user guide for uploading scripts
- **[SCRIPT_JSON_TEMPLATE.md](./SCRIPT_JSON_TEMPLATE.md)** - Field reference and templates
- **[SCRIPT_SYSTEM_SUMMARY.md](./SCRIPT_SYSTEM_SUMMARY.md)** - This file

---

## 📋 Quick Start

### Upload a Public Script (Free for All Users)

```bash
node upload-script.js ./backend/scripts/twitter-gm-commenter --public
```

### Upload an NFT-Gated Script

```bash
# Single NFT collection
node upload-script.js ./backend/scripts/premium-bot --nft 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb

# Multiple NFT collections (comma-separated)
node upload-script.js ./backend/scripts/vip-bot --nft 0x742d...bEb,0x1234...5678,0xabcd...efgh
```

### Update an Existing Script

```bash
node upload-script.js ./backend/scripts/twitter-gm-commenter --update
```

---

## 🏗️ System Architecture

### Upload Flow

```
┌─────────────────┐
│  script.json    │  ← Script metadata
│  index.js       │  ← Script code
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  upload-script.js       │  ← CLI Tool
│  - Reads files          │
│  - Validates data       │
│  - Applies CLI flags    │
│  - Builds API payload   │
└────────┬────────────────┘
         │
         ▼ HTTP POST/PUT
┌─────────────────────────┐
│  Backend API            │  ← Next.js
│  /api/admin/scripts/add │
│  - Validates admin IP   │
│  - Validates NFT format │
│  - Saves to database    │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  PostgreSQL Database    │
│  scripts_library table  │
│  - script_id (unique)   │
│  - script_content       │
│  - nft_addresses        │
│  - metadata (JSONB)     │
└─────────────────────────┘
```

### Access Control Flow

```
┌──────────────┐
│ User Wallet  │
│ 0x1234...    │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│ NFT Verification     │  ← Backend checks blockchain
│ - Query NFT balance  │
│ - Cache for 30 days  │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Script Access Determination  │
│ - Public scripts: Always     │
│ - NFT scripts: If owns NFT   │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────┐
│ Deliver Script       │  ← Send to Electron
│ - Encrypted code     │
│ - Via WebSocket      │
└──────────────────────┘
```

---

## 🔑 NFT Address Configuration

### Priority Order

When determining NFT addresses, the system uses this priority:

1. **`--public` CLI flag** → Forces empty array `[]` (public script)
2. **`--nft` CLI flag** → Uses addresses from command line
3. **`nft_addresses` in script.json** → Uses addresses from file
4. **Default** → Empty array `[]` (public script)

### Examples

```bash
# Override script.json - make it public
node upload-script.js ./script-folder --public

# Override script.json - make it NFT-gated
node upload-script.js ./script-folder --nft 0x742d35...bEb

# Use nft_addresses from script.json
node upload-script.js ./script-folder
```

---

## 📁 Minimal script.json Template

```json
{
  "id": "my-script-id",
  "name": "My Script Name",
  "version": "1.0.0",
  "nft_addresses": []
}
```

## 📁 Recommended script.json Template

```json
{
  "id": "twitter-automation-script",
  "name": "Twitter Automation Script",
  "description": "Brief description of what this script does",
  "version": "1.0.0",
  "author": "Your Name",
  "category": "twitter-automation",
  "nft_addresses": [],
  "features": [
    "Feature 1: Auto-commenting",
    "Feature 2: Smart scheduling",
    "Feature 3: Analytics tracking"
  ],
  "entry_point": "index.js"
}
```

---

## 🎨 Field Reference

### Required Fields (Backend Database)

| Field     | Type     | Description       | Example                  |
| --------- | -------- | ----------------- | ------------------------ |
| `id`      | `string` | Unique identifier | `"twitter-gm-commenter"` |
| `name`    | `string` | Display name      | `"Twitter GM Commenter"` |
| `version` | `string` | Semver version    | `"1.0.0"`                |

### Important Fields

| Field           | Type       | Description               | Default | Example                  |
| --------------- | ---------- | ------------------------- | ------- | ------------------------ |
| `nft_addresses` | `string[]` | NFT gate (empty = public) | `[]`    | `["0x742d..."]`          |
| `category`      | `string`   | Script category           | `null`  | `"twitter-automation"`   |
| `description`   | `string`   | User-facing description   | `""`    | `"Auto tweet commenter"` |

### Optional Fields (Metadata)

| Field         | Type       | Description                    |
| ------------- | ---------- | ------------------------------ |
| `author`      | `string`   | Creator name                   |
| `features`    | `string[]` | Feature list for UI            |
| `entry_point` | `string`   | Main file name (documentation) |
| `tags`        | `string[]` | Search tags (future use)       |

---

## 🚀 CLI Command Reference

### Basic Usage

```bash
# Upload from folder
node upload-script.js <path-to-script-folder>

# Upload with explicit files
node upload-script.js --json <path> --code <path>
```

### Access Control

```bash
# Public script (free for all users)
node upload-script.js ./script --public

# NFT-gated (single collection)
node upload-script.js ./script --nft 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb

# NFT-gated (multiple collections)
node upload-script.js ./script --nft 0xAddr1...,0xAddr2...,0xAddr3...
```

### Customization

```bash
# Override category
node upload-script.js ./script --category premium-bots

# Update existing script
node upload-script.js ./script --update

# Combine flags
node upload-script.js ./script --public --category free-tier --update
```

### Help & Info

```bash
# Show help
node upload-script.js --help

# Environment variables
API_HOST=192.168.1.100 API_PORT=3000 node upload-script.js ./script
```

---

## ✅ Validation Rules

The upload tool validates:

1. **Required fields present**: `id`, `name`, `version`
2. **NFT address format**: Must be valid Ethereum addresses `0x[40 hex chars]`
3. **Valid JSON**: script.json must be parsable
4. **Code file exists**: index.js must be readable
5. **Admin IP**: Request must come from whitelisted IP

---

## 🔐 Security Notes

### Admin IP Whitelist

Backend only accepts requests from IPs in `ADMIN_IPS` environment variable.

**Configure in backend/.env:**

```env
ADMIN_IPS=127.0.0.1,::1,localhost,YOUR_IP_HERE
```

### NFT Address Validation

- Must be valid Ethereum address format: `0x` + 40 hexadecimal characters
- Example valid: `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`
- Example invalid: `0x742d`, `742d35Cc...`, `0xGGGG...`

---

## 📊 Database Schema

### scripts_library Table

```sql
CREATE TABLE scripts_library (
  id SERIAL PRIMARY KEY,
  script_id VARCHAR(255) NOT NULL UNIQUE,  -- From script.json "id"
  name VARCHAR(255) NOT NULL,              -- From script.json "name"
  description TEXT,                        -- From script.json "description"
  version VARCHAR(50) NOT NULL,            -- From script.json "version"
  script_content TEXT NOT NULL,            -- From index.js file
  nft_addresses TEXT[] NOT NULL DEFAULT '{}', -- From script.json or CLI
  category VARCHAR(100),                   -- From script.json or CLI
  config JSONB,                            -- Optional config
  metadata JSONB,                          -- Collected metadata
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### metadata JSONB Example

```json
{
  "author": "Twitter Automation Platform",
  "tags": ["twitter", "automation", "gm"],
  "features": ["Auto-commenting", "Smart delays", "Stealth mode"],
  "entry_point": "index.js"
}
```

---

## 🎯 Common Use Cases

### 1. Create Public Free-Tier Script

```bash
# Step 1: Create script files
mkdir -p backend/scripts/free-twitter-bot
cd backend/scripts/free-twitter-bot

# Step 2: Create script.json
cat > script.json << 'EOF'
{
  "id": "free-twitter-bot",
  "name": "Free Twitter Bot",
  "description": "Basic Twitter automation for all users",
  "version": "1.0.0",
  "author": "My Name",
  "category": "free-tier",
  "nft_addresses": [],
  "features": ["Auto-like", "Follow users"]
}
EOF

# Step 3: Create index.js with your code
# ... write your puppeteer script ...

# Step 4: Upload to server
cd ../../../  # Back to project root
node upload-script.js ./backend/scripts/free-twitter-bot --public
```

### 2. Create NFT-Gated Premium Script

```bash
# Step 1: Create script files (same as above)
mkdir -p backend/scripts/premium-twitter-bot

# Step 2: Create script.json (with or without nft_addresses)
cat > backend/scripts/premium-twitter-bot/script.json << 'EOF'
{
  "id": "premium-twitter-bot",
  "name": "Premium Twitter Bot",
  "version": "1.0.0",
  "nft_addresses": []
}
EOF

# Step 3: Upload with NFT gating via CLI
node upload-script.js ./backend/scripts/premium-twitter-bot \
  --nft 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb \
  --category premium
```

### 3. Update Existing Script

```bash
# Step 1: Modify code or script.json
# ... make your changes ...

# Step 2: Bump version in script.json
# "version": "1.0.0" → "1.1.0"

# Step 3: Upload with --update flag
node upload-script.js ./backend/scripts/my-script --update
```

### 4. Migrate Script from NFT-Gated to Public

```bash
# Use --public flag to override nft_addresses in script.json
node upload-script.js ./backend/scripts/my-script --public --update
```

---

## 🐛 Troubleshooting

### Error: "Network error: connect ECONNREFUSED"

**Problem:** Backend server is not running

**Solution:**

```bash
cd backend
npm run dev
```

### Error: "This endpoint is restricted to admin IPs"

**Problem:** Your IP is not in ADMIN_IPS whitelist

**Solution:** Add your IP to `backend/.env`:

```env
ADMIN_IPS=127.0.0.1,::1,localhost,YOUR_IP_HERE
```

### Error: "Script with ID xxx already exists"

**Problem:** Script already in database

**Solution:** Use `--update` flag:

```bash
node upload-script.js ./script --update
```

### Error: "Invalid NFT address format"

**Problem:** NFT address doesn't match Ethereum format

**Solution:** Use full 42-character address:

```bash
# ❌ Wrong
--nft 0x742d

# ✅ Correct
--nft 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

---

## 📚 Related Documentation

- [SCRIPT_UPLOAD_GUIDE.md](./SCRIPT_UPLOAD_GUIDE.md) - Detailed upload guide
- [SCRIPT_JSON_TEMPLATE.md](./SCRIPT_JSON_TEMPLATE.md) - Complete field reference
- [backend/DATABASE_SETUP.md](./backend/DATABASE_SETUP.md) - Database setup
- [backend/SCRIPT_API_GUIDE.md](./backend/SCRIPT_API_GUIDE.md) - API documentation

---

## 🎉 Summary

You now have a complete script upload system that:

✅ **Simplifies** script structure (removed unused fields)
✅ **Validates** all inputs (NFT addresses, required fields)
✅ **Flexible** NFT configuration (CLI overrides, public/private)
✅ **User-friendly** CLI with colored output and help
✅ **Well-documented** with templates and guides
✅ **Production-ready** with security checks and error handling

**Next steps:**

1. Start backend server: `cd backend && npm run dev`
2. Upload your first script: `node upload-script.js ./backend/scripts/twitter-gm-commenter --public`
3. Check in database: Scripts should appear in `scripts_library` table
4. Test on frontend: Script should be delivered to Electron app via WebSocket

Happy scripting! 🚀
