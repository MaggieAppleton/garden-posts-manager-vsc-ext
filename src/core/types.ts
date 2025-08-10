export type ContentType =
	| "note"
	| "essay"
	| "smidgeon"
	| "now"
	| "pattern"
	| "talk";

export type DraftStatus = "fresh" | "stale" | "default";

export interface Post {
	path: string;
	title: string;
	slug?: string;
	wordCount: number;
	lastModified: Date;
	created: Date;
	type: ContentType;
	status: "draft" | "published";
	tags?: string[];
	description?: string;
	publishedDate?: Date;
}

export interface PostStatistics {
	totalPosts: number;
	totalWords: number;
	draftCount: number;
	publishedCount: number;
	postsThisMonth: number;
	postsThisYear: number;
	averagePostsPerMonth: number;
	typeBreakdown: Record<ContentType, number>;
	wordCountDistribution: {
		short: number; // <300 words
		medium: number; // 300-1000
		long: number; // >1000
	};
}

export interface SearchFilters {
	query?: string;
	status?: "draft" | "published";
	type?: ContentType;
}
