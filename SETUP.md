# Setup Instructions for myDealz Filter Extension

Follow these steps to properly install and configure the myDealz Filter extension.

## Installation Methods

### Method 1: Install from Firefox Add-ons (Recommended)
1. Visit [addons.mozilla.org](https://addons.mozilla.org)
2. Search for "myDealz Filter"
3. Click "Add to Firefox"
4. Confirm installation when prompted

### Method 2: Manual Installation for Development
1. Download the extension files
2. Open Firefox and navigate to `about:debugging`
3. Click "This Firefox"
4. Click "Load Temporary Add-on"
5. Select the `manifest.json` file from the extension folder

## Initial Configuration

1. Once installed, click the extension icon in your toolbar
2. The popup will open with configuration options

## Setting Up Filter Terms

1. In the "Filter Terms" text area, enter keywords you want to hide
2. Separate multiple terms with commas (e.g., "iPhone, Apple, Samsung")
3. Click "Save Filters" to apply your settings
4. Navigate to mydealz.de to see filtered results

## Using Hidden Posts Tab

1. After setting up filter terms and visiting mydealz.de, some deals may be hidden
2. Click on the "Hidden Posts" tab in the extension popup to see a list of hidden deals
3. Each hidden deal shows:
   - The title as a clickable link to the original deal
   - Which filter term caused it to be hidden
4. The number in parentheses next to the "Hidden Posts" tab shows how many deals are currently hidden

## Understanding the Badge Counter

- The green badge on the extension icon shows how many postings have been hidden
- If the number is 0, no postings have been filtered
- The number updates in real-time as you browse

## Tips for Effective Filtering

- Use specific terms to avoid over-filtering
- Consider using singular and plural forms if needed (e.g., "iPhone, iPhones")
- Regularly review and update your filter terms
- Remember that filtering is case-insensitive
- The extension respects your system's dark/light mode preference

## Support the Project

If you find this extension useful, consider supporting its development:
- [Buy me a coffee](https://buymeacoffee.com/codingiymynewgaming)
- [Donate via PayPal](https://www.paypal.com/donate/?hosted_button_id=ZXHJFTUW9NQK8)

## Troubleshooting

### Content disappears after a few seconds
- This issue has been fixed in the latest version
- If experiencing this, try reloading the extension or updating to the latest version

### Filter terms not working
- Check that terms are saved correctly in the popup
- Ensure you're on mydealz.de domain (extension only works on this site)
- Verify terms don't have extra spaces or special characters

### Badge counter not updating
- Refresh the mydealz.de page
- Check that the extension has proper permissions

### Extension not activating on mydealz.de
- Verify the URL is exactly mydealz.de
- Check extension permissions in Firefox settings
- Ensure the extension is enabled

### Hidden deals section not showing
- Make sure you're on a mydealz.de page with deals
- Ensure you have active filter terms that match some deals
- The hidden deals will only appear when there are actually hidden deals on the current page

## Privacy Information

- Filter terms are stored locally in your browser
- No data is transmitted to external servers
- The extension only operates on mydealz.de domain
- No tracking or analytics are used
- Hidden deals information is only accessed when the popup is opened

## Contact / Feedback / Issues / Feature Requests

For questions, feedback, bug reports, or feature requests:
- GitHub: [https://github.com/codingismynewgaming](https://github.com/codingismynewgaming)

## Release Information

Version: 1.0.0
Release Date: Wednesday, 11 February 2026