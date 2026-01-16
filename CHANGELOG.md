# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.0]

### ✨ Added

#### **Authentication & Security**
- **Web UI Password Protection** - Optional password authentication with brute force protection (exponential backoff and IP lockout after 10 failed attempts)
- **API Authentication** - Torznab and qBittorrent APIs now require authentication when web UI auth is enabled (API key = UI password)

#### **Download History**
- **History Tracking** - Optional persistent download history with filtering and search

#### **Mobile Redesign**
- **New Home Dashboard** - Mobile-optimized widgets for quick overview
- **Bottom Navigation Bar** - Easy thumb-accessible navigation
- **Optimized Card Views** - Improved mobile layouts for all views
- **Mobile Table Features** - Sort and filter controls adapted for touch

#### **Bulk Actions**
- **Download Selection Mode** - Mass pause/resume, category assignment, and delete
- **Shared Files Selection** - Bulk ED2K link export

#### **Enhanced File Views**
- **Detailed Info Modals** - Rich information dialogs for downloads and shared files
- **Context Menus** - Right-click quick actions on downloads and shared files
- **Filter by Filename** - Text filter for downloads, uploads, shared files, and search results
- **Items-per-page Selector** - Configurable page sizes for all views
- **ED2K Link Export** - Export links from shared files

#### **System Monitoring**
- **Disk Space Indicator** - Real-time disk usage in footer
- **CPU Usage Indicator** - System CPU load in footer
- **Hostname Resolution** - Peer hostnames displayed in uploads view

#### **UI Enhancements**
- **Version Badge** - Automatic update check and app version info
- **Font Size Toggle** - Adjustable UI font size
- **Reload Shared Folders Button** - New button in Shared Files view to rescan shared folders from disk

### 🔧 Changed

#### **Build & Deployment**
- **JavaScript Bundling** - All frontend JS bundled into single file using esbuild
- **Updated bcrypt** - Version 6.0.0 removes deprecated dependencies

#### **Code Refactoring**
- **Config Management** - Refactored config.js/configAPI.js with improved secrets handling
- **Sensitive Env Vars** - Environment variables for passwords/API keys now always override config.json and lock UI fields
- **Torznab/qBittorrent APIs** - Refactored indexer and download client implementations
- **Frontend Architecture** - Massive app.js refactoring with contexts, consolidated state management, simplified views
- **Batched WebSocket Updates** - Reduced UI re-renders via autoRefreshManager
- **Deduplicated Code** - Consolidated Sonarr/Radarr logic in configTester.js and arrManager.js

#### **UI Improvements**
- **Server Disconnect Button** - Only shown on currently connected server
- **Header Tooltips** - Added tooltips on navigation buttons
- **Tablet Layout Fixes** - Improved sidebar and view layouts for tablets
- **Form Element Styles** - Unified form styling across views
- **Settings Page** - Reduced horizontal padding on mobile for more content width

### 🐛 Fixed

- **Arr Integration** - Fixed automatic search not initializing when enabled from settings after startup
- **Sonarr TBA Episodes** - Unreleased episodes (TBA) no longer trigger searches
- **Loading States** - Fixed "no files" message shown instead of "loading" on slow connections
- **Chart Rendering** - Fixed laggy home view by deferring chart rendering
- **Mobile Scroll** - Fixed viewport auto-scroll to top on page changes
- **Theme Persistence** - Theme selection now properly remembered
- **Light Mode** - Fixed progress bar text visibility in downloads
- **iOS Safari** - Fixed CSS viewport issues on iOS Safari
- **Loading Spinner** - Fixed spinner CSS styling

### 📝 Documentation

- **Restructured Docs** - Separated into focused guides (Configuration, Integrations, GeoIP, API, Development)
- **Docker Hub Link** - Added link to Docker Hub repository
- **Auth Documentation** - Added authentication setup for Torznab and qBittorrent APIs

## [2.1.0]

### ✨ Added
- Comprehensive monitoring dashboard on Home view (desktop)
- Real-time active downloads and uploads widgets
- 24h statistics with charts and metric cards
- Quick search integration on dashboard
- Auto-refresh every 15 seconds

### 🔧 Changed
- Improve Torznab category support for Prowlarr

## [2.0.0]

### 🎉 Major Release - Complete Refactoring & New Features

This is a major release featuring a complete codebase refactoring and numerous new features that significantly enhance functionality and user experience.

### ✨ Added

#### **Configuration Management**
- **Interactive Setup Wizard** - First-run guided configuration with real-time validation and testing
- **Settings Page** - Manage all configuration through the web interface with live testing
- **Persistent Configuration** - Settings saved to `config.json` with environment variable fallback
- **Configuration Precedence** - Clear hierarchy: config file > env vars > defaults
- **Test Before Save** - Validate individual sections or all settings before applying changes

#### **Sonarr/Radarr Integration**
- **Torznab Indexer API** - Full Torznab compatibility for ED2K network searches
- **qBittorrent Download Client Compatibility** - Works as download client for *arr apps
- **Automatic Library Scanning** - Configurable interval-based searches for missing content
- **Quality Profile Support** - Respects quality upgrade preferences from Sonarr/Radarr
- **Interactive Search Support** - Manual searches from Sonarr/Radarr interface
- **ED2K Rate Limiting** - Prevents server flood protection bans
- **Search Result Caching** - Efficient pagination handling for *arr apps

