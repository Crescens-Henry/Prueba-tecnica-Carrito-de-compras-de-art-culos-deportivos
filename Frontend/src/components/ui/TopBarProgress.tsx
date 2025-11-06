import LinearProgress from '@mui/material/LinearProgress'
import Box from '@mui/material/Box'

export default function TopBarProgress({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1300 }}>
      <LinearProgress />
    </Box>
  )
}
