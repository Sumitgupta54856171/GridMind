import { Link } from 'react-router-dom'

export function LoginFooter() {
  return (
    <p className="text-center text-sm text-muted-foreground">
      Don&apos;t have an account?{' '}
      <Link to="/register" className="font-medium text-primary hover:underline">
        Create one
      </Link>
    </p>
  )
}
