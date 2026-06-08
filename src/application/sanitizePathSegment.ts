export function sanitizePathSegment(value: string): string {
  return value.trim().replace(/[<>:"/\\|?*]+/g, '_')
}
