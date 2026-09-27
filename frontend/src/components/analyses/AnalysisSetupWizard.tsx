import { useState } from 'react'
import {
  X, Check, Building2, Sliders, ArrowRight, ArrowLeft, Play,
  Sparkles, CheckCircle2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Utility } from '@/api/utilities'
import type { Project } from '@/api/projects'
import type { CreateAnalysisPayload } from '@/api/analyses'

interface AnalysisSetupWizardProps {
  utilities: Utility[]
  projects: Project[]
  onSubmit: (payload: CreateAnalysisPayload) => Promise<unknown>
  onCancel: () => void
  isLoading: boolean
}

const STEP_LABELS = ['Utilities', 'Projects', 'Rules', 'Review']

export function AnalysisSetupWizard({
  utilities,
  projects,
  onSubmit,
  onCancel,
  isLoading,
}: AnalysisSetupWizardProps) {
  const [step, setStep] = useState(1)

  // Step 1: Selected Utilities
  const [selectedUtils, setSelectedUtils] = useState<string[]>(
    utilities.slice(0, 2).map((u) => u._id)
  )

  // Step 2: Date Range
  const [dateRange, setDateRange] = useState<string>('all')

  // Step 3: Rules
  const [threshold, setThreshold] = useState<number>(100)
  const [overlapDays, setOverlapDays] = useState<number>(1)
  const [enableAI, setEnableAI] = useState<boolean>(true)

  // Toggle utility selection
  const toggleUtility = (id: string) => {
    if (selectedUtils.includes(id)) {
      if (selectedUtils.length > 2) {
        setSelectedUtils(selectedUtils.filter((u) => u !== id))
      }
    } else {
      setSelectedUtils([...selectedUtils, id])
    }
  }

  // Filter projects matching selected utilities and range
  const matchingProjects = projects.filter((p) => {
    const uId = p.utilityId?._id || p.utilityId
    return selectedUtils.includes(uId as string)
  })

  const handleRun = async () => {
    try {
      await onSubmit({
        utilityIds: selectedUtils,
        dateRange,
        spatialThresholdMeters: threshold,
        minimumOverlapDays: overlapDays,
        enableAI,
      })
    } catch {
      // handled by parent query onError
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4 overflow-y-auto">
      <Card className="w-full max-w-2xl my-6 shadow-2xl border-border/60 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <CardHeader className="pb-3 border-b border-border/50 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">New Coordination Analysis</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure multi-utility spatial & temporal conflict comparison
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Stepper bar (matching build/ui.html screenSetup) */}
          <div className="flex items-center justify-between pt-3 mt-1">
            {STEP_LABELS.map((label, idx) => {
              const n = idx + 1
              const isDone = n < step
              const isActive = n === step

              return (
                <div key={label} className="flex items-center gap-2 flex-1">
                  <div
                    onClick={() => isDone && setStep(n)}
                    className={`flex items-center gap-2 text-xs font-semibold select-none cursor-default ${
                      isDone ? 'text-foreground cursor-pointer hover:text-indigo-600' : isActive ? 'text-indigo-600' : 'text-muted-foreground'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-mono border transition-all ${
                        isDone
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : isActive
                          ? 'border-indigo-600 text-indigo-600 ring-3 ring-indigo-50 font-bold'
                          : 'border-border text-muted-foreground'
                      }`}
                    >
                      {isDone ? '✓' : n}
                    </span>
                    <span className="hidden sm:inline">{label}</span>
                  </div>
                  {idx < STEP_LABELS.length - 1 && (
                    <div className="flex-1 h-0.5 bg-border/80 mx-2" />
                  )}
                </div>
              )
            })}
          </div>
        </CardHeader>

        {/* Wizard Body */}
        <CardContent className="overflow-y-auto p-5 space-y-4 text-xs">
          {/* STEP 1: Select Utilities */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Select the utilities whose construction plans you want to compare. GridMind will detect spatial and temporal overlaps between their published projects. <b>Minimum 2 utilities.</b>
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {utilities.map((u) => {
                  const isSelected = selectedUtils.includes(u._id)
                  const pCount = projects.filter((p) => (p.utilityId?._id || p.utilityId) === u._id).length

                  return (
                    <button
                      key={u._id}
                      type="button"
                      onClick={() => toggleUtility(u._id)}
                      className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col gap-1.5 ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50/50 shadow-xs ring-1 ring-indigo-500/20'
                          : 'border-border/70 hover:border-border hover:bg-muted/30 bg-background'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-foreground flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                          {u.name}
                        </span>
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                            isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-border bg-background'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>

                      <p className="text-[11px] text-muted-foreground truncate">
                        {u.serviceAreaText || 'Municipal Area'}
                      </p>

                      <div className="mt-1 pt-2 border-t border-border/40 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                        <span>{pCount} indexed projects</span>
                        <span>{u.sourcesCount || 0} source(s)</span>
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60 text-xs text-muted-foreground flex items-center justify-between">
                <span>
                  {selectedUtils.length >= 2 ? (
                    <span className="text-emerald-700 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {selectedUtils.length} utilities selected — ready for analysis
                    </span>
                  ) : (
                    <span className="text-amber-700 font-medium">
                      Select at least 2 utilities to compare
                    </span>
                  )}
                </span>
                <span className="font-mono text-[11px]">
                  {matchingProjects.length} candidate projects
                </span>
              </div>
            </div>
          )}

          {/* STEP 2: Projects & Construction Window */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-foreground text-xs">Date Range / Construction Window</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Only projects whose construction dates fall within this window will be compared.
                  </p>
                </div>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="h-8 rounded-lg border border-border/60 bg-background px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="all">All Dates / Entire 2026–2027</option>
                  <option value="q1">Q1 — Jan–Mar 2026</option>
                  <option value="q2">Q2 — Apr–Jun 2026</option>
                  <option value="h2">H2 — Jul–Dec 2026</option>
                </select>
              </div>

              <div>
                <h4 className="font-semibold text-foreground text-xs mb-2">
                  Mapped Corridor Previews ({matchingProjects.length} projects)
                </h4>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {matchingProjects.map((p) => (
                    <div
                      key={p._id}
                      className="p-2 rounded-lg border border-border/60 bg-background flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                        <span className="font-semibold text-foreground truncate">{p.name}</span>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {p.projectType}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono shrink-0">
                        <span>{p.corridorName || 'Corridor'}</span>
                        <span>
                          {p.startDate ? new Date(p.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '2026'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Analysis Rules */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Spatial threshold slider */}
              <div className="p-3.5 rounded-xl border border-border/60 bg-background space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-foreground text-xs">Spatial Proximity Threshold</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Projects within this geographic distance are flagged as potential spatial conflicts.
                    </p>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border-indigo-200">
                    {threshold} m
                  </Badge>
                </div>
                <div className="pt-2 flex items-center gap-3">
                  <input
                    type="range"
                    min="25"
                    max="500"
                    step="25"
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="w-full accent-indigo-600 h-2 bg-muted rounded-lg cursor-pointer"
                  />
                  <span className="text-[11px] text-muted-foreground font-mono w-12 text-right">500 m</span>
                </div>
              </div>

              {/* Minimum overlap days */}
              <div className="p-3.5 rounded-xl border border-border/60 bg-background flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-foreground text-xs">Minimum Overlap Days</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Construction windows must overlap by at least this many calendar days.
                  </p>
                </div>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={overlapDays}
                  onChange={(e) => setOverlapDays(Number(e.target.value))}
                  className="w-16 h-8 text-center rounded-lg border border-border/60 bg-background text-xs font-mono font-bold"
                />
              </div>

              {/* AI Explanation Toggle */}
              <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/30 flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    Gemini AI Coordination Explanations & Actions
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Generate plain-language explanations of conflict significance and actionable coordination steps.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={enableAI}
                  onChange={(e) => setEnableAI(e.target.checked)}
                  className="w-5 h-5 accent-indigo-600 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* STEP 4: Review & Run */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-3">
                <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider">
                  Analysis Parameters Summary
                </h4>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Compared Utilities:</span>
                    <p className="font-bold text-foreground mt-0.5">
                      {selectedUtils
                        .map((id) => utilities.find((u) => u._id === id)?.name)
                        .filter(Boolean)
                        .join(' ↔ ')}
                    </p>
                  </div>

                  <div>
                    <span className="text-muted-foreground">Candidate Projects:</span>
                    <p className="font-bold text-foreground mt-0.5 font-mono">
                      {matchingProjects.length} projects
                    </p>
                  </div>

                  <div>
                    <span className="text-muted-foreground">Spatial Proximity:</span>
                    <p className="font-bold text-foreground mt-0.5 font-mono">≤ {threshold} meters</p>
                  </div>

                  <div>
                    <span className="text-muted-foreground">Minimum Overlap:</span>
                    <p className="font-bold text-foreground mt-0.5 font-mono">≥ {overlapDays} day(s)</p>
                  </div>

                  <div>
                    <span className="text-muted-foreground">Date Window:</span>
                    <p className="font-bold text-foreground mt-0.5 uppercase">{dateRange}</p>
                  </div>

                  <div>
                    <span className="text-muted-foreground">AI Coordination Synthesis:</span>
                    <p className="font-bold text-indigo-600 mt-0.5">
                      {enableAI ? 'Enabled (Gemini 2.5 Flash)' : 'Disabled'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>

        {/* Footer Navigation */}
        <div className="p-4 border-t border-border/50 flex items-center justify-between gap-3 shrink-0">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs h-9 gap-1"
              onClick={() => setStep((s) => s - 1)}
              disabled={isLoading}
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs h-9"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          )}

          {step < 4 ? (
            <Button
              type="button"
              size="sm"
              className="text-xs h-9 bg-indigo-600 hover:bg-indigo-700 text-white gap-1"
              disabled={step === 1 && selectedUtils.length < 2}
              onClick={() => setStep((s) => s + 1)}
            >
              Next: {STEP_LABELS[step]} <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              className="text-xs h-9 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white gap-1.5 shadow-sm"
              disabled={isLoading || selectedUtils.length < 2}
              onClick={handleRun}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Running Analysis…
                </span>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Run Analysis
                </>
              )}
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}
