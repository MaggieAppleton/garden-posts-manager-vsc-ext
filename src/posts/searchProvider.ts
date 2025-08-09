import * as vscode from "vscode";
import { Post } from "../shared/types";
import { PostTreeItem } from "./postItem";

export class SearchProvider implements vscode.TreeDataProvider<PostTreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<
		PostTreeItem | undefined | null | void
	> = new vscode.EventEmitter<PostTreeItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<
		PostTreeItem | undefined | null | void
	> = this._onDidChangeTreeData.event;

	private allPosts: Post[] = [];
	private filteredPosts: Post[] = [];
	private extensionPath: string;
	private currentFilters: SearchFilters = {};

	constructor(extensionPath: string) {
		this.extensionPath = extensionPath;
	}

	/**
	 * Update the available posts
	 */
	updatePosts(posts: Post[]): void {
		this.allPosts = posts;
		this.applyFilters();
	}

	/**
	 * Apply current filters and refresh view
	 */
	private applyFilters(): void {
		let filtered = [...this.allPosts];

		// Apply search query filter
		if (this.currentFilters.query) {
			const query = this.currentFilters.query.toLowerCase();
			filtered = filtered.filter(post => 
				post.title.toLowerCase().includes(query) ||
				post.type.toLowerCase().includes(query) ||
				(post.description && post.description.toLowerCase().includes(query)) ||
				(post.tags && post.tags.some(tag => tag.toLowerCase().includes(query)))
			);
		}

		// Apply status filter
		if (this.currentFilters.status) {
			filtered = filtered.filter(post => post.status === this.currentFilters.status);
		}

		// Apply type filter
		if (this.currentFilters.type) {
			filtered = filtered.filter(post => post.type === this.currentFilters.type);
		}

		// Apply date filter
		if (this.currentFilters.dateRange) {
			const now = new Date();
			let cutoffDate: Date;

			switch (this.currentFilters.dateRange) {
				case 'lastWeek':
					cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
					break;
				case 'lastMonth':
					cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
					break;
				case 'lastYear':
					cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
					break;
				default:
					cutoffDate = new Date(0);
			}

			filtered = filtered.filter(post => post.lastModified >= cutoffDate);
		}

		this.filteredPosts = filtered;
		this._onDidChangeTreeData.fire();
	}

	/**
	 * Set search query
	 */
	setSearchQuery(query: string): void {
		this.currentFilters.query = query.trim() || undefined;
		this.applyFilters();
	}

	/**
	 * Set status filter
	 */
	setStatusFilter(status: 'draft' | 'published' | undefined): void {
		this.currentFilters.status = status;
		this.applyFilters();
	}

	/**
	 * Set type filter
	 */
	setTypeFilter(type: string | undefined): void {
		this.currentFilters.type = type;
		this.applyFilters();
	}

	/**
	 * Set date range filter
	 */
	setDateRangeFilter(range: 'lastWeek' | 'lastMonth' | 'lastYear' | undefined): void {
		this.currentFilters.dateRange = range;
		this.applyFilters();
	}

	/**
	 * Clear all filters
	 */
	clearFilters(): void {
		this.currentFilters = {};
		this.applyFilters();
	}

	/**
	 * Get tree item for display
	 */
	getTreeItem(element: PostTreeItem): vscode.TreeItem {
		return element;
	}

	/**
	 * Get children for tree view
	 */
	getChildren(element?: PostTreeItem): Thenable<PostTreeItem[]> {
		if (!element) {
			// Root level - return filtered posts
			return Promise.resolve(
				this.filteredPosts.map(post => new PostTreeItem(post, this.extensionPath))
			);
		}

		// No children for individual posts
		return Promise.resolve([]);
	}

	/**
	 * Get current filters
	 */
	getCurrentFilters(): SearchFilters {
		return { ...this.currentFilters };
	}

	/**
	 * Get filtered posts count
	 */
	getFilteredCount(): number {
		return this.filteredPosts.length;
	}

	/**
	 * Dispose of resources
	 */
	dispose(): void {
		// No resources to dispose for search provider
	}
}

interface SearchFilters {
	query?: string;
	status?: 'draft' | 'published';
	type?: string;
	dateRange?: 'lastWeek' | 'lastMonth' | 'lastYear';
}
