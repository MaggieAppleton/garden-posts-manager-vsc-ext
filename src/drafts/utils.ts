import { DraftPost } from "./draftItem";
import { findAllPosts, calculateDraftStatus } from "../core/utils";

/**
 * Find draft files in the workspace
 */
export async function findDraftFiles(): Promise<DraftPost[]> {
	const posts = await findAllPosts();
	const drafts = posts.filter(post => post.status === 'draft');
	
	// Convert to DraftPost instances
	return drafts.map(post => new DraftPost(
		post.path,
		post.title,
		post.wordCount,
		post.lastModified,
		post.type,
		calculateDraftStatus(post.lastModified, post.wordCount)
	));
}
