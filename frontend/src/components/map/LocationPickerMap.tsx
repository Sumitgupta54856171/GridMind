import { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import {
  MapPin,
  Navigation,
  RotateCcw,
  Crosshair,
  Search,
  Loader2,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface LocationPickerProps {
  initialCenter?: [number, number] // [lng, lat]
  initialCoordinates?: number[][][] // GeoJSON Polygon coordinates: [[[lng, lat], ...]]
  serviceAreaText?: string // Current location text from parent form
  externalQuery?: string // When user clicks "Find" in the parent form
  onLocationSelect: (data: {
    center: [number, number] // [lng, lat]
    polygonCoordinates?: number[][][]
    label?: string
  }) => void
}

const PRESETS: { label: string; center: [number, number]; radiusKm: number }[] = [
  { label: 'Satna, MP', center: [80.8332, 24.5778], radiusKm: 6 },
  { label: 'Delhi, India', center: [77.209, 28.6139], radiusKm: 12 },
  { label: 'Mumbai, India', center: [72.8777, 19.076], radiusKm: 12 },
  { label: 'Austin, TX', center: [-97.7431, 30.2672], radiusKm: 10 },
  { label: 'New York, NY', center: [-74.006, 40.7128], radiusKm: 8 },
  { label: 'London, UK', center: [-0.1276, 51.5074], radiusKm: 8 },
]

/**
 * Generates an approximate circle polygon as GeoJSON coordinates around [lng, lat]
 */
function createCirclePolygon(lng: number, lat: number, radiusKm: number, points = 24): number[][][] {
  const coords: [number, number][] = []
  const kmToLat = 1 / 110.574
  const kmToLng = 1 / (111.32 * Math.cos((lat * Math.PI) / 180))

  for (let i = 0; i <= points; i++) {
    const angle = (i * 2 * Math.PI) / points
    const pLng = lng + radiusKm * kmToLng * Math.cos(angle)
    const pLat = lat + radiusKm * kmToLat * Math.sin(angle)
    coords.push([parseFloat(pLng.toFixed(6)), parseFloat(pLat.toFixed(6))])
  }
  return [coords]
}

/**
 * Free geocoding using OpenStreetMap Nominatim with local dictionary fallback
 */
async function geocodeAddress(query: string): Promise<{
  lat: number
  lng: number
  displayName: string
} | null> {
  const trimmed = query.trim()
  if (!trimmed) return null

  // 1. Check if user typed coordinates directly, e.g. "24.5778, 80.8332"
  const coordMatch = trimmed.match(/^([-+]?\d{1,2}(?:\.\d+)?)[,\s]+([-+]?\d{1,3}(?:\.\d+)?)$/)
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1])
    const lng = parseFloat(coordMatch[2])
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng, displayName: `${lat.toFixed(4)}, ${lng.toFixed(4)}` }
    }
  }

  // 2. Instant dictionary lookup for common places
  const lower = trimmed.toLowerCase()
  if (lower.includes('satna')) {
    return { lat: 24.5778, lng: 80.8332, displayName: 'Satna, Madhya Pradesh, India' }
  }
  for (const preset of PRESETS) {
    const pName = preset.label.toLowerCase()
    if (lower.includes(pName.split(',')[0]) || pName.includes(lower)) {
      return { lat: preset.center[1], lng: preset.center[0], displayName: preset.label }
    }
  }

  // 3. Query OpenStreetMap Nominatim API
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmed)}&limit=1`,
      { headers: { Accept: 'application/json' } }
    )
    if (!res.ok) throw new Error('Geocoding service unavailable')
    const results = await res.json()
    if (results && results.length > 0) {
      const first = results[0]
      return {
        lat: parseFloat(first.lat),
        lng: parseFloat(first.lon),
        displayName: first.display_name,
      }
    }
  } catch (err) {
    console.warn('Nominatim geocode failed:', err)
  }

  return null
}

export function LocationPickerMap({
  initialCenter,
  initialCoordinates,
  serviceAreaText,
  externalQuery,
  onLocationSelect,
}: LocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const polygonRef = useRef<L.Polygon | null>(null)

  // Default fallback: Satna, MP (or initial center) instead of hardcoded Austin
  const defaultLng = initialCenter ? initialCenter[0] : 80.8332
  const defaultLat = initialCenter ? initialCenter[1] : 24.5778

  const [selectedPoint, setSelectedPoint] = useState<[number, number] | null>(
    initialCenter ? [initialCenter[0], initialCenter[1]] : null
  )
  const [radiusKm, setRadiusKm] = useState<number>(8)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{
    text: string
    type: 'info' | 'success' | 'error'
  } | null>(null)

  // Marker icon builder
  const getMarkerIcon = useCallback(() => {
    return L.divIcon({
      className: 'gridmind-map-pin',
      html: `
        <div style="
          width: 32px;
          height: 32px;
          background: #2563eb;
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 4px 12px rgba(37,99,235,0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          cursor: pointer;
        ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    })
  }, [])

  // Function to apply a point on map and inform parent
  const applyPoint = useCallback(
    (lng: number, lat: number, label?: string, zoom = 13) => {
      const map = mapInstanceRef.current
      if (!map) return

      const cleanLng = parseFloat(lng.toFixed(5))
      const cleanLat = parseFloat(lat.toFixed(5))

      map.setView([cleanLat, cleanLng], zoom, { animate: true })

      const icon = getMarkerIcon()
      if (markerRef.current) {
        markerRef.current.setLatLng([cleanLat, cleanLng])
      } else {
        markerRef.current = L.marker([cleanLat, cleanLng], { icon }).addTo(map)
      }

      const polyCoords = createCirclePolygon(cleanLng, cleanLat, radiusKm)
      const latLngs = polyCoords[0].map(([plng, plat]) => [plat, plng] as [number, number])

      if (polygonRef.current) {
        polygonRef.current.setLatLngs(latLngs)
      } else {
        polygonRef.current = L.polygon(latLngs, {
          color: '#2563eb',
          fillColor: '#3b82f6',
          fillOpacity: 0.15,
          weight: 2,
        }).addTo(map)
      }

      setSelectedPoint([cleanLng, cleanLat])
      onLocationSelect({
        center: [cleanLng, cleanLat],
        polygonCoordinates: polyCoords,
        label: label || `${cleanLat}, ${cleanLng}`,
      })
    },
    [getMarkerIcon, onLocationSelect, radiusKm]
  )

  // ── Initialize Map on mount ───────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return

    const map = L.map(mapContainerRef.current, {
      center: [defaultLat, defaultLng],
      zoom: initialCenter ? 13 : 11,
      zoomControl: false,
    })

    const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      subdomains: 'abcd',
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>',
    }).addTo(map)

    tileLayer.on('tileerror', (e) => {
      const tile = e.tile as HTMLImageElement
      if (tile && !tile.dataset.fallbackTried) {
        tile.dataset.fallbackTried = 'true'
        tile.src = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${e.coords.z}/${e.coords.y}/${e.coords.x}`
      }
    })

    L.control.zoom({ position: 'topright' }).addTo(map)

    const icon = getMarkerIcon()

    // If initialCenter provided, place marker and polygon
    if (initialCenter) {
      markerRef.current = L.marker([initialCenter[1], initialCenter[0]], { icon }).addTo(map)

      if (initialCoordinates && initialCoordinates[0]?.length) {
        const latLngs = initialCoordinates[0].map(([lng, lat]) => [lat, lng] as [number, number])
        const poly = L.polygon(latLngs, {
          color: '#2563eb',
          fillColor: '#3b82f6',
          fillOpacity: 0.15,
          weight: 2,
        }).addTo(map)
        polygonRef.current = poly
        map.fitBounds(poly.getBounds(), { padding: [20, 20] })
      }
    } else {
      // Auto-detect user's location on first load if no initialCenter
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lng = parseFloat(pos.coords.longitude.toFixed(5))
            const lat = parseFloat(pos.coords.latitude.toFixed(5))
            applyPoint(lng, lat, 'Your Location', 13)
            setStatusMessage({ text: '📍 Centered to your current location', type: 'success' })
          },
          () => {
            // Geolocation not granted or timed out, attempt IP-based fallback
            fetch('https://ipapi.co/json/')
              .then((res) => res.json())
              .then((data) => {
                if (data.latitude && data.longitude) {
                  const lat = parseFloat(data.latitude)
                  const lng = parseFloat(data.longitude)
                  const label = data.city ? `${data.city}, ${data.region || ''}` : 'Detected Region'
                  applyPoint(lng, lat, label, 12)
                  setStatusMessage({ text: `📍 Centered to ${label}`, type: 'success' })
                }
              })
              .catch(() => {
                // If offline or blocked, stay on default Satna
              })
          },
          { timeout: 5000, enableHighAccuracy: false, maximumAge: 300000 }
        )
      }
    }

    // Click handler on map canvas
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng
      applyPoint(lng, lat)
      setStatusMessage({ text: '📍 Pin placed on selected point', type: 'info' })
    })

    mapInstanceRef.current = map

    setTimeout(() => {
      map.invalidateSize()
    }, 200)

    return () => {
      map.remove()
      mapInstanceRef.current = null
      markerRef.current = null
      polygonRef.current = null
    }
  }, [applyPoint, defaultLat, defaultLng, getMarkerIcon, initialCenter, initialCoordinates])

  // ── Handle Searching for Location ─────────────────────────────
  const handleSearch = useCallback(
    async (textToSearch: string) => {
      if (!textToSearch.trim()) return

      setIsSearching(true)
      setStatusMessage({ text: `Searching for "${textToSearch}"...`, type: 'info' })

      const result = await geocodeAddress(textToSearch)
      setIsSearching(false)

      if (result) {
        applyPoint(result.lng, result.lat, result.displayName, 13)
        setStatusMessage({ text: `📍 Found: ${result.displayName}`, type: 'success' })
      } else {
        setStatusMessage({
          text: `Could not find "${textToSearch}". Try a different city name or click on the map.`,
          type: 'error',
        })
      }
    },
    [applyPoint]
  )

  // ── Handle external query trigger (e.g. Find button in parent form) ──
  useEffect(() => {
    if (externalQuery && externalQuery.trim()) {
      handleSearch(externalQuery)
    }
  }, [externalQuery, handleSearch])

  // ── Auto-search when serviceAreaText is typed (with debounce) ──
  useEffect(() => {
    if (!serviceAreaText || serviceAreaText.trim().length < 3) return

    const timer = setTimeout(() => {
      // Only auto-search if the query differs from current search input
      if (serviceAreaText !== searchQuery) {
        setSearchQuery(serviceAreaText)
        handleSearch(serviceAreaText)
      }
    }, 900)

    return () => clearTimeout(timer)
  }, [serviceAreaText, searchQuery, handleSearch])

  // ── Handle GPS Current Location Button ────────────────────────
  const handleUseCurrentLocation = () => {
    setIsLocating(true)
    setStatusMessage({ text: 'Detecting GPS coordinates...', type: 'info' })

    if (!navigator.geolocation) {
      // Fallback to IP lookup
      fetch('https://ipapi.co/json/')
        .then((res) => res.json())
        .then((data) => {
          setIsLocating(false)
          if (data.latitude && data.longitude) {
            const lat = parseFloat(data.latitude)
            const lng = parseFloat(data.longitude)
            const label = data.city ? `${data.city}, ${data.region || ''}` : 'Detected Location'
            applyPoint(lng, lat, label, 13)
            setStatusMessage({ text: `📍 Location detected: ${label}`, type: 'success' })
          } else {
            setStatusMessage({ text: 'Geolocation unavailable. Please type a city name.', type: 'error' })
          }
        })
        .catch(() => {
          setIsLocating(false)
          setStatusMessage({ text: 'Geolocation unavailable. Please type a city name.', type: 'error' })
        })
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false)
        const lng = parseFloat(pos.coords.longitude.toFixed(5))
        const lat = parseFloat(pos.coords.latitude.toFixed(5))
        applyPoint(lng, lat, 'Current Location', 14)
        setStatusMessage({ text: '📍 Successfully located to your current GPS position', type: 'success' })
      },
      (err) => {
        console.warn('Browser GPS error, trying IP location fallback...', err)
        // Fallback to IP location
        fetch('https://ipapi.co/json/')
          .then((res) => res.json())
          .then((data) => {
            setIsLocating(false)
            if (data.latitude && data.longitude) {
              const lat = parseFloat(data.latitude)
              const lng = parseFloat(data.longitude)
              const label = data.city ? `${data.city}, ${data.region || ''}` : 'Detected Location'
              applyPoint(lng, lat, label, 13)
              setStatusMessage({ text: `📍 Location detected: ${label}`, type: 'success' })
            } else {
              setStatusMessage({
                text: 'GPS permission denied or timed out. Please type a city in the search box.',
                type: 'error',
              })
            }
          })
          .catch(() => {
            setIsLocating(false)
            setStatusMessage({
              text: 'GPS permission denied or timed out. Please type a city in the search box.',
              type: 'error',
            })
          })
      },
      { timeout: 8000, enableHighAccuracy: true, maximumAge: 30000 }
    )
  }

  // Clear map selection
  const handleClear = () => {
    if (markerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(markerRef.current)
      markerRef.current = null
    }
    if (polygonRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(polygonRef.current)
      polygonRef.current = null
    }
    setSelectedPoint(null)
    setStatusMessage(null)
  }

  return (
    <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-white">
      {/* ── Top Header Bar ── */}
      <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
        <span className="font-semibold text-foreground flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-indigo-600" />
          Interactive Service Area & Location Picker (Free Map)
        </span>
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <span>Click anywhere on the map or search a city</span>
        </div>
      </div>

      {/* ── Search Input & Locate Bar ── */}
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Type city, town, or address (e.g. Satna, New York, Delhi)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSearch(searchQuery)
              }
            }}
            className="w-full h-8 pl-8 pr-7 text-xs rounded-lg border border-slate-200 bg-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => handleSearch(searchQuery)}
          disabled={isSearching || !searchQuery.trim()}
          className="h-8 px-3 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1 shrink-0 transition-colors"
        >
          {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          Locate
        </button>
      </div>

      {/* ── Status Message Feedback ── */}
      {statusMessage && (
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 text-rose-700 border border-rose-200'
              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-3 h-3 shrink-0" />
          ) : statusMessage.type === 'error' ? (
            <AlertCircle className="w-3 h-3 shrink-0" />
          ) : (
            <MapPin className="w-3 h-3 shrink-0" />
          )}
          <span className="truncate flex-1">{statusMessage.text}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* ── Presets & GPS Location Controls ── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] text-muted-foreground font-medium mr-1">Presets:</span>
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => {
              applyPoint(p.center[0], p.center[1], p.label, 13)
              setStatusMessage({ text: `📍 Moved to ${p.label}`, type: 'success' })
            }}
            className="text-[11px] px-2 py-0.5 rounded-full border border-slate-200 hover:border-indigo-300 hover:bg-slate-50 transition-colors bg-white"
          >
            {p.label}
          </button>
        ))}

        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isLocating}
          className="text-[11px] px-2 py-0.5 rounded-full border border-indigo-200 text-indigo-600 hover:bg-slate-50 transition-colors flex items-center gap-1 bg-white disabled:opacity-50"
          title="Use browser GPS location or IP location"
        >
          {isLocating ? (
            <Loader2 className="w-2.5 h-2.5 animate-spin" />
          ) : (
            <Navigation className="w-2.5 h-2.5" />
          )}
          {isLocating ? 'Locating...' : 'My Location'}
        </button>

        {selectedPoint && (
          <button
            type="button"
            onClick={handleClear}
            className="text-[11px] px-2 py-0.5 rounded-full border border-border text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1 ml-auto"
          >
            <RotateCcw className="w-2.5 h-2.5" /> Clear
          </button>
        )}
      </div>

      {/* ── Leaflet Map Canvas ── */}
      <div
        ref={mapContainerRef}
        className="w-full h-56 rounded-lg overflow-hidden border border-slate-200 shadow-inner relative z-0"
        style={{ minHeight: '220px' }}
      />

      {/* ── Selection info & Radius controls ── */}
      <div className="flex items-center justify-between text-[11px] pt-1 text-muted-foreground flex-wrap gap-2">
        {selectedPoint ? (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200 font-mono">
              Center: [{selectedPoint[0]}, {selectedPoint[1]}]
            </Badge>
            <span className="text-emerald-700 font-medium flex items-center gap-1">
              <Crosshair className="w-3 h-3 text-emerald-600" />
              Service Polygon Active (~{radiusKm} km radius)
            </span>
          </div>
        ) : (
          <span className="italic text-muted-foreground">
            No coordinates pinned yet. Click on the map, use "My Location", or search a city.
          </span>
        )}

        <div className="flex items-center gap-1.5 ml-auto">
          <span>Boundary Radius:</span>
          {[4, 8, 15].map((km) => (
            <button
              key={km}
              type="button"
              onClick={() => {
                setRadiusKm(km)
                if (selectedPoint && mapInstanceRef.current) {
                  const polyCoords = createCirclePolygon(selectedPoint[0], selectedPoint[1], km)
                  const latLngs = polyCoords[0].map(([plng, plat]) => [plat, plng] as [number, number])
                  if (polygonRef.current) polygonRef.current.setLatLngs(latLngs)
                  onLocationSelect({
                    center: selectedPoint,
                    polygonCoordinates: polyCoords,
                  })
                }
              }}
              className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                radiusKm === km
                  ? 'bg-indigo-600 text-white border-indigo-600 font-medium'
                  : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
            >
              {km}km
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
