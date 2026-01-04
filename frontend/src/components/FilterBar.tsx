import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDownIcon, StarIcon, ClockIcon, TagIcon } from "@heroicons/react/24/outline";

interface FilterBarProps {
    language: string | null;
    sortBy: "relevance" | "stars" | "recency";
    selectedLabel: string | null;
    daysAgo: number | null;
    onLanguageChange: (lang: string | null) => void;
    onSortChange: (sort: "relevance" | "stars" | "recency") => void;
    onLabelChange: (label: string | null) => void;
    onTimeChange: (days: number | null) => void;
}

const LANGUAGES = [
    "Python",
    "JavaScript",
    "TypeScript",
    "Java",
    "C#",
    "Go",
    "Rust",
    "C++",
    "PHP",
    "Ruby",
];

const LABELS = [
    "good first issue",
    "help wanted",
    "documentation",
    "enhancement",
    "bug",
    "beginner",
];

const TIME_FILTERS = [
    { label: "Last 2 Hours", value: 0.08333 },
    { label: "Last 24 Hours", value: 1 },
    { label: "Last 3 Days", value: 3 },
    { label: "Last 7 Days", value: 7 },
    { label: "Last 30 Days", value: 30 },
];

export function FilterBar({
    language,
    sortBy,
    selectedLabel,
    daysAgo,
    onLanguageChange,
    onSortChange,
    onLabelChange,
    onTimeChange,
}: FilterBarProps) {
    const getSelectedTimeLabel = () => {
        if (!daysAgo) return "Any Time";
        const filter = TIME_FILTERS.find((f) => f.value === daysAgo);
        return filter ? filter.label : "Any Time";
    };

    return (
        <div className="flex flex-wrap items-center gap-3 mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Language Filter */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-9 px-3 text-sm font-medium">
                        Language: <span className="ml-1 text-primary">{language || "All"}</span>
                        <ChevronDownIcon className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[180px]">
                    <DropdownMenuItem onClick={() => onLanguageChange(null)}>
                        All Languages
                    </DropdownMenuItem>
                    {LANGUAGES.map((lang) => (
                        <DropdownMenuItem key={lang} onClick={() => onLanguageChange(lang)}>
                            {lang}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Label Filter */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-9 px-3 text-sm font-medium">
                        Label: <span className="ml-1 text-primary">{selectedLabel || "All"}</span>
                        <ChevronDownIcon className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[180px]">
                    <DropdownMenuItem onClick={() => onLabelChange(null)}>
                        All Labels
                    </DropdownMenuItem>
                    {LABELS.map((label) => (
                        <DropdownMenuItem key={label} onClick={() => onLabelChange(label)}>
                            <TagIcon className="mr-2 h-4 w-4 opacity-50" />
                            {label}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Time Filter */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-9 px-3 text-sm font-medium">
                        Time: <span className="ml-1 text-primary">{getSelectedTimeLabel()}</span>
                        <ChevronDownIcon className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[180px]">
                    <DropdownMenuItem onClick={() => onTimeChange(null)}>
                        Any Time
                    </DropdownMenuItem>
                    {TIME_FILTERS.map((filter) => (
                        <DropdownMenuItem key={filter.value} onClick={() => onTimeChange(filter.value)}>
                            <ClockIcon className="mr-2 h-4 w-4 opacity-50" />
                            {filter.label}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Sort Filter */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-9 px-3 text-sm font-medium">
                        Sort: <span className="ml-1 text-primary capitalize">{sortBy}</span>
                        <ChevronDownIcon className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[180px]">
                    <DropdownMenuItem onClick={() => onSortChange("relevance")}>
                        Relevance (AI)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onSortChange("recency")}>
                        <ClockIcon className="mr-2 h-4 w-4" /> Recency
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onSortChange("stars")}>
                        <StarIcon className="mr-2 h-4 w-4" /> Stars
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
