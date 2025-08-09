# Post Manager Extension - Technical Specification

## Overview
A comprehensive VS Code extension to manage and visualize all blog posts (drafts and published) in a dedicated workspace, providing statistics, search, and focused post management separate from the cluttered file explorer.

## Vision Statement
**Transform VS Code into a focused writing environment** by providing a dedicated post management interface that abstracts away the technical complexity of the blog's file structure, allowing writers to focus purely on content creation and organization.

## Core Functionality
**Primary Goal:** Provide a comprehensive post management system with dual interfaces - a lightweight draft tree view for quick access, and a rich activity bar panel for deep post management, statistics, and discovery.

## Architecture Overview

### Two-Interface Approach
1. **Draft Tree View** (Current) - Lightweight, always-visible draft awareness in Explorer sidebar
2. **Post Manager Panel** (New) - Rich, dedicated activity bar interface for comprehensive post management

---

## Interface 1: Draft Tree View (Keep Existing)

### Purpose
Quick awareness and access to draft posts while working in files.

### Features (Already Implemented)
- Shows only draft posts (`draft: true`)
- Compact metadata display
- Status indicators (fresh/stale/default)
- Quick open functionality
- Promote/demote commands

### Location
Explorer sidebar panel (current implementation)

---

## Interface 2: Post Manager Panel (New)

### Purpose
Comprehensive post management, discovery, and analytics workspace.

### Location
Custom Activity Bar icon with dedicated sidebar panel

### Panel Structure
```
Activity Bar:    Post Manager Sidebar:
[📁] Explorer    ┌─────────────────────────────┐
[🔍] Search      │  📝 POST MANAGER            │
[🌿] Git         │  ┌─ Toolbar ──────────────┐ │
[🐛] Debug       │  │ [🔍] [📊] [⚙️] [↻]    │ │
[🧩] Extensions  │  └─────────────────────────┘ │
[📝] Posts ←     ├─────────────────────────────┤
                 │  📝 ALL POSTS (24)          │
                 │  ├─📝 Drafts (5)            │
                 │  │  ├─ My Long Post...      │
                 │  │  └─ Quick Note           │
                 │  ├─✅ Published (19)        │
                 │  │  ├─ Getting Started...   │
                 │  │  └─ Advanced Guide...    │
                 │  └─📁 By Type               │
                 │     ├─📄 Essays (8)         │
                 │     ├─📋 Notes (12)         │
                 │     └─🎤 Talks (4)          │
                 ├─────────────────────────────┤
                 │  📊 STATISTICS              │
                 │  • Total: 24 posts         │
                 │  • Words: 45,230           │
                 │  • This month: 3 posts     │
                 │  • Avg per month: 2.1      │
                 │  [View Details]             │
                 ├─────────────────────────────┤
```

---

## Feature Specifications

### 1. All Posts View
**Purpose:** Unified view of entire content library

**Structure:**
- **Drafts Section** - Expandable, shows current drafts
- **Published Section** - Expandable, shows published posts  
- **By Type Section** - Group by content type (note, essay, etc.)
- **Optional:** By date, by word count, by tags

**Metadata Display:**
```
📝 My Blog Post Title          245w • 2d • Essay • Published
🟠 Old Draft Stub              23w • 3mo • Note • Draft
✅ Complete Guide              1.2kw • 1w • Essay • Published
```

### 2. Enhanced Statistics Panel
**Basic Stats:**
- Total posts (published + drafts)
- Total word count
- Posts this month/year
- Average posts per month

**Visual Elements:**
- Progress bars for draft vs published ratio
- Sparkline charts for posting frequency
- Word count distribution
- Content type breakdown (pie chart)


### 3. Search & Filter System
**Search Capabilities:**
- Full-text search across post content
- Search by title, tags, content type
- Search within date ranges

**Filter Options:**
- By status (draft/published)
- By content type (essay, note, pattern, etc.)
- By date range (last week, month, year, custom)
- By last modified

**Smart Filters:**
- "Stale drafts" (old + low word count)
- "Recent activity" (modified in last week)
- "Long form" (essays over 1000 words)

### 4. Rich Post Management
**Enhanced Context Menus:**
- Show in file explorer  
- Copy file path

