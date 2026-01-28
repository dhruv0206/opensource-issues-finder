/* API client for backend communication */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface SearchResult {
  issue_id: number;
  issue_number: number;
  title: string;
  body: string | null;
  repo_name: string;
  repo_full_name: string;
  repo_stars: number;
  repo_forks: number;
  language: string | null;
  labels: string[];
  created_at: string;
  updated_at: string;
  comments_count: number;
  issue_url: string;
  repo_url: string;
  score: number;
  is_assigned?: boolean;
  assignees_count?: number;
  has_claimer?: boolean;
  repo_description?: string | null;
  repo_topics?: string[];
  repo_license?: string | null;
}

export interface ParsedQuery {
  semantic_query: string;
  language: string | null;
  min_stars: number | null;
  max_stars: number | null;
  labels: string[] | null;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | null;
  sort_by: 'stars' | 'recency' | 'relevance';
  days_ago: number | null;
  unassigned_only?: boolean;
  topics?: string[] | null;
}

export interface SearchResponse {
  results: SearchResult[];
  parsed_query: ParsedQuery;
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface SearchParams {
  query: string;
  limit?: number;
  page?: number;
  // Manual overrides
  language?: string | null;
  labels?: string[] | null;
  sort_by?: 'newest' | 'recently_discussed' | 'relevance' | 'stars' | null;
  days_ago?: number | null;
  unassigned_only?: boolean;
}

export async function searchIssues(params: SearchParams): Promise<SearchResponse> {
  const { query, limit = 20, page = 1, language, labels, sort_by, days_ago, unassigned_only } = params;
  
  const response = await fetch(`${API_BASE_URL}/api/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      query, 
      limit, 
      page,
      language,
      labels,
      sort_by,
      days_ago,
      unassigned_only
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Search failed');
  }

  return response.json();
}

export interface HealthStatus {
  status: string;
  index_stats?: {
    dimension: number;
    index_fullness: number;
    total_vector_count: number;
  };
  error?: string;
}

export async function checkHealth(): Promise<HealthStatus> {
  const response = await fetch(`${API_BASE_URL}/api/search/health`);
  return response.json();
}

export interface RecentResponse {
  results: SearchResult[];
  total: number;
}

export async function getRecentIssues(
  limit: number = 20, 
  sortBy: 'newest' | 'recently_discussed' | 'relevance' | 'stars' = 'recently_discussed',
  languages?: string[],
  labels?: string[],
  daysAgo?: number | null,
  unassignedOnly?: boolean
): Promise<RecentResponse> {
  const params = new URLSearchParams();
  params.append('limit', limit.toString());
  params.append('sort_by', sortBy);
  if (languages && languages.length > 0) params.append('languages', languages.join(','));
  if (labels && labels.length > 0) params.append('labels', labels.join(','));
  if (daysAgo) params.append('days_ago', daysAgo.toString());
  if (unassignedOnly) params.append('unassigned_only', 'true');
  
  const response = await fetch(`${API_BASE_URL}/api/search/recent?${params.toString()}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch recent issues');
  }
  
  return response.json();
}

export interface LastUpdatedResponse {
  last_updated: string | null;
  timestamp: number | null;
}

export async function getLastUpdated(): Promise<LastUpdatedResponse> {
  const response = await fetch(`${API_BASE_URL}/api/search/last-updated`);
  return response.json();
}

export interface StatsResponse {
  total_issues: number;
  total_repos: number | null;
  last_updated: string | null;
}

export async function getStats(): Promise<StatsResponse> {
  const response = await fetch(`${API_BASE_URL}/api/search/stats`);
  return response.json();
}
