# insitu.company Chrome Extension

Real-time campaign nomenclature and budget validation for ad platforms.

## Installation

### Development Mode

1. Clone the repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (top right toggle)
4. Click "Load unpacked"
5. Select the `/extension` folder
6. Extension should appear in your toolbar

### Users (Coming Soon)

Will be available on Chrome Web Store:
- [insitu.company - Campaign Validator](https://chrome.google.com/webstore)

## Features

✅ **Real-time Validation**
- Validates campaign names as you type
- Checks budget against limits
- Instant visual feedback (green ✓ / red ✗)

✅ **Multi-Platform Support**
- Meta Ads (Facebook/Instagram)
- Google Ads
- TikTok Ads (coming)
- Pinterest Ads (coming)
- LinkedIn Ads (coming)
- And 8+ more platforms

✅ **Naming Convention**
- Validates: `PAÍS_CANAL_OBJETIVO_PRODUCTO_AÑO`
- Example: `EC_FB_CONV_Test_2026`
- Real-time error messages

✅ **Budget Tracking**
- Monitors spend vs. limit
- Color-coded alerts (green/yellow/red)
- Auto-flags overbudget campaigns

## How It Works

### Extension → Dashboard Communication

The extension communicates with the insitu.company dashboard:

1. **Detection**: When extension is installed, dashboard shows "✅ Extension Installed"
2. **Validation**: Real-time feedback on Meta Ads Manager or Google Ads
3. **Sync**: Campaign data flows back to dashboard
4. **Alerts**: Budget overages trigger automatic notifications

### Files

- `manifest.json` - Extension configuration
- `content-bridge.js` - Bridges extension ↔ webpage
- `meta-validator.js` - Meta Ads Manager integration
- `google-validator.js` - Google Ads integration
- `background.js` - Service worker for lifecycle
- `popup.html` - Popup UI
- `popup.js` - Popup logic

## Usage

### In Campaign Creation (Meta Ads Manager)

```
When creating a campaign:
1. Type campaign name: "EC_FB_CONV_Test_2026"
2. Extension validates in real-time
3. Green border ✓ = Valid
4. Red border ✗ + tooltip = Invalid (shows error)
```

### In insitu.company Dashboard

```
1. Go to /campaigns
2. See "✅ Extension Installed" at top
3. Click "Test" to validate sample campaign
4. Go to Meta/Google Ads with extension active
5. See real-time validation on campaign fields
```

## Validation Rules

### Nomenclature Format: `PAÍS_CANAL_OBJETIVO_PRODUCTO_AÑO`

**PAÍS** (2 letters):
- `EC` Ecuador
- `CO` Colombia
- `PE` Peru
- `MX` Mexico
- etc.

**CANAL** (2+ letters):
- `FB` Facebook
- `IG` Instagram
- `GO` Google Ads
- `TT` TikTok
- `PI` Pinterest
- `LI` LinkedIn
- `SC` Snapchat
- `X` Twitter
- `AM` Amazon
- etc.

**OBJETIVO** (3+ letters):
- `CONV` Conversions
- `LEAD` Leads
- `TRAF` Traffic
- `AW` Awareness
- `RETG` Retargeting
- etc.

**PRODUCTO** (3+ chars):
- Can include letters, numbers, hyphens
- Examples: `Test`, `Premium`, `Summer2026`

**AÑO** (4 digits):
- 2026, 2027, etc.

### Examples

✅ **Valid**
- `EC_FB_CONV_Test_2026`
- `CO_GO_LEAD_ProductoX_2026`
- `PE_PI_TRAF_Summer-Sale_2026`

❌ **Invalid**
- `EC FB CONV Test 2026` (spaces instead of underscores)
- `EC_FB_CONV_Test` (missing year)
- `Ecuador_FB_CONV_Test_2026` (country should be 2 letters)

## Development

### Running Tests

```bash
# Test in Chrome
1. Open chrome://extensions
2. Go to Meta Ads Manager or Google Ads
3. Check for real-time validation
```

### Building for Production

```bash
# Package for Chrome Web Store
zip -r insitu-extension.zip extension/ -x "*.git*"
```

## Troubleshooting

**Extension not showing in dashboard?**
- Reload extension: chrome://extensions → click reload icon
- Hard refresh dashboard: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

**Validation not working on Meta Ads?**
- Check if you're on the right page (facebook.com/ads/manager)
- Check Extension console: Right-click → Inspect → Console tab
- Look for: "[insitu.company] Extension is active"

**Campaign name field not detected?**
- Meta Ads uses dynamic IDs - extension searches by placeholder
- If placeholder changed, update selector in `meta-validator.js`

## Support

- Issues: [GitHub Issues](https://github.com/quiciopuerta/insitu-police-ads-)
- Docs: [insitu.company](https://github.com/quiciopuerta/insitu-police-ads-)

## License

© 2026 insitu.company. All rights reserved.