**Drag & Drop:**
- Reorder posts
- Move between draft/published
- Create collections/folders

---

## Technical Implementation

### File Structure (Updated)
```
post-manager/
├── package.json
├── src/
│   ├── extension.ts              # Main activation
│   ├── draft/
│   │   ├── draftProvider.ts      # Existing draft tree view
│   │   ├── draftItem.ts          # Draft models
│   │   └── draftCommands.ts      # Draft-specific commands
│   ├── posts/
│   │   ├── postManager.ts        # Main post manager panel
│   │   ├── postProvider.ts       # Post data provider
│   │   ├── postItem.ts           # Post models
│   │   ├── searchProvider.ts     # Search & filter logic
│   │   ├── statisticsView.ts     # Stats calculations
│   │   └── postCommands.ts       # Post management commands
│   ├── shared/
│   │   ├── types.ts              # Shared interfaces
│   │   ├── utils.ts              # File operations
│   │   └── config.ts             # Settings management
│   └── webview/
│       ├── statisticsPanel.ts    # Rich stats webview
│       └── assets/               # CSS, JS for webviews
└── README.md
```

### Package.json Contributions (New)
```json
{
  "contributes": {
    "viewsContainers": {
      "activitybar": [{
        "id": "postManager",
        "title": "Post Manager",
        "icon": "$(notebook)"
      }]
    },
    "views": {
      "explorer": [
        {
          "id": "draftManager",
          "name": "Drafts",
          "when": "workspaceHasFolder"
        }
      ],
      "postManager": [
        {
          "id": "allPosts",
          "name": "All Posts",
          "when": "workspaceHasFolder"
        },
        {
          "id": "postStatistics", 
          "name": "Statistics",
          "when": "workspaceHasFolder"
        },
        {
          "id": "postSearch",
          "name": "Search & Filter", 
          "when": "workspaceHasFolder"
        }
      ]
    },
    "commands": [
      {
        "command": "postManager.refresh",
        "title": "Refresh Posts",
        "icon": "$(refresh)"
      },
      {
        "command": "postManager.search",
        "title": "Search Posts",
        "icon": "$(search)"
      },
      {
        "command": "postManager.showStatistics",
        "title": "Show Detailed Statistics",
        "icon": "$(graph)"
      }
    ]
  }
}
```

### Data Models

#### Post Model (Enhanced)
```typescript
export interface Post {
  path: string;
  title: string;
  slug?: string;
  wordCount: number;
  lastModified: Date;
  created: Date;
  type: ContentType;
  status: 'draft' | 'published';
  tags?: string[];
  description?: string;
  featured?: boolean;
  publishedDate?: Date;
}

export interface PostStatistics {
  totalPosts: number;
  totalWords: number;
  draftCount: number;
  publishedCount: number;
  postsThisMonth: number;
  postsThisYear: number;
  averagePostsPerMonth: number;
  typeBreakdown: Record<ContentType, number>;
  wordCountDistribution: {
    short: number;    // <300 words
    medium: number;   // 300-1000
    long: number;     // >1000
  };
}
```

---

## User Experience Flows

### Writer's Daily Workflow
1. **Open VS Code** → See draft count in Explorer sidebar
2. **Click Post Manager** → Full view of writing pipeline
3. **Check statistics** → See progress and trends
4. **Search old posts** → Find reference material
5. **Work on draft** → Use either interface to open

### Content Organization
1. **Filter by type** → Find all essays, notes, etc.
2. **Search by topic** → Full-text search across posts
3. **View by status** → See pipeline from draft to published
4. **Analytics review** → Monthly writing review

### Discovery & Inspiration
1. **Browse statistics** → See patterns in writing habits
2. **Find stale drafts** → Resurrect old ideas
3. **View recent activity** → Continue momentum
4. **Explore by type** → See content variety

---

## Migration Strategy

### Phase 1: Enhance Current Extension
- Keep existing draft tree view exactly as-is
- Add activity bar view container
- Implement basic "All Posts" view
- Add simple statistics panel

### Phase 2: Rich Features
- Advanced search and filtering
- Webview-based statistics with charts
- Enhanced metadata support

---