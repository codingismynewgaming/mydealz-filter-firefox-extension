# myDealz Filter Extension - Project Summary

## Overview
A Firefox extension that allows users to filter postings on mydealz.de by keywords in the title. Postings containing specified keywords are hidden from view, and a badge shows how many postings have been filtered out.

## Features

### Core Functionality
- Filter deal postings by keywords in the title
- Simple popup interface to enter filter terms
- Badge counter showing number of hidden postings (green color)
- Real-time filtering as new content loads
- Reset counter on page reload

### Advanced Features
- Shows hidden deals with clickable links when clicking the extension icon
- Displays which filter term caused each deal to be hidden
- Respects user's dark/light mode preference
- Includes donate buttons for Buy Me a Coffee and PayPal

### Technical Improvements
- Fixed content disappearing issue by optimizing mutation observers
- Added proper error handling throughout the codebase
- Implemented efficient batch DOM operations
- Added debouncing to prevent excessive filtering operations

## Files Structure

- `manifest.json` - Extension metadata and permissions
- `src/content-script.js` - Main filtering logic that runs on mydealz.de pages
- `src/popup.html` - Interface for entering filter terms and viewing hidden deals
- `src/popup.css` - Styling for the popup interface with dark/light mode support
- `src/popup.js` - Logic for the popup interface
- `src/background.js` - Handles badge updates and message routing
- `icons/` - Extension icon files
- `README.md` - General information about the extension
- `LICENSE` - MIT License
- `test-page.html` - Test page to validate functionality
- `DEVELOPMENT.md` - Development guidelines
- `CHANGELOG.md` - Change history
- `SETUP.md` - Setup instructions
- `PROJECT_SUMMARY.md` - This file

### How Filtering Works

1. The content script runs when visiting mydealz.de
2. It identifies deal postings using various selectors optimized for mydealz.de structure
3. It extracts titles from the postings
4. It compares titles against the filter terms (case-insensitive)
5. Matching postings are hidden by setting `display: none`
6. A mutation observer detects new content and reapplies filters
7. The background script updates the badge counter with green color
8. When clicking the icon, hidden deals are shown with links and filter terms

## Privacy and Data Handling

This extension:
- Does NOT collect or transmit any personal data
- Does NOT send any information to external servers
- Stores filter terms locally in the browser's storage
- Only operates on the mydealz.de domain as specified in permissions
- Does NOT inject ads or modify web content beyond hiding filtered postings

## Compatibility

This extension is designed to work with:
- Firefox (with Manifest V3 support)
- May work with Chrome/Chromium browsers with minor adjustments

## Donation Options

Users can support the extension through:
- Buy Me a Coffee: https://buymeacoffee.com/codingiymynewgaming
- PayPal: https://www.paypal.com/donate/?hosted_button_id=ZXHJFTUW9NQK8

## Contact / Feedback / Issues / Feature Requests

For questions, feedback, bug reports, or feature requests:
- GitHub: [https://github.com/codingismynewgaming](https://github.com/codingismynewgaming)

## Release Information

Version: 1.0.0
Release Date: Wednesday, 11 February 2026

## License

MIT License - See LICENSE file for details.