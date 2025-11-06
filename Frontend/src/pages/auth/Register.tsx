import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { showToast } from '../../lib/toast'
import { register as apiRegister } from '../../lib/api/auth'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useAppDispatch } from '../../store/hooks'
import { loginSuccess } from '../../store/slices/authSlice'
import { ApiError } from '../../lib/api/http'
import Paper from '@mui/material/Paper'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Link from '@mui/material/Link'
import Alert from '@mui/material/Alert'

const schema = z.object({
  name: z.string().min(2, 'Nombre muy corto'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe incluir mayúscula')
    .regex(/[a-z]/, 'Debe incluir minúscula')
    .regex(/[0-9]/, 'Debe incluir número')
    .regex(/[^A-Za-z0-9]/, 'Debe incluir caracter especial')
})

export default function Register() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) })
  const [apiError, setApiError] = useState<string | null>(null)
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  async function onSubmit(values: z.infer<typeof schema>) {
    setApiError(null)
    try {
      const { token, user } = await apiRegister(values)
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
        <Typography variant="h6" mb={2}>Registro</Typography>
        {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}
        <Box component="form" onSubmit={handleSubmit(onSubmit)} display="grid" gap={2}>
          <TextField label="Nombre" size="small" {...register('name')} error={!!errors.name} helperText={errors.name?.message} />
          <TextField label="Email" size="small" {...register('email')} error={!!errors.email} helperText={errors.email?.message} />
          <TextField type="password" label="Contraseña" size="small" {...register('password')} error={!!errors.password} helperText={errors.password?.message} />
          <Button type="submit" variant="contained" disabled={isSubmitting} fullWidth>
            {isSubmitting ? 'Creando…' : 'Crear cuenta'}
          </Button>
        </Box>
        <Typography variant="body2" mt={2}>
          ¿Ya tienes cuenta?{' '}
          <Link component={RouterLink} to="/auth/login">Inicia sesión</Link>
        </Typography>
      </Paper>
    </Box>
  )
}
