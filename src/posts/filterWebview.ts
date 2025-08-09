import * as vscode from "vscode";
import { Post } from "../shared/types";

export class FilterWebviewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'postManager.filterView';

	private _view?: vscode.WebviewView;
	private _posts: Post[] = [];
	private _filteredPosts: Post[] = [];
	private _filters: any = {};

	constructor(
		private readonly _extensionUri: vscode.Uri,
		private readonly _onFiltersChanged: (filters: any) => void
	) {}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this._extensionUri]
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		// Handle messages from the webview
		webviewView.webview.onDidReceiveMessage(
			message => {
				switch (message.type) {
					case 'setSearch':
						this._filters.query = message.value || undefined;
						this._onFiltersChanged(this._filters);
						this._updateWebview();
						break;
					case 'setStatus':
						this._filters.status = message.value || undefined;
						this._onFiltersChanged(this._filters);
						this._updateWebview();
						break;
					case 'setType':
						this._filters.type = message.value || undefined;
						this._onFiltersChanged(this._filters);
						this._updateWebview();
						break;
					case 'clearFilters':
						this._filters = {};
						this._onFiltersChanged(this._filters);
						this._updateWebview();
						break;
					case 'removeFilter':
						delete this._filters[message.filterType];
						this._onFiltersChanged(this._filters);
						this._updateWebview();
						break;
					case 'openPost':
						// Open the post file
						const postPath = message.path;
						vscode.workspace.openTextDocument(postPath).then(doc => {
							vscode.window.showTextDocument(doc);
						});
						break;
				}
			}
		);
	}

	public updatePosts(posts: Post[], filteredPosts: Post[], filters: any) {
		console.log(`FILTER WEBVIEW: updatePosts called with ${posts.length} total posts, ${filteredPosts.length} filtered posts`);
		this._posts = posts;
		this._filteredPosts = filteredPosts;
		this._filters = filters;
		this._updateWebview();
	}

	private _updateWebview() {
		if (this._view) {
			console.log(`FILTER WEBVIEW: Sending message to webview with ${this._filteredPosts.length} filtered posts`);
			this._view.webview.postMessage({
				type: 'updateData',
				posts: this._posts,
				filteredPosts: this._filteredPosts,
				filters: this._filters,
				availableTypes: [...new Set(this._posts.map(p => p.type))].sort()
			});
		} else {
			console.log(`FILTER WEBVIEW: No webview available to update`);
		}
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'filter.css'));

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleUri}" rel="stylesheet">
				<title>Post Manager</title>
			</head>
			<body>
				<div class="container">
					<!-- Search Section -->
					<div class="search-section">
						<div class="search-box">
							<input type="text" id="searchInput" placeholder="🔍 Search posts..." />
							<button id="clearSearch" class="clear-btn" style="display: none;">✕</button>
						</div>
					</div>

					<!-- Filters -->
					<div class="filters">
						<div class="section-title">Filters</div>
						<div class="filter-group">
							<label for="statusSelect">Status:</label>
							<select id="statusSelect">
								<option value="">All</option>
								<option value="draft">Draft</option>
								<option value="published">Published</option>
							</select>
						</div>
						<div class="filter-group">
							<label for="typeSelect">Type:</label>
							<select id="typeSelect">
								<option value="">All Types</option>
							</select>
						</div>
						
						<!-- Active Filters (compact chips) -->
						<div id="activeFilters" class="active-filters-compact" style="display: none;">
							<div id="filterChips" class="filter-chips-inline"></div>
							<button id="clearAllFilters" class="clear-all-compact">Clear All</button>
						</div>
					</div>

					<!-- Results Section -->
					<div class="results-section">
						<div class="results-header">
							<span id="resultCount">0</span> posts
							<button id="toggleView" class="toggle-btn">📋</button>
						</div>
						<div id="postsList" class="posts-list"></div>
					</div>
				</div>

				<script>
					const vscode = acquireVsCodeApi();
					let currentFilters = {};
					let availableTypes = [];
					let allPosts = [];
					let filteredPosts = [];

					// Search input handling
					const searchInput = document.getElementById('searchInput');
					const clearSearch = document.getElementById('clearSearch');
					
					searchInput.addEventListener('input', debounce((e) => {
						const value = e.target.value.trim();
						vscode.postMessage({ type: 'setSearch', value });
						clearSearch.style.display = value ? 'block' : 'none';
					}, 300));

					clearSearch.addEventListener('click', () => {
						searchInput.value = '';
						clearSearch.style.display = 'none';
						vscode.postMessage({ type: 'setSearch', value: '' });
					});

					// Select dropdowns
					document.getElementById('statusSelect').addEventListener('change', (e) => {
						vscode.postMessage({ type: 'setStatus', value: e.target.value });
					});

					document.getElementById('typeSelect').addEventListener('change', (e) => {
						vscode.postMessage({ type: 'setType', value: e.target.value });
					});

					// Clear all filters
					document.getElementById('clearAllFilters').addEventListener('click', () => {
						vscode.postMessage({ type: 'clearFilters' });
					});

					// Handle messages from extension
					window.addEventListener('message', event => {
						const message = event.data;
						if (message.type === 'updateData') {
							updateUI(message);
						}
					});

					function updateUI(data) {
						currentFilters = data.filters;
						availableTypes = data.availableTypes;
						allPosts = data.posts;
						filteredPosts = data.filteredPosts;

						// Update search input
						searchInput.value = currentFilters.query || '';
						clearSearch.style.display = currentFilters.query ? 'block' : 'none';

						// Update selects
						document.getElementById('statusSelect').value = currentFilters.status || '';
						
						const typeSelect = document.getElementById('typeSelect');
						typeSelect.innerHTML = '<option value="">All Types</option>';
						availableTypes.forEach(type => {
							const option = document.createElement('option');
							option.value = type;
							option.textContent = type;
							option.selected = currentFilters.type === type;
							typeSelect.appendChild(option);
						});

						// Update active filters
						updateActiveFilters();

						// Update results count
						document.getElementById('resultCount').textContent = filteredPosts.length;

						// Update button states
						updateButtonStates();

						// Update posts list
						updatePostsList();
					}

					function updateActiveFilters() {
						const activeFiltersDiv = document.getElementById('activeFilters');
						const filterChipsDiv = document.getElementById('filterChips');
						
						const hasFilters = Object.keys(currentFilters).some(key => currentFilters[key]);
						
						if (hasFilters) {
							activeFiltersDiv.style.display = 'block';
							filterChipsDiv.innerHTML = '';
							
							Object.entries(currentFilters).forEach(([key, value]) => {
								if (value) {
									const chip = document.createElement('div');
									chip.className = 'filter-chip';
									chip.innerHTML = \`
										<span class="chip-label">\${key}: \${value}</span>
										<button class="chip-remove" data-filter="\${key}">✕</button>
									\`;
									filterChipsDiv.appendChild(chip);
								}
							});

							// Add click handlers for remove buttons
							filterChipsDiv.querySelectorAll('.chip-remove').forEach(btn => {
								btn.addEventListener('click', () => {
									vscode.postMessage({ 
										type: 'removeFilter', 
										filterType: btn.dataset.filter 
									});
								});
							});
						} else {
							activeFiltersDiv.style.display = 'none';
						}
					}

					function updateButtonStates() {
						// Update select dropdown states
						const statusSelect = document.getElementById('statusSelect');
						const typeSelect = document.getElementById('typeSelect');
						
						statusSelect.value = currentFilters.status || '';
						typeSelect.value = currentFilters.type || '';
					}

					function updatePostsList() {
						postsList.innerHTML = '';

						if (filteredPosts.length === 0) {
							postsList.innerHTML = '<div class="no-posts">No posts found</div>';
							return;
						}

						filteredPosts.forEach(post => {
							const postItem = document.createElement('div');
							postItem.className = \`post-item \${post.status}\`;
							
							// Simple single-line format like tree view
							const statusIcon = post.status === 'draft' ? '📝' : '✅';
							const typeLabel = post.type.charAt(0).toUpperCase() + post.type.slice(1);
							const wordCount = post.wordCount;
							
							// Format time like in tree view
							const timeAgo = new Date(post.lastModified);
							const now = new Date();
							const diffTime = Math.abs(now - timeAgo);
							const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
							
							let timeString;
							if (diffDays === 1) {
								timeString = '1d';
							} else if (diffDays < 7) {
								timeString = diffDays + 'd';
							} else if (diffDays < 30) {
								timeString = Math.ceil(diffDays / 7) + 'w';
							} else if (diffDays < 365) {
								timeString = Math.ceil(diffDays / 30) + 'mo';
							} else {
								timeString = Math.ceil(diffDays / 365) + 'y';
							}
							
							// Truncate title to match tree view
							const truncatedTitle = post.title.length > 28 
								? post.title.substring(0, 28) + "..."
								: post.title;
							
							postItem.innerHTML = \`
								<div class="post-line">
									<span class="post-icon">\${statusIcon}</span>
									<span class="post-title-text">\${truncatedTitle}</span>
									<span class="post-metadata">\${typeLabel} • \${wordCount}w • \${timeString}</span>
								</div>
							\`;
							
							postsList.appendChild(postItem);
						});

						// Add click handlers for post items
						postsList.querySelectorAll('.post-item').forEach(item => {
							item.addEventListener('click', () => {
								const index = Array.from(item.parentNode.children).indexOf(item);
								const post = filteredPosts[index];
								if (post) {
									vscode.postMessage({ 
										type: 'openPost', 
										path: post.path 
									});
								}
							});
						});
					}

					function debounce(func, wait) {
						let timeout;
						return function executedFunction(...args) {
							const later = () => {
								clearTimeout(timeout);
								func(...args);
							};
							clearTimeout(timeout);
							timeout = setTimeout(later, wait);
						};
					}
				</script>
			</body>
			</html>`;
	}
}
