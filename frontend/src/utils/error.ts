export function getErrorMessage(err: unknown, fallback = 'Произошла ошибка'): string {
  if (typeof err === 'string') return err
  if (err && typeof err === 'object') {
    const axiosError = err as { response?: { data?: { message?: string; detail?: string } }; message?: string }
    return axiosError.response?.data?.message || axiosError.response?.data?.detail || axiosError.message || fallback
  }
  return fallback
}
