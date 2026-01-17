import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ChevronDownIcon, StarIcon, ClockIcon, TagIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface FilterBarProps {
    languages: string[];
    sortBy: "newest" | "recently_discussed" | "relevance" | "stars";
    selectedLabels: string[];
    daysAgo: number | null;
    unassignedOnly: boolean;
    onLanguageChange: (langs: string[]) => void;
    onSortChange: (sort: "newest" | "recently_discussed" | "relevance" | "stars") => void;
    onLabelChange: (labels: string[]) => void;
    onTimeChange: (days: number | null) => void;
    onUnassignedChange: (unassigned: boolean) => void;
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
    "Dart",
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
    languages,
    sortBy,
    selectedLabels,
    daysAgo,
    unassignedOnly,
    onLanguageChange,
    onSortChange,
    onLabelChange,
    onTimeChange,
    onUnassignedChange,
}: FilterBarProps) {
    const getSelectedTimeLabel = () => {
        if (!daysAgo) return "Any Time";
        const filter = TIME_FILTERS.find((f) => f.value === daysAgo);
        return filter ? filter.label : "Any Time";
    };

    const toggleLanguage = (lang: string) => {
        if (languages.includes(lang)) {
            onLanguageChange(languages.filter((l) => l !== lang));
        } else {
            onLanguageChange([...languages, lang]);
        }
    };

    const toggleLabel = (label: string) => {
        if (selectedLabels.includes(label)) {
            onLabelChange(selectedLabels.filter((l) => l !== label));
        } else {
            onLabelChange([...selectedLabels, label]);
        }
    };

    const getLanguageDisplay = () => {
        if (languages.length === 0) return "All";
        if (languages.length === 1) return languages[0];
        return `${languages.length} selected`;
    };

    const getLabelDisplay = () => {
        if (selectedLabels.length === 0) return "All";
        if (selectedLabels.length === 1) return selectedLabels[0];
        return `${selectedLabels.length} selected`;
    };

    return (
        <div className="flex flex-wrap items-center gap-3 mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Language Filter */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-9 px-3 text-sm font-medium">
                        Language: <span className="ml-1 text-primary">{getLanguageDisplay()}</span>
                        <ChevronDownIcon className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[180px]">
                    {languages.length > 0 && (
                        <>
                            <DropdownMenuItem onClick={() => onLanguageChange([])}>
                                <XMarkIcon className="mr-2 h-4 w-4" />
                                Clear All
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                        </>
                    )}
                    {LANGUAGES.map((lang) => (
                        <DropdownMenuCheckboxItem
                            key={lang}
                            checked={languages.includes(lang)}
                            onCheckedChange={() => toggleLanguage(lang)}
                            className="cursor-pointer"
                        >
                            <span className={`mr-2 inline-flex h-4 w-4 items-center justify-center rounded border ${languages.includes(lang) ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/50'}`}>
                                {languages.includes(lang) && <span className="text-xs">✓</span>}
                            </span>
                            {lang}
                        </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Label Filter */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-9 px-3 text-sm font-medium">
                        Label: <span className="ml-1 text-primary">{getLabelDisplay()}</span>
                        <ChevronDownIcon className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[180px]">
                    {selectedLabels.length > 0 && (
                        <>
                            <DropdownMenuItem onClick={() => onLabelChange([])}>
                                <XMarkIcon className="mr-2 h-4 w-4" />
                                Clear All
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                        </>
                    )}
                    {LABELS.map((label) => (
                        <DropdownMenuCheckboxItem
                            key={label}
                            checked={selectedLabels.includes(label)}
                            onCheckedChange={() => toggleLabel(label)}
                            className="cursor-pointer"
                        >
                            <span className={`mr-2 inline-flex h-4 w-4 items-center justify-center rounded border ${selectedLabels.includes(label) ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/50'}`}>
                                {selectedLabels.includes(label) && <span className="text-xs">✓</span>}
                            </span>
                            {label}
                        </DropdownMenuCheckboxItem>
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
                        Sort: <span className="ml-1 text-primary">{
                            sortBy === "newest" ? "Newest" :
                                sortBy === "recently_discussed" ? "Recently Discussed" :
                                    sortBy === "relevance" ? "Relevance" : "Stars"
                        }</span>
                        <ChevronDownIcon className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[200px]">
                    <DropdownMenuItem onClick={() => onSortChange("newest")}>
                        <ClockIcon className="mr-2 h-4 w-4" /> Newest (Created)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onSortChange("recently_discussed")}>
                        <ClockIcon className="mr-2 h-4 w-4" /> Recently Discussed
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onSortChange("relevance")}>
                        Relevance (AI)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onSortChange("stars")}>
                        <StarIcon className="mr-2 h-4 w-4" /> Stars
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Exclude Assigned Toggle */}
            <div className={`
                flex items-center gap-2 h-9 px-3 rounded-md border transition-colors duration-200
                ${unassignedOnly
                    ? 'bg-emerald-500/10 border-emerald-500/50'
                    : 'bg-transparent border-border'
                }
            `}>
                <Switch
                    id="unassigned-only"
                    checked={unassignedOnly}
                    onCheckedChange={onUnassignedChange}
                />
                <label
                    htmlFor="unassigned-only"
                    className={`text-sm font-medium cursor-pointer select-none transition-colors duration-200 ${unassignedOnly ? 'text-emerald-400' : 'text-muted-foreground'}`}
                >
                    Unassigned Only
                </label>
            </div>
        </div>
    );
}
