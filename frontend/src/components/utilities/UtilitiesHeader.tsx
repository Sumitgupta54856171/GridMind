import { Building2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface UtilitiesHeaderProps {
  count: number
  onAdd: () => void
}

export function UtilitiesHeader({ count, onAdd }: UtilitiesHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Utilities</h2>
          <p className="text-sm text-muted-foreground">
            {count === 0 ? 'No utilities yet' : `${count} utility${count !== 1 ? ' organisations' : ' organisation'}`}
          </p>
        </div>
      </div>
      <Button
        onClick={onAdd}
        className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 hover:-translate-y-0.5 transition-all"
      >
        <Plus className="w-4 h-4" />
        Add Utility
      </Button>
    </div>
  )
}
