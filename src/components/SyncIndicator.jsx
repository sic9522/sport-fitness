import { useSyncExternalStore, useState } from 'react'
import { IoCloudOffline, IoClose } from 'react-icons/io5'
import { subscribeSync, getSyncState } from '../data/syncStatus'
import { useLang } from '../context/LanguageContext'

// Mostra a schermo lo stato della sincronizzazione cloud.
//
// Nasce da un problema concreto: i fallimenti di sync finivano solo in console.error,
// quindi dal telefono erano invisibili e il dato sembrava "sparire" senza spiegazione.
// Qui l'errore e' leggibile e tocca all'utente decidere cosa farne.
//
// Si mostra SOLO in caso di errore. La sincronizzazione riuscita non merita rumore a
// schermo: e' il comportamento atteso, e un indicatore che lampeggia a ogni salvataggio
// distrae senza aggiungere nulla. Il fallimento invece va notato, perche' e' l'unico
// caso in cui il dato non e' dove l'utente crede che sia.
function SyncIndicator() {
  const { t } = useLang()
  const state = useSyncExternalStore(subscribeSync, getSyncState)
  const [openError, setOpenError] = useState(false)

  const { phase, error, scope } = state

  // Tutto cio' che non e' un errore non si mostra: sincronizzazione in corso compresa.
  if (phase !== 'error') return null
  return (
    <>
      <button
        onClick={() => setOpenError(true)}
        className="fixed top-3 left-1/2 -translate-x-1/2 z-[80] flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold backdrop-blur-md border shadow-lg"
        style={{ backgroundColor: 'color-mix(in srgb, #ef4444 22%, var(--navbar))', borderColor: '#ef4444' }}
      >
        <IoCloudOffline className="text-sm" style={{ color: '#ef4444' }} />
        <span>{t('sync.failed')}</span>
      </button>

      {openError && (
        <div className="fixed inset-0 z-[90] bg-black/60 flex items-end justify-center p-4" onClick={() => setOpenError(false)}>
          <div
            className="w-full max-w-sm rounded-2xl bg-[var(--surface)] border border-[color:var(--border-1)] p-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <IoCloudOffline className="text-lg" style={{ color: '#ef4444' }} />
                <h3 className="font-extrabold">{t('sync.failed')}</h3>
              </div>
              <button onClick={() => setOpenError(false)} aria-label={t('sync.close')}>
                <IoClose className="text-xl text-[color:var(--text-muted)]" />
              </button>
            </div>

            <p className="mt-3 text-xs text-[color:var(--text-dim)]">{t('sync.scope')}: <b>{scope}</b></p>
            {/* Messaggio grezzo: e' l'unica cosa che dice davvero cosa e' andato storto. */}
            <pre className="mt-2 whitespace-pre-wrap break-words text-[11px] leading-relaxed rounded-xl bg-[var(--surface-3)] p-3 text-[color:var(--text)]">
              {error}
            </pre>
            <p className="mt-3 text-xs text-[color:var(--text-dim)]">{t('sync.localSafe')}</p>
          </div>
        </div>
      )}
    </>
  )
}

export default SyncIndicator
