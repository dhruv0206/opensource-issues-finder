/* API client for backend communication */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
  sort_by?: 'relevance' | 'stars' | 'recency' | null;
  days_ago?: number | null;
}

export async function searchIssues(params: SearchParams): Promise<SearchResponse> {
  const { query, limit = 20, page = 1, language, labels, sort_by, days_ago } = params;
  
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
      days_ago
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

export async function getRecentIssues(limit: number = 20): Promise<RecentResponse> {
  const response = await fetch(`${API_BASE_URL}/api/search/recent?limit=${limit}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch recent issues');
  }
  
  return response.json();
}
