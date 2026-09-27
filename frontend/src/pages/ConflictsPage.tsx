import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  AlertTriangle, Building2,
  Eye, CheckCircle2, Search, X, Loader2,
} from 'lucide-react'
import { AppShell } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { conflictsApi, type Conflict, type ConflictStatus } from '@/api/conflicts'
import { ConflictDetailModal } from '@/components/conflicts/ConflictDetailModal'

export default function ConflictsPage() {
  const [searchParams] = useSearchParams()
  const qc = useQueryClient()

  const analysisRunIdParam = searchParams.get('analysisRunId') || undefined

  // Filters
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [inspectingConflict, setInspectingConflict] = useState<Conflict | null>(null)

  // Queries
  const { data: conflictsData, isLoading: conflictsLoading } = useQuery({
    queryKey: ['conflicts', { analysisRunId: analysisRunIdParam, severity: selectedSeverity, status: selectedStatus }],
    queryFn: () =>
      conflictsApi
        .list({
          analysisRunId: analysisRunIdParam,
          severity: selectedSeverity !== 'all' ? selectedSeverity : undefined,
          status: selectedStatus !== 'all' ? selectedStatus : undefined,
        })
        .then((r) => r.data.conflicts),
  })

  const conflicts = conflictsData || []

  // Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ConflictStatus }) =>
      conflictsApi.updateStatus(id, status),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['conflicts'] })
      toast.success(res.data.message || 'Status updated')
      if (inspectingConflict && inspectingConflict._id === res.data.conflict._id) {
        setInspectingConflict(res.data.conflict)
      }
    },
    onError: () => toast.error('Failed to update status'),
  })

  // Summary counts
  const summaryCounts = useMemo(() => {
    let high = 0
    let medium = 0
    let low = 0
    conflicts.forEach((c) => {
      if (c.severity === 'HIGH') high++
      else if (c.severity === 'MEDIUM') medium++
      else if (c.severity === 'LOW') low++
    })
    return { total: conflicts.length, high, medium, low }
  }, [conflicts])

  // Filtered conflicts
  const filteredConflicts = useMemo(() => {
    return conflicts.filter((c) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const nameA = c.projectAId?.name?.toLowerCase() || ''
        const nameB = c.projectBId?.name?.toLowerCase() || ''
        const corrA = c.projectAId?.corridorName?.toLowerCase() || ''
        const corrB = c.projectBId?.corridorName?.toLowerCase() || ''
        const utilA = c.projectAId?.utilityId?.name?.toLowerCase() || ''
        const utilB = c.projectBId?.utilityId?.name?.toLowerCase() || ''
        return (
          nameA.includes(q) ||
          nameB.includes(q) ||
          corrA.includes(q) ||
          corrB.includes(q) ||
          utilA.includes(q) ||
          utilB.includes(q)
        )
      }
      return true
    })
  }, [conflicts, searchQuery])

  return (
    <AppShell
      title="Conflict Opportunities"
      subtitle="Detected spatial overlaps and synchronized construction windows across utilities"
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              Conflict Candidates & Opportunities
              <Badge variant="secondary" className="text-xs font-normal">
                {summaryCounts.total} total
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Grounded in physical distance and construction dates to prevent repeated excavation
            </p>
          </div>
        </div>

        {/* Summary Chips (matching build/ui.html lines 243-248) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl border border-border/70 bg-card flex flex-col gap-0.5 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Conflicts</span>
            <span className="text-2xl font-bold font-mono text-foreground">{summaryCounts.total}</span>
            <span className="text-[10px] text-muted-foreground">Detected across runs</span>
          </div>

          <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/40 flex flex-col gap-0.5 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">High Priority</span>
            <span className="text-2xl font-bold font-mono text-rose-700">{summaryCounts.high}</span>
            <span className="text-[10px] text-rose-600">Immediate coordination required</span>
          </div>

          <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 flex flex-col gap-0.5 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Medium Priority</span>
            <span className="text-2xl font-bold font-mono text-amber-700">{summaryCounts.medium}</span>
            <span className="text-[10px] text-amber-600">Sequencing review recommended</span>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col gap-0.5 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Low Priority</span>
            <span className="text-2xl font-bold font-mono text-slate-700">{summaryCounts.low}</span>
            <span className="text-[10px] text-slate-500">Monitor schedule drift</span>
          </div>
        </div>

        {/* Severity Filter Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {['all', 'high', 'medium', 'low'].map((s) => {
            const isActive = selectedSeverity === s
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSelectedSeverity(s)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                  isActive
                    ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                    : 'bg-card border-border/70 text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <span className="capitalize">{s === 'all' ? 'All Severities' : `${s} Priority`}</span>
              </button>
            )
          })}
        </div>

        {/* Search Bar */}
        <div className="p-3.5 rounded-xl border border-border/60 bg-card flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by project title, corridor, or utility…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-9 text-xs border-border/60 bg-background/50 focus-visible:ring-indigo-500/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-9 rounded-md border border-border/60 bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Review Statuses</option>
              <option value="new">New</option>
              <option value="actionable">Actionable</option>
              <option value="reviewed">Reviewed</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>
        </div>

        {/* Conflict Cards Grid */}
        {conflictsLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredConflicts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center flex flex-col items-center justify-center max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">No conflicts match filters</h3>
            <p className="text-xs text-muted-foreground mt-1 mb-5 text-center leading-relaxed">
              Run a coordination analysis on the Analyses page to discover cross-utility overlaps.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredConflicts.map((c) => {
              const pA = c.projectAId
              const pB = c.projectBId
              const sevBadgeClass =
                c.severity === 'HIGH'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : c.severity === 'MEDIUM'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200'

              return (
                <Card
                  key={c._id}
                  className="border-border/70 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col p-4 gap-3 cursor-pointer group"
                  onClick={() => setInspectingConflict(c)}
                >
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className={`text-[10px] font-bold uppercase border ${sevBadgeClass}`}>
                      {c.severity} Priority
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] capitalize font-mono">
                      {c.status}
                    </Badge>
                  </div>

                  {/* Conflict Project Titles */}
                  <div className="space-y-1 min-w-0">
                    <h3 className="font-bold text-sm text-foreground leading-snug group-hover:text-indigo-600 transition-colors">
                      {pA?.name} <span className="text-muted-foreground font-normal">↔</span> {pB?.name}
                    </h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                      <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span>{pA?.utilityId?.name} ↔ {pB?.utilityId?.name}</span>
                    </p>
                  </div>

                  {/* Metric Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted/60 font-mono font-medium text-foreground">
                      {c.spatial.distanceMeters} m apart
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted/60 font-mono font-medium text-foreground">
                      {c.temporal.overlapDays}-day overlap
                    </span>
                    {pA?.corridorName && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted/60 text-muted-foreground truncate max-w-[160px]">
                        📍 {pA.corridorName}
                      </span>
                    )}
                  </div>

                  {/* AI Recommendation Summary Preview */}
                  {c.recommendation?.summary && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed bg-indigo-50/30 p-2 rounded-lg border border-indigo-100/60">
                      💡 {c.recommendation.summary}
                    </p>
                  )}

                  {/* Bottom Inspect Action */}
                  <div className="mt-auto pt-2 border-t border-border/40 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-muted-foreground">
                      Score: <b className="text-foreground">{c.conflictScore}</b>/100
                    </span>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs px-2.5 gap-1 text-indigo-600 border-indigo-200 group-hover:bg-indigo-50"
                      onClick={(e) => {
                        e.stopPropagation()
                        setInspectingConflict(c)
                      }}
                    >
                      <Eye className="w-3 h-3" /> Inspect Details
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {/* Conflict Detail Modal */}
        {inspectingConflict && (
          <ConflictDetailModal
            conflict={inspectingConflict}
            onClose={() => setInspectingConflict(null)}
            onStatusChange={(id, status) => updateStatusMutation.mutateAsync({ id, status })}
          />
        )}
      </div>
    </AppShell>
  )
}
