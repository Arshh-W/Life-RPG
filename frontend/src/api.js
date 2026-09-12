const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'

export async function apiRequest(path, options = {}, token = '') {
  const requestToken = localStorage.getItem('life-rpg-token') || token
  const request = (accessToken) => fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...options.headers },
  })
  let response
  try {
    response = await request(requestToken)
  } catch (error) {
    const connectionError = new Error('The realm is unreachable. Check your connection and try again.')
    connectionError.status = 0
    connectionError.cause = error
    throw connectionError
  }
  if (response.status === 401 && requestToken && localStorage.getItem('life-rpg-refresh-token') && !path.endsWith('/refresh')) {
    const refreshResponse = await fetch(`${API_URL}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: localStorage.getItem('life-rpg-refresh-token') }) })
    if (!refreshResponse.ok) {
      const expiredError = new Error('Your session has expired. Please sign in again.')
      expiredError.status = 401
      throw expiredError
    }
    const refreshed = await refreshResponse.json()
    localStorage.setItem('life-rpg-token', refreshed.access_token)
    localStorage.setItem('life-rpg-refresh-token', refreshed.refresh_token)
    response = await request(refreshed.access_token)
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    const apiError = new Error(payload.detail || 'The realm could not answer. Try again.')
    apiError.status = response.status
    throw apiError
  }
  return response.status === 204 ? null : response.json()
}