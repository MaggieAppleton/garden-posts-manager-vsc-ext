import * as vscode from "vscode";
import * as path from "path";
import { formatDistanceToNow } from "date-fns";
import { Post, PostStatistics } from "../core/types";

export class PostTreeItem extends vscode.TreeItem {
	constructor(
		public readonly post: Post,
		public readonly extensionPath: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None
	) {
		// Truncate title to 28 characters to match draft format
		const truncatedTitle = post.title.length > 28 
			? post.title.substring(0, 28) + "..."
			: post.title;

		super(truncatedTitle, collapsibleState);

		this.tooltip = `${post.title}\n${this.getMetadataString()}`;
		this.description = this.getMetadataString();
		this.contextValue = post.status; // 'draft' or 'published'
		
		// Set simple icon based on status
		this.iconPath = this.getStatusIcon();

		// Set command to open post when clicked
		this.command = {
			command: "postManager.openPost",
			title: "Open Post",
			arguments: [post],
		};
	}

	private getMetadataString(): string {
		const timeAgo = formatDistanceToNow(this.post.lastModified, { addSuffix: false });
		
		// Convert to more compact format for tree view (same as drafts)
		const compactTime = timeAgo
			.replace(/about /g, '~')
			.replace(/ days?/g, 'd')
			.replace(/ weeks?/g, 'w')
			.replace(/ months?/g, 'mo')
			.replace(/ years?/g, 'y')
			.replace(/less than a minute/g, 'just now');
		
		// Capitalize the first letter of the content type
		const capitalizedType = this.post.type.charAt(0).toUpperCase() + this.post.type.slice(1);
		
		return `${capitalizedType} • ${this.post.wordCount}w • ${compactTime}`;
	}

	private getStatusIcon(): vscode.ThemeIcon {
		if (this.post.status === 'draft') {
			// Draft posts use edit/pencil icon
			return new vscode.ThemeIcon('edit');
		} else {
			// Published posts use check/checkmark icon  
			return new vscode.ThemeIcon('check');
		}
	}
}

export class PostSectionItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly count: number,
		public readonly sectionType: 'drafts' | 'published' | 'type',
		public readonly posts: Post[]
	) {
		super(`${label} (${count})`, vscode.TreeItemCollapsibleState.Expanded);
		
		this.contextValue = sectionType;
		this.tooltip = `${count} ${label.toLowerCase()}`;
		
		// Set appropriate icons for sections
		switch (sectionType) {
			case 'drafts':
				this.iconPath = new vscode.ThemeIcon('edit');
				break;
			case 'published':
				this.iconPath = new vscode.ThemeIcon('check');
				break;
			case 'type':
				this.iconPath = new vscode.ThemeIcon('symbol-class');
				break;
		}
	}
}

export class StatisticsItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly value: string | number,
		public readonly description?: string
	) {
		super(label, vscode.TreeItemCollapsibleState.None);
		
		this.description = value.toString();
		this.contextValue = "statistic";
		this.tooltip = description || `${label}: ${value}`;
		this.iconPath = new vscode.ThemeIcon('info');
	}
}

export class LoadingTreeItem extends vscode.TreeItem {
	constructor() {
		super("Loading posts...", vscode.TreeItemCollapsibleState.None);
		
		this.iconPath = new vscode.ThemeIcon("loading~spin");
		this.contextValue = "loading";
		this.tooltip = "Scanning workspace for posts...";
	}
}
