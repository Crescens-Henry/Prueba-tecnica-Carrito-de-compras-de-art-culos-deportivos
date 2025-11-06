import { Link as RouterLink } from 'react-router-dom'
import { useAppSelector } from '../../store/hooks'
import type { CartItem } from '../../store/slices/cartSlice'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Badge from '@mui/material/Badge'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import LoginIcon from '@mui/icons-material/Login'
import ListAltIcon from '@mui/icons-material/ListAlt'

export default function Navbar() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = useAppSelector((s: any) => s.cart.items)
  const count = items.reduce((acc: number, it: CartItem) => acc + it.qty, 0)

  return (
    <AppBar position="sticky" color="default" sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Toolbar sx={{ gap: 2 }}>
        <Typography variant="h6" component={RouterLink} to="/app/products" sx={{ textDecoration: 'none', color: 'inherit', flexGrow: 1 }}>
          Claro Shop
        </Typography>
        <IconButton color="inherit" component={RouterLink} to="/auth/login" aria-label="login">
          <LoginIcon />
        </IconButton>
        <IconButton color="inherit" component={RouterLink} to="/app/orders" aria-label="orders">
          <ListAltIcon />
        </IconButton>
        <IconButton color="inherit" component={RouterLink} to="/app/cart" aria-label="cart">
          <Badge badgeContent={count} color="primary">
            <ShoppingCartIcon />
          </Badge>
        </IconButton>
      </Toolbar>
    </AppBar>
  )
}
