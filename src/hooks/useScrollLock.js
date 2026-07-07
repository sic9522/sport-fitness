import { useEffect } from 'react'

// Blocca lo scroll dello sfondo finché il componente (una modale) è montato.
// Usa position:fixed perché su mobile (iOS) `overflow:hidden` sul body non basta.
export default function useScrollLock() {
  useEffect(() => {
    const scrollY = window.scrollY
    const body = document.body
    const prev = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    }
    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.width = '100%'
    return () => {
      body.style.overflow = prev.overflow
      body.style.position = prev.position
      body.style.top = prev.top
      body.style.width = prev.width
      window.scrollTo(0, scrollY)
    }
  }, [])
}
