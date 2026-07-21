import { Link, useNavigate } from 'react-router-dom'
import {
  IoPersonCircleOutline, IoScaleOutline, IoBodyOutline, IoChevronForward,
  IoColorPaletteOutline, IoFlagOutline, IoLanguageOutline, IoArchiveOutline,
  IoStopwatchOutline, IoLogOutOutline, IoIdCardOutline, IoMoonOutline,
} from 'react-icons/io5'
import TopBar from '../components/TopBar'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabaseClient'
import { FEATURES } from '../config/features'

// Riga di menu (icona in pastiglia + titolo/descrizione + chevron), come nel mockup Settings.
function Row({ to, icon: Icon, title, desc, trailing }) {
  return (
    <Link
      to={to}
      className="bg-[var(--surface)] p-4 flex items-center gap-4 w-full text-left hover:bg-[var(--surface-3)] transition-colors"
    >
      <div className="w-10 h-10 rounded-xl bg-[var(--fill-1)] flex items-center justify-center shrink-0">
        <Icon className="text-xl" style={{ color: 'var(--accent)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{title}</p>
        {desc && <p className="text-[color:var(--text-dim)] text-xs mt-0.5">{desc}</p>}
      </div>
      {trailing}
      <IoChevronForward className="text-[color:var(--text-faint)] shrink-0" />
    </Link>
  )
}

// Riga con interruttore, come il "Dark Mode" del mockup Settings: l'azione piu'
// frequente si fa sul posto, senza entrare in una sottopagina.
function ToggleRow({ icon: Icon, title, desc, checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="bg-[var(--surface)] p-4 flex items-center gap-4 w-full text-left hover:bg-[var(--surface-3)] transition-colors"
    >
      <div className="w-10 h-10 rounded-xl bg-[var(--fill-1)] flex items-center justify-center shrink-0">
        <Icon className="text-xl" style={{ color: 'var(--accent)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{title}</p>
        {desc && <p className="text-[color:var(--text-dim)] text-xs mt-0.5">{desc}</p>}
      </div>
      <span
        className="relative h-6 w-11 rounded-full shrink-0 transition-colors"
        style={{ backgroundColor: checked ? 'var(--accent)' : 'var(--fill-2)' }}
      >
        <span
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all"
          style={{ left: checked ? '1.375rem' : '0.125rem' }}
        />
      </span>
    </button>
  )
}

// Gruppo di righe sotto un'etichetta maiuscola: le righe sono contigue e il gruppo
// è arrotondato agli estremi (divide-y per i separatori), come nel mockup.
function Section({ title, children }) {
  return (
    <section className="mt-6">
      <h2 className="text-xs uppercase tracking-wider text-[color:var(--text-dim)] mb-2 px-1">{title}</h2>
      <div className="rounded-2xl overflow-hidden border border-[color:var(--border-1)] divide-y divide-[color:var(--border-1)]">
        {children}
      </div>
    </section>
  )
}

function Profilo() {
  const { t } = useLang()
  const { isConfigured, loading, user } = useAuth()
  const { theme, mode, setMode } = useTheme()
  const navigate = useNavigate()

  async function logout() {
    if (supabase) await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <div className="flex flex-col pb-28">
      <TopBar title={t('page.profilo')} />

      <div className="px-5 pt-5">
        {/* Intestazione profilo: avatar + identità dell'account (niente "Pro Member":
            l'app non ha piani a pagamento, sarebbe un'etichetta inventata). */}
        <div className="flex items-center gap-4 rounded-2xl bg-[var(--surface)] border border-[color:var(--border-1)] p-4">
          <IoPersonCircleOutline className="text-5xl text-[color:var(--text-muted)] shrink-0" />
          <div className="min-w-0">
            <p className="font-bold truncate">{t('page.profilo')}</p>
            <p className="text-xs text-[color:var(--text-muted)] truncate">
              {loading ? t('common.loading') : user?.email || t('profilo.noAccount')}
            </p>
          </div>
        </div>

        {/* I dati anagrafici si modificano solo da loggati: senza account non c'è
            nessun profilo da salvare. */}
        {user && (
          <Section title={t('profilo.sectionPersonal')}>
            <Row to="/impostazioni/profilo" icon={IoIdCardOutline} title={t('profile.title')} desc={t('profile.desc')} />
          </Section>
        )}

        <Section title={t('profilo.sectionApp')}>
          {/* Come nel mockup Settings: l'aspetto si cambia da qui, la palette ha la sua
              pagina ma mostra gia' il colore attivo nella riga. */}
          <ToggleRow
            icon={IoMoonOutline}
            title={t('colors.dark')}
            desc={t('profilo.darkDesc')}
            checked={mode === 'dark'}
            onChange={on => setMode(on ? 'dark' : 'light')}
          />
          <Row
            to="/impostazioni/colori"
            icon={IoColorPaletteOutline}
            title={t('settings.colors.title')}
            desc={theme.name}
            trailing={<span className="h-4 w-4 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />}
          />
          <Row to="/impostazioni/lingua" icon={IoLanguageOutline} title={t('settings.language.title')} desc={t('settings.language.desc')} />
        </Section>

        <Section title={t('profilo.sectionHealth')}>
          <Row to="/peso" icon={IoScaleOutline} title={t('profilo.weightCard')} desc={t('profilo.weightCardDesc')} />
          <Row to="/impostazioni/obiettivi" icon={IoFlagOutline} title={t('settings.goals.title')} desc={t('settings.goals.desc')} />
          {/* Il Timer non è più nella navbar (design Stitch): resta raggiungibile da qui. */}
          <Row to="/timer" icon={IoStopwatchOutline} title={t('nav.timer')} desc={t('profilo.timerDesc')} />
          {/* Misure corporee: pronta ma nascosta finché FEATURES.bodyMeasures è false. */}
          {FEATURES.bodyMeasures && (
            <Row to="/misure" icon={IoBodyOutline} title={t('profilo.bodyCard')} desc={t('profilo.bodyCardDesc')} />
          )}
        </Section>

        <Section title={t('profilo.sectionData')}>
          <Row to="/impostazioni/backup" icon={IoArchiveOutline} title={t('settings.backup.title')} desc={t('settings.backup.desc')} />
        </Section>

        <section className="mt-6">
          <h2 className="text-xs uppercase tracking-wider text-[color:var(--text-dim)] mb-2 px-1">
            {t('profilo.sectionAccount')}
          </h2>
          {!isConfigured ? (
            <div className="rounded-2xl border border-[color:var(--border-1)] bg-[var(--surface)] p-4 text-sm text-[color:var(--text-muted)]">
              {t('profilo.supabaseOff')}
            </div>
          ) : user ? (
            <button
              onClick={logout}
              className="w-full flex items-center gap-4 rounded-2xl border border-[color:var(--border-1)] bg-[var(--surface)] p-4 text-left hover:bg-[var(--surface-3)] transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-[var(--fill-1)] flex items-center justify-center shrink-0">
                <IoLogOutOutline className="text-xl text-red-400" />
              </div>
              <span className="font-semibold text-sm text-red-400">{t('profilo.signOut')}</span>
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-[color:var(--text-muted)]">{t('auth.loginRequired')}</p>
              <Link
                to="/registrazione"
                className="rounded-full py-3 text-center font-bold"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
              >
                {t('page.registrazione')}
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default Profilo
