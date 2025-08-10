import * as vscode from "vscode";
import { Post, PostStatistics } from "../core/types";
import { calculatePostStatistics } from "../core/utils";
import { StatisticsItem, LoadingTreeItem } from "./postItem";

export class StatisticsProvider
	implements vscode.TreeDataProvider<StatisticsItem | LoadingTreeItem>
{
	private _onDidChangeTreeData: vscode.EventEmitter<
		StatisticsItem | LoadingTreeItem | undefined | null | void
	> = new vscode.EventEmitter<
		StatisticsItem | LoadingTreeItem | undefined | null | void
	>();
	readonly onDidChangeTreeData: vscode.Event<
		StatisticsItem | LoadingTreeItem | undefined | null | void
	> = this._onDidChangeTreeData.event;

	private posts: Post[] = [];
	private statistics: PostStatistics | null = null;

	constructor() {}

	/**
	 * Update posts and recalculate statistics
	 */
	updatePosts(posts: Post[]): void {
		this.posts = posts;
		this.statistics = calculatePostStatistics(posts);
		this._onDidChangeTreeData.fire();
	}

	/**
	 * Get tree item for display
	 */
	getTreeItem(element: StatisticsItem | LoadingTreeItem): vscode.TreeItem {
		return element;
	}

	/**
	 * Get children for tree view
	 */
	getChildren(
		element?: StatisticsItem | LoadingTreeItem
	): Thenable<(StatisticsItem | LoadingTreeItem)[]> {
		if (!element) {
			// Root level - show statistics or loading
			if (!this.statistics) {
				return Promise.resolve([new LoadingTreeItem()]);
			}

			return Promise.resolve(this.createStatisticsItems());
		}

		// No children for individual statistics
		return Promise.resolve([]);
	}

	/**
	 * Create statistics items for display
	 */
	private createStatisticsItems(): StatisticsItem[] {
		if (!this.statistics) return [];

		const items: StatisticsItem[] = [];

		// Basic counts
		items.push(
			new StatisticsItem(
				"Total Posts",
				this.statistics.totalPosts,
				`${this.statistics.draftCount} drafts, ${this.statistics.publishedCount} published`
			)
		);

		items.push(
			new StatisticsItem(
				"Total Words",
				this.formatNumber(this.statistics.totalWords),
				`Across all ${this.statistics.totalPosts} posts`
			)
		);

		items.push(
			new StatisticsItem(
				"This Month",
				this.statistics.postsThisMonth,
				"Posts created or modified this month"
			)
		);

		items.push(
			new StatisticsItem(
				"Average/Month",
				this.statistics.averagePostsPerMonth,
				"Average posts per month this year"
			)
		);

		// Word count distribution
		if (this.statistics.wordCountDistribution.short > 0) {
			items.push(
				new StatisticsItem(
					"Short Posts",
					this.statistics.wordCountDistribution.short,
					"Under 300 words"
				)
			);
		}

		if (this.statistics.wordCountDistribution.medium > 0) {
			items.push(
				new StatisticsItem(
					"Medium Posts",
					this.statistics.wordCountDistribution.medium,
					"300-1000 words"
				)
			);
		}

		if (this.statistics.wordCountDistribution.long > 0) {
			items.push(
				new StatisticsItem(
					"Long Posts",
					this.statistics.wordCountDistribution.long,
					"Over 1000 words"
				)
			);
		}

		// Content type breakdown (only show types that exist)
		const typeEntries = Object.entries(this.statistics.typeBreakdown)
			.filter(([_, count]) => count > 0)
			.sort(([, a], [, b]) => b - a); // Sort by count descending

		if (typeEntries.length > 0) {
			typeEntries.forEach(([type, count]) => {
				const capitalizedType =
					type.charAt(0).toUpperCase() + type.slice(1) + "s";
				items.push(new StatisticsItem(capitalizedType, count, `${type} posts`));
			});
		}

		return items;
	}

	/**
	 * Format large numbers for display
	 */
	private formatNumber(num: number): string {
		if (num >= 1000) {
			return (num / 1000).toFixed(1) + "k";
		}
		return num.toString();
	}

	/**
	 * Get current statistics
	 */
	getStatistics(): PostStatistics | null {
		return this.statistics;
	}

	/**
	 * Dispose of resources
	 */
	dispose(): void {
		// No resources to dispose for statistics provider
	}
}
