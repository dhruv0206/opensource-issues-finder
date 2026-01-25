"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Loader2, Plus, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"

export function AddProjectModal({ userId, defaultGithubUsername }: { userId?: string, defaultGithubUsername?: string }) {
    const [open, setOpen] = useState(false)
    const [url, setUrl] = useState("")
    const [loading, setLoading] = useState(false)
    const [statusText, setStatusText] = useState("")

    // Contributor Mode State
    const [isContributor, setIsContributor] = useState(false)
    const [isContributionDetected, setIsContributionDetected] = useState(false)
    const [confirmedContribution, setConfirmedContribution] = useState(false)
    const [githubUsername, setGithubUsername] = useState("")

    // Pre-Scan State
    // Pre-Scan State
    const [scanResult, setScanResult] = useState<any>(null) // { stack: {...}, authorship: ... }
    const [projectType, setProjectType] = useState("")
    const [scanned, setScanned] = useState(false)
    const [showOverride, setShowOverride] = useState(false)
    const [extractedClaims, setExtractedClaims] = useState<string[]>([])
    const [selectedClaims, setSelectedClaims] = useState<string[]>([])
    const [claimsReviewed, setClaimsReviewed] = useState(false)
    const [rejectionReason, setRejectionReason] = useState<string | null>(null) // New state

    const router = useRouter()

    // Use the passed userId or fallback to demo if not provided (though page always provides it)
    const effectiveUserId = userId || "demo-user-123"

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

    const handleConfirmImport = async () => {
        setLoading(true)
        setStatusText("Running Mentor Audit (Gemini)...")

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

            setOpen(false)
            handleReset()
            window.location.reload() // Force reload to fetch new project data

        } catch (e: any) {
            const msg = e.message || ""
            if (msg.includes("Low Authorship")) {
                setRejectionReason("Low Authorship")
            } else {
                alert("Verification Failed: " + msg)
            }
        } finally {
            setLoading(false)
            setStatusText("")
        }
    }

    const handleReset = () => {
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
        // Keep contributor settings? Maybe reset them too.
        setIsContributor(false)
        setIsContributionDetected(false)
        setConfirmedContribution(false)
        setGithubUsername("")
    }

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen)
        if (!newOpen) {
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
                        {rejectionReason ? (
                            "Verification Failed"
                        ) : isContributionDetected && !confirmedContribution ? (
                            "Contributor Verification"
                        ) : !scanned
                            ? "Step 1: Enter your GitHub URL to start."
                            : !claimsReviewed
                                ? "Step 2: Detect & Confirm Stack."
                                : "Step 3: Confirm features to verify."}
                    </DialogDescription>
                </DialogHeader>

                {rejectionReason ? (
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
                                To prevent fraud, DevProof requires you to be a primary contributor. If this is a team project, ensure you have committed significant code with your GitHub email.
                            </p>
                        </div>
                        {rejectionReason === "ContactUs" && (
                            <div className="bg-blue-50 p-4 rounded-md text-sm text-blue-700 mt-2 mx-8 text-center flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                Please contact our support team to verify your relationship with this project.
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
                                💡 Tip: We analyze your <strong>README</strong> to find technical claims. Make sure it mentions your key features!
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
                            <h3 className="font-bold text-lg">Contribution Detected</h3>
                            <p className="text-sm text-muted-foreground px-4">
                                This repository belongs to someone else. <br />
                                <strong>Are you a contributor to this project?</strong>
                            </p>
                            <p className="text-xs text-muted-foreground px-8 pt-2">
                                We will verify <strong>YOUR</strong> specific code contributions using your GitHub handle <strong>{defaultGithubUsername}</strong>.
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
                                {/* Stack Badges */}
                                {scanResult?.stack?.languages?.map((l: string) => <Badge key={l} variant="outline">{l}</Badge>)}
                                {scanResult?.stack?.frameworks?.map((f: string) => <Badge key={f} className="bg-blue-100 text-blue-800">{f}</Badge>)}
                            </div>
                        </div>

                        {/* Archetype Editor */}
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium">Project Archetype (Auto-Detected)</label>
                            <Input
                                value={projectType}
                                onChange={(e) => setProjectType(e.target.value)}
                                className="font-semibold border-amber-200 bg-amber-50 focus:bg-white transition-colors"
                            />
                            <p className="text-[11px] text-muted-foreground">
                                * This determines the specific Judging Rubric used for your score. Ensure it describes your project accurately.
                            </p>
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
                                <p className="text-sm text-muted-foreground text-center py-4">No specific claims found in README.</p>
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
                        <p className="text-xs text-muted-foreground">Only verified features will appear on your profile.</p>
                    </div>
                )}

                {loading && (
                    <div className="flex flex-col items-center justify-center p-4 gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <p className="text-sm font-medium animate-pulse">{statusText}</p>
                    </div>
                )}

                <DialogFooter>
                    {/* Navigation Buttons */}
                    {rejectionReason ? (
                        <Button onClick={handleReset} variant="destructive" className="w-full">
                            {rejectionReason === "ContactUs" ? "Close" : "Okay, I understand"}
                        </Button>
                    ) : isContributionDetected && !confirmedContribution ? (
                        null // Buttons are in the special view
                    ) : !scanned ? (
                        <Button onClick={handleScan} disabled={loading || !url}>Scan Repository</Button>
                    ) : !claimsReviewed ? (
                        <div className="flex gap-2 w-full justify-end">
                            <Button variant="ghost" onClick={() => setScanned(false)} disabled={loading}>Back</Button>
                            <Button onClick={handleProceedToClaims} disabled={loading}>Review Claims &rarr;</Button>
                        </div>
                    ) : (
                        <div className="flex gap-2 w-full justify-end">
                            <Button variant="ghost" onClick={() => setClaimsReviewed(false)} disabled={loading}>Back</Button>
                            <Button onClick={handleConfirmImport} disabled={loading}>Confirm & Verify</Button>
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog >
    )
}
