import * as vscode from "vscode";
import { Post } from "../shared/types";
import { findAllPosts } from "../shared/utils";
import { PostTreeItem, PostSectionItem, LoadingTreeItem } from "./postItem";
import { FilterItem, ActiveFilterItem, SeparatorItem } from "./filterItem";

export interface SearchFilters {
	query?: string;
	status?: 'draft' | 'published';
	type?: string;
	dateRange?: {
		start: Date;
		end: Date;
	};
}

export class PostProvider implements vscode.TreeDataProvider<PostTreeItem | LoadingTreeItem | FilterItem | ActiveFilterItem | SeparatorItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<
		PostTreeItem | LoadingTreeItem | FilterItem | ActiveFilterItem | SeparatorItem | undefined | null | void
	> = new vscode.EventEmitter<PostTreeItem | LoadingTreeItem | FilterItem | ActiveFilterItem | SeparatorItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<
		PostTreeItem | LoadingTreeItem | FilterItem | ActiveFilterItem | SeparatorItem | undefined | null | void
	> = this._onDidChangeTreeData.event;

	private allPosts: Post[] = [];
	private filteredPosts: Post[] = [];
	private fileWatcher: vscode.FileSystemWatcher | undefined;
	private extensionPath: string;
	private isLoading: boolean = false;
	private currentFilters: SearchFilters = {};

	constructor(extensionPath: string) {
		this.extensionPath = extensionPath;
		this.setupFileWatcher();
		this.refresh();
	}

	/**
	 * Set up file system watcher to auto-refresh on MDX file changes
	 */
	private setupFileWatcher(): void {
		// Watch for changes to .mdx files
		this.fileWatcher = vscode.workspace.createFileSystemWatcher("**/*.mdx");

		// Refresh on file changes
		this.fileWatcher.onDidChange(() => this.refresh());
		this.fileWatcher.onDidCreate(() => this.refresh());
		this.fileWatcher.onDidDelete(() => this.refresh());
	}

	/**
	 * Refresh the tree view by rescanning for post files
	 */
	async refresh(): Promise<void> {
		try {
			console.log("Refreshing posts...");
			this.isLoading = true;
			this._onDidChangeTreeData.fire(); // Show loading state
			
			this.allPosts = await findAllPosts();
			console.log(`Found ${this.allPosts.length} post files:`, this.allPosts.map((p: Post) => `${p.title} (${p.status})`));
			
			this.applyFilters();
			this.isLoading = false;
			this._onDidChangeTreeData.fire(); // Show actual results
		} catch (error) {
			console.error("Error refreshing posts:", error);
			this.isLoading = false;
			this._onDidChangeTreeData.fire();
			vscode.window.showErrorMessage(
				"Failed to refresh posts. Check console for details."
			);
		}
	}

	/**
	 * Get tree item for display
	 */
	getTreeItem(element: PostTreeItem | LoadingTreeItem | FilterItem | ActiveFilterItem | SeparatorItem): vscode.TreeItem {
		return element;
	}

	/**
	 * Get children for tree view
	 */
	getChildren(element?: PostTreeItem | LoadingTreeItem | FilterItem | ActiveFilterItem | SeparatorItem): Thenable<(PostTreeItem | LoadingTreeItem | FilterItem | ActiveFilterItem | SeparatorItem)[]> {
		if (!element) {
			// Root level - show loading or just posts (filters are now in webview)
			if (this.isLoading) {
				return Promise.resolve([new LoadingTreeItem()]);
			}
			
			// Just show the filtered posts directly
			return Promise.resolve(
				this.filteredPosts.map(post => new PostTreeItem(post, this.extensionPath))
			);
		}

		// No children for individual items
		return Promise.resolve([]);
	}

	/**
	 * Create filter control items
	 */
	private createFilterItems(): FilterItem[] {
		const items: FilterItem[] = [];
		
		// Search filter
		const hasSearchQuery = !!this.currentFilters.query;
		items.push(new FilterItem(
			hasSearchQuery ? `Search: "${this.currentFilters.query}"` : "🔍 Search Posts",
			'search',
			this.currentFilters.query,
			hasSearchQuery
		));
		
		// Status filter
		const hasStatusFilter = !!this.currentFilters.status;
		items.push(new FilterItem(
			hasStatusFilter ? `Status: ${this.currentFilters.status}` : "📋 Filter by Status",
			'status',
			this.currentFilters.status,
			hasStatusFilter
		));
		
		// Type filter
		const hasTypeFilter = !!this.currentFilters.type;
		items.push(new FilterItem(
			hasTypeFilter ? `Type: ${this.currentFilters.type}` : "🏷️ Filter by Type",
			'type',
			this.currentFilters.type,
			hasTypeFilter
		));
		
		// Clear filters (only show if there are active filters)
		if (this.hasActiveFilters()) {
			items.push(new FilterItem("🗑️ Clear All Filters", 'clear', undefined, true));
		}
		
		return items;
	}

	/**
	 * Create active filter indicator items
	 */
	private createActiveFilterItems(): ActiveFilterItem[] {
		const items: ActiveFilterItem[] = [];
		
		if (this.currentFilters.query) {
			items.push(new ActiveFilterItem("Search", this.currentFilters.query));
		}
		
		if (this.currentFilters.status) {
			items.push(new ActiveFilterItem("Status", this.currentFilters.status));
		}
		
		if (this.currentFilters.type) {
			items.push(new ActiveFilterItem("Type", this.currentFilters.type));
		}
		
		return items;
	}

	/**
	 * Check if any filters are currently active
	 */
	private hasActiveFilters(): boolean {
		return !!(this.currentFilters.query || this.currentFilters.status || this.currentFilters.type);
	}
	private applyFilters(): void {
		let filtered = [...this.allPosts];
		console.log(`POST PROVIDER: Applying filters to ${this.allPosts.length} posts`);
		console.log(`POST PROVIDER: Current filters:`, this.currentFilters);

		// Apply search query filter
		if (this.currentFilters.query) {
			const query = this.currentFilters.query.toLowerCase();
			filtered = filtered.filter((post: Post) => 
				post.title.toLowerCase().includes(query) ||
				post.type.toLowerCase().includes(query) ||
				(post.description && post.description.toLowerCase().includes(query)) ||
				(post.tags && post.tags.some((tag: string) => tag.toLowerCase().includes(query)))
			);
		}

		// Apply status filter
		if (this.currentFilters.status) {
			filtered = filtered.filter((post: Post) => post.status === this.currentFilters.status);
		}

		// Apply type filter
		if (this.currentFilters.type) {
			filtered = filtered.filter((post: Post) => post.type === this.currentFilters.type);
		}

		// Apply date range filter
		if (this.currentFilters.dateRange) {
			filtered = filtered.filter((post: Post) => {
				const postDate = post.publishedDate || post.lastModified;
				return postDate >= this.currentFilters.dateRange!.start && 
					   postDate <= this.currentFilters.dateRange!.end;
			});
		}

		this.filteredPosts = filtered;
		console.log(`POST PROVIDER: Filtered to ${this.filteredPosts.length} posts`);
	}

	/**
	 * Set search query filter
	 */
	setSearchQuery(query: string): void {
		this.currentFilters.query = query || undefined;
		this.applyFilters();
		this._onDidChangeTreeData.fire();
	}

	/**
	 * Set status filter
	 */
	setStatusFilter(status: 'draft' | 'published' | undefined): void {
		this.currentFilters.status = status;
		this.applyFilters();
		this._onDidChangeTreeData.fire();
	}

	/**
	 * Set type filter
	 */
	setTypeFilter(type: string | undefined): void {
		this.currentFilters.type = type;
		this.applyFilters();
		this._onDidChangeTreeData.fire();
	}

	/**
	 * Remove a specific filter
	 */
	removeFilter(filterType: string): void {
		switch (filterType.toLowerCase()) {
			case 'search':
				this.currentFilters.query = undefined;
				break;
			case 'status':
				this.currentFilters.status = undefined;
				break;
			case 'type':
				this.currentFilters.type = undefined;
				break;
		}
		this.applyFilters();
		this._onDidChangeTreeData.fire();
	}

	/**
	 * Clear all filters
	 */
	clearFilters(): void {
		this.currentFilters = {};
		this.applyFilters();
		this._onDidChangeTreeData.fire();
	}

	/**
	 * Get available post types for filtering
	 */
	getAvailableTypes(): string[] {
		const types = new Set<string>();
		this.allPosts.forEach((post: Post) => {
			types.add(post.type);
		});
		return Array.from(types).sort();
	}

	/**
	 * Get current filters
	 */
	getCurrentFilters(): SearchFilters {
		return { ...this.currentFilters };
	}

	/**
	 * Get the number of posts for display in tree view title
	 */
	getPostCount(): number {
		return this.allPosts.length;
	}

	/**
	 * Get the number of filtered posts
	 */
	getFilteredCount(): number {
		return this.filteredPosts.length;
	}

	/**
	 * Get all posts
	 */
	getAllPosts(): Post[] {
		return this.allPosts;
	}

	/**
	 * Get filtered posts
	 */
	getFilteredPosts(): Post[] {
		return this.filteredPosts;
	}

	/**
	 * Dispose of resources
	 */
	dispose(): void {
		if (this.fileWatcher) {
			this.fileWatcher.dispose();
		}
	}
}
