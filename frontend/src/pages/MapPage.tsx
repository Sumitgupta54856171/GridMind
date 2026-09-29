import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams, useNavigate } from 'react-router-dom'
import L from 'leaflet'
import {
  Plus, Minus, Locate, Calendar,
  Building2, Eye, X, Filter, FolderOpen,
  Droplets, Zap, Radio, Car, Flame, CloudRain, Loader2,
} from 'lucide-react'
import { AppShell } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { projectsApi, type Project } from '@/api/projects'
import { utilitiesApi } from '@/api/utilities'

// Project Type configuration with icons and styling matching build/ui.html
const TYPE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; icon: React.ComponentType<{ className?: string }> }
> = {
  water: {
    label: 'Water & Sewer',
    color: '#0284c7', // Sky-600
    bg: 'bg-sky-50 text-sky-700',
    border: 'border-sky-200',
    icon: Droplets,
  },
  wastewater: {
    label: 'Wastewater',
    color: '#0369a1',
    bg: 'bg-cyan-50 text-cyan-700',
    border: 'border-cyan-200',
    icon: Droplets,
  },
  electric: {
    label: 'Electric & Power',
    color: '#d97706', // Amber-600
    bg: 'bg-amber-50 text-amber-700',
    border: 'border-amber-200',
    icon: Zap,
  },
  fiber: {
    label: 'Fiber & Telecom',
    color: '#7c3aed', // Violet-600
    bg: 'bg-purple-50 text-purple-700',
    border: 'border-purple-200',
    icon: Radio,
  },
  telecom: {
    label: 'Telecom',
    color: '#7c3aed',
    bg: 'bg-purple-50 text-purple-700',
    border: 'border-purple-200',
    icon: Radio,
  },
  transportation: {
    label: 'Transportation & Road',
    color: '#2563eb', // Blue-600
    bg: 'bg-blue-50 text-blue-700',
    border: 'border-blue-200',
    icon: Car,
  },
  gas: {
    label: 'Natural Gas',
    color: '#ea580c', // Orange-600
    bg: 'bg-orange-50 text-orange-700',
    border: 'border-orange-200',
    icon: Flame,
  },
  stormwater: {
    label: 'Stormwater',
    color: '#0891b2',
    bg: 'bg-teal-50 text-teal-700',
    border: 'border-teal-200',
    icon: CloudRain,
  },
}

function getTypeConfig(type: string) {
  const t = (type || 'water').toLowerCase()
  return (
    TYPE_CONFIG[t] || {
      label: type.charAt(0).toUpperCase() + type.slice(1),
      color: '#475467',
      bg: 'bg-slate-50 text-slate-700',
      border: 'border-slate-200',
      icon: FolderOpen,
    }
  )
}

export function getProjectCenter(p: Project): [number, number] | null {
  if (!p.geometry || !p.geometry.coordinates) return null
  const { type, coordinates } = p.geometry

  // 1. Point [lng, lat]
  if ((type === 'Point' || !type) && Array.isArray(coordinates)) {
    if (typeof coordinates[0] === 'number' && typeof coordinates[1] === 'number') {
      return [coordinates[0], coordinates[1]]
    }
  }

  // 2. LineString [[lng, lat], ...]
  if (type === 'LineString' && Array.isArray(coordinates) && coordinates.length > 0) {
    const mid = coordinates[Math.floor(coordinates.length / 2)] || coordinates[0]
    if (Array.isArray(mid) && typeof mid[0] === 'number' && typeof mid[1] === 'number') {
      return [mid[0], mid[1]]
    }
  }

  // 3. Polygon [[[lng, lat], ...], ...]
  if (type === 'Polygon' && Array.isArray(coordinates) && coordinates.length > 0) {
    const ring = coordinates[0]
    if (Array.isArray(ring) && ring.length > 0) {
      let sumLng = 0
      let sumLat = 0
      let count = 0
      for (const pt of ring) {
        if (Array.isArray(pt) && typeof pt[0] === 'number' && typeof pt[1] === 'number') {
          sumLng += pt[0]
          sumLat += pt[1]
          count++
        }
      }
      if (count > 0) {
        return [sumLng / count, sumLat / count]
      }
    }
  }

  // 4. MultiPolygon [[[[lng, lat], ...]]]]
  if (type === 'MultiPolygon' && Array.isArray(coordinates) && coordinates.length > 0) {
    const poly = coordinates[0]
    if (Array.isArray(poly) && poly.length > 0) {
      const ring = poly[0]
      if (Array.isArray(ring) && ring.length > 0) {
        let sumLng = 0
        let sumLat = 0
        let count = 0
        for (const pt of ring) {
          if (Array.isArray(pt) && typeof pt[0] === 'number' && typeof pt[1] === 'number') {
            sumLng += pt[0]
            sumLat += pt[1]
            count++
          }
        }
        if (count > 0) return [sumLng / count, sumLat / count]
      }
    }
  }

  // 5. Fallback recursive traversal
  if (Array.isArray(coordinates)) {
    if (typeof coordinates[0] === 'number' && typeof coordinates[1] === 'number') {
      return [coordinates[0], coordinates[1]]
    }
    let cur: any = coordinates
    while (Array.isArray(cur) && Array.isArray(cur[0])) {
      cur = cur[0]
    }
    if (Array.isArray(cur) && typeof cur[0] === 'number' && typeof cur[1] === 'number') {
      return [cur[0], cur[1]]
    }
  }

  return null
}

