import { Outlet } from 'react-router-dom'
import Footer from './Footer'

function Layout() {
  return (
    <div className="min-h-screen bg-[var(--body-bg)] text-[color:var(--text)] max-w-[390px] mx-auto relative">
      <Outlet />
      <Footer />
    </div>
  )
}

export default Layout
