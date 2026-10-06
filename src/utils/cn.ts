/** Joins class names, skipping anything falsy: cn('a', isOn && 'b') -> "a b" or "a". */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}
