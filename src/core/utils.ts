import * as vscode from "vscode";
import * as path from "path";
import * as matter from "gray-matter";
import { Post, ContentType, PostStatistics, DraftStatus } from "./types";
import { DraftPost } from "../drafts/draftItem";

/**
 * Scan workspace for all MDX files (both draft and published)
 */
export async function findAllPosts(): Promise<Post[]> {
	const posts: Post[] = [];

	// Find all .mdx files in workspace
	const mdxFiles = await vscode.workspace.findFiles(
		"**/*.mdx",
		"**/node_modules/**"
	);

	for (const fileUri of mdxFiles) {
		try {
			const post = await parsePostFile(fileUri);
			if (post) {
				posts.push(post);
			}
		} catch (error) {
			console.error(`Error parsing post file ${fileUri.fsPath}:`, error);
		}
	}

	// Sort posts: drafts first, then by last modified (newest first)
	posts.sort((a, b) => {
		// Drafts first
		if (a.status === 'draft' && b.status === 'published') return -1;
		if (a.status === 'published' && b.status === 'draft') return 1;
		
		// Within same status, sort by last modified (newest first)
		return b.lastModified.getTime() - a.lastModified.getTime();
	});

	return posts;
}

/**
 * Parse a single MDX file and return Post
 */
export async function parsePostFile(fileUri: vscode.Uri): Promise<Post | null> {
	try {
		const fileContent = await vscode.workspace.fs.readFile(fileUri);
		const contentString = Buffer.from(fileContent).toString("utf8");

		// Parse frontmatter
		const parsed = matter(contentString);
		const frontmatter = parsed.data;

		// Get file stats for dates
		const stats = await vscode.workspace.fs.stat(fileUri);
		const lastModified = new Date(stats.mtime);
		const created = new Date(stats.ctime);

		// Extract title (from frontmatter or filename)
		const title =
			frontmatter.title ||
			frontmatter.name ||
			path.basename(fileUri.fsPath, ".mdx");

		// Get content type (default to 'note' if not specified)
		const type = frontmatter.type || "note";

		// Validate content type
		const validTypes: ContentType[] = ["note", "essay", "smidgeon", "now", "pattern", "talk"];
		const contentType: ContentType = validTypes.includes(type) ? type : "note";

		// Determine status
		const status = frontmatter.draft === true ? 'draft' : 'published';

		// Count words in content (excluding frontmatter)
		const wordCount = countWords(parsed.content);

		// Extract other metadata
		const slug = frontmatter.slug;
		const tags = frontmatter.tags;
		const description = frontmatter.description;
		const publishedDate = frontmatter.publishedDate ? new Date(frontmatter.publishedDate) : 
							 frontmatter.date ? new Date(frontmatter.date) : undefined;

		return {
			path: fileUri.fsPath,
			title,
			slug,
			wordCount,
			lastModified,
			created,
			type: contentType,
			status,
			tags,
			description,
			publishedDate
		};
	} catch (error) {
		console.error(`Error parsing file ${fileUri.fsPath}:`, error);
		return null;
	}
}

/**
 * Count words in markdown content
 */
export function countWords(content: string): number {
	if (!content || content.trim().length === 0) {
		return 0;
	}

	// Clean content by removing all syntax and keeping only readable text
	const cleanContent = content
		// MDX-specific syntax
		.replace(/^import\s+.*?from\s+.*?;?$/gm, "") // Remove import statements
		.replace(/^export\s+.*?;?$/gm, "") // Remove export statements
		.replace(/<([A-Z][A-Za-z0-9]*)[^>]*>(.*?)<\/\1>/gs, "$2") // Extract content from custom components
		.replace(/<([A-Z][A-Za-z0-9]*)[^>]*\/>/g, "") // Remove self-closing custom components
		.replace(/<([A-Z][A-Za-z0-9]*)[^>]*><\/\1>/g, "") // Remove empty custom components
		.replace(/\{[^}]*\}/g, "") // Remove JSX expressions
		// Standard markdown syntax
		.replace(/#{1,6}\s+/g, "") // Remove headers
		.replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold
		.replace(/\*(.*?)\*/g, "$1") // Remove italic
		.replace(/`(.*?)`/g, "$1") // Remove inline code
		.replace(/```[\s\S]*?```/g, "") // Remove code blocks
		.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1") // Replace links with text
		.replace(/!\[([^\]]*)\]\([^\)]+\)/g, "") // Remove images
		.trim();

	if (cleanContent.length === 0) {
		return 0;
	}

	// Split by whitespace and filter empty strings
	const words = cleanContent.split(/\s+/).filter((word) => word.length > 0);
	return words.length;
}