export default function MapPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Filters
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedUtility, setSelectedUtility] = useState<string>('all')
  const [selectedDateRange, setSelectedDateRange] = useState<string>('all')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  // Map state
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)
  const markerMapRef = useRef<Map<string, L.Marker>>(new Map())

  // Queries
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
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

  // Extract distinct project types present in dataset + defaults
  const typeFilterOptions = useMemo(() => {
    const presentTypes = new Set<string>(['all', 'water', 'electric', 'fiber', 'transportation'])
    projects.forEach((p) => {
      if (p.projectType) presentTypes.add(p.projectType.toLowerCase())
    })
    return Array.from(presentTypes)
  }, [projects])

  // Filter projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // Type filter
      if (selectedType !== 'all') {
        const pType = (p.projectType || '').toLowerCase()
        if (selectedType === 'water' && !['water', 'wastewater', 'sewer', 'stormwater'].includes(pType)) return false
        if (selectedType === 'fiber' && !['fiber', 'telecom'].includes(pType)) return false
        if (selectedType === 'electric' && !['electric', 'power'].includes(pType)) return false
        if (selectedType === 'transportation' && !['transportation', 'road', 'street', 'paving'].includes(pType)) return false
        if (selectedType !== 'water' && selectedType !== 'fiber' && selectedType !== 'electric' && selectedType !== 'transportation' && pType !== selectedType) return false
      }

      // Utility filter - safe comparison for both object and string utilityId
      if (selectedUtility !== 'all') {
        const uId = p.utilityId?._id || p.utilityId
        if (String(uId) !== String(selectedUtility)) {
          return false
        }
      }

      // Date range filter
      if (selectedDateRange !== 'all') {
        const start = p.startDate ? new Date(p.startDate) : null
        if (!start) return true
        const month = start.getMonth() + 1 // 1-12
        if (selectedDateRange === 'q1' && (month < 1 || month > 3)) return false
        if (selectedDateRange === 'q2' && (month < 4 || month > 6)) return false
        if (selectedDateRange === 'h2' && month < 7) return false
      }

      return true
    })
  }, [projects, selectedType, selectedUtility, selectedDateRange])

  // Mapped projects (have valid coordinates in Point, LineString, or Polygon)
  const mappedProjects = useMemo(() => {
    return filteredProjects.filter((p) => getProjectCenter(p) !== null)
  }, [filteredProjects])


  // ── Initialize Leaflet Map ──────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return

    // Clean modern base map using OpenStreetMap
    const map = L.map(mapContainerRef.current, {
      center: [24.5778, 80.8332], // Default center on Satna / Austin coordinates
      zoom: 13,
      zoomControl: false,
    })

    // OpenStreetMap tile layer — free, no API key required
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
    }).addTo(map)

    const markersLayer = L.layerGroup().addTo(map)
    markersLayerRef.current = markersLayer
    mapInstanceRef.current = map

    // Fix map container size
    setTimeout(() => {
      map.invalidateSize()
    }, 200)

    return () => {
      map.remove()
      mapInstanceRef.current = null
      markersLayerRef.current = null
    }
  }, [])

  // ── Sync Markers on Map ─────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current
    const layer = markersLayerRef.current
    if (!map || !layer) return

    layer.clearLayers()
    markerMapRef.current.clear()

    const bounds = L.latLngBounds([])

    mappedProjects.forEach((p) => {
      const center = getProjectCenter(p)
      if (!center) return

      const [lng, lat] = center
      const isSelected = selectedProject?._id === p._id
      const typeCfg = getTypeConfig(p.projectType)
      const utilColor = p.utilityId?.color || typeCfg.color

      // Render vector overlay for Polygons and LineStrings
      if (p.geometry?.type === 'Polygon' || p.geometry?.type === 'MultiPolygon') {
        try {
          const polyLayer = L.geoJSON(p.geometry as any, {
            style: {
              color: utilColor,
              weight: isSelected ? 3.5 : 2,
              fillColor: utilColor,
              fillOpacity: isSelected ? 0.4 : 0.2,
            },
          })
          polyLayer.on('click', () => setSelectedProject(p))
          polyLayer.addTo(layer)
        } catch {
          // ignore geometry rendering errors
        }
      } else if (p.geometry?.type === 'LineString' || p.geometry?.type === 'MultiLineString') {
        try {
          const lineLayer = L.geoJSON(p.geometry as any, {
            style: {
              color: utilColor,
              weight: isSelected ? 5 : 3,
              opacity: 0.85,
            },
          })
          lineLayer.on('click', () => setSelectedProject(p))
          lineLayer.addTo(layer)
        } catch {
          // ignore geometry rendering errors
        }
      }

      // Create styled custom DivIcon matching build/ui.html design
      const customIcon = L.divIcon({
        className: 'gridmind-marker-container',
        html: `
          <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
            ${
              isSelected
                ? `<div style="
                    position: absolute;
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    background: ${utilColor}25;
                    border: 2px solid ${utilColor};
                    animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
                  "></div>`
                : ''
            }
            <div style="
              width: 30px;
              height: 30px;
              border-radius: 50%;
              background: ${utilColor};
              border: 2.5px solid white;
              box-shadow: 0 4px 10px rgba(0,0,0,0.25);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              cursor: pointer;
              transition: transform 0.15s ease;
              ${isSelected ? 'transform: scale(1.15);' : ''}
            ">
              <span style="font-size: 11px; font-weight: 800; font-family: monospace;">
                ${p.name.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      })

      const marker = L.marker([lat, lng], { icon: customIcon })

      // Popup content
      const popupHtml = `
        <div style="font-family: inherit; padding: 4px 2px; min-width: 190px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 2px; background: ${utilColor};"></span>
            <span style="font-size: 11px; font-weight: 600; color: #64748b;">${p.utilityId?.name || 'Utility'}</span>
          </div>
          <div style="font-weight: 700; font-size: 13px; color: #0f172a; line-height: 1.3; margin-bottom: 4px;">
            ${p.name}
          </div>
          ${p.corridorName ? `<div style="font-size: 11px; color: #475467; margin-bottom: 3px;">📍 ${p.corridorName}</div>` : ''}
          ${
            p.startDate
              ? `<div style="font-size: 11px; color: #64748b; font-family: monospace;">🗓 ${new Date(
                  p.startDate
                ).toLocaleDateString()} — ${p.endDate ? new Date(p.endDate).toLocaleDateString() : 'Ongoing'}</div>`
              : ''
          }
        </div>
      `
      marker.bindPopup(popupHtml, { closeButton: false, offset: [0, -10] })

      marker.on('click', () => {
        setSelectedProject(p)
      })

      marker.addTo(layer)
      markerMapRef.current.set(p._id, marker)
      bounds.extend([lat, lng])
    })

    // If initial query param has projectId, select and fly to it
    const paramId = searchParams.get('projectId')
    if (paramId) {
      const match = mappedProjects.find((p) => p._id === paramId)
      if (match) {
        setSelectedProject(match)
        const center = getProjectCenter(match)
        if (center) {
          map.flyTo([center[1], center[0]], 15, { duration: 0.8 })
          const m = markerMapRef.current.get(match._id)
          if (m) m.openPopup()
        }
      }
    } else if (bounds.isValid() && mappedProjects.length > 0 && !selectedProject) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
    }
  }, [mappedProjects, selectedProject, searchParams])

  // Handle click on project item in list
  const handleSelectProject = (project: Project) => {
    setSelectedProject(project)
    const map = mapInstanceRef.current
    if (!map) return

    const center = getProjectCenter(project)
    if (center) {
      map.flyTo([center[1], center[0]], 15, { duration: 0.8 })
      const m = markerMapRef.current.get(project._id)
      if (m) m.openPopup()
    }
  }

  // Zoom controls
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn()
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut()
  const handleResetView = () => {
    if (!mapInstanceRef.current) return
    const bounds = L.latLngBounds([])
    mappedProjects.forEach((p) => {
      const center = getProjectCenter(p)
      if (center) bounds.extend([center[1], center[0]])
    })
    if (bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
    } else {
      mapInstanceRef.current.setView([24.5778, 80.8332], 13)
    }
    setSelectedProject(null)
  }


  return (
    <AppShell
      title="Infrastructure Map"
      subtitle="Interactive spatial corridor map of utility capital projects & construction alignments"
    >
      <div className="space-y-4 max-w-7xl mx-auto">
        {/* ── TOP BAR: Project Type Filter Chips (Screen 3 & build/ui.html specification) ── */}
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/60 bg-card flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Project Types:
            </span>

            {/* "All" Chip */}
            <button
              type="button"
              onClick={() => setSelectedType('all')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                selectedType === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-muted-foreground hover:bg-slate-50 hover:text-foreground'
              }`}
            >
              All Projects
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedType === 'all' ? 'bg-slate-700 text-slate-100' : 'bg-slate-100 text-muted-foreground font-mono'
                }`}
              >
                {projects.length}
              </span>
            </button>

            {/* Specific Project Type Chips */}
            {typeFilterOptions
              .filter((t) => t !== 'all')
              .map((typeKey) => {
                const cfg = getTypeConfig(typeKey)
                const IconComponent = cfg.icon
                const count = stats.byType[typeKey] || projects.filter((p) => p.projectType === typeKey).length
                const isActive = selectedType === typeKey

                return (
                  <button
                    key={typeKey}
                    type="button"
                    onClick={() => setSelectedType(typeKey)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                      isActive
                        ? `${cfg.bg} ${cfg.border} shadow-xs font-bold scale-[1.02]`
                        : 'bg-white border-border/70 text-muted-foreground hover:bg-slate-50 hover:text-foreground'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: cfg.color }}
                    />
                    <IconComponent className="w-3 h-3 shrink-0" />
                    <span>{cfg.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-white text-foreground font-mono shadow-xs' : 'bg-slate-100 text-muted-foreground font-mono'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
          </div>

          {/* Right Utility & Date Dropdowns */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
            {/* Utility filter */}
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <select
                value={selectedUtility}
                onChange={(e) => setSelectedUtility(e.target.value)}
                className="h-8 rounded-lg border border-border/60 bg-background px-2 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">All Utilities</option>
                {utilities.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range filter */}
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <select
                value={selectedDateRange}
                onChange={(e) => setSelectedDateRange(e.target.value)}
                className="h-8 rounded-lg border border-border/60 bg-background px-2 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">All Dates</option>
                <option value="q1">Q1 (Jan–Mar)</option>
                <option value="q2">Q2 (Apr–Jun)</option>
                <option value="h2">H2 (Jul–Dec)</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── MAP LAYOUT: Side Panel + Map Canvas ── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
          {/* Left Side: Projects Mini List */}
          <div className="lg:col-span-1 space-y-3 order-2 lg:order-1">
            <Card className="border-border/60 p-3.5 flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Mapped Corridors
                  </span>
                </div>
                <Badge variant="secondary" className="text-[10px] font-mono">
                  {mappedProjects.length} on map
                </Badge>
              </div>

              {/* Projects Scrollable List */}
              <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                {projectsLoading ? (
                  <div className="py-8 flex flex-col items-center justify-center text-xs text-muted-foreground gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                    <span>Loading projects…</span>
                  </div>
                ) : mappedProjects.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground italic">
                    No mapped projects match filters.
                  </div>
                ) : (
                  mappedProjects.map((p) => {
                    const typeCfg = getTypeConfig(p.projectType)
                    const isSelected = selectedProject?._id === p._id
                    const utilColor = p.utilityId?.color || typeCfg.color

                    return (
                      <button
                        key={p._id}
                        type="button"
                        onClick={() => handleSelectProject(p)}
                        className={`w-full text-left p-2.5 rounded-lg border transition-all flex flex-col gap-1 ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-300 shadow-xs'
                            : 'bg-white hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded border"
                            style={{
                              backgroundColor: `${utilColor}15`,
                              borderColor: `${utilColor}30`,
                              color: utilColor,
                            }}
                          >
                            {p.projectType || 'Project'}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {p.startDate ? new Date(p.startDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '2026'}
                          </span>
                        </div>

                        <p className="text-xs font-bold text-foreground leading-snug truncate">
                          {p.name}
                        </p>

                        <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-0.5">
                          <span className="truncate flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: utilColor }} />
                            {p.utilityId?.name || 'Utility'}
                          </span>
                          <span className="text-[10px] text-indigo-600 font-medium">Focus →</span>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </Card>

            {/* Quick Map Legend */}
            <Card className="border border-slate-200 p-3 bg-white text-xs space-y-2">
              <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider block">
                Map Symbology
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-sky-600 border border-white shrink-0" />
                  <span>Water & Sewer</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-amber-600 border border-white shrink-0" />
                  <span>Electric</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-violet-600 border border-white shrink-0" />
                  <span>Fiber / Telecom</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-blue-600 border border-white shrink-0" />
                  <span>Transportation</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Main Map Canvas */}
          <div className="lg:col-span-3 space-y-3 order-1 lg:order-2">
            <div className="relative rounded-2xl border border-border overflow-hidden shadow-xs bg-white">
              {/* Map Controls */}
              <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 bg-white p-1 rounded-xl shadow-md border border-border">
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-foreground transition-colors"
                  title="Zoom In"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-foreground transition-colors"
                  title="Zoom Out"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleResetView}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-foreground transition-colors"
                  title="Reset View"
                >
                  <Locate className="w-4 h-4" />
                </button>
              </div>

              {/* Free OpenStreetMap Canvas */}
              <div
                ref={mapContainerRef}
                className="w-full h-[380px] sm:h-[500px] lg:h-[540px] z-0 bg-white"
                style={{ minHeight: '320px' }}
              />

              {/* Active count badge in bottom left */}
              <div className="absolute bottom-3 left-3 z-10 bg-white border border-border rounded-lg px-3 py-1.5 text-xs text-muted-foreground shadow-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-foreground">{mappedProjects.length}</span> projects plotted
                on Free OpenStreetMap tiles
              </div>
            </div>

            {/* ── BOTTOM SELECTED PROJECT BAR (as in build/ui.html conflictBar) ── */}
            {selectedProject ? (
              <Card className="border border-border bg-white p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-150">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                      {selectedProject.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground truncate">
                          {selectedProject.name}
                        </span>
                        <Badge variant="outline" className="text-[10px] bg-white border-indigo-200 text-indigo-700 capitalize">
                          {selectedProject.projectType}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {selectedProject.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate flex items-center gap-3">
                        <span>🏢 {selectedProject.utilityId?.name}</span>
                        {selectedProject.corridorName && <span>📍 {selectedProject.corridorName}</span>}
                        {selectedProject.startDate && (
                          <span className="font-mono text-[11px]">
                            🗓 {new Date(selectedProject.startDate).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white gap-1"
                      onClick={() => navigate('/projects')}
                    >
                      <Eye className="w-3.5 h-3.5" /> Inspect in Projects
                    </Button>
                    <button
                      type="button"
                      onClick={() => setSelectedProject(null)}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
