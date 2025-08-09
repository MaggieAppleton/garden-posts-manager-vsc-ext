import * as vscode from "vscode";
import { Post } from "../shared/types";
import { PostTreeItem } from "./postItem";

/**
 * Open a post in the editor
 */
export async function openPost(post: Post): Promise<void> {
	try {
		console.log("Opening post:", post);
		console.log("Post path:", post.path);
		
		if (!post || !post.path) {
			vscode.window.showErrorMessage("Invalid post object - no path found");
			return;
		}
		
		const document = await vscode.workspace.openTextDocument(post.path);
		await vscode.window.showTextDocument(document);
	} catch (error) {
		console.error("Error opening post:", error);
		vscode.window.showErrorMessage(`Failed to open post: ${error}`);
	}
}

/**
 * Show post in file explorer
 */
export async function showPostInExplorer(post: Post): Promise<void> {
	try {
		if (!post || !post.path) {
			vscode.window.showErrorMessage("Invalid post object - no path found");
			return;
		}

		const uri = vscode.Uri.file(post.path);
		await vscode.commands.executeCommand("revealFileInOS", uri);
	} catch (error) {
		// Fallback: try to reveal in VS Code explorer
		try {
			const uri = vscode.Uri.file(post.path);
			await vscode.commands.executeCommand("revealInExplorer", uri);
		} catch (fallbackError) {
			vscode.window.showErrorMessage(
				`Failed to show file in explorer: ${error}`
			);
		}
	}
}

/**
 * Copy post file path to clipboard
 */
export async function copyPostPath(post: Post): Promise<void> {
	try {
		if (!post || !post.path) {
			vscode.window.showErrorMessage("Invalid post object - no path found");
			return;
		}

		await vscode.env.clipboard.writeText(post.path);
		vscode.window.showInformationMessage("Post path copied to clipboard");
	} catch (error) {
		vscode.window.showErrorMessage(`Failed to copy path: ${error}`);
	}
}
