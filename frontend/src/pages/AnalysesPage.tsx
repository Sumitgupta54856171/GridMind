import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  FlaskConical, Plus, Trash2, ArrowRight,
  Loader2, Building2, CheckCircle2,
} from 'lucide-react'
import { AppShell } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { analysesApi, type AnalysisRun, type CreateAnalysisPayload } from '@/api/analyses'
import { utilitiesApi } from '@/api/utilities'
import { projectsApi } from '@/api/projects'
import { AnalysisSetupWizard } from '@/components/analyses/AnalysisSetupWizard'

export default function AnalysesPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [showWizard, setShowWizard] = useState(false)
  const [activePipeline, setActivePipeline] = useState<AnalysisRun | null>(null)

  // Queries
  const { data: analysesData, isLoading: analysesLoading } = useQuery({
    queryKey: ['analyses'],
    queryFn: () => analysesApi.list().then((r) => r.data.analyses),
  })

  const { data: utilitiesData } = useQuery({
    queryKey: ['utilities'],
    queryFn: () => utilitiesApi.list().then((r) => r.data.utilities),
  })

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list().then((r) => r.data.projects),
  })

  const analyses = analysesData || []
  const utilities = utilitiesData || []
  const projects = projectsData || []

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateAnalysisPayload) => analysesApi.create(data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['analyses'] })
      qc.invalidateQueries({ queryKey: ['conflicts'] })
      setActivePipeline(res.data.analysisRun)
      setShowWizard(false)
      toast.success('Analysis Completed', {
        description: `Discovered ${res.data.totalConflicts} potential conflict(s) with ${res.data.highSeverityCount} high priority.`,
      })
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Analysis execution failed.'
      toast.error('Analysis Failed', { description: msg })
    },
  })

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => analysesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['analyses'] })
      qc.invalidateQueries({ queryKey: ['conflicts'] })
      toast.success('Analysis run deleted')
    },
  })

  const handleDelete = (id: string) => {
    toast('Delete this analysis run?', {
      description: 'This will remove the run and all associated conflict records.',
      action: {
        label: 'Delete',
        onClick: () => deleteMutation.mutate(id),
      },
    })
  }

  return (
    <AppShell
      title="Analyses"
      subtitle="Multi-utility spatial and temporal coordination comparisons"
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Controls Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-indigo-600" />
              Coordination Analyses
              <Badge variant="secondary" className="text-xs font-normal">
                {analyses.length} completed
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cross-utility conflict detection, overlap duration calculations, and AI recommendations
            </p>
          </div>

          <Button
            className="gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm"
            onClick={() => setShowWizard(true)}
          >
            <Plus className="w-4 h-4" />
            New Analysis
          </Button>
        </div>

        {/* Active Pipeline Card (if recently executed) */}
        {activePipeline && (
          <Card className="border-indigo-200 bg-indigo-50/40 p-4 shadow-sm animate-in fade-in duration-200">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-indigo-100 flex-wrap">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h4 className="font-bold text-xs text-foreground">
                  Analysis Pipeline Completed Successfully
                </h4>
              </div>
              <Button
                size="sm"
                className="text-xs h-7 bg-indigo-600 hover:bg-indigo-700 text-white gap-1"
                onClick={() => navigate(`/conflicts?analysisRunId=${activePipeline._id}`)}
              >
                Inspect Results <ArrowRight className="w-3 h-3" />
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground">Spatial Engine:</span>
                <span className="font-bold text-foreground">Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground">Temporal Overlap:</span>
                <span className="font-bold text-foreground">Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground">Evidence Linking:</span>
                <span className="font-bold text-foreground">Grounded</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground">Gemini AI Synthesis:</span>
                <span className="font-bold text-foreground">Complete</span>
              </div>
            </div>
          </Card>
        )}

        {/* Analyses Table View */}
        {analysesLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : analyses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center flex flex-col items-center justify-center max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3">
              <FlaskConical className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">No analyses run yet</h3>
            <p className="text-xs text-muted-foreground mt-1 mb-5 text-center leading-relaxed">
              Compare two or more utilities to discover spatial proximity and calendar overlaps between future capital construction plans.
            </p>
            <Button
              className="gap-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-xs h-9"
              onClick={() => setShowWizard(true)}
            >
              <Plus className="w-4 h-4" /> Start First Analysis
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] font-semibold tracking-wider border-b border-border/60">
                  <tr>
                    <th scope="col" className="py-3 px-4">Run ID / Date</th>
                    <th scope="col" className="py-3 px-4">Compared Utilities</th>
                    <th scope="col" className="py-3 px-3">Thresholds</th>
                    <th scope="col" className="py-3 px-3">Conflicts</th>
                    <th scope="col" className="py-3 px-3">High Priority</th>
                    <th scope="col" className="py-3 px-3">Status</th>
                    <th scope="col" className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {analyses.map((run) => {
                    const dateFormatted = new Date(run.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })

                    const utilNames = run.utilityIds?.map((u) => u.name).join(' ↔ ') || 'Utilities'

                    return (
                      <tr key={run._id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-medium text-foreground whitespace-nowrap">
                          <p className="font-semibold text-foreground">{dateFormatted}</p>
                          <span className="text-[10px] text-muted-foreground">ID: {run._id.slice(-6)}</span>
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-foreground max-w-xs">
                          <p className="truncate flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            {utilNames}
                          </p>
                        </td>

                        <td className="py-3.5 px-3 whitespace-nowrap font-mono text-muted-foreground text-[11px]">
                          ≤ {run.configuration?.spatialThresholdMeters || 100}m · ≥ {run.configuration?.minimumOverlapDays || 1}d
                        </td>

                        <td className="py-3.5 px-3 whitespace-nowrap font-mono font-semibold text-foreground">
                          {run.totalConflicts ?? 0}
                        </td>

                        <td className="py-3.5 px-3 whitespace-nowrap font-mono font-bold text-rose-600">
                          {run.highSeverityCount ?? 0}
                        </td>

                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            ● Completed
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs px-2 gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                              onClick={() => navigate(`/conflicts?analysisRunId=${run._id}`)}
                            >
                              Inspect Conflicts
                            </Button>
                            <button
                              onClick={() => handleDelete(run._id)}
                              className="p-1 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                              title="Delete analysis"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Wizard Modal */}
        {showWizard && (
          <AnalysisSetupWizard
            utilities={utilities}
            projects={projects}
            onSubmit={(data) => createMutation.mutateAsync(data)}
            onCancel={() => setShowWizard(false)}
            isLoading={createMutation.isPending}
          />
        )}
      </div>
    </AppShell>
  )
}
