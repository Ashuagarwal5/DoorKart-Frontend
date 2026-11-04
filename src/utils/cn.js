/** Joins class names, skipping anything falsy: cn('a', isOn && 'b') -> "a b" or "a". */
export function cn(...parts) {
  return parts.filter(Boolean).join(' ');
}
