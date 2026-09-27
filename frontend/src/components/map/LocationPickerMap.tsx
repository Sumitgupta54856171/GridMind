import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { MapPin, Navigation, RotateCcw, Crosshair } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface LocationPickerProps {
  initialCenter?: [number, number] // [lng, lat]
  initialCoordinates?: number[][][] // GeoJSON Polygon coordinates: [[[lng, lat], ...]]
  onLocationSelect: (data: {
    center: [number, number] // [lng, lat]
    polygonCoordinates?: number[][][]
    label?: string
  }) => void
}

const PRESETS: { label: string; center: [number, number]; radiusKm: number }[] = [
  { label: 'Satna, MP', center: [80.8332, 24.5778], radiusKm: 6 },
  { label: 'Austin, TX', center: [-97.7431, 30.2672], radiusKm: 10 },
  { label: 'New York, NY', center: [-74.006, 40.7128], radiusKm: 8 },
  { label: 'Chicago, IL', center: [-87.6298, 41.8781], radiusKm: 10 },
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

export function LocationPickerMap({
  initialCenter,
  initialCoordinates,
  onLocationSelect,
}: LocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const polygonRef = useRef<L.Polygon | null>(null)

  // Default to initial center or Austin, TX
  const defaultLng = initialCenter ? initialCenter[0] : -97.7431
  const defaultLat = initialCenter ? initialCenter[1] : 30.2672

  const [selectedPoint, setSelectedPoint] = useState<[number, number] | null>(
    initialCenter ? [initialCenter[0], initialCenter[1]] : null
  )
  const [radiusKm, setRadiusKm] = useState<number>(8)

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return

    // Initialize Leaflet map
    const map = L.map(mapContainerRef.current, {
      center: [defaultLat, defaultLng],
      zoom: 12,
      zoomControl: false,
    })

    // Add free OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
    }).addTo(map)

    // Add zoom control top-right
    L.control.zoom({ position: 'topright' }).addTo(map)

    // Custom modern SVG marker icon
    const customIcon = L.divIcon({
      className: 'gridmind-map-pin',
      html: `
        <div style="
          width: 32px;
          height: 32px;
          background: #2563eb;
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 4px 12px rgba(37,99,235,0.4);
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

    // If initialCenter provided, place marker and polygon
    if (initialCenter) {
      const marker = L.marker([initialCenter[1], initialCenter[0]], { icon: customIcon }).addTo(map)
      markerRef.current = marker

      if (initialCoordinates && initialCoordinates[0]?.length) {
        // Render existing polygon
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
    }

    // Click handler to select point
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng
      const cleanLat = parseFloat(lat.toFixed(5))
      const cleanLng = parseFloat(lng.toFixed(5))

      // Update or create marker
      if (markerRef.current) {
        markerRef.current.setLatLng([cleanLat, cleanLng])
      } else {
        const marker = L.marker([cleanLat, cleanLng], { icon: customIcon }).addTo(map)
        markerRef.current = marker
      }

      // Generate service area polygon around the point
      const polyCoords = createCirclePolygon(cleanLng, cleanLat, radiusKm)
      const latLngs = polyCoords[0].map(([plng, plat]) => [plat, plng] as [number, number])

      if (polygonRef.current) {
        polygonRef.current.setLatLngs(latLngs)
      } else {
        const poly = L.polygon(latLngs, {
          color: '#2563eb',
          fillColor: '#3b82f6',
          fillOpacity: 0.15,
          weight: 2,
        }).addTo(map)
        polygonRef.current = poly
      }

      setSelectedPoint([cleanLng, cleanLat])
      onLocationSelect({
        center: [cleanLng, cleanLat],
        polygonCoordinates: polyCoords,
        label: `${cleanLat}, ${cleanLng}`,
      })
    })

    mapInstanceRef.current = map

    // Fix map container size after mount
    setTimeout(() => {
      map.invalidateSize()
    }, 200)

    return () => {
      map.remove()
      mapInstanceRef.current = null
      markerRef.current = null
      polygonRef.current = null
    }
  }, [defaultLat, defaultLng, initialCenter, initialCoordinates, onLocationSelect, radiusKm])

  // Handle preset selection
  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    const map = mapInstanceRef.current
    if (!map) return

    const [lng, lat] = preset.center
    map.setView([lat, lng], 13)

    const customIcon = L.divIcon({
      className: 'gridmind-map-pin',
      html: `
        <div style="
          width: 32px;
          height: 32px;
          background: #2563eb;
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 4px 12px rgba(37,99,235,0.4);
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

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng])
    } else {
      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map)
      markerRef.current = marker
    }

    const polyCoords = createCirclePolygon(lng, lat, preset.radiusKm)
    const latLngs = polyCoords[0].map(([plng, plat]) => [plat, plng] as [number, number])

    if (polygonRef.current) {
      polygonRef.current.setLatLngs(latLngs)
    } else {
      const poly = L.polygon(latLngs, {
        color: '#2563eb',
        fillColor: '#3b82f6',
        fillOpacity: 0.15,
        weight: 2,
      }).addTo(map)
      polygonRef.current = poly
    }

    setSelectedPoint([lng, lat])
    onLocationSelect({
      center: [lng, lat],
      polygonCoordinates: polyCoords,
      label: preset.label,
    })
  }

  // Handle Geolocation
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lng = parseFloat(pos.coords.longitude.toFixed(5))
        const lat = parseFloat(pos.coords.latitude.toFixed(5))
        handleApplyPreset({ label: 'Current Location', center: [lng, lat], radiusKm: 6 })
      },
      (err) => console.warn('Geolocation failed:', err)
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
  }

  return (
    <div className="space-y-2 border border-border/80 rounded-xl p-3 bg-muted/20">
      <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
        <span className="font-semibold text-foreground flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-indigo-600" />
          Interactive Service Area & Location Picker (Free Map)
        </span>
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <span>Click anywhere on the map to set location & boundary</span>
        </div>
      </div>

      {/* Preset pills & Geolocation */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] text-muted-foreground font-medium mr-1">Presets:</span>
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => handleApplyPreset(p)}
            className="text-[11px] px-2 py-0.5 rounded-full border border-border/70 hover:border-indigo-300 hover:bg-indigo-50/60 transition-colors bg-background"
          >
            {p.label}
          </button>
        ))}

        <button
          type="button"
          onClick={handleUseCurrentLocation}
          className="text-[11px] px-2 py-0.5 rounded-full border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center gap-1 bg-background"
          title="Use browser GPS location"
        >
          <Navigation className="w-2.5 h-2.5" /> GPS
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

      {/* Leaflet Map Canvas */}
      <div
        ref={mapContainerRef}
        className="w-full h-56 rounded-lg overflow-hidden border border-border/70 shadow-inner relative z-0"
        style={{ minHeight: '220px' }}
      />

      {/* Selection info bar */}
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
          <span className="italic text-muted-foreground">No coordinates pinned yet. Click on the map or pick a preset.</span>
        )}

        <div className="flex items-center gap-1.5 ml-auto">
          <span>Boundary Radius:</span>
          {[4, 8, 15].map((km) => (
            <button
              key={km}
              type="button"
              onClick={() => {
                setRadiusKm(km)
                if (selectedPoint) {
                  const polyCoords = createCirclePolygon(selectedPoint[0], selectedPoint[1], km)
                  const latLngs = polyCoords[0].map(([plng, plat]) => [plat, plng] as [number, number])
                  if (polygonRef.current) polygonRef.current.setLatLngs(latLngs)
                  onLocationSelect({
                    center: selectedPoint,
                    polygonCoordinates: polyCoords,
                  })
                }
              }}
              className={`text-[10px] px-1.5 py-0.5 rounded border ${
                radiusKm === km
                  ? 'bg-indigo-600 text-white border-indigo-600 font-medium'
                  : 'bg-background border-border/70 hover:bg-muted'
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
