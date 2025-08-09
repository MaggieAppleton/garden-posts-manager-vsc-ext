# Garden Posts Manager – VS Code Extension

A VS Code extension designed for managing MDX posts and keeping track of drafts.

## ✨ Features

### 📝 Draft Management

- **Smart Draft Discovery**: Automatically finds all MDX files with `draft: true` in your workspace
- **Intelligent Status Indicators**:
  - 🟢 **Fresh & Substantial**: Recently touched + meaningful content (≥300 words, ≤30 days old)
  - 🟠 **Stale & Incomplete**: Neglected seedlings (≤100 words, ≥60 days old)
  - ⚪ **Default**: Everything in between
- **Quick Actions**: Open drafts, promote to published, reveal in finder
- **Rich Metadata**: See word count, last modified date, and content type at a glance

### Garden Analytics

- **Writing Statistics**: Track your total posts, word count, and writing momentum
- **Content Distribution**: Visualize your garden's composition by content type
- **Growth Tracking**: Monitor posts created this month/year and average output

### Content Discovery

- **Unified Post View**: Browse all content (drafts + published) in one place
- **Search**: Find posts by title, content, or tags
- **Filtering**: Filter by status (draft/published) or content type

### Setting Up Your MDX Files

Your MDX files should include frontmatter like this:

```mdx
---
title: "My Garden Thought"
type: "note"
draft: true
tags: ["gardening", "ideas"]
description: "A seedling idea about digital cultivation"
---

Your content goes here...
```

**Required frontmatter:**

- `draft: true` (for drafts) or omit/set to `false` (for published)
- `type: "note" | "essay" | "smidgeon" | "now" | "pattern" | "talk"`

**Optional frontmatter:**

- `title` - Will use filename if not provided
- `tags` - Array of strings for categorization
- `description` - Brief summary
- `slug` - Custom URL slug
- `publishedDate` or `date` - Publication date

## 🎨 Interface Overview

### Draft Tree View (Explorer Sidebar)

```
📝 DRAFTS (5)
├── 🟢 Emergent Patterns in Code    [445w, 2d, pattern]
├── 🟠 Old Reading Note             [23w, 45d, note]
├── 🟢 Weekly Reflection            [289w, 1d, now]
├── ⚪ Conference Talk Ideas         [156w, 12d, talk]
└── 🟠 Abandoned Essay Draft        [67w, 89d, essay]
```

### Post Manager Panel (Activity Bar)

- **All Posts View**: Complete garden overview with filtering
- **Statistics Panel**: Growth metrics and content analytics
- **Search & Filter Interface**: Discover and organize your thoughts

## 🛠️ Commands

| Command                    | Description                        |
| -------------------------- | ---------------------------------- |
| `Garden: Refresh Drafts`   | Rescan workspace for draft changes |
| `Garden: Refresh Posts`    | Update all post data               |
| `Garden: Search Posts`     | Find content across your garden    |
| `Garden: Filter by Status` | Show only drafts or published      |
| `Garden: Filter by Type`   | Filter by content type             |
| `Garden: Clear Filters`    | Reset all filters                  |
| `Garden: Show Statistics`  | Display detailed analytics         |

## 🔧 Requirements

- VS Code 1.74.0 or higher
- MDX files with frontmatter

## 📦 Dependencies

- `gray-matter` - Frontmatter parsing
- `date-fns` - Date manipulation
