import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Search, X } from 'lucide-react'
import { AppShell } from '@/components/layout'
import { Input } from '@/components/ui/input'
import {
  UtilitiesHeader,
  UtilityCard,
  AddUtilityForm,
  EditUtilityForm,
  UtilitiesEmptyState,
} from '@/components/utilities'
import { utilitiesApi, type Utility, type UpdateUtilityPayload } from '@/api/utilities'

export default function UtilitiesPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingUtility, setEditingUtility] = useState<Utility | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // ── Fetch utilities ──────────────────────────────────────────
  const { data, isLoading, isError } = useQuery({
    queryKey: ['utilities'],
    queryFn: () => utilitiesApi.list().then((r) => r.data.utilities),
  })

  // ── Create mutation ──────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: {
      name: string
      description: string
      website: string
      serviceAreaText: string
      serviceArea?: { type: 'Polygon'; coordinates: number[][][] }
    }) =>
      utilitiesApi.create({
        name: payload.name,
        description: payload.description,
        website: payload.website,
        serviceAreaText: payload.serviceAreaText,
        serviceArea: payload.serviceArea,
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['utilities'] })
      toast.success(`"${res.data.utility.name}" created`, {
        description: 'Utility added to your account.',
      })
      setShowForm(false)
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to create utility.'
      toast.error('Create failed', { description: message })
    },
  })

  // ── Update mutation ──────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUtilityPayload }) =>
      utilitiesApi.update(id, data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['utilities'] })
      qc.invalidateQueries({ queryKey: ['utility', res.data.utility._id] })
      toast.success(`"${res.data.utility.name}" updated`)
      setEditingUtility(null)
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to update utility.'
      toast.error('Update failed', { description: message })
    },
  })

  // ── Delete mutation ──────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) => utilitiesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['utilities'] })
      toast.success('Utility deleted')
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to delete utility.'
      toast.error('Delete failed', { description: message })
    },
  })

  const handleDelete = (id: string) => {
    const name = data?.find((u) => u._id === id)?.name ?? 'utility'
    toast(`Delete "${name}"?`, {
      description: 'This action cannot be undone.',
      action: {
        label: 'Delete',
        onClick: () => deleteMutation.mutate(id),
      },
    })
  }

  const utilities = data ?? []

  // Filter utilities by name, description, or service area
  const filteredUtilities = useMemo(() => {
    if (!searchQuery.trim()) return utilities
    const q = searchQuery.toLowerCase().trim()
    return utilities.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        (u.description && u.description.toLowerCase().includes(q)) ||
        (u.serviceAreaText && u.serviceAreaText.toLowerCase().includes(q)),
    )
  }, [utilities, searchQuery])

  return (
    <AppShell title="Utilities" subtitle="Manage utility organisations and their data sources">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <UtilitiesHeader count={utilities.length} onAdd={() => setShowForm(true)} />

        {/* Search & filters bar if utilities exist */}
        {utilities.length > 0 && (
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, region or description…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 h-9 text-xs border border-border bg-white text-foreground focus-visible:ring-blue-500/50 shadow-xs"
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
        )}

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Body */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm text-red-500 font-medium">Failed to load utilities</p>
            <p className="text-xs text-muted-foreground mt-1">Check your connection and try again.</p>
          </div>
        ) : utilities.length === 0 ? (
          <UtilitiesEmptyState onAdd={() => setShowForm(true)} />
        ) : filteredUtilities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium text-foreground">No matching utilities found</p>
            <p className="text-xs text-muted-foreground mt-1">
              No utilities match "{searchQuery}". Try a different search term.
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-3 text-xs text-blue-600 hover:underline font-medium"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUtilities.map((utility) => (
              <UtilityCard
                key={utility._id}
                utility={utility}
                onEdit={(u) => setEditingUtility(u)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Utility modal */}
      {showForm && (
        <AddUtilityForm
          onSubmit={createMutation.mutateAsync}
          onCancel={() => setShowForm(false)}
          isLoading={createMutation.isPending}
        />
      )}

      {/* Edit Utility modal */}
      {editingUtility && (
        <EditUtilityForm
          utility={editingUtility}
          onSubmit={(data) =>
            updateMutation.mutateAsync({ id: editingUtility._id, data })
          }
          onCancel={() => setEditingUtility(null)}
          isLoading={updateMutation.isPending}
        />
      )}
    </AppShell>
  )
}

