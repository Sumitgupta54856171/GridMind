import { Link } from 'react-router-dom'

export function RegisterFooter() {
  return (
    <p className="text-center text-sm text-muted-foreground">
      Already have an account?{' '}
      <Link to="/login" className="font-medium text-primary hover:underline">
        Sign in
      </Link>
    </p>
  )
}
