import { Link } from 'react-router-dom'
import { IoPulseOutline } from 'react-icons/io5'
import { useLang } from '../context/LanguageContext'

function AuthShell({ title, subtitle, children, footerText, footerLink, footerLinkLabel }) {
  const { t } = useLang()

  return (
    <main className="min-h-screen bg-[var(--body-bg)] text-[color:var(--text)] max-w-[390px] mx-auto px-5 py-8 flex flex-col">
      <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold tracking-widest uppercase">
        <IoPulseOutline className="text-2xl" style={{ color: 'var(--accent)' }} />
        {t('brand.app')}
      </Link>

      <section className="flex-1 flex flex-col justify-center">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold leading-tight">{title}</h1>
          {subtitle && <p className="text-[color:var(--text-muted)] text-sm mt-3">{subtitle}</p>}
        </div>

        {children}

        <p className="text-center text-sm text-[color:var(--text-muted)] mt-6">
          {footerText}{' '}
          <Link to={footerLink} className="font-semibold" style={{ color: 'var(--accent)' }}>
            {footerLinkLabel}
          </Link>
        </p>
      </section>
    </main>
  )
}

export default AuthShell
