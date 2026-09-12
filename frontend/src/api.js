const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'

export async function apiRequest(path, options = {}, token = '') {
  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
    })
  } catch (error) {
    const connectionError = new Error('The realm is unreachable. Check your connection and try again.')
    connectionError.status = 0
    connectionError.cause = error
    throw connectionError
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    const apiError = new Error(payload.detail || 'The realm could not answer. Try again.')
    apiError.status = response.status
    throw apiError
  }
  return response.status === 204 ? null : response.json()
}