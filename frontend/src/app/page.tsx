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

import { FilterBar } from '@/components/FilterBar';

// ... imports

export default function Home() {
  const { results, parsedQuery, isLoading, error, pagination, search, goToPage, clearResults, currentQuery } = useSearch();
  const [hasSearched, setHasSearched] = useState(false);

  // Filter State
  const [language, setLanguage] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"relevance" | "stars" | "recency">("recency");
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [daysAgo, setDaysAgo] = useState<number | null>(null);

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

  // Sync UI state with AI-parsed query
  useEffect(() => {
    if (parsedQuery) {
      // Sync Language
      if (parsedQuery.language) setLanguage(parsedQuery.language);

      // Sync Sort
      if (parsedQuery.sort_by) setSortBy(parsedQuery.sort_by);

      // Sync Time
      if (parsedQuery.days_ago) setDaysAgo(parsedQuery.days_ago);

      // Sync Labels (simple match for now)
      if (parsedQuery.labels && parsedQuery.labels.length > 0) {
        // Check if any of the parsed labels match our predefined labels
        // This is a basic heuristic since dropdown is single-select
        const knownLabels = ["good first issue", "help wanted", "documentation", "enhancement", "bug", "beginner"];
        const matched = parsedQuery.labels.find(l => knownLabels.includes(l.toLowerCase()));
        if (matched) setSelectedLabel(matched);
      }
    }
  }, [parsedQuery]);

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
    // Reset filters on new search
    setLanguage(null);
    setSortBy("relevance");
    setSelectedLabel(null);
    setDaysAgo(null);
    setHasSearched(true);

    // Perform search with default/empty filters
    await search(query, {
      language: null,
      sortBy: "recency",
      labels: undefined,
      daysAgo: null
    });
  };

  // Filter Handlers
  const handleLanguageChange = (lang: string | null) => {
    setLanguage(lang);
    if (hasSearched) {
      search(currentQuery, {
        language: lang,
        sortBy,
        labels: selectedLabel ? [selectedLabel] : undefined,
        daysAgo
      });
    }
  };

  const handleSortChange = (sort: "relevance" | "stars" | "recency") => {
    setSortBy(sort);
    if (hasSearched) {
      search(currentQuery, {
        language,
        sortBy: sort,
        labels: selectedLabel ? [selectedLabel] : undefined,
        daysAgo
      });
    }
  };

  const handleLabelChange = (label: string | null) => {
    setSelectedLabel(label);
    if (hasSearched) {
      search(currentQuery, {
        language,
        sortBy,
        labels: label ? [label] : undefined,
        daysAgo
      });
    }
  };

  const handleTimeChange = (days: number | null) => {
    setDaysAgo(days);
    if (hasSearched) {
      search(currentQuery, {
        language,
        sortBy,
        labels: selectedLabel ? [selectedLabel] : undefined,
        daysAgo: days
      });
    }
  };

  const handleClear = () => {
    clearResults();
    setHasSearched(false);
    setRecentPage(1);
    // Optional: Reset filters on clear?
    // setLanguage(null);
    // setSortBy("relevance");
    // setSelectedLabel(null);
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
        {/* ... title ... */}

        {/* Search */}
        <div className="max-w-4xl mx-auto mb-8 flex flex-col items-center">
          <div className="w-full mb-6">
            <SearchBar onSearch={handleSearch} isLoading={isLoading} />
          </div>

          <div className="w-full h-px bg-border/50 mb-6" />

          <div className="w-full flex justify-center">
            <FilterBar
              language={language}
              sortBy={sortBy}
              selectedLabel={selectedLabel}
              daysAgo={daysAgo}
              onLanguageChange={handleLanguageChange}
              onSortChange={handleSortChange}
              onLabelChange={handleLabelChange}
              onTimeChange={handleTimeChange}
            />
          </div>
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

      {/* Footer - Modified with Credits & Actions */}
      <footer className="border-t border-border py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Left - Credits */}
            <div className="text-sm text-muted-foreground text-center md:text-left">
              <p>
                Built by{' '}
                <a
                  href="https://www.linkedin.com/in/dhruv-patel-0206/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  Dhruv
                </a>
              </p>
            </div>

            {/* Right - Actions */}
            <div className="flex items-center gap-3">
              <a
                href="https://www.linkedin.com/in/dhruv-patel-0206/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="LinkedIn"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
              <a
                href="https://github.com/dhruv0206/opensource-issues-finder"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="GitHub"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
              </a>
              <a
                href="https://discord.gg/dZRFt9kN"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Discord"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
              </a>
              <a
                href="https://github.com/dhruv0206/opensource-issues-finder/blob/master/CONTRIBUTING.md"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
              >
                Want to Contribute?
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
