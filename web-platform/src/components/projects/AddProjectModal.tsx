"use client"
// Force HMR Update

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Loader2, Plus, CheckCircle2, AlertTriangle, ShieldCheck, Circle } from "lucide-react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"

const PROGRESS_STEPS = [
    "Connecting to GitHub",
    "Verifying Authorship",
    "Reading Source Code",
    "Generating Rubric",
    "Deep Mentor Audit",
    "Finalizing Score"
]

export function AddProjectModal({ userId, defaultGithubUsername }: { userId?: string, defaultGithubUsername?: string }) {
    const [open, setOpen] = useState(false)
    const [url, setUrl] = useState("")
    const [loading, setLoading] = useState(false)
    const [statusText, setStatusText] = useState("")

    // Contributor Mode State
    const [isContributor, setIsContributor] = useState(false)
    const [isContributionDetected, setIsContributionDetected] = useState(false)
    const [confirmedContribution, setConfirmedContribution] = useState(false)

    // Pre-Scan State
    const [scanResult, setScanResult] = useState<any>(null) // { stack: {...}, authorship: ... }
    const [projectType, setProjectType] = useState("")
    const [scanned, setScanned] = useState(false)
    const [showOverride, setShowOverride] = useState(false)
    const [extractedClaims, setExtractedClaims] = useState<string[]>([])
    const [selectedClaims, setSelectedClaims] = useState<string[]>([])
    const [claimsReviewed, setClaimsReviewed] = useState(false)
    const [rejectionReason, setRejectionReason] = useState<string | null>(null)

    // New Progress State
    const [isAuditing, setIsAuditing] = useState(false)
    const [currentStep, setCurrentStep] = useState(0)
    const progressInterval = useRef<NodeJS.Timeout | null>(null)

    const router = useRouter()

    // Use the passed userId or fallback to demo if not provided (though page always provides it)
    const effectiveUserId = userId || "demo-user-123"

    // Cleanup interval on unmount
    useEffect(() => {
        return () => {
            if (progressInterval.current) clearInterval(progressInterval.current)
        }
    }, [])

    const handleScan = async () => {
        if (!url) return
        setLoading(true)
        setStatusText("Scanning Repository...")
        setRejectionReason(null)

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${API_URL}/api/projects/scan`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    repo_url: url,
                    user_id: effectiveUserId
                })
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.detail || "Scan failed")
            }

            const data = await res.json()
            setScanResult(data)
            setProjectType(data.archetype?.name || "Full Stack Application")

            // Proactive Detection
            try {
                const urlObj = new URL(url)
                const pathParts = urlObj.pathname.split('/').filter(Boolean)
                const repoOwner = pathParts[0]

                if (repoOwner && defaultGithubUsername && repoOwner.toLowerCase() !== defaultGithubUsername.toLowerCase()) {
                    setIsContributionDetected(true)
                    setIsContributor(true)
                }
            } catch (e) { console.error("URL Parse error", e) }

            setScanned(true)

        } catch (e: any) {
            alert(e.message)
        } finally {
            setLoading(false)
            setStatusText("")
        }
    }

    const handleProceedToClaims = async () => {
        setLoading(true)
        setStatusText("Generating Custom Rubric & Features...")
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${API_URL}/api/projects/extract-features`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ repo_url: url, user_id: effectiveUserId })
            })

            if (!res.ok) throw new Error("Failed to extract features")

            const data = await res.json()
            setExtractedClaims(data.features || [])
            setSelectedClaims(data.features || [])
            setClaimsReviewed(true)
        } catch (e: any) {
            alert(e.message)
        } finally {
            setLoading(false)
            setStatusText("")
        }
    }

    const handleToggleClaim = (claim: string) => {
        if (selectedClaims.includes(claim)) {
            setSelectedClaims(selectedClaims.filter(c => c !== claim))
        } else {
            setSelectedClaims([...selectedClaims, claim])
        }
    }

    const startSimulatedProgress = () => {
        setCurrentStep(0)

        // Clear any existing
        if (progressInterval.current) clearInterval(progressInterval.current)

        progressInterval.current = setInterval(() => {
            setCurrentStep(prev => {
                // Stall at "Deep Mentor Audit" (step 4) until actual response
                if (prev >= 4) {
                    return prev
                }
                return prev + 1
            })
        }, 2000) // Advance every 2 seconds roughly
    }

    const handleConfirmImport = async () => {
        setIsAuditing(true)
        startSimulatedProgress()

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

            const res = await fetch(`${API_URL}/api/projects/import`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    repo_url: url,
                    user_id: effectiveUserId,
                    project_type: projectType,
                    target_claims: selectedClaims
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.detail)

            // Success! Fast forward to end
            if (progressInterval.current) clearInterval(progressInterval.current)
            setCurrentStep(PROGRESS_STEPS.length - 1) // Finalizing

            setTimeout(() => {
                setOpen(false)
                handleReset()
                window.location.reload()
            }, 1000)

        } catch (e: any) {
            if (progressInterval.current) clearInterval(progressInterval.current)

            const msg = e.message || ""
            if (msg.includes("Low Authorship")) {
                setRejectionReason("Low Authorship")
                setIsAuditing(false) // Exit progress view to show rejection
            } else {
                alert("Verification Failed: " + msg)
                setIsAuditing(false)
            }
        }
    }

    const handleReset = () => {
        // Only reset if NOT auditing (to prevent accidental loss if closed)
        if (isAuditing) return

        setScanned(false)
        setScanResult(null)
        setProjectType("")
        setUrl("")
        setShowOverride(false)
        setClaimsReviewed(false)
        setExtractedClaims([])
        setSelectedClaims([])
        setStatusText("")
        setRejectionReason(null)
        setIsContributor(false)
        setIsContributionDetected(false)
        setConfirmedContribution(false)
        setIsAuditing(false)
        setCurrentStep(0)
        if (progressInterval.current) clearInterval(progressInterval.current)
    }

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen)
        if (!newOpen) {
            // Give a delay before reset to allow animation to close, 
            // but checked inside handleReset if we should actually reset
            setTimeout(handleReset, 300)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus className="w-4 h-4" /> Add project for verification
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Import & Verify Project</DialogTitle>
                    <DialogDescription>
                        {isAuditing ? "Deep Mentor Analysis Running..." :
                            rejectionReason ? "Verification Failed" :
                                isContributionDetected && !confirmedContribution ? "Contributor Verification" :
                                    !scanned ? "Step 1: Enter your GitHub URL to start." :
                                        !claimsReviewed ? "Step 2: Detect & Confirm Stack." :
                                            "Step 3: Confirm features to verify."}
                    </DialogDescription>
                </DialogHeader>

                {isAuditing ? (
                    // PROGRESS VIEW
                    <div className="py-6 space-y-6">
                        <div className="space-y-4 px-4">
                            {PROGRESS_STEPS.map((step, index) => {
                                const isCompleted = index < currentStep
                                const isCurrent = index === currentStep

                                return (
                                    <div key={index} className="flex items-center gap-3">
                                        {isCompleted ? (
                                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                                        ) : isCurrent ? (
                                            <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                        ) : (
                                            <Circle className="w-5 h-5 text-muted-foreground/30" />
                                        )}
                                        <span className={`text-sm ${isCurrent ? "font-semibold text-foreground" : isCompleted ? "text-muted-foreground" : "text-muted-foreground/50"}`}>
                                            {step}
                                            {isCurrent && index === 2 && <span className="block text-xs font-normal text-muted-foreground mt-0.5">Fetching latest source files (ignoring assets)...</span>}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                        <p className="text-xs text-center text-muted-foreground/60 pt-4">
                            You can close this window. The audit will continue in the background.
                        </p>
                    </div>
                ) : rejectionReason ? (
                    // REJECTION VIEW
                    <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                            <AlertTriangle className="w-8 h-8 text-red-600" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-bold text-lg text-red-700">Verification Rejected</h3>
                            <p className="text-sm text-muted-foreground px-4">
                                We could not verify your authorship. <br />
                                <strong>Reason: Authorship &lt; 15%</strong>
                            </p>
                            <p className="text-xs text-muted-foreground px-8">
                                To prevent fraud, DevProof requires you to be a primary contributor.
                            </p>
                        </div>
                        {rejectionReason === "ContactUs" && (
                            <div className="bg-blue-50 p-4 rounded-md text-sm text-blue-700 mt-2 mx-8 text-center flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                Please contact support to verify your relationship with this project.
                            </div>
                        )}
                    </div>
                ) : !scanned ? (
                    // STEP 1: INPUT
                    <div className="grid gap-4 py-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium">GitHub Repository URL</label>
                            <Input
                                placeholder="https://github.com/username/repo"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                disabled={loading}
                            />
                            <p className="text-[11px] text-muted-foreground">
                                💡 Tip: We analyze your <strong>README</strong> to find technical claims.
                            </p>
                        </div>
                    </div>
                ) : isContributionDetected && !confirmedContribution ? (
                    // CONTRIBUTION CONFIRMATION VIEW
                    <div className="flex flex-col items-center justify-center py-8 text-center space-y-6">
                        <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center">
                            <ShieldCheck className="w-8 h-8 text-cyan-600" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-bold text-lg">External Repository Detected</h3>
                            <p className="text-sm text-muted-foreground px-4">
                                This repository belongs to someone else. <br />
                                <strong>Are you a contributor to this project?</strong>
                            </p>
                        </div>
                        <div className="flex flex-col w-full gap-2 px-8">
                            <Button onClick={() => setConfirmedContribution(true)} className="bg-cyan-600 hover:bg-cyan-700">
                                Yes, I am a Contributor
                            </Button>
                            <Button variant="outline" onClick={() => setRejectionReason("ContactUs")}>
                                No, this is not my work
                            </Button>
                        </div>
                    </div>
                ) : !claimsReviewed ? (
                    // STEP 2: STACK CONFIRMATION
                    <div className="py-4 space-y-4">
                        <div className="bg-muted p-4 rounded-lg">
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                Stack Detected
                            </h4>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {scanResult?.stack?.languages?.map((l: string) => <Badge key={l} variant="outline">{l}</Badge>)}
                                {scanResult?.stack?.frameworks?.map((f: string) => <Badge key={f} className="bg-blue-100 text-blue-800 hover:bg-blue-100">{f}</Badge>)}
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium">Project Archetype</label>
                            <Input
                                value={projectType}
                                onChange={(e) => setProjectType(e.target.value)}
                                className="font-semibold border-amber-200 bg-amber-50 focus:bg-white transition-colors"
                            />
                        </div>
                    </div>
                ) : (
                    // STEP 3: CLAIMS REVIEW
                    <div className="py-4 space-y-4">
                        <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/30 p-3 rounded border border-blue-200 dark:border-blue-900">
                            <p>
                                I found these features in your README. Uncheck any that you haven't implemented yet.
                            </p>
                        </div>

                        <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-md p-2">
                            {extractedClaims.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">No specific claims found.</p>
                            ) : (
                                extractedClaims.map((claim, i) => (
                                    <div key={i} className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded cursor-pointer" onClick={() => handleToggleClaim(claim)}>
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedClaims.includes(claim) ? "bg-primary border-primary text-primary-foreground" : "border-input"}`}>
                                            {selectedClaims.includes(claim) && <CheckCircle2 className="w-3 h-3" />}
                                        </div>
                                        <span className="text-sm">{claim}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                <DialogFooter>
                    {isAuditing ? (
                        null
                    ) : rejectionReason ? (
                        <Button onClick={handleReset} variant="destructive" className="w-full">
                            {rejectionReason === "ContactUs" ? "Close" : "Okay, I understand"}
                        </Button>
                    ) : isContributionDetected && !confirmedContribution ? (
                        null
                    ) : !scanned ? (
                        <Button onClick={handleScan} disabled={loading || !url}>
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Scan Repository
                        </Button>
                    ) : !claimsReviewed ? (
                        <div className="flex gap-2 w-full justify-end">
                            <Button variant="ghost" onClick={() => setScanned(false)} disabled={loading}>Back</Button>
                            <Button onClick={handleProceedToClaims} disabled={loading}>
                                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Review Claims &rarr;
                            </Button>
                        </div>
                    ) : (
                        <div className="flex gap-2 w-full justify-end">
                            <Button variant="ghost" onClick={() => setClaimsReviewed(false)} disabled={loading}>Back</Button>
                            <Button onClick={handleConfirmImport} disabled={loading}>
                                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Confirm & Verify
                            </Button>
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

