import * as vscode from "vscode";
import * as path from "path";
import { formatDistanceToNow } from "date-fns";

export type DraftStatus = "fresh" | "stale" | "default";

export class LoadingTreeItem extends vscode.TreeItem {
	constructor() {
		super("Loading drafts...", vscode.TreeItemCollapsibleState.None);
		
		this.iconPath = new vscode.ThemeIcon("loading~spin");
		this.contextValue = "loading";
		this.tooltip = "Scanning workspace for draft files...";
	}
}

export class DraftPost {
	constructor(
		public readonly path: string,
		public readonly title: string,
		public readonly wordCount: number,
		public readonly lastModified: Date,
		public readonly type: string,
		public readonly status: DraftStatus
	) {}

	/**
	 * Calculate status based on freshness and word count rules:
	 * - fresh: Modified less than 30 days ago (no word count requirement)
	 * - stale: Modified more than 6 months ago OR less than 300 words
	 * - default: Everything else
	 */
	static calculateStatus(lastModified: Date, wordCount: number): DraftStatus {
		const now = new Date();
		const daysSinceModified = Math.floor(
			(now.getTime() - lastModified.getTime()) / (1000 * 60 * 60 * 24)
		);

		// fresh: Modified less than 30 days ago
		if (daysSinceModified < 30) {
			return "fresh";
		}

		// stale: Modified more than 6 months ago OR less than 300 words
		if (daysSinceModified > 180 || wordCount < 300) {
			return "stale";
		}

		// default: Everything else (30-180 days old with 300+ words)
		return "default";
	}

	/**
	 * Get days since last modified for display
	 */
	getDaysAgo(): number {
		const now = new Date();
		return Math.floor(
			(now.getTime() - this.lastModified.getTime()) / (1000 * 60 * 60 * 24)
		);
	}

	/**
	 * Get compact metadata string with dots for tree view display
	 */
	getMetadataString(): string {
		const timeAgo = formatDistanceToNow(this.lastModified, { addSuffix: false });
		
		// Convert to more compact format for tree view
		const compactTime = timeAgo
			.replace(/about /g, '~')
			.replace(/ days?/g, 'd')
			.replace(/ weeks?/g, 'w')
			.replace(/ months?/g, 'mo')
			.replace(/ years?/g, 'y')
			.replace(/less than a minute/g, 'just now')
		
		// Capitalize the first letter of the content type
		const capitalizedType = this.type.charAt(0).toUpperCase() + this.type.slice(1);
		
		return `${this.wordCount}w • ${compactTime} • ${capitalizedType}`;
	}	/**

	/**
	 * Get status icon path for tree view display
	 */
	getStatusIconPath(extensionPath: string): string {
		const iconName = this.status === "fresh" ? "fresh" : 
						 this.status === "stale" ? "stale" : "default";
		return path.join(extensionPath, "resources", "icons", `${iconName}.svg`);
	}
}

export class DraftTreeItem extends vscode.TreeItem {
	constructor(
		public readonly draft: DraftPost,
		public readonly extensionPath: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState = vscode
			.TreeItemCollapsibleState.None
	) {
		// Truncate title to 28 characters and add ellipsis if needed
		const truncatedTitle = draft.title.length > 28
			? draft.title.substring(0, 28) + "..."
			: draft.title;

		super(truncatedTitle, collapsibleState);

		this.tooltip = `${draft.title}\n${draft.getMetadataString()}`;
		this.description = draft.getMetadataString();
		this.contextValue = "draft";
		
		// Set custom icon based on draft status
		this.iconPath = vscode.Uri.file(draft.getStatusIconPath(extensionPath));

		// Set command to open draft when clicked
		this.command = {
			command: "draftManager.openDraft",
			title: "Open Draft",
			arguments: [draft],
		};
	}
}
