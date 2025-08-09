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
		this._posts = posts;
		this._filteredPosts = filteredPosts;
		this._filters = filters;
		this._updateWebview();
	}

	private _updateWebview() {
		if (this._view) {
			this._view.webview.postMessage({
				type: 'updateData',
				posts: this._posts,
				filteredPosts: this._filteredPosts,
				filters: this._filters,
				availableTypes: [...new Set(this._posts.map(p => p.type))].sort()
			});
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

					<!-- Active Filters -->
					<div id="activeFilters" class="active-filters" style="display: none;">
						<div class="section-title">Active Filters</div>
						<div id="filterChips" class="filter-chips"></div>
						<button id="clearAllFilters" class="clear-all-btn">Clear All</button>
					</div>

					<!-- Quick Filters -->
					<div id="quickFilters" class="quick-filters">
						<div class="section-title">Quick Filters</div>
						<div class="filter-buttons">
							<button class="filter-btn status-filter" data-status="draft">
								📝 Drafts Only
							</button>
							<button class="filter-btn status-filter" data-status="published">
								✅ Published Only
							</button>
						</div>
					</div>

					<!-- Advanced Filters -->
					<div class="advanced-filters">
						<div class="section-title">Advanced Filters</div>
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

					// Status filter buttons
					document.querySelectorAll('.status-filter').forEach(btn => {
						btn.addEventListener('click', () => {
							const status = btn.dataset.status;
							const isActive = btn.classList.contains('active');
							vscode.postMessage({ 
								type: 'setStatus', 
								value: isActive ? '' : status 
							});
						});
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

						// Hide quick filters if filters are active
						const hasFilters = Object.keys(currentFilters).some(key => currentFilters[key]);
						document.getElementById('quickFilters').style.display = hasFilters ? 'none' : 'block';
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
						// Update quick filter button states
						document.querySelectorAll('.status-filter').forEach(btn => {
							const isActive = currentFilters.status === btn.dataset.status;
							btn.classList.toggle('active', isActive);
						});
					}

					function updatePostsList() {
						const postsList = document.getElementById('postsList');
						postsList.innerHTML = '';

						if (filteredPosts.length === 0) {
							postsList.innerHTML = '<div class="no-posts">No posts found</div>';
							return;
						}

						filteredPosts.forEach(post => {
							const postItem = document.createElement('div');
							postItem.className = \`post-item \${post.status}\`;
							
							const statusIcon = post.status === 'draft' ? '📝' : '✅';
							const typeLabel = post.type;
							const wordCount = post.wordCount;
							const date = new Date(post.lastModified).toLocaleDateString();
							
							postItem.innerHTML = \`
								<div class="post-header">
									<span class="post-status">\${statusIcon}</span>
									<div class="post-title">\${post.title}</div>
									<button class="post-open" data-path="\${post.path}">Open</button>
								</div>
								<div class="post-meta">
									<span class="post-type">\${typeLabel}</span>
									<span class="post-words">\${wordCount}w</span>
									<span class="post-date">\${date}</span>
								</div>
								\${post.description ? \`<div class="post-description">\${post.description}</div>\` : ''}
							\`;
							
							postsList.appendChild(postItem);
						});

						// Add click handlers for open buttons
						postsList.querySelectorAll('.post-open').forEach(btn => {
							btn.addEventListener('click', () => {
								vscode.postMessage({ 
									type: 'openPost', 
									path: btn.dataset.path 
								});
							});
						});

						// Add click handlers for post items
						postsList.querySelectorAll('.post-item').forEach(item => {
							item.addEventListener('click', (e) => {
								if (!e.target.classList.contains('post-open')) {
									const openBtn = item.querySelector('.post-open');
									if (openBtn) {
										openBtn.click();
									}
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
