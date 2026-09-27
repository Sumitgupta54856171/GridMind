import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Database, Plus, Search, Filter, Loader2, X,
  LayoutGrid, Table as TableIcon, ExternalLink,
  Eye, Pencil, Trash2, Building2,
} from 'lucide-react'
import { AppShell } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { utilitiesApi } from '@/api/utilities'
import {
  sourcesApi,
  type DataSource,
  type CreateSourcePayload,
  type UpdateSourcePayload,
} from '@/api/sources'
import {
  AddSourceForm,
  EditSourceForm,
  SourceDetailModal,
  SourceCard,
} from '@/components/sources'

export default function SourcesPage() {
  const qc = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingSource, setEditingSource] = useState<DataSource | null>(null)
  const [viewingSource, setViewingSource] = useState<DataSource | null>(null)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table')

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUtility, setSelectedUtility] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')

  // ── Queries ──────────────────────────────────────────────────
  const { data: sourcesData, isLoading: sourcesLoading, isError: sourcesError } = useQuery({
    queryKey: ['sources'],
    queryFn: () => sourcesApi.list().then((r) => r.data.sources),
  })

  const { data: utilitiesData } = useQuery({
    queryKey: ['utilities'],
    queryFn: () => utilitiesApi.list().then((r) => r.data.utilities),
  })

  const sources = sourcesData || []
  const utilities = utilitiesData || []

  // ── Create Mutation ──────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: ({ utilityId, data }: { utilityId: string; data: CreateSourcePayload }) =>
      sourcesApi.createForUtility(utilityId, data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['sources'] })
      qc.invalidateQueries({ queryKey: ['utilities'] })
      toast.success(`"${res.data.source.name}" added`, {
        description: 'Data source attached to utility organisation.',
      })
      setShowAddModal(false)
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to add source.'
      toast.error('Add failed', { description: msg })
    },
  })

  // ── Update Mutation ──────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSourcePayload }) =>
      sourcesApi.update(id, data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['sources'] })
      toast.success(`"${res.data.source.name}" updated`)
      setEditingSource(null)
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to update source.'
      toast.error('Update failed', { description: msg })
    },
  })

  // ── Delete Mutation ──────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) => sourcesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sources'] })
      qc.invalidateQueries({ queryKey: ['utilities'] })
      toast.success('Source deleted')
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to delete source.'
      toast.error('Delete failed', { description: msg })
    },
  })

  const handleDelete = (id: string) => {
    const s = sources.find((src) => src._id === id)
    const name = s?.name || 'source'
    toast(`Delete "${name}"?`, {
      description: 'This will remove the attached data source reference.',
      action: {
        label: 'Delete',
        onClick: () => deleteMutation.mutate(id),
      },
    })
  }

  // ── Filtered list ────────────────────────────────────────────
  const filteredSources = useMemo(() => {
    return sources.filter((s) => {
      if (selectedUtility !== 'all' && s.utilityId?._id !== selectedUtility) return false
      if (selectedType !== 'all' && s.sourceType !== selectedType) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchName = s.name.toLowerCase().includes(q)
        const matchUtil = s.utilityId?.name.toLowerCase().includes(q)
        const matchDesc = s.metadata?.description?.toLowerCase().includes(q)
        const matchPub = s.metadata?.publisher?.toLowerCase().includes(q)
        return matchName || matchUtil || matchDesc || matchPub
      }
      return true
    })
  }, [sources, selectedUtility, selectedType, searchQuery])

  return (
    <AppShell title="Data Sources" subtitle="Public infrastructure plans, CIP documents and GIS feeds">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ── Top controls bar ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-600" />
              Source Provenance
              <Badge variant="secondary" className="text-xs font-normal">
                {sources.length} total
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Verified public source records that feed project detection and GIS alignment
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            {/* View toggle */}
            <div className="inline-flex rounded-lg border border-border/60 bg-muted/30 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md text-xs transition-colors ${
                  viewMode === 'table' ? 'bg-background shadow-xs text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Table view"
              >
                <TableIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-md text-xs transition-colors ${
                  viewMode === 'cards' ? 'bg-background shadow-xs text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Cards view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            <Button
              className="gap-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-sm"
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="w-4 h-4" />
              Add Source
            </Button>
          </div>
        </div>

        {/* ── Filters bar ── */}
        <div className="p-3.5 rounded-xl border border-border/60 bg-card flex flex-col md:flex-row items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by source title, utility, or publisher…"
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
            {/* Utility filter */}
            <div className="flex items-center gap-1.5 w-1/2 md:w-48">
              <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <select
                value={selectedUtility}
                onChange={(e) => setSelectedUtility(e.target.value)}
                className="w-full h-9 rounded-md border border-border/60 bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">All Utilities</option>
                {utilities.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Type filter */}
            <div className="flex items-center gap-1.5 w-1/2 md:w-36">
              <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full h-9 rounded-md border border-border/60 bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">All Formats</option>
                <option value="pdf">PDF</option>
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
                <option value="gis">GIS</option>
                <option value="webpage">Webpage</option>
                <option value="manual">Manual</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Main content view ── */}
        {sourcesLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : sourcesError ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm text-red-500 font-medium">Failed to load data sources</p>
            <p className="text-xs text-muted-foreground mt-1">Please check connection and reload.</p>
          </div>
        ) : sources.length === 0 ? (
          /* Empty state */
          <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center flex flex-col items-center justify-center max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">No data sources yet</h3>
            <p className="text-xs text-muted-foreground mt-1 mb-5 text-center leading-relaxed">
              Connect a public capital improvement plan (CIP), CSV schedule, or GIS feed to start extracting projects.
            </p>
            <Button
              className="gap-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs h-9"
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="w-4 h-4" /> Add First Source
            </Button>
          </div>
        ) : filteredSources.length === 0 ? (
          /* Filtered empty */
          <div className="text-center py-16">
            <p className="text-sm font-medium text-foreground">No matching data sources</p>
            <p className="text-xs text-muted-foreground mt-1">
              No sources match your current search and filters.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 text-xs"
              onClick={() => {
                setSearchQuery('')
                setSelectedUtility('all')
                setSelectedType('all')
              }}
            >
              Reset Filters
            </Button>
          </div>
        ) : viewMode === 'table' ? (
          /* ── Table View (Screen 10 specification) ── */
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] font-semibold tracking-wider border-b border-border/60">
                  <tr>
                    <th scope="col" className="py-3 px-4">Source Title</th>
                    <th scope="col" className="py-3 px-4">Utility</th>
                    <th scope="col" className="py-3 px-3">Type</th>
                    <th scope="col" className="py-3 px-3">Retrieved</th>
                    <th scope="col" className="py-3 px-3">Projects</th>
                    <th scope="col" className="py-3 px-3">Status</th>
                    <th scope="col" className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredSources.map((source) => {
                    const formattedDate = new Date(source.retrievedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })

                    const typeBadge =
                      source.sourceType === 'pdf'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : source.sourceType === 'csv'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : source.sourceType === 'json'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : source.sourceType === 'gis'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-zinc-100 text-zinc-700 border-zinc-200'

                    const statusBadge =
                      source.parserStatus === 'completed'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : source.parserStatus === 'processing'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : source.parserStatus === 'failed'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'

                    return (
                      <tr
                        key={source._id}
                        className="hover:bg-muted/30 transition-colors cursor-pointer group"
                        onClick={() => setViewingSource(source)}
                      >
                        <td className="py-3.5 px-4 font-medium text-foreground max-w-xs">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-semibold">{source.name}</span>
                            {source.sourceUrl && (
                              <a
                                href={source.sourceUrl.startsWith('http') ? source.sourceUrl : `https://${source.sourceUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-muted-foreground hover:text-indigo-600 transition-colors shrink-0"
                                title="Open document URL"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          {source.metadata?.publisher && (
                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                              {source.metadata.publisher}
                            </p>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-muted-foreground font-medium whitespace-nowrap">
                          {source.utilityId?.name || '—'}
                        </td>

                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <Badge variant="outline" className={`text-[10px] font-semibold uppercase px-2 py-0.5 border ${typeBadge}`}>
                            {source.sourceType}
                          </Badge>
                        </td>

                        <td className="py-3.5 px-3 text-muted-foreground whitespace-nowrap">
                          {formattedDate}
                        </td>

                        <td className="py-3.5 px-3 font-semibold text-foreground whitespace-nowrap">
                          {source.projectsCount}
                        </td>

                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <Badge variant="outline" className={`text-[10px] font-medium capitalize px-2 py-0.5 border ${statusBadge}`}>
                            {source.parserStatus}
                          </Badge>
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setViewingSource(source)}
                              className="p-1 rounded-md text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="Inspect provenance"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingSource(source)}
                              className="p-1 rounded-md text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Edit source"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(source._id)}
                              className="p-1 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                              title="Delete source"
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
        ) : (
          /* ── Cards View ── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSources.map((source) => (
              <SourceCard
                key={source._id}
                source={source}
                onView={(s) => setViewingSource(s)}
                onEdit={(s) => setEditingSource(s)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <AddSourceForm
          onSubmit={(utilityId, data) => createMutation.mutateAsync({ utilityId, data })}
          onCancel={() => setShowAddModal(false)}
          isLoading={createMutation.isPending}
        />
      )}

      {/* Edit Modal */}
      {editingSource && (
        <EditSourceForm
          source={editingSource}
          onSubmit={(data) => updateMutation.mutateAsync({ id: editingSource._id, data })}
          onCancel={() => setEditingSource(null)}
          isLoading={updateMutation.isPending}
        />
      )}

      {/* Provenance Detail Modal */}
      {viewingSource && (
        <SourceDetailModal
          source={viewingSource}
          onClose={() => setViewingSource(null)}
          onEdit={(s) => setEditingSource(s)}
        />
      )}
    </AppShell>
  )
}
