import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAppDispatch } from '../../store/hooks'
import { loginSuccess } from '../../store/slices/authSlice'
import { showToast } from '../../lib/toast'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import { login as apiLogin } from '../../lib/api/auth'
import { ApiError } from '../../lib/api/http'
import Paper from '@mui/material/Paper'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Link from '@mui/material/Link'
import Alert from '@mui/material/Alert'

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe incluir mayúscula')
    .regex(/[a-z]/, 'Debe incluir minúscula')
    .regex(/[0-9]/, 'Debe incluir número')
    .regex(/[^A-Za-z0-9]/, 'Debe incluir caracter especial')
})

type FormValues = z.infer<typeof schema>

export default function Login() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) })
  const [apiError, setApiError] = useState<string | null>(null)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  async function onSubmit(values: FormValues) {
    setApiError(null)
    try {
      const { token, user } = await apiLogin(values)
      dispatch(loginSuccess({ token, user }))
      showToast('Bienvenido/a', 'success')
      navigate('/app/products')
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setApiError(err.message)
        showToast(err.message, 'error')
      } else if (err instanceof Error) {
        setApiError(err.message)
        showToast(err.message, 'error')
      } else {
        const msg = 'Error desconocido'
        setApiError(msg)
        showToast(msg, 'error')
      }
    }
  }

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
      <Paper elevation={3} sx={{ p: 3, width: '100%', maxWidth: 420 }}>
        <Typography variant="h6" mb={2}>Iniciar sesión</Typography>
        {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}
        <Box component="form" onSubmit={handleSubmit(onSubmit)} display="grid" gap={2}>
          <TextField label="Email" size="small"
            error={!!errors.email} helperText={errors.email?.message}
            {...register('email')} />
          <TextField type="password" label="Contraseña" size="small"
            error={!!errors.password} helperText={errors.password?.message}
            {...register('password')} />
          <Button type="submit" variant="contained" disabled={isSubmitting} fullWidth>
            {isSubmitting ? 'Entrando…' : 'Entrar'}
          </Button>
        </Box>
        <Typography variant="body2" mt={2}>
          ¿No tienes cuenta?{' '}
          <Link component={RouterLink} to="/auth/register">Regístrate</Link>
        </Typography>
      </Paper>
    </Box>
  )
}
