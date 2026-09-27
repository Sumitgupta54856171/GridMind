import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { utilitiesApi } from '@/api/utilities'
import type { SourceType, CreateSourcePayload } from '@/api/sources'

interface AddSourceFormProps {
  initialUtilityId?: string
  initialUtilityName?: string
  onSubmit: (utilityId: string, data: CreateSourcePayload) => Promise<unknown>
  onCancel: () => void
  isLoading: boolean
}

const SOURCE_TYPES: { label: string; value: SourceType; hint: string }[] = [
  { label: 'PDF Document', value: 'pdf', hint: 'Capital improvement plan, bond report' },
  { label: 'CSV Spreadsheet', value: 'csv', hint: 'Tabular project list, row-by-row' },
  { label: 'JSON Dataset', value: 'json', hint: 'REST API payload or exported array' },
  { label: 'GIS Layer', value: 'gis', hint: 'ArcGIS / GeoJSON geospatial feature service' },
  { label: 'Webpage', value: 'webpage', hint: 'Public capital projects website or dashboard' },
  { label: 'Manual Entry', value: 'manual', hint: 'Curated or hand-entered project schedule' },
]

export function AddSourceForm({
  initialUtilityId,
  initialUtilityName,
  onSubmit,
  onCancel,
  isLoading,
}: AddSourceFormProps) {
  const [selectedUtilityId, setSelectedUtilityId] = useState(initialUtilityId || '')
  const [name, setName] = useState('')
  const [sourceType, setSourceType] = useState<SourceType>('pdf')
  const [sourceUrl, setSourceUrl] = useState('')
  const [publisher, setPublisher] = useState('')
  const [description, setDescription] = useState('')

  // Load utilities for selection dropdown if not already fixed
  const { data: utilitiesData } = useQuery({
    queryKey: ['utilities'],
    queryFn: () => utilitiesApi.list().then((r) => r.data.utilities),
    enabled: !initialUtilityId,
  })

  const utilities = utilitiesData || []
  const effectiveUtilityId = initialUtilityId || selectedUtilityId

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!effectiveUtilityId || !name.trim()) return

    const payload: CreateSourcePayload = {
      name: name.trim(),
      sourceType,
      sourceUrl: sourceUrl.trim(),
      metadata: {
        publisher: publisher.trim(),
        description: description.trim(),
        publicationDate: new Date().toISOString(),
      },
    }

    try {
      await onSubmit(effectiveUtilityId, payload)
    } catch {
      // handled by parent mutation onError
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <Card className="w-full max-w-lg shadow-2xl border-border/60 animate-in zoom-in-95 duration-200">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                <Database className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <CardTitle className="text-base">Add Public Data Source</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Attach an authoritative document or data feed
                </p>
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
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Utility selector if not pre-bound */}
            {initialUtilityId ? (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Target Utility Organisation</Label>
                <div className="p-2.5 rounded-md bg-muted/50 border border-border/50 text-sm font-medium text-foreground">
                  {initialUtilityName || 'Selected Utility'}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="source-utility" className="text-sm font-medium">
                  Utility Organisation <span className="text-red-500">*</span>
                </Label>
                <select
                  id="source-utility"
                  value={selectedUtilityId}
                  onChange={(e) => setSelectedUtilityId(e.target.value)}
                  required
                  className="w-full h-10 rounded-md border border-border/60 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  <option value="" disabled>Select utility organization…</option>
                  {utilities.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} {u.serviceAreaText ? `(${u.serviceAreaText})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Source Name */}
            <div className="space-y-2">
              <Label htmlFor="source-name" className="text-sm font-medium">
                Source Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="source-name"
                placeholder="e.g. 2026–2030 Capital Improvement Plan (CIP)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                className="h-10 border-border/60 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500"
              />
            </div>

            {/* Source Type */}
            <div className="space-y-2">
              <Label htmlFor="source-type" className="text-sm font-medium">
                Source Type <span className="text-red-500">*</span>
              </Label>
              <select
                id="source-type"
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as SourceType)}
                className="w-full h-10 rounded-md border border-border/60 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                {SOURCE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label} — {t.hint}
                  </option>
                ))}
              </select>
            </div>

            {/* Source URL */}
            <div className="space-y-2">
              <Label htmlFor="source-url" className="text-sm font-medium">
                Public Source URL / Document Link
              </Label>
              <Input
                id="source-url"
                type="url"
                placeholder="https://utility.gov/reports/cip-future-works.pdf"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                className="h-10 border-border/60 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500"
              />
            </div>

            {/* Publisher / Agency */}
            <div className="space-y-2">
              <Label htmlFor="source-publisher" className="text-sm font-medium">
                Publishing Division or Agency
              </Label>
              <Input
                id="source-publisher"
                placeholder="e.g. Engineering & Capital Projects Dept"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                className="h-10 border-border/60 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="source-desc" className="text-sm font-medium">
                Notes & Description
              </Label>
              <textarea
                id="source-desc"
                placeholder="Details on frequency of updates, methodology, or coverage…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none transition-colors"
              />
            </div>

            {/* Actions */}
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
                className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white"
                disabled={isLoading || !effectiveUtilityId || !name.trim()}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Adding Source…
                  </span>
                ) : (
                  'Add Source'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
