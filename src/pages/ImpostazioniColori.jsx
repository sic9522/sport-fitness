import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import { useTheme } from '../context/ThemeContext'
import { useLang } from '../context/LanguageContext'
import { themes, defaultTheme, isLightColor } from '../themes'
import { DEFAULT_RINGS } from '../data/ringDefaults'

// ─── Color picker row ─────────────────────────────────────────────────────────
function ColorRow({ label, sublabel, hex, onChange, previewBg, previewText }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        {sublabel && <p className="text-[color:var(--text-dim)] text-xs">{sublabel}</p>}
      </div>
      <label className="relative cursor-pointer flex items-center gap-2">
        <span className="text-xs text-[color:var(--text-muted)] font-mono">{hex}</span>
        <div
          className="w-10 h-10 rounded-full border-2 border-[color:var(--border-3)] flex items-center justify-center text-xs font-bold"
          style={{ backgroundColor: previewBg ?? hex, color: previewText ?? '#fff' }}
        >
          {previewText !== undefined ? 'Aa' : ''}
        </div>
        <input
          type="color"
          value={hex}
          onChange={e => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
      </label>
    </div>
  )
}

// Tab della pagina — stesso schema di Home/Obiettivi
const TABS = [
  { key: 'tema',   labelKey: 'colors.tab.theme'      },
  { key: 'sfondo', labelKey: 'colors.tab.background'  },
  { key: 'anelli', labelKey: 'colors.tab.rings'      },
]

