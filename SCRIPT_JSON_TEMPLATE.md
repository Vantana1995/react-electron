# 📋 script.json Template & Field Reference

## Minimal Required Template

This is the **absolute minimum** required for a script to work:

```json
{
  "id": "my-script-id",
  "name": "My Script Name",
  "version": "1.0.0",
  "nft_addresses": []
}
```

## Recommended Template

This is the recommended template with all commonly used fields:

```json
{
  "id": "twitter-automation-script",
  "name": "Twitter Automation Script",
  "description": "Brief description of what this script does",
  "version": "1.0.0",
  "author": "Your Name",
  "category": "twitter-automation",
  "nft_addresses": [],
  "features": ["Feature 1", "Feature 2", "Feature 3"],
  "entry_point": "index.js"
}
```

---

## Field Reference

### ✅ REQUIRED FIELDS (Database)

These fields are **required** by the backend database:

| Field     | Type     | Description                                                | Example                       |
| --------- | -------- | ---------------------------------------------------------- | ----------------------------- |
| `id`      | `string` | Unique script identifier (used in database as `script_id`) | `"twitter-gm-commenter"`      |
| `name`    | `string` | Human-readable script name                                 | `"Twitter GM Auto Commenter"` |
| `version` | `string` | Semantic version number                                    | `"1.0.0"`                     |

### 🔑 IMPORTANT FIELDS

These fields control access and categorization:

| Field           | Type       | Description                                      | Default | Example                        |
| --------------- | ---------- | ------------------------------------------------ | ------- | ------------------------------ |
| `nft_addresses` | `string[]` | Array of NFT contract addresses (empty = public) | `[]`    | `["0x742d35...bEb"]`           |
| `category`      | `string`   | Script category for organization                 | `null`  | `"twitter-automation"`         |
| `description`   | `string`   | Detailed script description                      | `""`    | `"Automated tweet commenting"` |

### 📝 OPTIONAL FIELDS (Metadata)

These fields are stored in the `metadata` JSONB column:

| Field         | Type       | Description                  | Used By       | Example                            |
| ------------- | ---------- | ---------------------------- | ------------- | ---------------------------------- |
| `author`      | `string`   | Script creator name          | Documentation | `"Twitter Platform"`               |
| `features`    | `string[]` | List of script features      | UI Display    | `["Auto comment", "Stealth mode"]` |
| `entry_point` | `string`   | Main script file name        | Documentation | `"index.js"`                       |
| `tags`        | `string[]` | Tags for searching/filtering | Future search | `["twitter", "automation"]`        |

---

## NFT Address Configuration

### Public Script (Free for All Users)

```json
{
  "id": "public-script",
  "name": "Public Script",
  "version": "1.0.0",
  "nft_addresses": []
}
```

**Result**: Accessible by ALL users (free tier + NFT holders)

### NFT-Gated Script (Single NFT Collection)

```json
{
  "id": "premium-script",
  "name": "Premium Script",
  "version": "1.0.0",
  "nft_addresses": ["0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"]
}
```

**Result**: Only accessible by users who own NFTs from this collection

### NFT-Gated Script (Multiple NFT Collections)

```json
{
  "id": "multi-access-script",
  "name": "Multi-Access Script",
  "version": "1.0.0",
  "nft_addresses": [
    "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "0x1234567890123456789012345678901234567890",
    "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
  ]
}
```

**Result**: Accessible by users who own NFTs from ANY of these collections

---

## Upload Script CLI Override

The `upload-script.js` CLI tool allows you to **override** script.json fields:

### Override NFT Addresses via CLI

```bash
# Make script public (override script.json)
node upload-script.js ./script-folder --public

# Add NFT gating (override script.json)
node upload-script.js ./script-folder --nft 0x742d35...bEb

# Multiple NFTs
node upload-script.js ./script-folder --nft 0x742d...bEb,0x1234...5678
```

### Override Category via CLI

```bash
# Override category from script.json
node upload-script.js ./script-folder --category premium-automation
```

### Priority Order

When determining final values, the system uses this priority:

**NFT Addresses:**

1. `--public` flag (CLI) → Empty array `[]`
2. `--nft` flag (CLI) → Use CLI addresses
3. `nft_addresses` field (script.json) → Use JSON addresses
4. Default → Empty array `[]` (public)

**Category:**

1. `--category` flag (CLI) → Use CLI category
2. `category` field (script.json) → Use JSON category
3. Default → `null`

---

## Database Storage

### scripts_library Table Columns

