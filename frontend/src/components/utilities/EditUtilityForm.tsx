import { useState } from 'react'
import { X, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LocationPickerMap } from '@/components/map/LocationPickerMap'
import type { Utility, UpdateUtilityPayload } from '@/api/utilities'

interface EditUtilityFormProps {
  utility: Utility
  onSubmit: (data: UpdateUtilityPayload) => Promise<unknown>
  onCancel: () => void
  isLoading: boolean
}

export function EditUtilityForm({ utility, onSubmit, onCancel, isLoading }: EditUtilityFormProps) {
  const [name, setName] = useState(utility.name || '')
  const [description, setDescription] = useState(utility.description || '')
  const [website, setWebsite] = useState(utility.website || '')
  const [serviceAreaText, setServiceAreaText] = useState(utility.serviceAreaText || '')

  // Initial center from existing polygon coordinates
  const initialCenter: [number, number] | undefined =
    utility.serviceArea?.coordinates?.[0]?.[0]
      ? [utility.serviceArea.coordinates[0][0][0], utility.serviceArea.coordinates[0][0][1]]
      : undefined

  const [polygonCoords, setPolygonCoords] = useState<number[][][] | undefined>(
    utility.serviceArea?.coordinates
  )
  const [showGeoInput, setShowGeoInput] = useState(false)
  const [geoJsonText, setGeoJsonText] = useState(
    utility.serviceArea ? JSON.stringify(utility.serviceArea) : ''
  )
  const [geoError, setGeoError] = useState('')

  const handleLocationSelect = (data: {
    center: [number, number]
    polygonCoordinates?: number[][][]
    label?: string
  }) => {
    if (data.polygonCoordinates) {
      setPolygonCoords(data.polygonCoordinates)
    }
    if (data.label && (!serviceAreaText || serviceAreaText.trim() === '')) {
      setServiceAreaText(data.label)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    let parsedGeo: { type: 'Polygon'; coordinates: number[][][] } | undefined = undefined

    if (showGeoInput && geoJsonText.trim()) {
      try {
        const parsed = JSON.parse(geoJsonText.trim())
        if (parsed.type === 'Polygon' && Array.isArray(parsed.coordinates)) {
          parsedGeo = parsed
        } else if (Array.isArray(parsed)) {
          parsedGeo = { type: 'Polygon', coordinates: parsed }
        } else {
          setGeoError('Must be a GeoJSON Polygon object or 3D coordinate array.')
          return
        }
        setGeoError('')
      } catch {
        setGeoError('Invalid JSON format for coordinates.')
        return
      }
    } else if (polygonCoords) {
      parsedGeo = { type: 'Polygon', coordinates: polygonCoords }
    }

    const payload: UpdateUtilityPayload = {
      name: name.trim(),
      description: description.trim(),
      website: website.trim(),
      serviceAreaText: serviceAreaText.trim(),
      serviceArea: parsedGeo,
    }

    try {
      await onSubmit(payload)
    } catch {
      // error handled by parent mutation onError
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <Card className="w-full max-w-xl my-6 shadow-2xl border-border/60 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <CardHeader className="pb-3 border-b border-border/50 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Edit Utility</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Update organisation details & spatial coverage</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="overflow-y-auto p-5 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-util-name" className="text-xs font-semibold">
                Utility Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-util-name"
                placeholder="e.g. City Water Authority"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                className="h-9 text-xs border-border/60 focus-visible:ring-blue-500/50 focus-visible:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-util-desc" className="text-xs font-semibold">
                Description
              </Label>
              <textarea
                id="edit-util-desc"
                placeholder="Brief description of this utility organisation…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 resize-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-util-service-area" className="text-xs font-semibold">
                Service Region Name
                <span className="text-muted-foreground font-normal ml-1">(city, region or county)</span>
              </Label>
              <Input
                id="edit-util-service-area"
                type="text"
                placeholder="e.g. Austin Metro, Travis County"
                value={serviceAreaText}
                onChange={(e) => setServiceAreaText(e.target.value)}
                className="h-9 text-xs border-border/60 focus-visible:ring-blue-500/50 focus-visible:border-blue-500"
              />
            </div>

            {/* Interactive Free OpenStreetMap Location & Polygon Picker */}
            <div className="space-y-1.5">
              <LocationPickerMap
                initialCenter={initialCenter}
                initialCoordinates={utility.serviceArea?.coordinates}
                onLocationSelect={handleLocationSelect}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowGeoInput((v) => !v)}
                  className="text-xs text-blue-600 hover:text-blue-700 hover:underline font-medium"
                >
                  {showGeoInput ? '— Hide Manual Raw GeoJSON' : '+ Advanced: Edit Raw GeoJSON'}
                </button>
              </div>
              {showGeoInput && (
                <div className="space-y-1.5 p-3 rounded-lg bg-muted/40 border border-border/60 animate-in fade-in duration-150">
                  <Label htmlFor="edit-util-geojson" className="text-xs text-muted-foreground">
                    GeoJSON Polygon coordinates or object:
                  </Label>
                  <textarea
                    id="edit-util-geojson"
                    value={geoJsonText}
                    onChange={(e) => {
                      setGeoJsonText(e.target.value)
                      setGeoError('')
                    }}
                    rows={2}
                    className="w-full font-mono text-[11px] rounded-md border border-border/60 bg-background px-3 py-2 placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {geoError && <p className="text-xs text-red-500">{geoError}</p>}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-util-website" className="text-xs font-semibold">
                Website
              </Label>
              <Input
                id="edit-util-website"
                type="url"
                placeholder="https://example.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="h-9 text-xs border-border/60 focus-visible:ring-blue-500/50 focus-visible:border-blue-500"
              />
            </div>

            <div className="flex gap-3 pt-3 border-t border-border/50">
              <Button
                type="button"
                variant="outline"
                className="flex-1 text-xs h-9"
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 text-xs h-9 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                disabled={isLoading || !name.trim()}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Saving…
                  </span>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
