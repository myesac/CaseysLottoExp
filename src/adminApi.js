const TOKEN_KEY = 'lotto-admin-password'

export async function fetchAdmin(url, options = {}) {
  let token = window.sessionStorage.getItem(TOKEN_KEY)

  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (!token) {
      token = window.prompt('Enter the admin password to update the hosted data')
      if (!token) throw new Error('Admin password is required to update data')
    }

    const headers = new Headers(options.headers)
    headers.set('Authorization', `Bearer ${token}`)
    const response = await fetch(url, { ...options, headers })
    if (response.status !== 401) {
      window.sessionStorage.setItem(TOKEN_KEY, token)
      return response
    }

    window.sessionStorage.removeItem(TOKEN_KEY)
    token = null
  }

  throw new Error('Admin password was rejected')
}
