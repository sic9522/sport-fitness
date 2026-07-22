import { useEffect } from 'react'

// Blocca lo scroll dello sfondo mentre `active` è vero (default: sempre, finché il
// componente è montato). Il parametro serve ai componenti sempre montati che bloccano
// solo quando visibili, come il Workout Player in Layout.
// Usa position:fixed perché su mobile (iOS) `overflow:hidden` sul body non basta.
export default function useScrollLock(active = true) {
  useEffect(() => {
    if (!active) return undefined
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
  }, [active])
}
