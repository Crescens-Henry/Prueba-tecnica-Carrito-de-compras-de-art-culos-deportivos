import Skeleton from '@mui/material/Skeleton'
import Box from '@mui/material/Box'

export function SkeletonCard() {
  return (
    <Box>
      <Skeleton variant="rounded" height={160} />
      <Skeleton sx={{ mt: 2 }} height={24} />
      <Skeleton width="50%" />
    </Box>
  )
}
