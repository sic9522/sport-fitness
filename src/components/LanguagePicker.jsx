import { useState } from 'react'
import { IoCheckmark } from 'react-icons/io5'
import { useLang } from '../context/LanguageContext'

function LanguagePicker() {
  const { lang, setLang, languages } = useLang()
  const [open, setOpen] = useState(false)

  const current = languages.find(l => l.code === lang) ?? languages[0]

  function select(code) {
    setLang(code)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="p-1 text-lg leading-none hover:opacity-80 transition-opacity"
        title={current.label}
      >
        {current.flag}
      </button>

      {open && (
        <>
          {/* Backdrop — chiude al click fuori */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="absolute right-0 top-8 bg-[var(--surface)] border border-[color:var(--border-2)] rounded-xl shadow-xl z-50 overflow-hidden min-w-[150px]">
            {languages.map(l => {
              const active = lang === l.code
              return (
                <button
                  key={l.code}
                  onClick={() => select(l.code)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--surface-3)] transition-colors"
                  style={active ? { color: 'var(--accent)' } : undefined}
                >
                  <span className="text-base shrink-0">{l.flag}</span>
                  <span className="flex-1 text-left">{l.label}</span>
                  {active && <IoCheckmark className="text-base shrink-0" />}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default LanguagePicker
