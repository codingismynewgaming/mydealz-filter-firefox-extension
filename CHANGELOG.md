# Changelog

All notable changes to the myDealz Filter extension will be documented in this file.

## [1.0.0] - 2026-02-11

### Added
- Initial release of the myDealz Filter extension
- Basic functionality to filter postings by keywords in titles
- Tabbed popup interface with Settings and Hidden Posts tabs
- Green badge counter showing number of hidden postings
- Real-time filtering as new content loads
- Shows hidden deals with clickable links in the Hidden Posts tab
- Displays which filter term caused each deal to be hidden
- Respects user's dark/light mode preference
- Reset counter on page reload
- Compatible with Firefox (Manifest V3)
- Includes donate buttons for Buy Me a Coffee and PayPal
- Content script for identifying and hiding deal postings
- Background script for managing badge updates

### Changed
- Improved selectors for detecting deal postings on mydealz.de
- Enhanced title extraction to handle various mydealz.de structures
- Optimized filtering performance with batch DOM operations
- Implemented efficient mutation observer for dynamic content
- Added privacy-focused approach with local-only data storage
- Updated README with privacy and data handling information
- Created comprehensive documentation (README.md, SETUP.md, DEVELOPMENT.md, PROJECT_SUMMARY.md, CHANGELOG.md)
- Implemented tabbed interface for better UX

### Fixed
- Fixed content disappearing issue by optimizing mutation observers
- Fixed hidden deals not showing by updating popup initialization logic
- Fixed message handling between content script and popup
- Fixed potential memory leaks by properly cleaning up tab data
- Fixed race conditions in filter processing
- Fixed responsive design for tabbed interface