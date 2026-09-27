import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { RegisterHeader, RegisterForm, RegisterError, RegisterFooter } from '@/components/register'
import { useAppDispatch } from '@/store/hooks'
import { setCredentials } from '@/store/slices/authSlice'
import { authApi } from '@/api/auth'

export default function RegisterPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (name: string, email: string, password: string) => {
    setError('')
    setIsLoading(true)
    try {
      const { data } = await authApi.register({ name, email, password })
      dispatch(setCredentials({ user: data.user, token: data.token }))
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Registration failed. Please try again.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <RegisterHeader />
        <Card>
          <CardContent className="pt-6 space-y-4">
            <RegisterError message={error} />
            <RegisterForm onSubmit={handleSubmit} isLoading={isLoading} />
          </CardContent>
        </Card>
        <RegisterFooter />
      </div>
    </div>
  )
}
