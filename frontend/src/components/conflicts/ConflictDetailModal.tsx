import { useState } from 'react'
import {
  X, Calendar, MapPin, Sparkles,
  AlertTriangle, ShieldCheck, Check,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Conflict, ConflictStatus } from '@/api/conflicts'

interface ConflictDetailModalProps {
  conflict: Conflict
  onClose: () => void
  onStatusChange?: (id: string, newStatus: ConflictStatus) => Promise<unknown>
}

export function ConflictDetailModal({
  conflict,
  onClose,
  onStatusChange,
}: ConflictDetailModalProps) {
  const [currentStatus, setCurrentStatus] = useState<ConflictStatus>(conflict.status)
  const [updating, setUpdating] = useState(false)

  const pA = conflict.projectAId
  const pB = conflict.projectBId
  const rec = conflict.recommendation
  const evidence = conflict.evidenceItems || []

  const handleUpdateStatus = async (status: ConflictStatus) => {
    if (!onStatusChange) return
    setUpdating(true)
    try {
      await onStatusChange(conflict._id, status)
      setCurrentStatus(status)
    } finally {
      setUpdating(false)
    }
  }

  const severityBadgeClass =
    conflict.severity === 'HIGH'
      ? 'bg-rose-50 text-rose-700 border-rose-200'
      : conflict.severity === 'MEDIUM'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-slate-100 text-slate-700 border-slate-200'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4 overflow-y-auto">
      <Card className="w-full max-w-3xl my-6 shadow-2xl border-border/60 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <CardHeader className="pb-3 border-b border-border/50 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-bold">Conflict Opportunity</CardTitle>
                  <Badge variant="outline" className={`text-[10px] font-bold uppercase border ${severityBadgeClass}`}>
                    {conflict.severity} Priority
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] capitalize">
                    {currentStatus}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Spatial corridor proximity and construction window overlap
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </CardHeader>

        {/* Content */}
        <CardContent className="overflow-y-auto p-5 space-y-4 text-xs">
          {/* Side-by-Side Project Comparison (Screen 13 in build/ui.html) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Project A */}
            <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <span className="font-bold text-[11px] text-muted-foreground uppercase tracking-wider">
                  {pA?.utilityId?.name || 'Utility A'}
                </span>
              </div>
              <h4 className="font-bold text-sm text-foreground leading-snug">{pA?.name}</h4>
              <div className="space-y-1 text-muted-foreground text-[11px]">
                <p className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-indigo-500 shrink-0" />
                  <span>{pA?.corridorName || pA?.locationText || 'Corridor record'}</span>
                </p>
                <p className="flex items-center gap-1 font-mono">
                  <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span>
                    {pA?.startDate ? new Date(pA.startDate).toLocaleDateString() : 'N/A'} —{' '}
                    {pA?.endDate ? new Date(pA.endDate).toLocaleDateString() : 'Ongoing'}
                  </span>
                </p>
              </div>
            </div>

            {/* Project B */}
            <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                <span className="font-bold text-[11px] text-muted-foreground uppercase tracking-wider">
                  {pB?.utilityId?.name || 'Utility B'}
                </span>
              </div>
              <h4 className="font-bold text-sm text-foreground leading-snug">{pB?.name}</h4>
              <div className="space-y-1 text-muted-foreground text-[11px]">
                <p className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-indigo-500 shrink-0" />
                  <span>{pB?.corridorName || pB?.locationText || 'Corridor record'}</span>
                </p>
                <p className="flex items-center gap-1 font-mono">
                  <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span>
                    {pB?.startDate ? new Date(pB.startDate).toLocaleDateString() : 'N/A'} —{' '}
                    {pB?.endDate ? new Date(pB.endDate).toLocaleDateString() : 'Ongoing'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* KPI Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-2.5 rounded-lg border border-border/60 bg-background text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Spatial Proximity</p>
              <p className="text-lg font-bold font-mono text-foreground mt-0.5">
                {conflict.spatial.distanceMeters} m
              </p>
              <p className="text-[10px] text-muted-foreground">
                {conflict.spatial.sameCorridor ? 'Same street corridor' : 'Adjacent alignment'}
              </p>
            </div>

            <div className="p-2.5 rounded-lg border border-border/60 bg-background text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Temporal Overlap</p>
              <p className="text-lg font-bold font-mono text-foreground mt-0.5">
                {conflict.temporal.overlapDays} days
              </p>
              <p className="text-[10px] text-muted-foreground">Concurrent schedule</p>
            </div>

            <div className="p-2.5 rounded-lg border border-border/60 bg-background text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Conflict Score</p>
              <p className="text-lg font-bold font-mono text-rose-600 mt-0.5">
                {conflict.conflictScore} <span className="text-xs text-muted-foreground">/ 100</span>
              </p>
              <p className="text-[10px] text-muted-foreground">Deterministic calculation</p>
            </div>

            <div className="p-2.5 rounded-lg border border-border/60 bg-background text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">AI Confidence</p>
              <p className="text-lg font-bold font-mono text-emerald-600 mt-0.5">
                {Math.round((rec?.confidence || 0.9) * 100)}%
              </p>
              <p className="text-[10px] text-muted-foreground">Grounded facts</p>
            </div>
          </div>

          {/* AI Coordination Recommendations (Gemini Agent) */}
          {rec && (
            <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/30 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-xs text-foreground">
                  Gemini AI Coordination Intelligence
                </span>
                <Badge variant="outline" className="text-[9px] font-mono text-indigo-700 bg-white border-indigo-200 ml-auto">
                  Google Gemini 2.5 Flash
                </Badge>
              </div>

              {/* Why It Matters */}
              <div>
                <h5 className="font-semibold text-xs text-foreground mb-1">Why It Matters</h5>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {rec.whyItMatters}
                </p>
              </div>

              {/* Recommended Actions */}
              {rec.recommendedActions && rec.recommendedActions.length > 0 && (
                <div className="space-y-2 pt-1 border-t border-indigo-100">
                  <h5 className="font-semibold text-xs text-foreground">Recommended Coordination Actions</h5>
                  <div className="space-y-1.5">
                    {rec.recommendedActions.map((act, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-lg border border-border/60 bg-background flex flex-col gap-0.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-mono font-bold">
                              {i + 1}
                            </span>
                            {act.action}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[9px] font-semibold uppercase ${
                              act.priority === 'high'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : act.priority === 'medium'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {act.priority}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground pl-5.5 leading-relaxed">
                          {act.rationale}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Evidence Items Drawer (Screen 13 specification) */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <h5 className="font-semibold text-xs text-foreground flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              Verified Evidence Items ({evidence.length})
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              {evidence.map((ev, i) => (
                <div key={i} className="p-2 rounded-lg border border-border/60 bg-muted/20 space-y-0.5">
                  <span className="font-semibold text-foreground uppercase tracking-wider text-[9px] block text-muted-foreground">
                    {ev.evidenceType.replace(/_/g, ' ')}
                  </span>
                  <p className="font-medium text-foreground">
                    {typeof ev.value === 'object' ? JSON.stringify(ev.value) : String(ev.value)}
                  </p>
                  {ev.sourceReference?.section && (
                    <p className="text-[10px] text-muted-foreground truncate">
                      Ref: {ev.sourceReference.section}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border/50 flex items-center justify-between gap-2 shrink-0 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={updating || currentStatus === 'actionable'}
              onClick={() => handleUpdateStatus('actionable')}
              className={`text-xs h-8 ${currentStatus === 'actionable' ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold' : ''}`}
            >
              <Check className="w-3.5 h-3.5 text-emerald-600" /> Mark Actionable
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={updating || currentStatus === 'reviewed'}
              onClick={() => handleUpdateStatus('reviewed')}
              className="text-xs h-8"
            >
              Mark Reviewed
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={updating || currentStatus === 'dismissed'}
              onClick={() => handleUpdateStatus('dismissed')}
              className="text-xs h-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
            >
              Dismiss
            </Button>
          </div>

          <Button
            type="button"
            variant="default"
            size="sm"
            className="text-xs h-8 bg-slate-900 text-white"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </Card>
    </div>
  )
}