/**
 * Calculate statistics for a collection of posts
 */
export function calculatePostStatistics(posts: Post[]): PostStatistics {
	const now = new Date();
	const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
	const thisYear = new Date(now.getFullYear(), 0, 1);

	const totalPosts = posts.length;
	const totalWords = posts.reduce((sum, post) => sum + post.wordCount, 0);
	const draftCount = posts.filter(p => p.status === 'draft').length;
	const publishedCount = posts.filter(p => p.status === 'published').length;

	const postsThisMonth = posts.filter(p => p.lastModified >= thisMonth).length;
	const postsThisYear = posts.filter(p => p.lastModified >= thisYear).length;

	// Calculate average posts per month (simple approximation)
	const monthsActive = Math.max(1, Math.ceil((now.getTime() - thisYear.getTime()) / (1000 * 60 * 60 * 24 * 30)));
	const averagePostsPerMonth = Number((postsThisYear / monthsActive).toFixed(1));

	// Type breakdown
	const typeBreakdown: Record<ContentType, number> = {
		note: 0,
		essay: 0,
		smidgeon: 0,
		now: 0,
		pattern: 0,
		talk: 0
	};

	posts.forEach(post => {
		typeBreakdown[post.type]++;
	});

	// Word count distribution
	const wordCountDistribution = {
		short: posts.filter(p => p.wordCount < 300).length,
		medium: posts.filter(p => p.wordCount >= 300 && p.wordCount <= 1000).length,
		long: posts.filter(p => p.wordCount > 1000).length
	};

	return {
		totalPosts,
		totalWords,
		draftCount,
		publishedCount,
		postsThisMonth,
		postsThisYear,
		averagePostsPerMonth,
		typeBreakdown,
		wordCountDistribution
	};
}

/**
 * Calculate draft status based on freshness and word count
 */
export function calculateDraftStatus(lastModified: Date, wordCount: number): DraftStatus {
	const now = new Date();
	const daysSinceModified = Math.floor((now.getTime() - lastModified.getTime()) / (1000 * 60 * 60 * 24));
	
	if (daysSinceModified <= 30) {
		return "fresh";
	} else if (daysSinceModified >= 180 || wordCount < 300) {
		return "stale";
	} else {
		return "default";
	}
}

/**
 * Promote a draft to published status
 */
export async function promoteDraft(filePath: string): Promise<boolean> {
	try {
		const fileUri = vscode.Uri.file(filePath);
		const fileContent = await vscode.workspace.fs.readFile(fileUri);
		const contentString = Buffer.from(fileContent).toString("utf8");
		
		const parsed = matter(contentString);
		
		// Remove draft: true from frontmatter or set it to false
		delete parsed.data.draft;
		
		// Add published date if not present
		if (!parsed.data.publishedDate && !parsed.data.date) {
			parsed.data.publishedDate = new Date().toISOString().split('T')[0];
		}
		
		const newContent = matter.stringify(parsed.content, parsed.data);
		await vscode.workspace.fs.writeFile(fileUri, Buffer.from(newContent, 'utf8'));
		
		vscode.window.showInformationMessage(`Promoted draft: ${path.basename(filePath)}`);
		return true;
	} catch (error) {
		console.error('Error promoting draft:', error);
		vscode.window.showErrorMessage(`Failed to promote draft: ${error instanceof Error ? error.message : 'Unknown error'}`);
		return false;
	}
}

/**
 * Convert a published post back to draft status
 */
export async function unpromoteToDraft(filePath: string): Promise<boolean> {
	try {
		const fileUri = vscode.Uri.file(filePath);
		const fileContent = await vscode.workspace.fs.readFile(fileUri);
		const contentString = Buffer.from(fileContent).toString("utf8");
		
		const parsed = matter(contentString);
		
		// Set draft: true in frontmatter
		parsed.data.draft = true;
		
		const newContent = matter.stringify(parsed.content, parsed.data);
		await vscode.workspace.fs.writeFile(fileUri, Buffer.from(newContent, 'utf8'));
		
		vscode.window.showInformationMessage(`Converted to draft: ${path.basename(filePath)}`);
		return true;
	} catch (error) {
		console.error('Error converting to draft:', error);
		vscode.window.showErrorMessage(`Failed to convert to draft: ${error instanceof Error ? error.message : 'Unknown error'}`);
		return false;
	}
}

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
