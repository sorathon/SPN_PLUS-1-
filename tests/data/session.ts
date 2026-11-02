import fs from 'fs'
import path from 'path'
import { users, UserRole } from './users'

/**
 * Read a value the app keeps in `localStorage` from an account's saved storage state
 * (the file its setup project wrote). Use it to derive what the UI shows for the
 * logged-in person — display name, company — instead of hard-coding it in assertions:
 *
 *   const me = sessionItem<{ data: { firstname: string; lastname: string } }>('user1', 'currentUser')
 *   const display = `${me.data.firstname} ${me.data.lastname}`
 *
 * The value is JSON-parsed when it is valid JSON, otherwise returned as the raw string.
 * Call it INSIDE a test (or a helper a test calls), never at module load: spec files are
 * loaded before the setup project has written the file.
 */
export function sessionItem<T = unknown>(role: UserRole, key: string): T {
  const file = path.resolve(users[role].statePath)
  if (!fs.existsSync(file)) throw new Error(`${file} not found — run the setup project for "${role}" first`)
  const state = JSON.parse(fs.readFileSync(file, 'utf8')) as {
    origins: { localStorage: { name: string; value: string }[] }[]
  }
  for (const origin of state.origins) {
    const entry = origin.localStorage.find((e) => e.name === key)
    if (!entry) continue
    try {
      return JSON.parse(entry.value) as T
    } catch {
      return entry.value as unknown as T
    }
  }
  throw new Error(`localStorage "${key}" not found in ${file}`)
}

/**
 * ShippingNet Pluz+ session of an account: UID + UCODE. The app stores UCODE in
 * localStorage under "<site>-<UID>-UCODE" and every page compares it with the UCODE
 * in its URL (mismatch → wrong.php), so both are read from the saved storage state.
 * <site> is the site's folder and differs per link ("standard", "php8-ms-after-merge", …).
 * Call it inside a test/fixture — the setup project writes the file first.
 */
export function spnSession(role: UserRole): { uid: string; ucode: string } {
  const file = path.resolve(users[role].statePath)
  if (!fs.existsSync(file)) throw new Error(`${file} not found — run the setup project for "${role}" first`)
  const state = JSON.parse(fs.readFileSync(file, 'utf8')) as {
    origins: { localStorage: { name: string; value: string }[] }[]
  }
  for (const origin of state.origins) {
    for (const entry of origin.localStorage) {
      const m = entry.name.match(/^.+-(\d+)-UCODE$/)
      if (m) return { uid: m[1], ucode: entry.value }
    }
  }
  throw new Error(`localStorage "<site>-<UID>-UCODE" not found in ${file}`)
}
