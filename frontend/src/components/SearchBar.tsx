'use client';

import { useState, useRef, FormEvent } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SearchBarProps {
    onSearch: (query: string) => void;
    isLoading: boolean;
    placeholder?: string;
}

export function SearchBar({ onSearch, isLoading, placeholder }: SearchBarProps) {
    const [query, setQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            onSearch(query.trim());
        }
    };

    const handleClear = () => {
        setQuery('');
        inputRef.current?.focus();
    };

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto">
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-muted-foreground" />
                </div>
                <Input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={placeholder || 'Search for contribution opportunities...'}
                    className="pl-12 pr-28 py-6 text-lg"
                    disabled={isLoading}
                />
                {query && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleClear}
                        className="absolute inset-y-0 right-20 my-auto h-8 w-8"
                    >
                        <XMarkIcon className="h-4 w-4" />
                    </Button>
                )}
                <Button
                    type="submit"
                    disabled={isLoading || !query.trim()}
                    className="absolute inset-y-0 right-2 my-auto h-10"
                >
                    {isLoading ? (
                        <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    ) : (
                        'Search'
                    )}
                </Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {[
                    'unassigned beginner issues',
                    'recent Python issues',
                    'help wanted in popular repos',
                    'good first issue in JavaScript',
                    'easy documentation fixes',
                    'TypeScript CLI tools',
                ].map((suggestion) => (
                    <Button
                        key={suggestion}
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                            setQuery(suggestion);
                            onSearch(suggestion);
                        }}
                    >
                        {suggestion}
                    </Button>
                ))}
            </div>
        </form>
    );
}
