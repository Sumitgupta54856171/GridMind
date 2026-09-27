import { useState } from 'react'
import { X, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface AddUtilityFormProps {
  onSubmit: (data: {
    name: string
    description: string
    website: string
    serviceAreaText: string
    serviceArea?: { type: 'Polygon'; coordinates: number[][][] }
  }) => Promise<unknown>
  onCancel: () => void
  isLoading: boolean
}

export function AddUtilityForm({ onSubmit, onCancel, isLoading }: AddUtilityFormProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [website, setWebsite] = useState('')
  const [serviceAreaText, setServiceAreaText] = useState('')
  const [showGeoInput, setShowGeoInput] = useState(false)
  const [geoJsonText, setGeoJsonText] = useState('')
  const [geoError, setGeoError] = useState('')

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
    }

    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        website: website.trim(),
        serviceAreaText: serviceAreaText.trim(),
        serviceArea: parsedGeo,
      })
    } catch {
      // error handled by parent query mutation onError
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md shadow-2xl border-border/60 animate-in fade-in zoom-in-95 duration-200">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <CardTitle className="text-base">Add Utility</CardTitle>
            </div>
            <button
              onClick={onCancel}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="util-name" className="text-sm font-medium">
                Utility name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="util-name"
                placeholder="e.g. City Water Authority"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                className="h-10 border-border/60 focus-visible:ring-blue-500/50 focus-visible:border-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="util-desc" className="text-sm font-medium">
                Description
              </Label>
              <textarea
                id="util-desc"
                placeholder="Brief description of this utility organisation…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 resize-none transition-colors"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="util-service-area" className="text-sm font-medium">
                Service area
                <span className="text-muted-foreground font-normal ml-1">(city, region or county)</span>
              </Label>
              <Input
                id="util-service-area"
                type="text"
                placeholder="e.g. Austin Metro, Travis County"
                value={serviceAreaText}
                onChange={(e) => setServiceAreaText(e.target.value)}
                className="h-10 border-border/60 focus-visible:ring-blue-500/50 focus-visible:border-blue-500"
              />
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setShowGeoInput((v) => !v)}
                  className="text-xs text-blue-600 hover:text-blue-700 hover:underline font-medium"
                >
                  {showGeoInput ? '— Hide GIS Polygon' : '+ Add GeoJSON Polygon (optional)'}
                </button>
              </div>
              {showGeoInput && (
                <div className="space-y-1.5 p-3 rounded-lg bg-muted/40 border border-border/60 animate-in fade-in duration-150">
                  <Label htmlFor="util-geojson" className="text-xs text-muted-foreground">
                    Paste GeoJSON Polygon coordinates or object:
                  </Label>
                  <textarea
                    id="util-geojson"
                    placeholder='{"type":"Polygon","coordinates":[[[-97.74,30.26],[-97.70,30.26],[-97.70,30.30],[-97.74,30.30],[-97.74,30.26]]]}'
                    value={geoJsonText}
                    onChange={(e) => {
                      setGeoJsonText(e.target.value)
                      setGeoError('')
                    }}
                    rows={3}
                    className="w-full font-mono text-xs rounded-md border border-border/60 bg-background px-3 py-2 placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {geoError && <p className="text-xs text-red-500">{geoError}</p>}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="util-website" className="text-sm font-medium">
                Website
              </Label>
              <Input
                id="util-website"
                type="url"
                placeholder="https://example.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="h-10 border-border/60 focus-visible:ring-blue-500/50 focus-visible:border-blue-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                disabled={isLoading || !name.trim()}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Creating…
                  </span>
                ) : (
                  'Create Utility'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
