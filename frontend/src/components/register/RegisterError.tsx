import { AlertCircle } from 'lucide-react'

interface RegisterErrorProps {
  message: string
}

export function RegisterError({ message }: RegisterErrorProps) {
  if (!message) return null
  return (
    <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  )
}
