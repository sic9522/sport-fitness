import { Outlet } from 'react-router-dom'
import Footer from './Footer'
import TimerPill from './TimerPill'

function Layout() {
  return (
    <div className="min-h-screen bg-[var(--body-bg)] text-[color:var(--text)] max-w-[390px] mx-auto relative">
      <Outlet />
      <TimerPill />
      <Footer />
    </div>
  )
}

export default Layout
