import * as vscode from "vscode";
import { DraftProvider } from "./draftProvider";
import { DraftPost, DraftTreeItem, LoadingTreeItem } from "./draftItem";
import { promoteDraft, unpromoteToDraft } from "./utils";
import { PostProvider } from "./posts/postProvider";
import { StatisticsProvider } from "./posts/statisticsProvider";
import { FilterWebviewProvider } from "./posts/filterWebview";
import { openPost, showPostInExplorer, copyPostPath } from "./posts/postCommands";
import { Post } from "./shared/types";

export function activate(context: vscode.ExtensionContext) {
	console.log("🚀 POST MANAGER EXTENSION ACTIVATING...");
	
	try {
		console.log("Post Manager extension is now active");

		// Create the original draft provider (keep existing functionality)
		console.log("Creating draft provider...");
		const draftProvider = new DraftProvider(context.extensionPath);

	// Create new post management providers
	console.log("Creating post management providers...");
	const postProvider = new PostProvider(context.extensionPath);
	const statisticsProvider = new StatisticsProvider();
	
	// Create filter webview provider
	const filterProvider = new FilterWebviewProvider(
		context.extensionUri,
		(filters) => {
			// Apply filters to post provider
			postProvider.setSearchQuery(filters.query || "");
			postProvider.setStatusFilter(filters.status);
			postProvider.setTypeFilter(filters.type);
		}
	);	// Register the original draft tree view
	const draftTreeView = vscode.window.createTreeView("draftManager", {
		treeDataProvider: draftProvider,
		showCollapseAll: false,
	});

	// Register the new post manager tree views
	const statisticsTreeView = vscode.window.createTreeView("postStatistics", {
		treeDataProvider: statisticsProvider,
		showCollapseAll: false,
	});

	// Register the filter webview
	const filterWebview = vscode.window.registerWebviewViewProvider(
		'postFilters',
		filterProvider,
		{ webviewOptions: { retainContextWhenHidden: true } }
	);

	console.log("Tree views created");

	// Link providers together - when posts are loaded, update statistics and filter webview
	postProvider.onDidChangeTreeData(() => {
		const posts = postProvider.getAllPosts();
		const filteredPosts = postProvider.getFilteredPosts();
		const filters = postProvider.getCurrentFilters();
		
		statisticsProvider.updatePosts(posts);
		filterProvider.updatePosts(posts, filteredPosts, filters);
		
		// Update tree view titles
		updateTreeViewTitles();
	});

	// Update tree view titles with counts
	const updateTreeViewTitles = () => {
		const draftCount = draftProvider.getDraftCount();
		
		draftTreeView.title = `Drafts (${draftCount})`;
		// Note: Post count is now shown in the webview interface
	};

	// Update titles on data changes
	draftProvider.onDidChangeTreeData(() => {
		updateTreeViewTitles();
	});

	// Initial title update
	updateTreeViewTitles();

	// Register original draft commands
	const refreshCommand = vscode.commands.registerCommand(
		"draftManager.refresh",
		() => {
			draftProvider.refresh();
		}
	);

	const openDraftCommand = vscode.commands.registerCommand(
		"draftManager.openDraft",
		async (item: DraftPost | DraftTreeItem | LoadingTreeItem) => {
			try {
				// Don't allow opening loading items
				if (item instanceof LoadingTreeItem) {
					return;
				}
				
				// Handle both DraftPost and DraftTreeItem arguments
				const draft = item instanceof DraftTreeItem ? item.draft : item;
				
				console.log("Opening draft:", draft);
				console.log("Draft path:", draft?.path);
				
				if (!draft || !draft.path) {
					vscode.window.showErrorMessage("Invalid draft object - no path found");
					return;
				}
				
				const document = await vscode.workspace.openTextDocument(draft.path);
				await vscode.window.showTextDocument(document);
			} catch (error) {
				console.error("Error opening draft:", error);
				vscode.window.showErrorMessage(`Failed to open draft: ${error}`);
			}
		}
	);

	const promoteDraftCommand = vscode.commands.registerCommand(
		"draftManager.promoteDraft",
		async (item: DraftPost | DraftTreeItem | LoadingTreeItem) => {
			try {
				// Don't allow promoting loading items
				if (item instanceof LoadingTreeItem) {
					return;
				}
				
				// Handle both DraftPost and DraftTreeItem arguments
				const draft = item instanceof DraftTreeItem ? item.draft : item;
				
				if (!draft || !draft.title || !draft.path) {
					vscode.window.showErrorMessage("Invalid draft object");
					return;
				}

				const result = await vscode.window.showWarningMessage(
					`Promote "${draft.title}" to published? This will remove the "draft: true" from the frontmatter.`,
					{ modal: true },
					"Promote"
				);

				if (result === "Promote") {
					const success = await promoteDraft(draft.path);
					if (success) {
						const undoResult = await vscode.window.showInformationMessage(
							`Successfully promoted "${draft.title}" to published!`,
							"Undo"
						);
						
						if (undoResult === "Undo") {
							const undoSuccess = await unpromoteToDraft(draft.path);
							if (undoSuccess) {
								vscode.window.showInformationMessage(
									`Reverted "${draft.title}" back to draft status.`
								);
							} else {
								vscode.window.showErrorMessage(
									`Failed to revert "${draft.title}" to draft. Check console for details.`
								);
							}
						}
						
						draftProvider.refresh();
					} else {
						vscode.window.showErrorMessage(
							`Failed to promote "${draft.title}". Check console for details.`
						);
					}
				}
			} catch (error) {
				vscode.window.showErrorMessage(`Error promoting draft: ${error}`);
			}
		}
	);

	const showInExplorerCommand = vscode.commands.registerCommand(
		"draftManager.showInExplorer",
		async (item: DraftPost | DraftTreeItem | LoadingTreeItem) => {
			try {
				// Don't allow showing loading items in explorer
				if (item instanceof LoadingTreeItem) {
					return;
				}
				
				// Handle both DraftPost and DraftTreeItem arguments
				const draft = item instanceof DraftTreeItem ? item.draft : item;
				
				if (!draft || !draft.path) {
					vscode.window.showErrorMessage("Invalid draft object - no path found");
					return;
				}

				const uri = vscode.Uri.file(draft.path);
				await vscode.commands.executeCommand("revealFileInOS", uri);
			} catch (error) {
				// Fallback: try to reveal in VS Code explorer
				try {
					// Don't process loading items in fallback either
					if (item instanceof LoadingTreeItem) {
						return;
					}
					
					const draft = item instanceof DraftTreeItem ? item.draft : item;
					const uri = vscode.Uri.file(draft.path);
					await vscode.commands.executeCommand("revealInExplorer", uri);
				} catch (fallbackError) {
					vscode.window.showErrorMessage(
						`Failed to show file in explorer: ${error}`
					);
				}
			}
		}
	);

	// Register new post manager commands
	const postRefreshCommand = vscode.commands.registerCommand(
		"postManager.refresh",
		() => {
			postProvider.refresh();
		}
	);

	const postOpenCommand = vscode.commands.registerCommand(
		"postManager.openPost",
		async (post: Post) => {
			await openPost(post);
		}
	);

	const postSearchCommand = vscode.commands.registerCommand(
		"postManager.search",
		async () => {
			const currentQuery = postProvider.getCurrentFilters().query || "";
			const query = await vscode.window.showInputBox({
				prompt: "Search posts by title, content type, or tags",
				placeHolder: "Enter search terms...",
				value: currentQuery
			});
			
			if (query !== undefined) {
				postProvider.setSearchQuery(query);
			}
		}
	);

	const filterByStatusCommand = vscode.commands.registerCommand(
		"postManager.filterByStatus",
		async () => {
			const currentFilters = postProvider.getCurrentFilters();
			const items = [
				{ 
					label: "All", 
					value: undefined, 
					description: "Show all posts",
					picked: !currentFilters.status
				},
				{ 
					label: "Drafts", 
					value: "draft", 
					description: "Show only draft posts",
					picked: currentFilters.status === "draft"
				},
				{ 
					label: "Published", 
					value: "published", 
					description: "Show only published posts",
					picked: currentFilters.status === "published"
				}
			];

			const selected = await vscode.window.showQuickPick(items, {
				placeHolder: "Filter by status"
			});

			if (selected) {
				postProvider.setStatusFilter(selected.value as any);
			}
		}
	);

	const filterByTypeCommand = vscode.commands.registerCommand(
		"postManager.filterByType",
		async () => {
			const currentFilters = postProvider.getCurrentFilters();
			const types = postProvider.getAvailableTypes();
			const items = [
				{ 
					label: "All", 
					value: undefined, 
					description: "Show all types",
					picked: !currentFilters.type
				},
				...types.map(type => ({ 
					label: type, 
					value: type, 
					description: `Show ${type} posts`,
					picked: currentFilters.type === type
				}))
			];

			const selected = await vscode.window.showQuickPick(items, {
				placeHolder: "Filter by type"
			});

			if (selected) {
				postProvider.setTypeFilter(selected.value);
			}
		}
	);

	const clearFiltersCommand = vscode.commands.registerCommand(
		"postManager.clearFilters",
		() => {
			postProvider.clearFilters();
		}
	);

	const removeFilterCommand = vscode.commands.registerCommand(
		"postManager.removeFilter",
		(filterType: string) => {
			postProvider.removeFilter(filterType);
		}
	);

	const quickFilterCommand = vscode.commands.registerCommand(
		"postManager.quickFilter",
		(filterValue: string) => {
			// Quick filters are status filters
			postProvider.setStatusFilter(filterValue as 'draft' | 'published');
		}
	);

	const showStatisticsCommand = vscode.commands.registerCommand(
		"postManager.showStatistics",
		() => {
			const stats = statisticsProvider.getStatistics();
			if (stats) {
				vscode.window.showInformationMessage(
					`📊 Statistics: ${stats.totalPosts} posts, ${stats.totalWords} words, ${stats.draftCount} drafts, ${stats.publishedCount} published`
				);
			}
		}
	);

	// Add all disposables to context
	context.subscriptions.push(
		draftTreeView,
		statisticsTreeView,
		filterWebview,
		draftProvider,
		postProvider,
		statisticsProvider,
		refreshCommand,
		openDraftCommand,
		promoteDraftCommand,
		showInExplorerCommand,
		postRefreshCommand,
		postOpenCommand,
		postSearchCommand,
		filterByStatusCommand,
		filterByTypeCommand,
		clearFiltersCommand,
		removeFilterCommand,
		quickFilterCommand,
		showStatisticsCommand
	);
	
	console.log("✅ POST MANAGER EXTENSION ACTIVATED SUCCESSFULLY!");
	} catch (error) {
		console.error("❌ POST MANAGER EXTENSION ACTIVATION FAILED:", error);
		vscode.window.showErrorMessage(`Post Manager extension failed to activate: ${error}`);
	}
}

export function deactivate() {
	console.log("Draft Manager extension is now deactivated");
}
