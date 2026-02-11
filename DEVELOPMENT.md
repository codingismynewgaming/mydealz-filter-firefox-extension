# Development Guide for myDealz Filter Extension

This document provides detailed information about developing, testing, and preparing the myDealz Filter extension for submission to the Firefox Add-ons store.

## Project Structure

```
firefox-extension-mydealz-filter/
├── manifest.json          # Extension manifest (defines permissions, resources)
├── icons/                # Extension icons
│   ├── icon-48.png
│   └── icon-96.png
├── src/
│   ├── content-script.js  # Main filtering logic that runs on mydealz.de
│   ├── background.js      # Background service worker (handles badge updates)
│   ├── popup.html         # UI for configuring filter terms and viewing hidden deals
│   ├── popup.css          # Styling for popup UI with dark/light mode support
│   └── popup.js           # Logic for popup UI
├── README.md             # General information about the extension
├── LICENSE               # MIT License
├── test-page.html        # Test page to validate functionality
├── DEVELOPMENT.md        # This file
├── CHANGELOG.md          # Change history
├── SETUP.md              # Setup instructions
└── PROJECT_SUMMARY.md    # Project overview
```

## Firefox Add-ons Submission Requirements

### Functionality Requirements
- ✅ Self-contained: All code is included in the package, no remote code loading
- ✅ Clear purpose: The extension's function is clearly described
- ✅ Performance: Optimized to minimize impact on browser performance
- ✅ Functionality matches description: Does exactly what it claims to do

### Security Requirements
- ✅ Minimal permissions: Only requests storage and host permissions for mydealz.de
- ✅ No remote code: All code is local to the extension
- ✅ No obfuscated code: All code is readable and clear in purpose
- ✅ Secure data handling: Local storage only, no external transmission

### Content Requirements
- ✅ Clear naming: "myDealz Filter" clearly describes functionality
- ✅ Legal compliance: No copyrighted or trademark-infringing content
- ✅ Quality standards: Well-designed UI and functionality

### Data Collection Compliance
- ✅ No personal data collection: Extension only stores user-defined filter terms
- ✅ Local storage only: No data sent to external servers
- ✅ User control: Users fully control what data is stored (their filter terms)

## Key Features Implementation

### Filtering System
- Content script identifies deal postings using multiple selectors optimized for mydealz.de
- Title extraction with fallback methods for different page structures
- Case-insensitive keyword matching with efficient algorithms
- Real-time filtering with mutation observers for dynamic content

### Hidden Deals Tracking
- Content script tracks which deals were hidden and by which terms
- Background script manages hidden deals per tab
- Popup displays hidden deals with clickable links and filter terms

### UI/UX Features
- Tabbed popup interface with Settings and Hidden Posts tabs
- Dark/light mode support respecting system preferences
- Green badge counter for visual consistency
- Dynamic count in Hidden Posts tab showing number of hidden deals
- Responsive design for optimal popup experience

## Testing the Extension

### Manual Testing Steps
1. Load the extension in Firefox for temporary development:
   - Open `about:debugging`
   - Click "This Firefox"
   - Click "Load Temporary Add-on"
   - Select `manifest.json` from the project directory

2. Test filtering functionality:
   - Open the popup and enter filter terms (e.g., "Apple, iPhone")
   - Visit mydealz.de (or use test-page.html for local testing)
   - Verify that postings with matching terms are hidden
   - Check that the green badge shows the correct count of hidden items
   - Click the extension icon again to see hidden deals with links and filter terms

3. Test edge cases:
   - Empty filter terms (should show all postings)
   - Non-matching terms (should show all postings)
   - Dynamic content loading (scrolling, new content appearing)
   - Page reloads (counter should reset)

### Automated Testing
While not implemented in this version, automated tests could include:
- Unit tests for the filtering logic
- Integration tests for the popup interface
- End-to-end tests using tools like Selenium

## Building for Distribution

### Creating a Distributable Package
1. Ensure all development files are ready:
   - All code is committed and tested
   - Icons are in the correct format and size
   - Manifest is properly configured
   - README, SETUP, DEVELOPMENT, and PROJECT_SUMMARY are up to date

2. Create a ZIP archive of the extension:
   - Include all necessary files (everything except development-only files)
   - Do not include `.git` directory or other version control files
   - Name the file descriptively (e.g., `mydealz-filter-v1.0.0.zip`)

### Preparing for Firefox Add-ons Submission
1. Create an account on [addons.mozilla.org](https://addons.mozilla.org)
2. Prepare marketing materials:
   - Screenshots showing the extension in use
   - Detailed description of functionality
   - Privacy policy (included in README)
3. Submit the ZIP file through the developer hub
4. Respond promptly to reviewer feedback

## Code Quality Standards

### JavaScript Best Practices Used
- Proper error handling in asynchronous operations
- Efficient DOM manipulation techniques
- Performance optimization (batch operations, debouncing)
- Clear, documented code with comments where necessary
- Consistent formatting and naming conventions
- Modern ES6+ features where appropriate

### Security Measures Implemented
- Content Security Policy considerations (no eval or unsafe operations)
- Proper handling of user input (filter terms)
- Minimal permissions requested
- No external dependencies that could introduce vulnerabilities
- Safe DOM manipulation to prevent XSS

## Maintenance and Updates

### Versioning Strategy
- Follow semantic versioning (MAJOR.MINOR.PATCH)
- Increment major version for breaking changes
- Increment minor version for new features
- Increment patch for bug fixes

### Updating Process
1. Make changes to the codebase
2. Test thoroughly in development environment
3. Update version number in `manifest.json`
4. Update CHANGELOG.md with changes
5. Create new ZIP package
6. Submit update through Firefox Add-ons developer hub

## Troubleshooting Common Issues

### Extension Not Loading
- Check that manifest.json is valid JSON
- Verify all referenced files exist
- Look for errors in browser console

### Filtering Not Working
- Ensure the extension has permission for mydealz.de
- Check that filter terms are saved correctly
- Verify the content script is running on the page

### Hidden Deals Not Showing
- Make sure you're on mydealz.de with active filter terms
- Check that deals matching your terms exist on the page
- Verify the content script has properly identified and tracked hidden deals

### Badge Not Updating
- Check that background script has proper permissions
- Verify message passing between content script and background script

## Support the Project

If you find this extension useful, consider supporting the development:
- [Buy me a coffee](https://buymeacoffee.com/codingiymynewgaming)
- [Donate via PayPal](https://www.paypal.com/donate/?hosted_button_id=ZXHJFTUW9NQK8)

## Contact / Feedback / Issues / Feature Requests

For questions, feedback, bug reports, or feature requests:
- GitHub: [https://github.com/codingismynewgaming](https://github.com/codingismynewgaming)

## Release Information

Version: 1.0.0
Release Date: Wednesday, 11 February 2026

## License

MIT License - See LICENSE file for details.