import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  X, Database, Upload, FileText,
  Sparkles, Link2, FileSpreadsheet, FileCode,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { utilitiesApi } from '@/api/utilities'
import type { SourceType } from '@/api/sources'

interface AddSourceFormProps {
  initialUtilityId?: string
  initialUtilityName?: string
  onSubmit: (utilityId: string, data: FormData) => Promise<unknown>
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
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [sourceUrl, setSourceUrl] = useState('')
  const [publisher, setPublisher] = useState('')
  const [description, setDescription] = useState('')
  const [autoExtract, setAutoExtract] = useState(true)
  const [isDragging, setIsDragging] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load utilities for selection dropdown if not already fixed
  const { data: utilitiesData } = useQuery({
    queryKey: ['utilities'],
    queryFn: () => utilitiesApi.list().then((r) => r.data.utilities),
    enabled: !initialUtilityId,
  })

  const utilities = utilitiesData || []
  const effectiveUtilityId = initialUtilityId || selectedUtilityId

  const handleFileChange = (file: File | null) => {
    if (!file) {
      setSelectedFile(null)
      return
    }
    setSelectedFile(file)

    // Auto-detect source type
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext === 'pdf') setSourceType('pdf')
    else if (ext === 'csv') setSourceType('csv')
    else if (ext === 'json') setSourceType('json')
    else if (ext === 'geojson') setSourceType('gis')

