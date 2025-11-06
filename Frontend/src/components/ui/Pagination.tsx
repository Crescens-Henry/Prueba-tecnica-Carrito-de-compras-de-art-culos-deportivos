import MuiPagination from '@mui/material/Pagination'

type Props = {
  page: number
  pageSize: number
  total: number
  onPageChange: (p: number) => void
}

export default function Pagination({ page, pageSize, total, onPageChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  return (
    <MuiPagination color="primary" page={page} count={totalPages} onChange={(_, val)=>onPageChange(val)} />
  )
}
