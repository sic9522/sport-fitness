import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import Footer from './Footer'
import TimerPill from './TimerPill'
import WorkoutPlayer from './WorkoutPlayer'
import WorkoutPill from './WorkoutPill'
import PageLoader from './PageLoader'

function Layout() {
  return (
    <div className="min-h-screen bg-[var(--body-bg)] text-[color:var(--text)] max-w-[390px] mx-auto relative">
      {/* Boundary interno: la pagina (lazy) carica ma la shell qui sotto resta. */}
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
      <TimerPill />
      {/* Workout Player e la sua pill: la sessione vive nel contesto, quindi prosegue
          anche cambiando pagina. Il player si mostra da solo quando è in primo piano;
          la pill quando è in background. */}
      <WorkoutPill />
      <WorkoutPlayer />
      <Footer />
    </div>
  )
}

export default Layout
