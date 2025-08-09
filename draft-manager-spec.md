# Draft Manager Extension - Technical Specification

## Overview
A VS Code extension to display and manage draft MDX posts in a dedicated sidebar, showing content type, freshness, and completion status.

## Core Functionality
**Primary Goal:** Display and manage draft MDX posts with content type categorization and intelligent status indicators in a VS Code sidebar

## Features (MVP)

### Essential Features
1. **Draft Discovery** - Scan workspace for `.mdx` files with `draft: true` frontmatter
2. **Tree View Display** - Show drafts in Explorer sidebar panel with metadata
3. **Content Type Support** - Display content types: note, essay, smidgeon, now, pattern, talk
4. **Quick Open** - Click draft to open in editor
5. **Manual Refresh** - Button/command to rescan files

### Status & Metadata Features
1. **Smart Status Indicators** - Color-coded freshness/doneness:
   - 🟢 **Green**: Recently touched + higher word count (fresh & substantial)
   - 🟠 **Orange**: Old + lower word count (stale & incomplete)
   - ⚪ **White/Gray**: Default state
2. **Rich Metadata Display** - `[word count, days ago, type]` for each draft
3. **Promote Command** - Remove `draft: true` to publish draft

## UI Design

### Tree View Panel
```
📝 DRAFTS (5)
├── 🟢 My Great Post Idea          [245 words, 2 days ago, essay]
├── 🟠 Old Draft Stub              [23 words, 14 days ago, note] 
├── 🟢 Recent Pattern Discovery    [189 words, 1 day ago, pattern]
├── ⚪ Weekend Project Write-up    [78 words, 5 days ago, smidgeon]
└── 🟠 Abandoned Talk Outline      [45 words, 21 days ago, talk]
```

### Context Menu (Right-click on draft)
- "Promote to Published"
- "Show in Explorer"

### Status Logic
**Green Status (🟢):** Recent + Substantial
- Last modified ≤ 30 days ago AND word count ≥ 300 words

**Orange Status (🟠):** Stale + Incomplete  
- Last modified ≥ 60 days ago AND word count ≤ 100 words

**Default Status (⚪):** Everything else

## Technical Implementation

### File Structure
```
draft-manager/
├── package.json
├── src/
│   ├── extension.ts        # Main activation, command registration
│   ├── draftProvider.ts    # TreeDataProvider implementation  
│   ├── draftItem.ts        # Draft model class
│   └── utils.ts            # Frontmatter parsing, file operations
└── README.md
```

### Draft Model
```typescript
export class DraftPost {
  constructor(
    public readonly path: string,
    public readonly title: string,
    public readonly wordCount: number,
    public readonly lastModified: Date,
    public readonly type: string,
    public readonly status: 'fresh' | 'stale' | 'default'
  ) {}
}
```

### Key VS Code APIs
- `vscode.workspace.createFileSystemWatcher` - Auto-refresh on file changes
- `vscode.window.createTreeView` - Sidebar panel
- `vscode.commands.registerCommand` - Commands
- `vscode.workspace.findFiles` - File discovery
- `vscode.workspace.fs` - File reading operations

### Data Flow
1. Scan workspace for `**/*.mdx` files
2. Read each file, parse frontmatter for `draft: true`
3. Extract metadata: title, type, word count, last modified
4. Calculate status based on freshness + doneness rules
5. Update tree view with sorted/categorized results
6. Watch for file changes and refresh automatically

### Content Types Supported
- `note` - Short form thoughts/ideas
- `essay` - Long form writing
- `smidgeon` - Brief insights
- `now` - Current status updates  
- `pattern` - Design/development patterns
- `talk` - Speaking content

## Success Metrics
- Discovers all draft MDX files in workspace
- Correctly parses frontmatter and content types
- Status indicators accurately reflect freshness/doneness
- Tree view updates in <500ms
- All commands work reliably
- No crashes or performance issues