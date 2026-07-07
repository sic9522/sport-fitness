import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { IoColorPaletteOutline } from 'react-icons/io5'
import { useTheme } from '../context/ThemeContext'
import { useLang } from '../context/LanguageContext'

const DELAY = 5000

function ThemePicker() {
  const { theme, setTheme, themes } = useTheme()
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const [timerKey, setTimerKey] = useState(0)
  const [timerActive, setTimerActive] = useState(false)
  const closeTimer = useRef(null)
  const navigate = useNavigate()

  function startCloseTimer() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setTimerKey(k => k + 1)   // resetta l'animazione della barra
    setTimerActive(true)
    closeTimer.current = setTimeout(() => {
      setOpen(false)
      setTimerActive(false)
      closeTimer.current = null
    }, DELAY)
  }

  function closeImmediately() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
    setTimerActive(false)
    setOpen(false)
  }

  function toggle() {
    if (open) closeImmediately()
    else setOpen(true)
  }

  function selectTheme(t) {
    setTheme(t)
    startCloseTimer()
  }

  function applyCustom() {
    const saved = JSON.parse(localStorage.getItem('fitpulse-custom-theme') || 'null')
    if (saved) {
      setTheme({ id: 'custom', name: 'Personalizzato', ...saved })
      startCloseTimer()
    } else {
      closeImmediately()
      navigate('/impostazioni/colori')
    }
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        className="p-1 text-[color:var(--text-muted)] hover:text-[color:var(--text)] transition-colors"
      >
        <IoColorPaletteOutline className="text-xl" />
      </button>

      {open && (
        <>
          {/* Backdrop — chiude subito */}
          <div className="fixed inset-0 z-40" onClick={closeImmediately} />

          <div className="absolute right-0 top-8 bg-[var(--surface)] border border-[color:var(--border-2)] rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="p-3 flex items-center gap-2">

              {/* 5 preset */}
              {themes.map(t => (
                <button
                  key={t.id}
                  onClick={() => selectTheme(t)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                    theme.id === t.id ? 'border-[color:var(--border-solid)] scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: t.accent }}
                  title={t.name}
                />
              ))}

              {/* Separatore */}
              <div className="w-px h-4 bg-[var(--fill-2)]" />

              {/* Custom arcobaleno */}
              <button
                onClick={applyCustom}
                className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 overflow-hidden ${
                  theme.id === 'custom' ? 'border-[color:var(--border-solid)] scale-110' : 'border-[color:var(--border-4)]'
                }`}
                style={{
                  background: 'conic-gradient(from 0deg, #ff0000, #ff8800, #ffff00, #00cc00, #0088ff, #8800ff, #ff0000)',
                }}
                title={t('colors.customColor')}
              />
            </div>

            {/* Barra countdown — si svuota in DELAY ms, repart da zero ad ogni nuova scelta */}
            {timerActive && (
              <div className="h-0.5 bg-[var(--fill-1)]">
                <div
                  key={timerKey}
                  style={{
                    height: '100%',
                    backgroundColor: 'var(--accent)',
                    animation: `drainBar ${DELAY}ms linear forwards`,
                  }}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default ThemePicker
