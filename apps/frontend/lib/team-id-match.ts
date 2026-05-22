/** Match team ids with or without TEAM# prefix. */
export function teamIdsMatch(
  a?: string | null,
  b?: string | null,
): boolean {
  const normalize = (id?: string | null) =>
    id ? String(id).replace(/^TEAM#/, '').trim() : ''
  const na = normalize(a)
  const nb = normalize(b)
  if (!na || !nb) return false
  return na === nb
}
