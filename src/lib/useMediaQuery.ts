import { useEffect, useState } from 'react'

function matches(query: string): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches
}

/**
 * `true` mientras la media query case (p.ej. `useMediaQuery('(max-width: 735px)')`).
 * Se re-evalúa al cambiar el tamaño/orientación. Sin `window` (SSR/tests) devuelve false.
 */
export function useMediaQuery(query: string): boolean {
  const [value, setValue] = useState<boolean>(() => matches(query))

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia(query)
    const onChange = () => setValue(mql.matches)
    onChange() // por si la query cambió entre el render y el efecto
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    }
    // Safari < 14
    mql.addListener(onChange)
    return () => mql.removeListener(onChange)
  }, [query])

  return value
}