| Column           | Type           | Source                      | Example                             |
| ---------------- | -------------- | --------------------------- | ----------------------------------- |
| `id`             | `SERIAL`       | Auto-generated              | `1`                                 |
| `script_id`      | `VARCHAR(255)` | script.json `id`            | `"twitter-commenter"`            |
| `name`           | `VARCHAR(255)` | script.json `name`          | `"Twitter  Commenter"`            |
| `description`    | `TEXT`         | script.json `description`   | `"Auto comment script"`             |
| `version`        | `VARCHAR(50)`  | script.json `version`       | `"1.0.0"`                           |
| `script_content` | `TEXT`         | index.js file content       | `"const puppeteer = require..."`    |
| `nft_addresses`  | `TEXT[]`       | script.json `nft_addresses` | `{0x742d...}`                       |
| `category`       | `VARCHAR(100)` | script.json `category`      | `"twitter"`                         |
| `config`         | `JSONB`        | script.json `config`        | `{}`                                |
| `metadata`       | `JSONB`        | Collected from script.json  | `{"author":"...","features":[...]}` |
| `is_active`      | `BOOLEAN`      | Auto-set                    | `true`                              |
| `created_at`     | `TIMESTAMP`    | Auto-set                    | `2025-10-06 12:00:00`               |
| `updated_at`     | `TIMESTAMP`    | Auto-set                    | `2025-10-06 12:00:00`               |

### metadata JSONB Structure

```json
{
  "author": "Author Name",
  "tags": ["tag1", "tag2"],
  "features": ["Feature 1", "Feature 2"],
  "entry_point": "index.js"
}
```

---

## Frontend Usage

### What Frontend Receives

When a script is sent to the Electron frontend, it receives:

```typescript
interface ScriptData {
  id: string; // From script_id
  name: string; // From name
  code?: string; // From script_content (or "content")
  content?: string; // From script_content (or "code")
  version: string; // From version
  features: string[]; // From metadata.features
  metadata?: {
    description?: string;
    author?: string;
  };
}
```

### What Frontend Uses

The Electron app only uses:

- ✅ `code/content` - The actual script code to execute
- ✅ `name` - For display in UI
- ✅ `id` - For tracking execution

---

## Examples

### Example 1: Public Twitter Bot

```json
{
  "id": "twitter-public-bot",
  "name": "Twitter Public Bot",
  "description": "Basic Twitter automation for all users",
  "version": "1.0.0",
  "author": "Twitter Platform",
  "category": "twitter-automation",
  "nft_addresses": [],
  "features": ["Auto-like tweets", "Follow users", "Basic engagement"],
  "entry_point": "index.js"
}
```

**Upload:**

```bash
node upload-script.js ./scripts/twitter-public-bot
```

---

### Example 2: NFT-Gated Premium Bot

```json
{
  "id": "twitter-premium-bot",
  "name": "Twitter Premium Bot",
  "description": "Advanced Twitter automation for NFT holders",
  "version": "1.0.0",
  "author": "Twitter Platform",
  "category": "premium-automation",
  "nft_addresses": ["0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"],
  "features": [
    "Advanced engagement strategies",
    "Multi-account support",
    "AI-powered responses",
    "Analytics dashboard"
  ],
  "entry_point": "index.js"
}
```

**Upload:**

```bash
# Use NFT addresses from script.json
node upload-script.js ./scripts/twitter-premium-bot

# Or override with CLI
node upload-script.js ./scripts/twitter-premium-bot --nft 0xNewAddress...
```

---

### Example 3: Minimal Working Script

**script.json:**

```json
{
  "id": "minimal-script",
  "name": "Minimal Script",
  "version": "1.0.0"
}
```

**Upload:**

```bash
# Will be public by default (nft_addresses: [])
node upload-script.js ./scripts/minimal-script

# Make it NFT-gated via CLI
node upload-script.js ./scripts/minimal-script --nft 0x742d35...bEb
```

---

## Best Practices

1. **Use semantic versioning**: `"version": "1.0.0"`, `"1.1.0"`, `"2.0.0"`
2. **Unique script IDs**: Use kebab-case: `"twitter-gm-commenter"`
3. **Clear descriptions**: Help users understand what the script does
4. **List features**: Makes it easier for users to see capabilities
5. **Valid NFT addresses**: Always use full 42-character Ethereum addresses
6. **Keep it simple**: Only include fields you actually need

---

## Validation Rules

The upload script validates:

1. ✅ **Required fields present**: `id`, `name`, `version`
2. ✅ **NFT address format**: Must match `^0x[a-fA-F0-9]{40}$`
3. ✅ **Valid JSON**: script.json must be parsable
4. ✅ **Code file exists**: index.js must be readable

---

## Quick Reference Card

```
REQUIRED:
  id, name, version

IMPORTANT:
  nft_addresses (empty array = public)
  category (for organization)
  description (for users)

OPTIONAL:
  author, features, entry_point, tags

NOT USED:
  requirements, config, security, usage,
  examples, error_handling, changelog

CLI OVERRIDES:
  --public         → Make script public
  --nft ADDRESS    → Set NFT gating
  --category NAME  → Set category
  --update         → Update existing script
```

---

## Need Help?

- Check existing scripts in `backend/scripts/` for examples
- Use `node upload-script.js --help` for CLI options
- See [SCRIPT_UPLOAD_GUIDE.md](./SCRIPT_UPLOAD_GUIDE.md) for upload instructions