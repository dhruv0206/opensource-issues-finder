'use client';

import { useState, useCallback, useMemo } from 'react';
import { searchIssues, SearchResult, ParsedQuery, SearchResponse } from '@/lib/api';

const ITEMS_PER_PAGE = 10; // Display 10 per page
const FETCH_LIMIT = 100; // Fetch more from backend for local pagination

interface PaginationState {
  page: number;
  totalPages: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Search options passed from UI
export interface SearchOptions {
  language?: string | null;
  labels?: string[] | null;
  sortBy?: "newest" | "recently_discussed" | "relevance" | "stars" | null;
  daysAgo?: number | null;
  unassignedOnly?: boolean;
}

interface UseSearchReturn {
  results: SearchResult[];
  parsedQuery: ParsedQuery | null;
  isLoading: boolean;
  error: string | null;
  pagination: PaginationState | null;
  currentQuery: string;
  search: (query: string, options?: SearchOptions) => Promise<void>;
  goToPage: (page: number) => void;
  clearResults: () => void;
}

export function useSearch(): UseSearchReturn {
  const [allResults, setAllResults] = useState<SearchResult[]>([]);
  const [parsedQuery, setParsedQuery] = useState<ParsedQuery | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentQuery, setCurrentQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Calculate pagination from all results
  const pagination = useMemo<PaginationState | null>(() => {
    if (allResults.length === 0) return null;
    
    const total = allResults.length;
    const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
    const page = Math.min(currentPage, totalPages);
    
    return {
      page,
      totalPages,
      total,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }, [allResults, currentPage]);

  // Get results for current page
  const results = useMemo(() => {
    if (allResults.length === 0) return [];
    
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIdx = startIdx + ITEMS_PER_PAGE;
    return allResults.slice(startIdx, endIdx);
  }, [allResults, currentPage]);

  const search = useCallback(async (query: string, options?: SearchOptions) => {
    // If no query and no filters, just clear
    if (!query.trim() && !options) {
      setAllResults([]);
      setParsedQuery(null);
      setCurrentQuery('');
      setCurrentPage(1);
      return;
    }

    setIsLoading(true);
    setError(null);
    setCurrentQuery(query);
    setCurrentPage(1);

    try {
      // Fetch more results, paginate locally
      const response: SearchResponse = await searchIssues({ 
        query, 
        page: 1, 
        limit: FETCH_LIMIT,
        language: options?.language,
        labels: options?.labels,
        sort_by: options?.sortBy,
        days_ago: options?.daysAgo,
        unassigned_only: options?.unassignedOnly
      });
      setAllResults(response.results);
      setParsedQuery(response.parsed_query);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setAllResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(page);
    // Scroll to top of results
    window.scrollTo({ top: 300, behavior: 'smooth' });
  }, []);

  const clearResults = useCallback(() => {
    setAllResults([]);
    setParsedQuery(null);
    setError(null);
    setCurrentQuery('');
    setCurrentPage(1);
  }, []);

  return {
    results,
    parsedQuery,
    isLoading,
    error,
    pagination,
    currentQuery,
    search,
    goToPage,
    clearResults,
  };
}
