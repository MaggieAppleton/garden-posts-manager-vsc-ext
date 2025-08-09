import * as vscode from "vscode";
import { Post } from "../shared/types";
import { findAllPosts } from "../shared/utils";
import { PostTreeItem, PostSectionItem } from "./postItem";
import { FilterItem, SeparatorItem } from "./filterItem";

export interface SearchFilters {
	query?: string;
	status?: 'draft' | 'published';
	type?: string;
	dateRange?: {
		start: Date;
		end: Date;
	};
}

// Helper tree items for loading, error, and success states
class PostsLoadingTreeItem extends vscode.TreeItem {
	constructor() {
		super("Loading posts...", vscode.TreeItemCollapsibleState.None);
		this.iconPath = new vscode.ThemeIcon('sync', new vscode.ThemeColor('charts.blue'));
		this.description = "Please wait";
	}
}

class PostsErrorTreeItem extends vscode.TreeItem {
	constructor(message: string) {
		super("Error loading posts", vscode.TreeItemCollapsibleState.None);
		this.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('charts.red'));
		this.description = message;
	}
}

class PostsSuccessTreeItem extends vscode.TreeItem {
	constructor(count: number) {
		super(count === 0 ? "No posts found" : `Posts loaded: ${count}`, vscode.TreeItemCollapsibleState.None);
		this.iconPath = new vscode.ThemeIcon(count === 0 ? 'info' : 'check', new vscode.ThemeColor('charts.green'));
		this.description = count === 0 ? "Try changing your filters or add new posts." : undefined;
	}
}

export class PostProvider implements vscode.TreeDataProvider<PostTreeItem | FilterItem | SeparatorItem | PostsLoadingTreeItem | PostsErrorTreeItem | PostsSuccessTreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<PostTreeItem | FilterItem | SeparatorItem | PostsLoadingTreeItem | PostsErrorTreeItem | PostsSuccessTreeItem | undefined | null | void> = new vscode.EventEmitter();
	readonly onDidChangeTreeData: vscode.Event<PostTreeItem | FilterItem | SeparatorItem | PostsLoadingTreeItem | PostsErrorTreeItem | PostsSuccessTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

	private allPosts: Post[] = [];
	private filteredPosts: Post[] = [];
	private fileWatcher: vscode.FileSystemWatcher | undefined;
	private extensionPath: string;
	private isLoading: boolean = false;
	private errorMessage: string | null = null;
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
			this.isLoading = true;
			this.errorMessage = null;
			this._onDidChangeTreeData.fire(undefined);
			
			this.allPosts = await findAllPosts();
			
			this.applyFilters();
			this.isLoading = false;
			this._onDidChangeTreeData.fire(undefined);
		} catch (error) {
			console.error("Error refreshing posts:", error);
			this.isLoading = false;
			this.errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
			this._onDidChangeTreeData.fire(undefined);
			vscode.window.showErrorMessage(
				"Failed to refresh posts. Check console for details."
			);
		}
	}

	/**
	 * Get tree item for display
	 */
	getTreeItem(element: PostTreeItem | FilterItem | SeparatorItem | PostsLoadingTreeItem | PostsErrorTreeItem | PostsSuccessTreeItem): vscode.TreeItem {
		return element;
	}

	/**
	 * Get children for tree view
	 */
	getChildren(element?: PostTreeItem | FilterItem | SeparatorItem | PostsLoadingTreeItem | PostsErrorTreeItem | PostsSuccessTreeItem): Thenable<(PostTreeItem | FilterItem | SeparatorItem | PostsLoadingTreeItem | PostsErrorTreeItem | PostsSuccessTreeItem)[]> {
		if (!element) {
			// Root level - show loading, error, success, or posts
			if (this.isLoading) {
				return Promise.resolve([new PostsLoadingTreeItem()]);
			}
			if (this.errorMessage) {
				return Promise.resolve([new PostsErrorTreeItem(this.errorMessage)]);
			}
			if (this.filteredPosts.length === 0) {
				return Promise.resolve([new PostsSuccessTreeItem(0)]);
			}
			// Show posts and a success indicator
			return Promise.resolve([
				new PostsSuccessTreeItem(this.filteredPosts.length),
				...this.filteredPosts.map(post => new PostTreeItem(post, this.extensionPath))
			]);
		}

		// No children for individual items
		return Promise.resolve([]);
	}

	/**
	 * Apply current filters to the posts
	 */
	private applyFilters(): void {
		let filtered = [...this.allPosts];

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
	}

	/**
	 * Set search query filter
	 */
	setSearchQuery(query: string): void {
		this.currentFilters.query = query || undefined;
		this.applyFilters();
		this._onDidChangeTreeData.fire(undefined);
	}

	/**
	 * Set status filter
	 */
	setStatusFilter(status: 'draft' | 'published' | undefined): void {
		this.currentFilters.status = status;
		this.applyFilters();
		this._onDidChangeTreeData.fire(undefined);
	}

	/**
	 * Set type filter
	 */
	setTypeFilter(type: string | undefined): void {
		this.currentFilters.type = type;
		this.applyFilters();
		this._onDidChangeTreeData.fire(undefined);
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
		this._onDidChangeTreeData.fire(undefined);
	}

	/**
	 * Clear all filters
	 */
	clearFilters(): void {
		this.currentFilters = {};
		this.applyFilters();
		this._onDidChangeTreeData.fire(undefined);
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
