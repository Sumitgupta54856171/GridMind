import { Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface UtilitiesEmptyStateProps {
  onAdd: () => void
}

export function UtilitiesEmptyState({ onAdd }: UtilitiesEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4">
        <Building2 className="w-8 h-8 text-blue-400" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-2">No utilities yet</h3>
      <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-6">
        Add your first utility organisation to start importing projects and running conflict analysis.
      </p>
      <Button
        onClick={onAdd}
        className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20"
      >
        Add your first utility
      </Button>
    </div>
  )
}
