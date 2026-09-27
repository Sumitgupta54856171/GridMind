import {
  Globe, Calendar, Trash2, ExternalLink, FolderOpen,
  Building2, Eye, Pencil, Clock, CheckCircle2, AlertCircle, RefreshCw,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { DataSource, SourceType, ParserStatus } from '@/api/sources'

interface SourceCardProps {
  source: DataSource
  onView: (source: DataSource) => void
  onEdit: (source: DataSource) => void
  onDelete: (id: string) => void
}

const TYPE_CONFIG: Record<SourceType, { label: string; badgeClass: string }> = {
  pdf: { label: 'PDF', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' },
  csv: { label: 'CSV', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  json: { label: 'JSON', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  gis: { label: 'GIS', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  webpage: { label: 'Webpage', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' },
  manual: { label: 'Manual', badgeClass: 'bg-zinc-100 text-zinc-700 border-zinc-200' },
}

const STATUS_CONFIG: Record<ParserStatus, { label: string; icon: React.ComponentType<{ className?: string }>; badgeClass: string }> = {
  pending: { label: 'Pending', icon: Clock, badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  processing: { label: 'Processing', icon: RefreshCw, badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  completed: { label: 'Processed', icon: CheckCircle2, badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  failed: { label: 'Failed', icon: AlertCircle, badgeClass: 'bg-red-50 text-red-700 border-red-200' },
}

export function SourceCard({ source, onView, onEdit, onDelete }: SourceCardProps) {
  const typeCfg = TYPE_CONFIG[source.sourceType] || TYPE_CONFIG.manual
  const statusCfg = STATUS_CONFIG[source.parserStatus] || STATUS_CONFIG.pending
  const StatusIcon = statusCfg.icon

  const formattedDate = new Date(source.retrievedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <Card className="group border-border/60 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/5 transition-all duration-200 flex flex-col">
      <CardContent className="p-5 flex flex-col gap-4 flex-1">
        {/* Top: badges + actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className={`text-[10px] font-semibold uppercase px-2 py-0.5 border ${typeCfg.badgeClass}`}>
              {typeCfg.label}
            </Badge>
            <Badge variant="outline" className={`text-[10px] font-medium px-2 py-0.5 border flex items-center gap-1 ${statusCfg.badgeClass}`}>
              <StatusIcon className="w-3 h-3" />
              {statusCfg.label}
            </Badge>
          </div>

          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(source)}
              className="p-1 rounded-md text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              title="Edit source"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(source._id)}
              className="p-1 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Delete source"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Title + utility */}
        <div className="min-w-0">
          <h3 className="font-semibold text-foreground text-sm leading-snug line-clamp-2">
            {source.name}
          </h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 truncate">
            <Building2 className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
            <span className="font-medium text-foreground">{source.utilityId?.name || 'Unassigned'}</span>
          </p>
          {source.metadata?.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
              {source.metadata.description}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mt-auto pt-2 border-t border-border/40">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/60">
            <FolderOpen className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-foreground leading-none">{source.projectsCount}</p>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Projects</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/60">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs font-medium text-foreground leading-none truncate">{formattedDate}</p>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Retrieved</p>
            </div>
          </div>
        </div>

        {/* Bottom actions */}
        <div className="flex items-center gap-2 pt-1 border-t border-border/50">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs gap-1.5 hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50"
            onClick={() => onView(source)}
          >
            <Eye className="w-3.5 h-3.5" />
            Inspect
          </Button>

          {source.sourceUrl && (
            <a
              href={source.sourceUrl.startsWith('http') ? source.sourceUrl : `https://${source.sourceUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center h-8 px-2.5 rounded-md border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground text-xs gap-1 transition-colors"
              title="Open public link"
            >
              <Globe className="w-3 h-3" />
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
