import { Globe, Calendar, Trash2, ExternalLink, FolderOpen, Database, MapPin, Eye, Plus, Upload, Pencil } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Utility } from '@/api/utilities'

interface UtilityCardProps {
  utility: Utility
  onEdit: (utility: Utility) => void
  onDelete: (id: string) => void
}

export function UtilityCard({ utility, onEdit, onDelete }: UtilityCardProps) {
  const navigate = useNavigate()

  const initials = utility.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const formattedDate = new Date(utility.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <Card className="group border-border/60 hover:border-blue-200 hover:shadow-md hover:shadow-blue-500/5 transition-all duration-200 flex flex-col">
      <CardContent className="p-5 flex flex-col gap-4 flex-1">

        {/* ── Top row: avatar + name + actions ── */}
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md shadow-blue-500/20">
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1">
              <h3 className="font-semibold text-foreground text-sm leading-snug">
                {utility.name}
              </h3>
              <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onEdit(utility)}
                  className="p-1 rounded-md text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  title="Edit utility"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDelete(utility._id)}
                  className="p-1 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Delete utility"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {utility.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mt-0.5">
                {utility.description}
              </p>
            )}
          </div>
        </div>

        {/* ── Stats grid: Projects / Sources / Service area / Updated ── */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-muted/60">
            <FolderOpen className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-foreground leading-none">{utility.projectsCount}</p>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Projects</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-muted/60">
            <Database className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-foreground leading-none">{utility.sourcesCount}</p>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Sources</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-muted/60 col-span-2">
            <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <p className="text-xs text-muted-foreground truncate" title={utility.serviceAreaText || (utility.serviceArea?.coordinates?.length ? 'GeoJSON Polygon Defined' : 'No service area set')}>
              {utility.serviceAreaText ||
                (utility.serviceArea?.coordinates?.length ? 'GeoJSON Polygon Defined' : 'No service area set')}
            </p>
          </div>
        </div>

        {/* ── Meta row: website + last updated ── */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {utility.website ? (
            <a
              href={utility.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <Globe className="w-3 h-3" />
              Website
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          ) : (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal text-muted-foreground">
              No website
            </Badge>
          )}
          <span className="flex items-center gap-1 ml-auto">
            <Calendar className="w-3 h-3" />
            {formattedDate}
          </span>
        </div>

        {/* ── Action buttons ── */}
        <div className="flex gap-2 pt-1 border-t border-border/50">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 h-8 text-xs hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50"
            onClick={() => navigate(`/utilities/${utility._id}`)}
          >
            <Eye className="w-3.5 h-3.5" />
            View
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 h-8 text-xs hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50"
            onClick={() => navigate(`/utilities/${utility._id}/sources/new`)}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Source
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 h-8 text-xs hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50"
            onClick={() => navigate(`/utilities/${utility._id}/import`)}
          >
            <Upload className="w-3.5 h-3.5" />
            Import
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
