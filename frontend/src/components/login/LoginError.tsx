import { AlertCircle } from 'lucide-react'

interface LoginErrorProps {
  message: string
}

export function LoginError({ message }: LoginErrorProps) {
  if (!message) return null
  return (
    <div className="flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-500" />
      <span>{message}</span>
    </div>
  )
}
