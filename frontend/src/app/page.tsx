'use client';

import { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/Header';
import { SearchBar } from '@/components/SearchBar';
import { SearchResults } from '@/components/SearchResults';
import { ParsedQueryDisplay } from '@/components/ParsedQueryDisplay';
import { Pagination } from '@/components/Pagination';
import { useSearch } from '@/hooks/useSearch';
import { getRecentIssues, SearchResult } from '@/lib/api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';

const ITEMS_PER_PAGE = 10;

export default function Home() {
  const { results, parsedQuery, isLoading, error, pagination, search, goToPage, clearResults } = useSearch();
  const [hasSearched, setHasSearched] = useState(false);
  const [allRecentIssues, setAllRecentIssues] = useState<SearchResult[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [recentPage, setRecentPage] = useState(1);

  // Load recent issues on page mount
  useEffect(() => {
    async function loadRecent() {
      try {
        const response = await getRecentIssues(50); // Fetch more for pagination
        setAllRecentIssues(response.results);
      } catch (err) {
        console.error('Failed to load recent issues:', err);
      } finally {
        setRecentLoading(false);
      }
    }
    loadRecent();
  }, []);

  // Paginate recent issues locally
  const recentPagination = useMemo(() => {
    if (allRecentIssues.length === 0) return null;
    const total = allRecentIssues.length;
    const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
    const page = Math.min(recentPage, totalPages);
    return {
      page,
      totalPages,
      total,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }, [allRecentIssues, recentPage]);

  const recentIssues = useMemo(() => {
    const startIdx = (recentPage - 1) * ITEMS_PER_PAGE;
    const endIdx = startIdx + ITEMS_PER_PAGE;
    return allRecentIssues.slice(startIdx, endIdx);
  }, [allRecentIssues, recentPage]);

  const handleSearch = async (query: string) => {
    setHasSearched(true);
    await search(query);
  };

  const handleClear = () => {
    clearResults();
    setHasSearched(false);
    setRecentPage(1);
  };

  const handleRecentPageChange = (page: number) => {
    setRecentPage(page);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  // Show recent issues if no search has been performed
  const displayResults = hasSearched ? results : recentIssues;
  const showLoading = hasSearched ? isLoading : recentLoading;
  const currentPagination = hasSearched ? pagination : recentPagination;
  const handlePageChange = hasSearched ? goToPage : handleRecentPageChange;

  // Pagination component to reuse
  const PaginationBlock = () => (
    currentPagination && displayResults.length > 0 ? (
      <Pagination
        page={currentPagination.page}
        totalPages={currentPagination.totalPages}
        total={currentPagination.total}
        hasNext={currentPagination.hasNext}
        hasPrev={currentPagination.hasPrev}
        onPageChange={handlePageChange}
        isLoading={isLoading}
      />
    ) : null
  );

  return (
    <main className="min-h-screen">
      <Header />

      {/* Hero Section */}
      <section className="pt-24 pb-8 px-4">
        <div className="max-w-4xl mx-auto text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Find Your Next{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neutral-400 to-neutral-600">
              Open Source Contribution
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Use natural language to discover beginner-friendly issues, help wanted requests,
            and contribution opportunities across GitHub&apos;s most popular repositories.
          </p>
        </div>

        {/* Search */}
        <div className="max-w-4xl mx-auto mb-8">
          <SearchBar onSearch={handleSearch} isLoading={isLoading} />
        </div>
      </section>

      {/* Results Section */}
      <section className="px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          {/* Error Message */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <ExclamationCircleIcon className="h-4 w-4" />
              <AlertTitle>Search failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Parsed Query Display */}
          {parsedQuery && !isLoading && (
            <ParsedQueryDisplay parsedQuery={parsedQuery} onClear={handleClear} />
          )}

          {/* Section Title */}
          {!hasSearched && !recentLoading && allRecentIssues.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-muted-foreground">
                🔥 Recent Contribution Opportunities
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Fresh issues from popular repositories
              </p>
            </div>
          )}

          {/* Top Pagination */}
          <PaginationBlock />

          {/* Results */}
          <SearchResults results={displayResults} isLoading={showLoading} />

          {/* Bottom Pagination */}
          <PaginationBlock />

          {/* Empty State - only after search */}
          {hasSearched && !isLoading && results.length === 0 && !error && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold mb-2">No issues found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search query or using different keywords.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 px-4">
        <div className="max-w-4xl mx-auto text-center text-sm text-muted-foreground">
          <p>
            Powered by{' '}
            <a
              href="https://ai.google.dev/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Gemini AI
            </a>
            {' '}&{' '}
            <a
              href="https://www.pinecone.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Pinecone
            </a>
          </p>
        </div>
      </footer>
    </main>
  );
}
