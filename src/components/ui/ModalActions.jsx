import { IoSaveOutline, IoRefreshOutline, IoCheckmarkCircle } from 'react-icons/io5'
import { useLang } from '../../context/LanguageContext'
import ConfirmModal from '../ConfirmModal'

// Riga di comandi delle modali (Ricomincia / Annulla / Salva) più le conferme,
// pilotate da `useModalGuard`. Sta qui e non in ogni modale perché le regole
// devono essere identiche ovunque: vedi il commento del hook.
//
// `compact` = bottoni piccoli allineati a destra (modali di creazione);
// senza, occupano la riga a metà per uno (modale "Aggiungi un pasto").
function ModalActions({ guard, canSave = true, compact = false, showReset = false }) {
  const { t } = useLang()

  const smallBtn = 'flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-colors'
  const wideBtn = 'flex-1 flex items-center justify-center gap-2 rounded-full py-3 font-semibold transition-opacity'
  const outline = 'border border-[color:var(--border-2)] text-[color:var(--text)] hover:bg-[var(--surface-3)]'

  return (
    <>
      <div className={compact ? 'flex items-center justify-end gap-2 mt-5' : 'flex gap-2 mt-6'}>
        {showReset && (
          <button onClick={guard.requestReset} className={`${compact ? smallBtn : wideBtn} ${outline}`}>
            <IoRefreshOutline className={compact ? 'text-base' : 'text-lg'} />
            {t('products.restart')}
          </button>
        )}

        <button onClick={guard.requestClose} className={`${compact ? smallBtn : wideBtn} ${outline}`}>
          {t('common.cancel')}
        </button>

        {/* Disabilitato quando non c'è nulla da salvare: un "Salva" che non
            salverebbe niente è solo un modo per far dubitare di aver sbagliato. */}
        <button
          onClick={guard.requestSave}
          disabled={!canSave}
          className={`${compact ? smallBtn : wideBtn} disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90`}
          style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
        >
          <IoSaveOutline className={compact ? 'text-base' : 'text-lg'} />
          {t('common.save')}
        </button>
      </div>

      {guard.ask && (
        <ConfirmModal
          title={guard.ask === 'reset' ? t('common.confirmReset') : t('common.confirmExit')}
          message={guard.ask === 'reset' ? t('common.confirmResetBody') : t('common.confirmExitBody')}
          confirmLabel={t('common.yes')}
          cancelLabel={t('common.no')}
          danger
          onConfirm={guard.confirm}
          onCancel={guard.dismiss}
        />
      )}

      {/* Conferma del salvataggio: si vede mezzo secondo, poi la modale chiude.
          Nessun tasto da premere — il salvataggio è già deciso. */}
      {guard.saved && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="flex items-center gap-2 rounded-2xl bg-[var(--surface)] border border-[color:var(--border-2)] px-5 py-4">
            <IoCheckmarkCircle className="text-xl" style={{ color: 'var(--accent)' }} />
            <span className="text-sm font-semibold">{t('common.savedConfirmed')}</span>
          </div>
        </div>
      )}
    </>
  )
}

export default ModalActions
