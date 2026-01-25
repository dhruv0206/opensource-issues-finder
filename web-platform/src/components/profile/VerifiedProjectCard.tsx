import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { CheckCircle2, AlertCircle, TrendingUp, ShieldCheck, Zap, ChevronDown, ChevronUp } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

interface VerifiedFeature {
    feature: string
    status: "VERIFIED" | "Wrapper" | "Unverified" | "COMPLEX"
    evidence_file?: string
    tier?: "TIER_1_UI" | "TIER_2_LOGIC" | "TIER_3_DEEP"
    tier_reasoning?: string
    feature_type?: string
}

interface ProjectProps {
    name: string
    repoUrl: string
    authorship: number
    score?: number
    tier?: string
    recommendations?: string[]
    stack: {
        languages: string[]
        frameworks: string[]
        libs: string[]
    }
    verifiedFeatures: VerifiedFeature[]
}

export function VerifiedProjectCard({ project, currentUser }: { project: ProjectProps, currentUser?: string }) {
    // Determine Role
    let isContributor = false;
    let actualOwner = "";

    try {
        const urlParts = new URL(project.repoUrl).pathname.split("/").filter(Boolean);
        if (urlParts.length >= 2) {
            actualOwner = urlParts[0];
            if (currentUser && actualOwner.toLowerCase() !== currentUser.toLowerCase()) {
                isContributor = true;
            }
        }
    } catch (e) { console.error("Invalid Repo URL", e) }

    // Effective Score Logic
    const rawScore = project.score || 0;
    const effectiveScore = isContributor
        ? rawScore * (project.authorship / 100)
        : rawScore;

    const tierColor = project.tier === "ELITE" ? "text-purple-600 border-purple-200 bg-purple-50" :
        project.tier === "ADVANCED" ? "text-blue-600 border-blue-200 bg-blue-50" :
            "text-slate-600 border-slate-200 bg-slate-50";

    // Debug Logging
    if (process.env.NODE_ENV === "development") {
        console.log(`[DevProof Audit] ${project.name}:`, project.verifiedFeatures);
    }

    return (
        <Card className="w-full mb-6 overflow-hidden border-t-4 border-t-primary shadow-sm hover:shadow-md transition-all">
            <CardHeader className="pb-2 bg-gradient-to-r from-transparent to-muted/20">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-2xl font-bold">
                                <a href={project.repoUrl} target="_blank" className="hover:underline decoration-primary underline-offset-4">
                                    {project.name}
                                </a>
                            </CardTitle>
                            {project.score && (
                                <div className="flex flex-col ml-2">
                                    <Badge variant="outline" className={`text-xs font-bold uppercase tracking-wider ${isContributor ? "text-cyan-600 border-cyan-200 bg-cyan-50" : tierColor}`}>
                                        {project.tier} • {isContributor ? effectiveScore.toFixed(1) : project.score.toFixed(0)} PTS
                                    </Badge>
                                    {isContributor && (
                                        <span className="text-[10px] text-muted-foreground ml-1">
                                            (Project: {project.score.toFixed(0)} pts)
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <ShieldCheck className={`w-3.5 h-3.5 ${isContributor ? "text-cyan-600" : "text-green-600"}`} />
                                {isContributor ? "Verified Contributor" : "Verified Owner"}
                            </span>
                            <span className="flex items-center gap-1">
                                <Zap className="w-3.5 h-3.5 text-amber-500" />
                                {project.verifiedFeatures.length} Features
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                        <div className="flex gap-1">
                            {project.stack.languages.map(l => <Badge key={l} variant="secondary" className="text-xs">{l}</Badge>)}
                            {project.stack.frameworks.map(f => <Badge key={f} className="text-xs">{f}</Badge>)}
                        </div>
                        {/* Authorship Bar */}
                        <div className="flex items-center gap-2 text-xs w-[180px]">
                            <span className="text-muted-foreground">Authored:</span>
                            <Progress value={project.authorship} className="h-2 flex-1" />
                            <span className="font-mono font-bold">{project.authorship.toFixed(0)}%</span>
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-6">
                {/* Clusters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Deep Tech Column */}
                    <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center justify-between">
                            Deep Tech
                            <Badge variant="secondary" className="text-[10px] h-4 px-1">{project.verifiedFeatures.filter(f => f.tier === "TIER_3_DEEP" && f.status !== "Unverified").length}</Badge>
                        </h4>
                        <div className="space-y-2">
                            {project.verifiedFeatures.filter(f => f.tier === "TIER_3_DEEP" && f.status !== "Unverified").length > 0 ? (
                                project.verifiedFeatures.filter(f => f.tier === "TIER_3_DEEP" && f.status !== "Unverified").map((feat, idx) => (
                                    <FeatureItem key={idx} feat={feat} />
                                ))
                            ) : (
                                <p className="text-[10px] text-muted-foreground italic">No deep tech detected.</p>
                            )}
                        </div>
                    </div>

                    {/* Logic Column */}
                    <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center justify-between">
                            Core Logic
                            <Badge variant="secondary" className="text-[10px] h-4 px-1">{project.verifiedFeatures.filter(f => f.tier === "TIER_2_LOGIC" && f.status !== "Unverified").length}</Badge>
                        </h4>
                        <div className="space-y-2">
                            {project.verifiedFeatures.filter(f => f.tier === "TIER_2_LOGIC" && f.status !== "Unverified").map((feat, idx) => (
                                <FeatureItem key={idx} feat={feat} />
                            ))}
                        </div>
                    </div>

                    {/* UI Column (The Folder: Collapsed Noise) */}
                    <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                            UI / UX
                            <Badge variant="secondary" className="text-[10px] h-4 px-1">{project.verifiedFeatures.filter(f => f.tier === "TIER_1_UI" && f.status !== "Unverified").length}</Badge>
                        </h4>
                        <div className="space-y-2">
                            <FeatureList features={project.verifiedFeatures.filter(f => f.tier === "TIER_1_UI" && f.status !== "Unverified")} limit={3} />
                        </div>
                    </div>

                    {/* Unverified Claims Column */}
                    <div className="space-y-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800/30">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center justify-between">
                            Unverified
                            <Badge variant="destructive" className="text-[10px] h-4 px-1">{project.verifiedFeatures.filter(f => f.status === "Unverified").length}</Badge>
                        </h4>
                        <div className="space-y-2">
                            {project.verifiedFeatures.filter(f => f.status === "Unverified").map((feat, idx) => (
                                <FeatureItem key={idx} feat={feat} />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Recommendations */}
                {project.recommendations && project.recommendations.length > 0 && (
                    <Accordion type="single" collapsible className="w-full border rounded-lg px-4 bg-amber-50/50 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/50">
                        <AccordionItem value="item-1" className="border-none">
                            <AccordionTrigger className="hover:no-underline py-3">
                                <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
                                    <TrendingUp className="w-4 h-4" />
                                    How to Improve Rank
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <ul className="space-y-2 pb-3">
                                    {project.recommendations.map((rec, i) => (
                                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                            <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-500 shrink-0" />
                                            {rec}
                                        </li>
                                    ))}
                                    <li className="text-xs text-muted-foreground mt-4 italic border-t pt-2">
                                        * Rankings are based on technical complexity (Deep Tech &gt; Logic &gt; UI).
                                    </li>
                                </ul>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                )}
            </CardContent>
        </Card>
    )
}

function FeatureList({ features, limit }: { features: VerifiedFeature[], limit?: number }) {
    const [expanded, setExpanded] = useState(false)

    if (!limit || features.length <= limit) {
        return <>{features.map((feat, i) => <FeatureItem key={i} feat={feat} />)}</>
    }

    const displayed = expanded ? features : features.slice(0, limit)
    const hiddenCount = features.length - limit

    return (
        <>
            {displayed.map((feat, i) => <FeatureItem key={i} feat={feat} />)}
            <button
                onClick={() => setExpanded(!expanded)}
                className="text-[10px] text-muted-foreground w-full text-left hover:text-primary flex items-center gap-1 mt-2 font-medium"
            >
                {expanded ? (
                    <><ChevronUp className="w-3 h-3" /> Show Less</>
                ) : (
                    <><ChevronDown className="w-3 h-3" /> and {hiddenCount} more UI polish items...</>
                )}
            </button>
        </>
    )
}

function FeatureItem({ feat }: { feat: VerifiedFeature }) {
    return (
        <div className="flex items-start gap-2 text-sm">
            {feat.status === "VERIFIED" ? (
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
            ) : (
                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            )}
            <div>
                <span className={feat.status === "VERIFIED" ? "font-medium" : "text-muted-foreground"}>
                    {feat.feature}
                </span>
                {feat.evidence_file && (
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        {feat.evidence_file}
                    </p>
                )}
            </div>
        </div>
    )
}
