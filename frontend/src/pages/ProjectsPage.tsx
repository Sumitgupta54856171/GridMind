import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  FolderOpen, MapPin, Search, Filter, Plus, Building2,
  Trash2, LayoutGrid, Table as TableIcon,
  X, Loader2, Map,
} from 'lucide-react'
import { AppShell } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { projectsApi } from '@/api/projects'
import { utilitiesApi } from '@/api/utilities'

export default function ProjectsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()

  // State & Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUtility, setSelectedUtility] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')

  // Queries
  const { data: projectsData, isLoading: projectsLoading, isError: projectsError } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list().then((res) => res.data.projects),
  })

  const { data: statsData } = useQuery({
    queryKey: ['projects', 'stats'],
    queryFn: () => projectsApi.getStats().then((res) => res.data),
  })

  const { data: utilitiesData } = useQuery({
    queryKey: ['utilities'],
    queryFn: () => utilitiesApi.list().then((res) => res.data.utilities),
  })

  const projects = projectsData || []
  const utilities = utilitiesData || []
  const stats = statsData || { total: 0, mapped: 0, byType: {}, byUtility: {}, byStatus: {} }

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['projects', 'stats'] })
      toast.success('Project deleted')
    },
    onError: () => toast.error('Failed to delete project'),
  })

  const handleDelete = (id: string, name: string) => {
    toast(`Delete project "${name}"?`, {
      description: 'This will remove the project from analysis and mapping.',
      action: {
        label: 'Delete',
        onClick: () => deleteMutation.mutate(id),
      },
    })
  }

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (selectedUtility !== 'all' && p.utilityId?._id !== selectedUtility) return false
      if (selectedType !== 'all') {
        const t = (p.projectType || '').toLowerCase()
        if (selectedType === 'water' && !['water', 'wastewater', 'sewer'].includes(t)) return false
        if (selectedType === 'fiber' && !['fiber', 'telecom'].includes(t)) return false
        if (selectedType !== 'water' && selectedType !== 'fiber' && t !== selectedType) return false
      }
      if (selectedStatus !== 'all' && p.status !== selectedStatus) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchName = p.name.toLowerCase().includes(q)
        const matchCorr = p.corridorName?.toLowerCase().includes(q)
        const matchLoc = p.locationText?.toLowerCase().includes(q)
        const matchUtil = p.utilityId?.name.toLowerCase().includes(q)
        return matchName || matchCorr || matchLoc || matchUtil
      }
      return true
    })
  }, [projects, selectedUtility, selectedType, selectedStatus, searchQuery])

  return (
    <AppShell
      title="Projects"
      subtitle="Utility capital improvement programs, construction corridors, and infrastructure schedules"
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ── Top controls bar ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-indigo-600" />
              Infrastructure Projects
              <Badge variant="secondary" className="text-xs font-normal">
                {projects.length} total · {stats.mapped} mapped
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Extracted via Gemini AI Agent from public CIPs and GIS feeds
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            {/* View on Map CTA */}
            <Button
              variant="outline"
              className="gap-1.5 text-xs h-9 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
              onClick={() => navigate('/map')}
            >
              <Map className="w-4 h-4 text-indigo-500" />
              Open Map View
            </Button>

            {/* View toggle */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md text-xs transition-colors ${
                  viewMode === 'table'
                    ? 'bg-slate-100 shadow-xs text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Table view"
              >
                <TableIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-md text-xs transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-slate-100 shadow-xs text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Cards view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Type Filter Chips (like build/ui.html) ── */}
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { id: 'all', label: 'All Projects', count: projects.length },
            { id: 'water', label: 'Water & Sewer', count: stats.byType.water || 0 },
            { id: 'electric', label: 'Electric & Power', count: stats.byType.electric || 0 },
            { id: 'fiber', label: 'Fiber & Telecom', count: stats.byType.fiber || stats.byType.telecom || 0 },
            { id: 'transportation', label: 'Transportation', count: stats.byType.transportation || 0 },
          ].map((chip) => {
            const isActive = selectedType === chip.id
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setSelectedType(chip.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                  isActive
                    ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-muted-foreground hover:bg-slate-50 hover:text-foreground'
                }`}
              >
                <span>{chip.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-slate-700 text-slate-100' : 'bg-slate-100 text-muted-foreground font-mono'
                  }`}
                >
                  {chip.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* ── Filters bar ── */}
        <div className="p-3.5 rounded-xl border border-border bg-white flex flex-col md:flex-row items-center gap-3 shadow-xs">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by project name, corridor, location, or utility…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-9 text-xs border border-border bg-white text-foreground focus-visible:ring-indigo-500/50"
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
                className="w-full h-9 rounded-md border border-border bg-white px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">All Utilities</option>
                {utilities.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status filter */}
            <div className="flex items-center gap-1.5 w-1/2 md:w-36">
              <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-white px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">All Statuses</option>
                <option value="planned">Planned</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Main Content ── */}
        {projectsLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : projectsError ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm text-red-500 font-medium">Failed to load projects</p>
            <p className="text-xs text-muted-foreground mt-1">Please reload or check connection.</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center flex flex-col items-center justify-center max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3">
              <FolderOpen className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">No projects indexed yet</h3>
            <p className="text-xs text-muted-foreground mt-1 mb-5 text-center leading-relaxed">
              Upload a CIP document, CSV file or connect a public source to extract projects using Gemini AI.
            </p>
            <Button
              className="gap-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-xs h-9"
              onClick={() => navigate('/sources')}
            >
              <Plus className="w-4 h-4" /> Go to Sources
            </Button>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm font-medium text-foreground">No matching projects found</p>
            <p className="text-xs text-muted-foreground mt-1">Try clearing your filters or search query.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 text-xs"
              onClick={() => {
                setSearchQuery('')
                setSelectedUtility('all')
                setSelectedType('all')
                setSelectedStatus('all')
              }}
            >
              Reset Filters
            </Button>
          </div>
        ) : viewMode === 'table' ? (
          /* ── Table View (like build/ui.html screenProjects) ── */
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] font-semibold tracking-wider border-b border-border/60">
                  <tr>
                    <th scope="col" className="py-3 px-4">Project</th>
                    <th scope="col" className="py-3 px-4">Utility</th>
                    <th scope="col" className="py-3 px-3">Corridor</th>
                    <th scope="col" className="py-3 px-3">Type</th>
                    <th scope="col" className="py-3 px-3">Construction Window</th>
                    <th scope="col" className="py-3 px-3">Status</th>
                    <th scope="col" className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredProjects.map((p) => {
                    const hasCoords =
                      p.geometry?.coordinates &&
                      Array.isArray(p.geometry.coordinates) &&
                      p.geometry.coordinates.length > 0


                    const windowStr = p.startDate
                      ? `${new Date(p.startDate).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })} – ${
                          p.endDate
                            ? new Date(p.endDate).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                              })
                            : 'Ongoing'
                        }`
                      : 'Unscheduled'

                    return (
                      <tr key={p._id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-foreground max-w-xs">
                          <p className="font-semibold text-foreground truncate">{p.name}</p>
                          {p.description && (
                            <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                              {p.description}
                            </p>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                          <span className="font-medium text-foreground">{p.utilityId?.name || '—'}</span>
                        </td>

                        <td className="py-3.5 px-3 text-muted-foreground whitespace-nowrap">
                          {p.corridorName || p.locationText || '—'}
                        </td>

                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <Badge variant="outline" className="text-[10px] font-semibold uppercase px-2 py-0.5 capitalize border-border/70">
                            {p.projectType}
                          </Badge>
                        </td>

                        <td className="py-3.5 px-3 text-muted-foreground whitespace-nowrap font-mono text-[11px]">
                          {windowStr}
                        </td>

                        <td className="py-3.5 px-3 whitespace-nowrap">
                          {hasCoords ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <MapPin className="w-3 h-3" /> Mapped
                            </span>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] capitalize">
                              {p.status}
                            </Badge>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {hasCoords && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs px-2 gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                                onClick={() => navigate(`/map?projectId=${p._id}`)}
                                title="Locate on Infrastructure Map"
                              >
                                <MapPin className="w-3 h-3" /> View Map
                              </Button>
                            )}

                            <button
                              onClick={() => handleDelete(p._id, p.name)}
                              className="p-1 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                              title="Delete project"
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
            {filteredProjects.map((p) => {
              const hasCoords =
                p.geometry?.coordinates &&
                Array.isArray(p.geometry.coordinates) &&
                p.geometry.coordinates.length > 0


              return (
                <Card key={p._id} className="border-border/60 hover:border-indigo-200 transition-all flex flex-col p-4 gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="text-[10px] font-semibold uppercase capitalize">
                      {p.projectType}
                    </Badge>
                    {hasCoords && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <MapPin className="w-2.5 h-2.5" /> Mapped
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-semibold text-sm text-foreground leading-snug line-clamp-2">{p.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span>{p.utilityId?.name || 'Unassigned'}</span>
                    </p>
                    {p.corridorName && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        📍 {p.corridorName}
                      </p>
                    )}
                  </div>

                  <div className="mt-auto pt-2 border-t border-border/40 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {p.startDate ? new Date(p.startDate).toLocaleDateString() : '2026'}
                    </span>

                    <div className="flex items-center gap-1">
                      {hasCoords && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs px-2 gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                          onClick={() => navigate(`/map?projectId=${p._id}`)}
                        >
                          <MapPin className="w-3 h-3" /> Map
                        </Button>
                      )}
                      <button
                        onClick={() => handleDelete(p._id, p.name)}
                        className="p-1 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
