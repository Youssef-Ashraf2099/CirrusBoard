/** Frontend-only signup/password rules (Cognito-style complexity). */

const HAS_LOWER = /[a-z]/
const HAS_UPPER = /[A-Z]/
const HAS_NUMBER = /[0-9]/
const HAS_SPECIAL = /[^A-Za-z0-9]/

export function getPasswordValidationError(password: string): string | null {
  const missing: string[] = []

  if (password.length < 8) {
    missing.push('at least 8 characters')
  }
  if (!HAS_LOWER.test(password)) {
    missing.push('one lowercase letter')
  }
  if (!HAS_UPPER.test(password)) {
    missing.push('one uppercase letter')
  }
  if (!HAS_NUMBER.test(password)) {
    missing.push('one number')
  }
  if (!HAS_SPECIAL.test(password)) {
    missing.push('one special character')
  }

  if (missing.length === 0) return null
  return `Password must include ${missing.join(', ')}.`
}
