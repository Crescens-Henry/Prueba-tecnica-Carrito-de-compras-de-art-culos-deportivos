import Navbar from './Navbar'
import { Outlet } from 'react-router-dom'
import Container from '@mui/material/Container'

export default function Layout() {
  return (
    <>
      <Navbar />
      <Container maxWidth="xl" sx={{ py: 3, overflowX: 'hidden' }}>
        <Outlet />
      </Container>
    </>
  )
}