#### **GeoIP Integration**
- **MaxMind GeoLite2 Support** - Display geographic location of upload peers
- **Country Flags** - Visual country indicators in uploads view
- **City Information** - Detailed location data when available
- **Docker Integration** - GeoIP updater container for automatic database updates
- **Optional Feature** - Works without databases, gracefully degrades

#### **Download Management**
- **Category Management** - Create, edit, and delete download categories
- **Color-Coded Categories** - Customizable colors for visual organization
- **Category Assignment** - Assign downloads to categories via UI
- **Category Filtering** - Filter downloads by category
- **Pause/Resume Downloads** - Control individual download states
- **Multiple ED2K Link Support** - Add multiple ED2K links at once (one per line)
- **Segments Bar Visualization** - Visual representation of file parts availability
- **Detailed Source Counts** - Shows total, current, transferring, and A4AF sources
- **Last Seen Complete** - Color-coded indicators for source freshness

#### **User Experience**
- **Persistent Sorting Preferences** - Sort preferences saved to localStorage
- **Secondary Sorting** - Files with equal values sorted alphabetically by name
- **Improved Mobile UI** - Better touch interactions and responsive design
- **Enhanced Dark Mode** - Improved contrast and visual hierarchy

#### **Historical Statistics**
- **Interactive Charts** - Chart.js integration for speed and transfer visualization
- **Multiple Time Ranges** - 24h, 7d, and 30d views with appropriate aggregation
- **Accurate Calculations** - Fixed statistics calculation bugs (totals, averages, peaks)
- **Peak Speed Tracking** - True peak speeds from raw data, not averaged buckets
- **Database Optimization** - Efficient queries for large datasets

### 🔧 Changed

#### **Codebase Refactoring**
- **Modular Server Architecture** - Separated concerns into focused modules
  - `amuleHandler.js` - aMule EC protocol handling
  - `metricsAPI.js` - Historical statistics endpoints
  - `torznabAPI.js` - Torznab indexer implementation
  - `qbittorrentAPI.js` - qBittorrent API compatibility
  - `geoIPManager.js` - GeoIP database management
  - `config.js` - Centralized configuration
  - `categoriesManager.js` - Category operations
  - `sonarrClient.js` / `radarrClient.js` - *arr integration
- **Component-Based Frontend** - Organized React components
  - `components/common/` - Reusable UI components
  - `components/layout/` - Layout components (Header, Sidebar, Footer)
  - `components/views/` - Page view components
  - `components/modals/` - Modal dialogs
  - `hooks/` - Custom React hooks
  - `utils/` - Utility functions (formatters, validators, sorters)
- **Improved Code Reusability** - Extracted common patterns and utilities
- **Better Error Handling** - Comprehensive try-catch blocks and user feedback
- **Performance Optimizations** - Memoization, efficient queries, reduced re-renders
- **Code Readability** - Consistent naming, better comments, clear structure
- **Maintainability** - Easier to extend, test, and debug

#### **API Improvements**
- **RESTful Endpoints** - Proper HTTP methods and status codes
- **Consistent Response Format** - Standardized JSON responses
- **Better Error Messages** - Actionable error information
- **WebSocket Protocol** - Cleaner message structure
- **Rate Limiting** - Configurable delays for ED2K operations

#### **Database Changes**
- **Efficient Queries** - Added helper methods for common operations
  - `getFirstMetric()` - Get earliest record in range
  - `getLastMetric()` - Get latest record in range
  - `getPeakSpeeds()` - Get true peak speeds from raw data
- **Better Indexing** - Optimized timestamp lookups
- **Cleanup Routines** - Automatic old data retention management

### 🐛 Fixed

- **Statistics Calculation Bugs**:
  - Fixed 30d total upload/download showing less than 7d (100k record limit issue)
  - Fixed peak speeds calculated from averaged buckets instead of raw data
  - Fixed average speeds incorrectly averaging already-averaged bucket data
  - Now uses proper calculations: total/time for averages, MAX() for peaks
- **Secondary Sorting** - Files with equal sort values now alphabetically sorted
- **Dark Mode Consistency** - Improved color schemes across all views
- **Mobile Touch Interactions** - Better tap targets and touch feedback
- **Category Color Display** - Proper hex color rendering
- **WebSocket Reconnection** - More stable connection handling
- **Search Result Caching** - Prevents duplicate ED2K searches
- **Progress Bar Rendering** - Smooth animations and accurate percentages

### 📝 Documentation

- **Comprehensive README** - Updated with all new features and configuration options
- **Setup Instructions** - Clear Docker and native installation guides
- **Configuration Guide** - Detailed explanation of configuration precedence
- **Integration Guides** - Step-by-step Sonarr/Radarr setup
- **API Documentation** - Torznab and qBittorrent API endpoints
- **Troubleshooting Section** - Common issues and solutions
- **GeoIP Setup Guide** - MaxMind license and database configuration

### 📦 Dependencies

#### Added
- `maxmind` - GeoIP database reader
- Chart.js (via CDN) - Interactive charts

#### Updated
- React 18 - Latest stable version
- Tailwind CSS - Latest utilities
- better-sqlite3 - Latest database driver

---

## [1.0.1]

### Added
- Interactive charts for historical statistics
- Support for multiple ED2K links
- Improved statistics visualization

### Fixed
- Various bug fixes and performance improvements

---

## [1.0.0] - Initial Release

### Added
- Real-time search functionality
- Download management
- Upload monitoring
- Shared files view
- Historical statistics (24h/7d/30d)
- Dark mode support
- Responsive design
- WebSocket real-time updates
- Docker support
- Native installation support