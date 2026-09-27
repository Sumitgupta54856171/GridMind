import {
  X, Database, Globe, Calendar, ExternalLink,
  FolderOpen, Building2, CheckCircle2, Clock, AlertCircle, RefreshCw, Upload,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { DataSource, SourceType, ParserStatus } from '@/api/sources'

interface SourceDetailModalProps {
  source: DataSource
  onClose: () => void
  onEdit?: (source: DataSource) => void
}

const TYPE_CONFIG: Record<SourceType, { label: string; badgeClass: string }> = {
  pdf: { label: 'PDF Document', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' },
  csv: { label: 'CSV Spreadsheet', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  json: { label: 'JSON Dataset', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  gis: { label: 'GIS Service', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  webpage: { label: 'Webpage', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' },
  manual: { label: 'Manual Entry', badgeClass: 'bg-zinc-100 text-zinc-700 border-zinc-200' },
}

const STATUS_CONFIG: Record<ParserStatus, { label: string; icon: React.ComponentType<{ className?: string }>; badgeClass: string }> = {
  pending: { label: 'Pending Processing', icon: Clock, badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  processing: { label: 'Processing', icon: RefreshCw, badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  completed: { label: 'Processed / Extracted', icon: CheckCircle2, badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  failed: { label: 'Parser Failed', icon: AlertCircle, badgeClass: 'bg-red-50 text-red-700 border-red-200' },
}

export function SourceDetailModal({ source, onClose, onEdit }: SourceDetailModalProps) {
  const navigate = useNavigate()
  const typeCfg = TYPE_CONFIG[source.sourceType] || TYPE_CONFIG.manual
  const statusCfg = STATUS_CONFIG[source.parserStatus] || STATUS_CONFIG.pending
  const StatusIcon = statusCfg.icon

  const retrievedFormatted = new Date(source.retrievedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <Card className="w-full max-w-lg shadow-2xl border-border/60 animate-in zoom-in-95 duration-200">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                <Database className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Data Source Provenance</CardTitle>
                <p className="text-[11px] text-muted-foreground">Original source reference & parsing status</p>
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
        <CardContent className="pt-4 space-y-4 text-sm">
          {/* Header info */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="outline" className={`text-[10px] font-medium border ${typeCfg.badgeClass}`}>
                {typeCfg.label}
              </Badge>
              <Badge variant="outline" className={`text-[10px] font-medium border flex items-center gap-1 ${statusCfg.badgeClass}`}>
                <StatusIcon className="w-3 h-3" />
                {statusCfg.label}
              </Badge>
            </div>
            <h3 className="text-base font-bold text-foreground leading-snug">{source.name}</h3>
            {source.metadata?.description && (
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{source.metadata.description}</p>
            )}
          </div>

          {/* Provenance grid */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/40 border border-border/50 text-xs">
            <div>
              <p className="text-muted-foreground mb-0.5 flex items-center gap-1">
                <Building2 className="w-3 h-3" /> Utility
              </p>
              <p className="font-semibold text-foreground">{source.utilityId?.name || '—'}</p>
            </div>

            <div>
              <p className="text-muted-foreground mb-0.5 flex items-center gap-1">
                <FolderOpen className="w-3 h-3" /> Extracted Projects
              </p>
              <p className="font-semibold text-foreground">{source.projectsCount} project(s)</p>
            </div>

            <div>
              <p className="text-muted-foreground mb-0.5 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Retrieved Date
              </p>
              <p className="font-medium text-foreground">{retrievedFormatted}</p>
            </div>

            <div>
              <p className="text-muted-foreground mb-0.5">Publisher / Agency</p>
              <p className="font-medium text-foreground truncate">{source.metadata?.publisher || '—'}</p>
            </div>
          </div>

          {/* URL & Link */}
          <div className="space-y-1 text-xs">
            <p className="text-muted-foreground font-medium">Public Source URL</p>
            {source.sourceUrl ? (
              <a
                href={source.sourceUrl.startsWith('http') ? source.sourceUrl : `https://${source.sourceUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-blue-600 hover:underline font-mono text-[11px] break-all p-2 rounded-md bg-blue-50/60 border border-blue-100"
              >
                <Globe className="w-3.5 h-3.5 shrink-0" />
                <span className="flex-1 truncate">{source.sourceUrl}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            ) : (
              <p className="text-muted-foreground italic">No public URL recorded.</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2 border-t border-border/50">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs h-8"
                onClick={() => {
                  onClose()
                  onEdit(source)
                }}
              >
                Edit Metadata
              </Button>
            )}
            <Button
              size="sm"
              className="flex-1 text-xs h-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white gap-1.5"
              onClick={() => {
                onClose()
                navigate(`/utilities/${source.utilityId?._id}/import`)
              }}
            >
              <Upload className="w-3.5 h-3.5" />
              Import Projects
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
