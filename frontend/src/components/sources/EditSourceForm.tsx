import { useState } from 'react'
import { X, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DataSource, SourceType, ParserStatus, UpdateSourcePayload } from '@/api/sources'

interface EditSourceFormProps {
  source: DataSource
  onSubmit: (data: UpdateSourcePayload) => Promise<unknown>
  onCancel: () => void
  isLoading: boolean
}

const SOURCE_TYPES: { label: string; value: SourceType }[] = [
  { label: 'PDF Document', value: 'pdf' },
  { label: 'CSV Spreadsheet', value: 'csv' },
  { label: 'JSON Dataset', value: 'json' },
  { label: 'GIS Layer', value: 'gis' },
  { label: 'Webpage', value: 'webpage' },
  { label: 'Manual Entry', value: 'manual' },
]

const PARSER_STATUSES: { label: string; value: ParserStatus }[] = [
  { label: 'Pending Processing', value: 'pending' },
  { label: 'Processing in Progress', value: 'processing' },
  { label: 'Completed / Extracted', value: 'completed' },
  { label: 'Failed / Parsing Error', value: 'failed' },
]

export function EditSourceForm({
  source,
  onSubmit,
  onCancel,
  isLoading,
}: EditSourceFormProps) {
  const [name, setName] = useState(source.name || '')
  const [sourceType, setSourceType] = useState<SourceType>(source.sourceType || 'pdf')
  const [sourceUrl, setSourceUrl] = useState(source.sourceUrl || '')
  const [parserStatus, setParserStatus] = useState<ParserStatus>(source.parserStatus || 'pending')
  const [publisher, setPublisher] = useState(source.metadata?.publisher || '')
  const [description, setDescription] = useState(source.metadata?.description || '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const payload: UpdateSourcePayload = {
      name: name.trim(),
      sourceType,
      sourceUrl: sourceUrl.trim(),
      parserStatus,
      metadata: {
        publisher: publisher.trim(),
        description: description.trim(),
        publicationDate: source.metadata?.publicationDate || new Date().toISOString(),
      },
    }

    try {
      await onSubmit(payload)
    } catch {
      // handled by parent mutation onError
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
      <Card className="w-full max-w-lg shadow-2xl border-border/60 bg-white animate-in zoom-in-95 duration-200">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                <Database className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <CardTitle className="text-base">Edit Data Source</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Update provenance metadata and parser status
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
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Utility Organisation</Label>
              <div className="p-2.5 rounded-md bg-white border border-slate-200 text-sm font-medium text-foreground">
                {source.utilityId?.name || 'Assigned Utility'}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-source-name" className="text-sm font-medium">
                Source Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-source-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                className="h-10 border-border/60 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-source-type" className="text-sm font-medium">
                  Source Type
                </Label>
                <select
                  id="edit-source-type"
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value as SourceType)}
                  className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  {SOURCE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-parser-status" className="text-sm font-medium">
                  Parser Status
                </Label>
                <select
                  id="edit-parser-status"
                  value={parserStatus}
                  onChange={(e) => setParserStatus(e.target.value as ParserStatus)}
                  className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  {PARSER_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-source-url" className="text-sm font-medium">
                Public Source URL / Document Link
              </Label>
              <Input
                id="edit-source-url"
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                className="h-10 border-border/60 bg-white focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-source-publisher" className="text-sm font-medium">
                Publishing Division or Agency
              </Label>
              <Input
                id="edit-source-publisher"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                className="h-10 border-border/60 bg-white focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-source-desc" className="text-sm font-medium">
                Notes & Description
              </Label>
              <textarea
                id="edit-source-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none transition-colors"
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
                className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white"
                disabled={isLoading || !name.trim()}
              >
                {isLoading ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
