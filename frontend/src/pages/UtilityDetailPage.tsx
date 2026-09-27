import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Building2,
  FolderOpen,
  Database,
  MapPin,
  Globe,
  ExternalLink,
  ArrowLeft,
  Plus,
  Upload,
  Calendar,
  Pencil,
  Trash2,
  Eye,
  Sparkles,
} from 'lucide-react'
import { Loader2 } from 'lucide-react'
import { AppShell } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EditUtilityForm } from '@/components/utilities'
import {
  AddSourceForm,
  EditSourceForm,
  SourceDetailModal,
} from '@/components/sources'
import { utilitiesApi, type UpdateUtilityPayload } from '@/api/utilities'
import {
  sourcesApi,
  type DataSource,
  type CreateSourcePayload,
  type UpdateSourcePayload,
} from '@/api/sources'

export default function UtilityDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [showEditModal, setShowEditModal] = useState(false)
  const [showAddSourceModal, setShowAddSourceModal] = useState(false)
  const [editingSource, setEditingSource] = useState<DataSource | null>(null)
  const [viewingSource, setViewingSource] = useState<DataSource | null>(null)

  // ── Utility Query ─────────────────────────────────────────────
  const { data: utility, isLoading: utilityLoading, isError: utilityError } = useQuery({
    queryKey: ['utility', id],
    queryFn: () => utilitiesApi.getById(id!).then((r) => r.data.utility),
    enabled: !!id,
  })

  // ── Sources Query for this utility ────────────────────────────
  const { data: sourcesData, isLoading: sourcesLoading } = useQuery({
    queryKey: ['sources', 'utility', id],
    queryFn: () => sourcesApi.listByUtility(id!).then((r) => r.data.sources),
    enabled: !!id,
  })

  const sources = sourcesData || []

  // ── Utility Update mutation ───────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: (payload: UpdateUtilityPayload) => utilitiesApi.update(id!, payload),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['utilities'] })
      qc.invalidateQueries({ queryKey: ['utility', id] })
      toast.success(`"${res.data.utility.name}" updated`)
      setShowEditModal(false)
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to update utility.'
      toast.error('Update failed', { description: message })
    },
  })

  // ── Utility Delete mutation ───────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: () => utilitiesApi.delete(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['utilities'] })
      toast.success('Utility deleted')
      navigate('/utilities')
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to delete utility.'
      toast.error('Delete failed', { description: message })
    },
  })

  // ── Create Source mutation ────────────────────────────────────
  const createSourceMutation = useMutation({
    mutationFn: (data: CreateSourcePayload | FormData) => sourcesApi.createForUtility(id!, data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['sources'] })
      qc.invalidateQueries({ queryKey: ['sources', 'utility', id] })
      qc.invalidateQueries({ queryKey: ['utility', id] })
      qc.invalidateQueries({ queryKey: ['utilities'] })
      toast.success(`"${res.data.source.name}" attached`)
      setShowAddSourceModal(false)
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to add source.'
      toast.error('Add failed', { description: message })
    },
  })

  // ── Update Source mutation ────────────────────────────────────
  const updateSourceMutation = useMutation({
    mutationFn: ({ sourceId, data }: { sourceId: string; data: UpdateSourcePayload }) =>
      sourcesApi.update(sourceId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sources'] })
      qc.invalidateQueries({ queryKey: ['sources', 'utility', id] })
      toast.success('Source updated')
      setEditingSource(null)
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to update source.'
      toast.error('Update failed', { description: message })
    },
  })

  // ── Delete Source mutation ────────────────────────────────────
  const deleteSourceMutation = useMutation({
    mutationFn: (sourceId: string) => sourcesApi.delete(sourceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sources'] })
      qc.invalidateQueries({ queryKey: ['sources', 'utility', id] })
      qc.invalidateQueries({ queryKey: ['utility', id] })
      qc.invalidateQueries({ queryKey: ['utilities'] })
      toast.success('Source deleted')
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to delete source.'
      toast.error('Delete failed', { description: message })
    },
  })

  const handleDeleteUtility = () => {
    if (!utility) return
    toast(`Delete "${utility.name}"?`, {
      description: 'This will permanently remove this utility organization.',
      action: {
        label: 'Delete',
        onClick: () => deleteMutation.mutate(),
      },
    })
  }

  const handleDeleteSource = (sourceId: string, sourceName: string) => {
    toast(`Delete "${sourceName}"?`, {
      description: 'This will remove the attached data source reference.',
      action: {
        label: 'Delete',
        onClick: () => deleteSourceMutation.mutate(sourceId),
      },
    })
  }

  // ── Extract Source mutation ───────────────────────────────────
  const extractSourceMutation = useMutation({
    mutationFn: (sourceId: string) => sourcesApi.triggerExtraction(sourceId),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['sources'] })
      qc.invalidateQueries({ queryKey: ['sources', 'utility', id] })
      qc.invalidateQueries({ queryKey: ['utility', id] })
      qc.invalidateQueries({ queryKey: ['utilities'] })
      qc.invalidateQueries({ queryKey: ['projects'] })
      toast.success(res.data.message || 'AI Extraction completed', {
        description: `Extracted ${res.data.totalExtracted ?? 0} projects via Gemini AI.`,
      })
      if (viewingSource && viewingSource._id === res.data.source?._id) {
        setViewingSource(res.data.source)
      }
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Extraction failed.'
      toast.error('AI Extraction Failed', { description: message })
    },
  })

  const handleExtractSource = (source: DataSource) => {
    toast(`Run Gemini AI Extraction on "${source.name}"?`, {
      description: 'The AI Agent will scan the document/dataset and extract all projects.',
      action: {
        label: 'Extract',
        onClick: () => extractSourceMutation.mutate(source._id),
      },
    })
  }

  if (utilityLoading) {
    return (
      <AppShell title="Utility Details">
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    )
  }

  if (utilityError || !utility) {
    return (
      <AppShell title="Utility Details">
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <p className="text-sm text-red-500 font-medium">Utility not found</p>
          <Button variant="outline" className="mt-4 gap-2" onClick={() => navigate('/utilities')}>
            <ArrowLeft className="w-4 h-4" /> Back to Utilities
          </Button>
        </div>
      </AppShell>
    )
  }

  const initials = utility.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const hasGeoPolygon = Array.isArray(utility.serviceArea?.coordinates) && utility.serviceArea.coordinates.length > 0

  return (
    <AppShell title={utility.name} subtitle="Utility organisation details">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/utilities')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Utilities
          </button>

          {/* Utility actions */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-8 text-xs hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50"
              onClick={() => setShowEditModal(true)}
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit Utility
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-8 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
              onClick={handleDeleteUtility}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </Button>
          </div>
        </div>

        {/* ── Header card ── */}
        <Card className="border-border/60">
          <CardContent className="p-6">
            <div className="flex items-start gap-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/20 shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-foreground">{utility.name}</h2>
                {utility.description ? (
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{utility.description}</p>
                ) : (
                  <p className="text-xs text-muted-foreground italic mt-1">No description provided</p>
                )}
                <div className="flex flex-wrap items-center gap-4 mt-3">
                  {utility.website ? (
                    <a
                      href={utility.website.startsWith('http') ? utility.website : `https://${utility.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      {utility.website}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Globe className="w-3.5 h-3.5" />
                      No website linked
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    Updated {new Date(utility.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>
              {/* Quick actions for workflow */}
              <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50"
                  onClick={() => setShowAddSourceModal(true)}
                >
                  <Plus className="w-4 h-4" /> Add Source
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                  onClick={() => navigate(`/utilities/${utility._id}/import`)}
                >
                  <Upload className="w-4 h-4" /> Import Projects
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-border/60">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                <FolderOpen className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{utility.projectsCount}</p>
                <p className="text-xs text-muted-foreground">Projects Tracked</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                <Database className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{sources.length}</p>
                <p className="text-xs text-muted-foreground">Data Sources</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate" title={utility.serviceAreaText || (hasGeoPolygon ? 'Polygon defined' : 'Not set')}>
                  {utility.serviceAreaText || (hasGeoPolygon ? 'Polygon defined' : 'Not set')}
                </p>
                <p className="text-xs text-muted-foreground">Service Area</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Attached Data Sources Section ── */}
        <Card className="border-border/60">
          <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-600" />
              Attached Public Data Sources ({sources.length})
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              onClick={() => setShowAddSourceModal(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Source
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {sourcesLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : sources.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center">
                <Database className="w-8 h-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm font-medium text-foreground">No data sources attached yet</p>
                <p className="text-xs text-muted-foreground mt-0.5 max-w-sm mb-4">
                  Add a public Capital Improvement Plan, GIS dataset, or CSV spreadsheet to begin importing projects for this utility.
                </p>
                <Button
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 gap-1.5"
                  onClick={() => setShowAddSourceModal(true)}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Attach First Source
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {sources.map((src) => {
                  const typeBadgeClass =
                    src.sourceType === 'pdf'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : src.sourceType === 'csv'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : src.sourceType === 'json'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'

                  return (
                    <div
                      key={src._id}
                      className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={`text-[10px] font-semibold uppercase px-1.5 py-0 border ${typeBadgeClass}`}>
                            {src.sourceType}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] capitalize px-1.5 py-0 border">
                            {src.parserStatus}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {src.projectsCount} project(s)
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-foreground truncate">{src.name}</h4>
                        {src.metadata?.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {src.metadata.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        {src.sourceUrl && (
                          <a
                            href={src.sourceUrl.startsWith('http') ? src.sourceUrl : `https://${src.sourceUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            title="Open external link"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs px-2 gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                          disabled={src.parserStatus === 'processing'}
                          onClick={() => handleExtractSource(src)}
                          title="Extract projects with Gemini AI Agent"
                        >
                          <Sparkles className="w-3 h-3 text-indigo-500" />
                          Extract
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs px-2 gap-1"
                          onClick={() => setViewingSource(src)}
                        >
                          <Eye className="w-3 h-3" />
                          Inspect
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs px-2 gap-1"
                          onClick={() => setEditingSource(src)}
                        >
                          <Pencil className="w-3 h-3" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs px-2 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                          onClick={() => handleDeleteSource(src._id, src.name)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Organisation Specification card ── */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              Organisation Specification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Utility Name</p>
                <p className="font-medium text-foreground">{utility.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Region / Service Area</p>
                <p className="font-medium text-foreground">
                  {utility.serviceAreaText || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Website</p>
                {utility.website ? (
                  <a
                    href={utility.website.startsWith('http') ? utility.website : `https://${utility.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm truncate block"
                  >
                    {utility.website}
                  </a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">GIS Spatial Boundary</p>
                <Badge variant={hasGeoPolygon ? 'default' : 'secondary'} className="text-xs font-normal">
                  {hasGeoPolygon ? 'GeoJSON Polygon Registered' : 'Text/Descriptive Only'}
                </Badge>
              </div>
            </div>

            {hasGeoPolygon && (
              <div className="pt-2 border-t border-border/50">
                <p className="text-xs font-medium text-muted-foreground mb-1">GIS Coordinates (GeoJSON Polygon):</p>
                <div className="p-2.5 rounded-lg bg-muted/50 font-mono text-[11px] text-muted-foreground overflow-x-auto max-h-28">
                  {JSON.stringify(utility.serviceArea?.coordinates)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Utility modal */}
      {showEditModal && (
        <EditUtilityForm
          utility={utility}
          onSubmit={updateMutation.mutateAsync}
          onCancel={() => setShowEditModal(false)}
          isLoading={updateMutation.isPending}
        />
      )}

      {/* Add Source modal (pre-bound to this utility) */}
      {showAddSourceModal && (
        <AddSourceForm
          initialUtilityId={utility._id}
          initialUtilityName={utility.name}
          onSubmit={(_utilId, data) => createSourceMutation.mutateAsync(data)}
          onCancel={() => setShowAddSourceModal(false)}
          isLoading={createSourceMutation.isPending}
        />
      )}

      {/* Edit Source modal */}
      {editingSource && (
        <EditSourceForm
          source={editingSource}
          onSubmit={(data) =>
            updateSourceMutation.mutateAsync({ sourceId: editingSource._id, data })
          }
          onCancel={() => setEditingSource(null)}
          isLoading={updateSourceMutation.isPending}
        />
      )}

      {/* View Source Provenance modal */}
      {viewingSource && (
        <SourceDetailModal
          source={viewingSource}
          onClose={() => setViewingSource(null)}
          onEdit={(s) => setEditingSource(s)}
          onExtract={handleExtractSource}
        />
      )}
    </AppShell>
  )
}


