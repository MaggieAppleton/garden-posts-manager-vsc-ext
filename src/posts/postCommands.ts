import * as vscode from "vscode";
import { Post } from "../core/types";
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
 * Open a post in the editor
 */

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
