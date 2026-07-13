import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import Footer from './Footer'
import TimerPill from './TimerPill'
import PageLoader from './PageLoader'

function Layout() {
  return (
    <div className="min-h-screen bg-[var(--body-bg)] text-[color:var(--text)] max-w-[390px] mx-auto relative">
      {/* Boundary interno: la pagina (lazy) carica ma la shell qui sotto resta. */}
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
      <TimerPill />
      <Footer />
    </div>
  )
}

export default Layout
