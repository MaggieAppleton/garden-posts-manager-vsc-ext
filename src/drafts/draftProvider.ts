import * as vscode from "vscode";
import { DraftPost, DraftTreeItem, LoadingTreeItem } from "./draftItem";
import { findDraftFiles } from "../core/utils";

export class DraftProvider implements vscode.TreeDataProvider<DraftTreeItem | LoadingTreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<
		DraftTreeItem | LoadingTreeItem | undefined | null | void
	> = new vscode.EventEmitter<DraftTreeItem | LoadingTreeItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<
		DraftTreeItem | LoadingTreeItem | undefined | null | void
	> = this._onDidChangeTreeData.event;

	private drafts: DraftPost[] = [];
	private fileWatcher: vscode.FileSystemWatcher | undefined;
	private extensionPath: string;
	private isLoading: boolean = false;

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
	 * Refresh the tree view by rescanning for draft files
	 */
	async refresh(): Promise<void> {
		try {
			console.log("Refreshing drafts...");
			this.isLoading = true;
			this._onDidChangeTreeData.fire(); // Show loading state
			
			this.drafts = await findDraftFiles();
			
			this.isLoading = false;
			this._onDidChangeTreeData.fire(); // Show actual results
		} catch (error) {
			console.error("Error refreshing drafts:", error);
			this.isLoading = false;
			this._onDidChangeTreeData.fire();
			vscode.window.showErrorMessage(
				"Failed to refresh drafts. Check console for details."
			);
		}
	}

	/**
	 * Get tree item for display
	 */
	getTreeItem(element: DraftTreeItem | LoadingTreeItem): vscode.TreeItem {
		return element;
	}

	/**
	 * Get children for tree view (root level shows all drafts)
	 */
	getChildren(element?: DraftTreeItem | LoadingTreeItem): Thenable<(DraftTreeItem | LoadingTreeItem)[]> {
		if (!element) {
			// Root level - show loading or drafts
			if (this.isLoading) {
				return Promise.resolve([new LoadingTreeItem()]);
			}
			
			// Return all drafts as tree items
			return Promise.resolve(
				this.drafts.map((draft) => new DraftTreeItem(draft, this.extensionPath))
			);
		}

		// No children for individual draft items or loading item
		return Promise.resolve([]);
	}

	/**
	 * Get the number of drafts for display in tree view title
	 */
	getDraftCount(): number {
		return this.drafts.length;
	}

	/**
	 * Get draft by file path
	 */
	getDraftByPath(filePath: string): DraftPost | undefined {
		return this.drafts.find((draft) => draft.path === filePath);
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
