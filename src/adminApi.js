// ----------------------------------------------------------------------------------
//  Name:    adminApi.js
//  Author:  Mark Casey
//
//  Purpose: fetch wrapper for admin endpoints; asks for the admin password in a
//           masked dialog and keeps it in sessionStorage for the tab's lifetime.
//
//  Exported API:
//   • fetchAdmin()        → Promise<Response>
//   • readErrorMessage()  → Promise<string>, the API's error text or a fallback
// ----------------------------------------------------------------------------------

// ── Constants ─────────────────────────────────────────────
const TOKEN_KEY = 'lotto-admin-password'
const MAX_ATTEMPTS = 2

// ── Password dialog ───────────────────────────────────────
// Built with DOM APIs (no innerHTML); resolves to the password, or null on cancel.
function askForPassword(message) {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog')
    dialog.className = 'password-dialog glass'

    const form = document.createElement('form')
    form.method = 'dialog'

    const label = document.createElement('label')
    label.className = 'filter-field'
    const text = document.createElement('span')
    text.textContent = message
    const input = document.createElement('input')
    input.type = 'password'
    input.autocomplete = 'current-password'
    input.required = true
    label.append(text, input)

    const actions = document.createElement('div')
    actions.className = 'password-dialog-actions'
    const cancel = document.createElement('button')
    cancel.type = 'button'
    cancel.className = 'btn-secondary'
    cancel.textContent = 'Cancel'
    const ok = document.createElement('button')
    ok.type = 'submit'
    ok.className = 'refresh-btn'
    ok.textContent = 'Continue'
    actions.append(cancel, ok)

    form.append(label, actions)
    dialog.append(form)
    document.body.append(dialog)

    cancel.addEventListener('click', () => dialog.close(''))
    form.addEventListener('submit', () => dialog.close(input.value))
    dialog.addEventListener('close', () => {
      dialog.remove()
      resolve(dialog.returnValue || null)
    })
    dialog.showModal()
  })
}

// ── Admin requests ────────────────────────────────────────
export async function fetchAdmin(url, options = {}) {
  let token = window.sessionStorage.getItem(TOKEN_KEY)

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    if (!token) {
      token = await askForPassword(
        attempt === 0 ? 'Admin password' : 'Password was incorrect, try again',
      )
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

export async function readErrorMessage(response, fallback) {
  try {
    const body = await response.json()
    if (body.error) return body.error
  } catch (err) {
    console.warn(`${fallback}: error body was not JSON`, err)
  }

  return fallback
}
