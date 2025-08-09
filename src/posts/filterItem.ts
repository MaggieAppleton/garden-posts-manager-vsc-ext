import * as vscode from "vscode";

export class FilterItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly filterType: 'search' | 'status' | 'type' | 'clear',
		public readonly value: string | undefined,
		public readonly isActive: boolean = false
	) {
		super(label, vscode.TreeItemCollapsibleState.None);
		
		this.contextValue = filterType;
		this.command = this.getCommand();
		this.iconPath = this.getIcon();
		this.description = this.getDescription();
		this.tooltip = this.getTooltip();
	}

	private getCommand(): vscode.Command | undefined {
		switch (this.filterType) {
			case 'search':
				return {
					command: 'postManager.search',
					title: 'Search Posts',
					arguments: []
				};
			case 'status':
				return {
					command: 'postManager.filterByStatus',
					title: 'Filter by Status',
					arguments: []
				};
			case 'type':
				return {
					command: 'postManager.filterByType',
					title: 'Filter by Type',
					arguments: []
				};
			case 'clear':
				return {
					command: 'postManager.clearFilters',
					title: 'Clear All Filters',
					arguments: []
				};
			default:
				return undefined;
		}
	}

	private getIcon(): vscode.ThemeIcon | undefined {
		switch (this.filterType) {
			case 'search':
				return new vscode.ThemeIcon(this.isActive ? 'search-stop' : 'search');
			case 'status':
				return new vscode.ThemeIcon(this.isActive ? 'filter-filled' : 'filter');
			case 'type':
				return new vscode.ThemeIcon(this.isActive ? 'symbol-tag' : 'tag');
			case 'clear':
				return new vscode.ThemeIcon('close-all');
			default:
				return undefined;
		}
	}

	private getDescription(): string | undefined {
		if (this.isActive && this.value) {
			return `"${this.value}"`;
		}
		return undefined;
	}

	private getTooltip(): string | undefined {
		switch (this.filterType) {
			case 'search':
				return this.isActive ? `Current search: ${this.value}` : 'Search posts by title, type, or tags';
			case 'status':
				return this.isActive ? `Filtering by: ${this.value}` : 'Filter posts by draft/published status';
			case 'type':
				return this.isActive ? `Filtering by type: ${this.value}` : 'Filter posts by content type';
			case 'clear':
				return 'Remove all active filters';
			default:
				return undefined;
		}
	}
}

export class ActiveFilterItem extends vscode.TreeItem {
	constructor(
		public readonly filterType: string,
		public readonly filterValue: string
	) {
		super(`${filterType}: ${filterValue}`, vscode.TreeItemCollapsibleState.None);
		
		this.contextValue = 'activeFilter';
		this.iconPath = new vscode.ThemeIcon('close', new vscode.ThemeColor('charts.red'));
		this.tooltip = `Click to remove ${filterType} filter`;
		this.command = {
			command: 'postManager.removeFilter',
			title: 'Remove Filter',
			arguments: [filterType]
		};
	}
}

export class SeparatorItem extends vscode.TreeItem {
	constructor(label: string = "─────────────────") {
		super(label, vscode.TreeItemCollapsibleState.None);
		this.contextValue = 'separator';
		// Make it look like a separator
		this.iconPath = undefined;
		this.description = undefined;
	}
}