// ─── Pagina colori ────────────────────────────────────────────────────────────
function ImpostazioniColori() {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const { t } = useLang()
  const [activeTab, setActiveTab] = useState('tema')

  // ── Tema personalizzato ───────────────────────────────────────────────────
  const savedCustom = JSON.parse(localStorage.getItem('fitpulse-custom-theme') || 'null')
  const [customAccent, setCustomAccent] = useState(
    theme.id === 'custom' ? theme.accent : (savedCustom?.accent ?? '#CCFF00')
  )
  const [customOnAccent, setCustomOnAccent] = useState(
    theme.id === 'custom' ? theme.onAccent : (savedCustom?.onAccent ?? '#111508')
  )
  const [themeApplied, setThemeApplied] = useState(false)

  function applyCustom() {
    setTheme({ id: 'custom', name: 'Personalizzato', accent: customAccent, onAccent: customOnAccent })
    setThemeApplied(true)
    setTimeout(() => setThemeApplied(false), 2000)
  }

  // ── Colore navbar ─────────────────────────────────────────────────────────
  const [navbarColor, setNavbarColor] = useState(
    () => localStorage.getItem('fitpulse-navbar') || '#111508'
  )
  const [navbarSaved, setNavbarSaved] = useState(false)

  function saveNavbarColor() {
    localStorage.setItem('fitpulse-navbar', navbarColor)
    document.documentElement.style.setProperty('--navbar', navbarColor)
    setNavbarSaved(true)
    setTimeout(() => setNavbarSaved(false), 2000)
  }

  // ── Sfondo body ───────────────────────────────────────────────────────────
  const [bodyBg, setBodyBg] = useState(
    () => localStorage.getItem('fitpulse-body-bg') || '#111508'
  )
  const [bodyBgSaved, setBodyBgSaved] = useState(false)
  const bodyIsLight = isLightColor(bodyBg)   // per l'anteprima live

  function saveBodyBg() {
    localStorage.setItem('fitpulse-body-bg', bodyBg)
    document.documentElement.style.setProperty('--body-bg', bodyBg)
    // Sfondo chiaro → attiva il tema chiaro su tutta l'app
    document.documentElement.dataset.theme = bodyIsLight ? 'light' : 'dark'
    setBodyBgSaved(true)
    setTimeout(() => setBodyBgSaved(false), 2000)
  }

  // ── Colori anelli ─────────────────────────────────────────────────────────
  const [rings, setRings] = useState(() => {
    const saved = localStorage.getItem('fitpulse-ring-config')
    return (saved ? JSON.parse(saved) : DEFAULT_RINGS).slice(0, 3)
  })
  const [ringsSaved, setRingsSaved] = useState(false)

  function updateRingColor(id, color) {
    setRings(prev => prev.map(r => r.id === id ? { ...r, color } : r))
  }

  function saveRingColors() {
    localStorage.setItem('fitpulse-ring-config', JSON.stringify(rings))
    setRingsSaved(true)
    setTimeout(() => setRingsSaved(false), 2000)
  }

  // ── Reset: ripristina tutti i colori originali ──────────────────────────────
  function resetColors() {
    if (!window.confirm(t('colors.resetConfirm'))) return

    // Cancella le preferenze salvate
    localStorage.removeItem('fitpulse-navbar')
    localStorage.removeItem('fitpulse-body-bg')
    localStorage.removeItem('fitpulse-ring-config')
    localStorage.removeItem('fitpulse-custom-theme')

    // Ripristina il tema di default (setTheme aggiorna --accent/--on-accent)
    setTheme(defaultTheme)
    // Ripristina navbar e sfondo (+ tema scuro)
    document.documentElement.style.setProperty('--navbar', '#111508')
    document.documentElement.style.setProperty('--body-bg', '#111508')
    document.documentElement.dataset.theme = 'dark'

    // Allinea lo stato locale della pagina
    setCustomAccent('#CCFF00')
    setCustomOnAccent('#111508')
    setNavbarColor('#111508')
    setBodyBg('#111508')
    setRings(DEFAULT_RINGS.slice(0, 3))
  }

  return (
    <div className="flex flex-col pb-28">
      <TopBar title={t('title.colors')} onBack={() => navigate('/impostazioni')} />

      <div className="px-5 pt-5">
        <h2 className="text-2xl font-extrabold mb-1">{t('settings.colors.title')}</h2>
        <p className="text-[color:var(--text-muted)] text-sm mb-5">{t('colors.subtitle')}</p>

        {/* Tab selector — stesso schema della Home */}
        <div className="grid grid-cols-3 gap-1 bg-[var(--surface)] rounded-xl p-1 mb-4">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="py-2 rounded-lg text-xs font-semibold transition-all duration-200"
              style={
                activeTab === tab.key
                  ? { backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }
                  : { color: 'var(--text-dim)' }
              }
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>

        {/* ══ TAB TEMA ══ */}
        {activeTab === 'tema' && (
        <>
        {/* ── Preset tema ── */}
        <div className="bg-[var(--surface)] rounded-xl p-4 mb-4">
          <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--text-dim)] mb-3">{t('colors.preset')}</p>
          <div className="flex gap-3 flex-wrap">
            {themes.map(preset => (
              <button
                key={preset.id}
                onClick={() => setTheme(preset)}
                className={`w-10 h-10 rounded-full border-2 transition-all hover:scale-110 ${
                  theme.id === preset.id ? 'border-[color:var(--border-solid)] scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: preset.accent }}
                title={preset.name}
              />
            ))}
            {theme.id === 'custom' && (
              <div
                className="w-10 h-10 rounded-full border-2 border-[color:var(--border-solid)] scale-110"
                style={{ backgroundColor: theme.accent }}
                title={t('colors.custom')}
              />
            )}
          </div>
        </div>

        {/* ── Editor personalizzato (senza limiti di contrasto) ── */}
        <div className="bg-[var(--surface)] rounded-xl p-4 mb-4">
          <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--text-dim)] mb-4">
            {t('colors.custom')}
          </p>

          <div className="flex flex-col gap-4">
            <ColorRow
              label={t('colors.mainColor')}
              sublabel={t('colors.mainColor.desc')}
              hex={customAccent}
              onChange={setCustomAccent}
            />
            <ColorRow
              label={t('colors.onAccent')}
              sublabel={t('colors.onAccent.desc')}
              hex={customOnAccent}
              onChange={setCustomOnAccent}
              previewBg={customAccent}
              previewText={customOnAccent}
            />

            {/* Anteprima live */}
            <div
              className="rounded-xl p-4 flex items-center justify-between"
              style={{ backgroundColor: customAccent }}
            >
              <span className="text-sm font-bold" style={{ color: customOnAccent }}>
                {t('colors.preview')}
              </span>
              <span
                className="text-sm font-bold px-3 py-1 rounded-full"
                style={{ backgroundColor: 'rgba(0,0,0,0.2)', color: customOnAccent }}
              >
                FitPulse
              </span>
            </div>

            <button
              onClick={applyCustom}
              className="w-full py-3 rounded-xl font-bold text-sm uppercase tracking-widest"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
            >
              {themeApplied ? t('common.applied') : t('colors.applyCustom')}
            </button>
          </div>
        </div>

        </>
        )}

        {/* ══ TAB SFONDO ══ */}
        {activeTab === 'sfondo' && (
        <>
        {/* ── Colore navbar ── */}
        <div className="bg-[var(--surface)] rounded-xl p-4 mb-4">
          <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--text-dim)] mb-4">
            {t('colors.navbar')}
          </p>

          <ColorRow
            label={t('colors.navbar.bars')}
            sublabel={t('colors.navbar.desc')}
            hex={navbarColor}
            onChange={setNavbarColor}
          />

          {/* Anteprima live — mini navbar con voce attiva in accento (come il Footer) */}
          <div
            className="rounded-xl flex justify-around items-center py-3 px-2 mt-4"
            style={{ backgroundColor: navbarColor }}
          >
            {[
              { l: t('nav.home'), active: true },
              { l: 'AI', active: false },
              { l: t('page.profilo'), active: false },
            ].map(({ l, active }) => (
              <div key={l} className="flex flex-col items-center gap-1">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: active ? 'var(--accent)' : '#6b7280' }}
                />
                <span
                  className="text-[9px] font-medium"
                  style={{ color: active ? 'var(--accent)' : '#6b7280' }}
                >
                  {l}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={saveNavbarColor}
            className="w-full py-3 rounded-xl font-bold text-sm uppercase tracking-widest mt-5"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
          >
            {navbarSaved ? t('common.saved') : t('colors.saveNavbar')}
          </button>
        </div>

        {/* ── Sfondo body ── */}
        <div className="bg-[var(--surface)] rounded-xl p-4 mb-4">
          <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--text-dim)] mb-4">
            {t('colors.appBg')}
          </p>

          <ColorRow
            label={t('colors.bgColor')}
            sublabel={t('colors.bgColor.desc')}
            hex={bodyBg}
            onChange={setBodyBg}
          />

          {/* Anteprima live — testo e card si adattano al colore scelto (chiaro/scuro) */}
          <div
            className="rounded-xl p-4 mt-4"
            style={{
              backgroundColor: bodyBg,
              border: `1px solid ${bodyIsLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.06)'}`,
            }}
          >
            <p
              className="text-lg font-extrabold mb-2"
              style={{ color: bodyIsLight ? '#1a1e0f' : '#ffffff' }}
            >
              {t('colors.previewTitle')}
            </p>
            <div
              className="rounded-lg px-3 py-2"
              style={{ backgroundColor: bodyIsLight ? '#ffffff' : '#1a1e0f' }}
            >
              <span className="text-sm" style={{ color: bodyIsLight ? '#1a1e0f' : '#ffffff' }}>
                {t('colors.previewCard')}
              </span>
            </div>
          </div>

          <button
            onClick={saveBodyBg}
            className="w-full py-3 rounded-xl font-bold text-sm uppercase tracking-widest mt-5"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
          >
            {bodyBgSaved ? t('common.saved') : t('colors.saveBg')}
          </button>
        </div>

        </>
        )}

        {/* ══ TAB ANELLI ══ */}
        {activeTab === 'anelli' && (
        <div className="bg-[var(--surface)] rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--text-dim)] mb-4">
            {t('colors.rings')}
          </p>

          <div className="flex flex-col gap-4">
            {rings.map((ring, i) => (
              <div key={ring.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: ring.color }}
                  />
                  <div>
                    <p className="text-sm font-semibold">{ring.label}</p>
                    <p className="text-[color:var(--text-dim)] text-xs">{t('colors.ring', { n: i + 1 })}</p>
                  </div>
                </div>
                <label className="relative cursor-pointer flex items-center gap-2">
                  <span className="text-xs text-[color:var(--text-muted)] font-mono">{ring.color}</span>
                  <div
                    className="w-10 h-10 rounded-full border-2 border-[color:var(--border-3)]"
                    style={{ backgroundColor: ring.color }}
                  />
                  <input
                    type="color"
                    value={ring.color}
                    onChange={e => updateRingColor(ring.id, e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </label>
              </div>
            ))}
          </div>

          <button
            onClick={saveRingColors}
            className="w-full py-3 rounded-xl font-bold text-sm uppercase tracking-widest mt-5"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
          >
            {ringsSaved ? t('common.saved') : t('colors.saveRings')}
          </button>
        </div>
        )}

        {/* ── Reset colori (fuori dai tab, sempre visibile) ── */}
        <button
          onClick={resetColors}
          className="w-full py-3 rounded-xl font-bold text-sm uppercase tracking-widest mt-6 border border-[color:var(--border-2)] text-[color:var(--text-muted)] hover:border-[color:var(--border-3)] hover:text-[color:var(--text)] transition-colors"
        >
          {t('colors.reset')}
        </button>
      </div>
    </div>
  )
}

export default ImpostazioniColori
