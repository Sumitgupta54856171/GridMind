import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { LoginHeader, LoginForm, LoginError, LoginFooter } from '@/components/login'
import { useAppDispatch } from '@/store/hooks'
import { setCredentials } from '@/store/slices/authSlice'
import { authApi } from '@/api/auth'

export default function LoginPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (email: string, password: string) => {
    setError('')
    setIsLoading(true)
    try {
      const { data } = await authApi.login({ email, password })
      dispatch(setCredentials({ user: data.user, token: data.token }))
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Login failed. Please try again.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <LoginHeader />
        <Card>
          <CardContent className="pt-6 space-y-4">
            <LoginError message={error} />
            <LoginForm onSubmit={handleSubmit} isLoading={isLoading} />
          </CardContent>
        </Card>
        <LoginFooter />
      </div>
    </div>
  )
}