    // Pre-fill name if blank
    if (!name.trim()) {
      const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
      setName(baseName.charAt(0).toUpperCase() + baseName.slice(1))
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0])
      setUploadMode('file')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!effectiveUtilityId) return

    const resolvedName = name.trim() || selectedFile?.name || 'Untitled Source'

    const formData = new FormData()
    formData.append('name', resolvedName)
    formData.append('sourceType', sourceType)
    formData.append('autoExtract', autoExtract ? 'true' : 'false')

    if (uploadMode === 'file' && selectedFile) {
      formData.append('file', selectedFile)
    }

    if (sourceUrl.trim()) {
      formData.append('sourceUrl', sourceUrl.trim())
    }

    if (publisher.trim()) {
      formData.append('publisher', publisher.trim())
    }

    if (description.trim()) {
      formData.append('description', description.trim())
    }

    try {
      await onSubmit(effectiveUtilityId, formData)
    } catch {
      // Handled by parent mutation onError
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-150 overflow-y-auto">
      <Card className="w-full max-w-lg shadow-2xl border-border/60 animate-in zoom-in-95 duration-200 my-8">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Add Public Data Source</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Upload document, CIP schedule, or public link
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
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Utility selector if not pre-bound */}
            {initialUtilityId ? (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Target Utility Organisation</Label>
                <div className="p-2.5 rounded-md bg-muted/40 border border-border/50 text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>{initialUtilityName || 'Selected Utility'}</span>
                  <Badge variant="secondary" className="text-[10px]">Pre-selected</Badge>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="source-utility" className="text-xs font-medium">
                  Utility Organisation <span className="text-red-500">*</span>
                </Label>
                <select
                  id="source-utility"
                  value={selectedUtilityId}
                  onChange={(e) => setSelectedUtilityId(e.target.value)}
                  required
                  className="w-full h-9 rounded-md border border-border/60 bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="" disabled>Select target utility…</option>
                  {utilities.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} {u.serviceAreaText ? `(${u.serviceAreaText})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Source Type Selector */}
            <div className="space-y-1.5">
              <Label htmlFor="source-type" className="text-xs font-medium">
                Document / Source Format <span className="text-red-500">*</span>
              </Label>
              <select
                id="source-type"
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as SourceType)}
                className="w-full h-9 rounded-md border border-border/60 bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {SOURCE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label} — {t.hint}
                  </option>
                ))}
              </select>
            </div>

            {/* Mode Toggle: File Upload vs URL */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Data Ingestion Method</Label>
                <div className="inline-flex rounded-md border border-border/60 bg-muted/30 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setUploadMode('file')}
                    className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1 ${
                      uploadMode === 'file' ? 'bg-background shadow-xs font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Upload className="w-3 h-3" />
                    Direct Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadMode('url')}
                    className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1 ${
                      uploadMode === 'url' ? 'bg-background shadow-xs font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Link2 className="w-3 h-3" />
                    Public URL
                  </button>
                </div>
              </div>

              {/* Upload Dropzone */}
              {uploadMode === 'file' ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setIsDragging(true)
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-indigo-500 bg-indigo-50/50'
                      : selectedFile
                      ? 'border-emerald-300 bg-emerald-50/30'
                      : 'border-border/80 hover:border-indigo-300 hover:bg-muted/30'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.csv,.json,.geojson,.txt"
                    className="hidden"
                    onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                  />

                  {selectedFile ? (
                    <div className="flex items-center justify-between gap-3 text-left">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          {selectedFile.name.endsWith('.pdf') ? (
                            <FileText className="w-5 h-5" />
                          ) : selectedFile.name.endsWith('.csv') ? (
                            <FileSpreadsheet className="w-5 h-5" />
                          ) : (
                            <FileCode className="w-5 h-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{selectedFile.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {(selectedFile.size / 1024).toFixed(1)} KB • Click to change file
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedFile(null)
                        }}
                        className="p-1 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50"
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-1">
                        <Upload className="w-4 h-4" />
                      </div>
                      <p className="text-xs font-semibold text-foreground">
                        Click to select or drag & drop file
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Supports PDF (CIP plans), CSV (schedules), JSON or GIS files
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Input
                    id="source-url"
                    type="url"
                    placeholder="https://utility.gov/capital-improvement-plan.pdf"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    className="h-9 text-xs border-border/60 focus-visible:ring-indigo-500/50"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Publicly accessible web document or API endpoint.
                  </p>
                </div>
              )}
            </div>

            {/* Source Name */}
            <div className="space-y-1.5">
              <Label htmlFor="source-name" className="text-xs font-medium">
                Source Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="source-name"
                placeholder="e.g. 2026–2030 Capital Improvement Plan (CIP)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-9 text-xs border-border/60 focus-visible:ring-indigo-500/50"
              />
            </div>

            {/* Publisher / Agency */}
            <div className="space-y-1.5">
              <Label htmlFor="source-publisher" className="text-xs font-medium">
                Publishing Division or Agency (optional)
              </Label>
              <Input
                id="source-publisher"
                placeholder="e.g. Engineering & Capital Projects Dept"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                className="h-9 text-xs border-border/60 focus-visible:ring-indigo-500/50"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="source-desc" className="text-xs font-medium">
                Notes & Description (optional)
              </Label>
              <textarea
                id="source-desc"
                placeholder="Details on frequency of updates, methodology, or coverage…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-border/60 bg-background px-3 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
              />
            </div>

            {/* AI Agent Auto-Extraction Feature Box */}
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 flex items-start gap-2.5">
              <input
                id="auto-extract"
                type="checkbox"
                checked={autoExtract}
                onChange={(e) => setAutoExtract(e.target.checked)}
                className="mt-0.5 rounded border-border text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="auto-extract" className="text-xs cursor-pointer select-none">
                <span className="font-semibold text-indigo-950 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  Auto-extract projects with Gemini AI Agent
                </span>
                <p className="text-[11px] text-indigo-800 mt-0.5 leading-normal">
                  Gemini analyzes the document text and tables, extracting all capital projects, dates, street corridors, and GIS coordinates.
                </p>
              </label>
            </div>

            {/* Submit & Cancel */}
            <div className="flex gap-3 pt-2">
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
                className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs h-9"
                disabled={isLoading || !effectiveUtilityId || (!name.trim() && !selectedFile)}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    {autoExtract ? 'Uploading & Extracting…' : 'Uploading Source…'}
                  </span>
                ) : (
                  autoExtract ? 'Upload & Extract Projects' : 'Save Source'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
