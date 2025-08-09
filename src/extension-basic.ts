import * as vscode from "vscode";
import { DraftProvider } from "./draftProvider";
import { DraftPost, DraftTreeItem, LoadingTreeItem } from "./draftItem";
import { promoteDraft, unpromoteToDraft } from "./utils";

export function activate(context: vscode.ExtensionContext) {
	console.log("🚀 DRAFT MANAGER EXTENSION ACTIVATING...");
	
	try {
		console.log("Draft Manager extension is now active");

		// Create the draft provider
		console.log("Creating draft provider...");
		const draftProvider = new DraftProvider(context.extensionPath);

		// Register the draft tree view
		const draftTreeView = vscode.window.createTreeView("draftManager", {
			treeDataProvider: draftProvider,
			showCollapseAll: false,
		});

		console.log("Tree view created");

		// Update tree view title with count
		const updateTreeViewTitle = () => {
			const draftCount = draftProvider.getDraftCount();
			draftTreeView.title = `Drafts (${draftCount})`;
		};

		// Update title on data changes
		draftProvider.onDidChangeTreeData(() => {
			updateTreeViewTitle();
		});

		// Initial title update
		updateTreeViewTitle();

		// Register draft commands
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
						
						if (!draft || !draft.path) {
							vscode.window.showErrorMessage("Invalid draft object - no path found");
							return;
						}

						const uri = vscode.Uri.file(draft.path);
						await vscode.commands.executeCommand("revealInExplorer", uri);
					} catch (fallbackError) {
						console.error("Both reveal methods failed:", error, fallbackError);
						vscode.window.showErrorMessage(
							`Failed to show file in explorer: ${error}`
						);
					}
				}
			}
		);

		// Add all disposables to context
		context.subscriptions.push(
			draftTreeView,
			draftProvider,
			refreshCommand,
			openDraftCommand,
			promoteDraftCommand,
			showInExplorerCommand
		);

		console.log("✅ DRAFT MANAGER EXTENSION ACTIVATED SUCCESSFULLY");

	} catch (error) {
		console.error("❌ DRAFT MANAGER EXTENSION ACTIVATION FAILED:", error);
		vscode.window.showErrorMessage(
			`Failed to activate Draft Manager extension: ${error}`
		);
	}
}

export function deactivate() {
	console.log("Draft Manager extension deactivated");
}
