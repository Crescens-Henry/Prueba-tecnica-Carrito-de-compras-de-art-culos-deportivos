import { Route, Routes, Navigate } from 'react-router-dom'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'
import Layout from './components/layout/Layout'
import AuthGuard from './components/layout/AuthGuard'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ProductsList from './pages/products/ProductsList'
import ProductDetail from './pages/products/ProductDetail'
import CartPage from './pages/cart/CartPage'
import CheckoutPage from './pages/checkout/CheckoutPage'
import OrdersList from './pages/orders/OrdersList'
import OrderDetail from './pages/orders/OrderDetail'

const theme = createTheme({
  palette: { mode: 'dark' }
})

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route path="/auth">
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
        </Route>

        <Route element={<AuthGuard />}>
          <Route element={<Layout />}>
            <Route path="/app/products" element={<ProductsList />} />
            <Route path="/app/products/:id" element={<ProductDetail />} />
            <Route path="/app/cart" element={<CartPage />} />
            <Route path="/app/checkout" element={<CheckoutPage />} />
            <Route path="/app/orders" element={<OrdersList />} />
            <Route path="/app/orders/:orderId" element={<OrderDetail />} />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/auth/login" replace />} />
        <Route path="*" element={<div className="text-center p-10">404 - Página no encontrada</div>} />
      </Routes>
    </ThemeProvider>
  )
}
