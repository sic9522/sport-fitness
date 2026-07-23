import { IoTrashOutline, IoCheckboxOutline } from 'react-icons/io5'
import { useLang } from '../context/LanguageContext'
import { SORT_FIELDS } from '../data/foodSort'
import { SELECT_CLS } from './FoodEditor'

// Riga di comandi degli elenchi di Prodotti: ordinamento (criterio + verso) e
// selezione multipla. Sta tra la ricerca e l'elenco, in tutte e due le liste.
//
// La modalità selezione compare solo quando serve: finché non si preme
// "Seleziona" non ci sono caselle né cestino, così l'elenco si legge e basta.
function FoodFilterBar({
  sortKey, onSortKey, ascending, onAscending,
  selecting, onToggleSelecting,
  allSelected, onToggleAll, selectedCount, onDelete,
  hiddenCount = 0, onRestoreHidden,
}) {
  const { t } = useLang()

  const compactSelect = `${SELECT_CLS} py-2 text-xs`

  return (
    <div className="mb-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <select value={sortKey} onChange={e => onSortKey(e.target.value)} className={`${compactSelect} flex-1 min-w-0`}>
          {SORT_FIELDS.map(f => (
            <option key={f.key} value={f.key}>{t(f.labelKey)}</option>
          ))}
        </select>

        <select
          value={ascending ? 'asc' : 'desc'}
          onChange={e => onAscending(e.target.value === 'asc')}
          className={`${compactSelect} flex-1 min-w-0`}
        >
          <option value="asc">{t('products.ascending')}</option>
          <option value="desc">{t('products.descending')}</option>
        </select>

        <button
          type="button"
          onClick={onToggleSelecting}
          className="shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold border transition-colors"
          style={selecting
            ? { backgroundColor: 'var(--accent)', color: 'var(--on-accent)', borderColor: 'var(--accent)' }
            : { borderColor: 'var(--border-2)', color: 'var(--text)' }}
        >
          <IoCheckboxOutline className="text-base" />
          {t('products.select')}
        </button>
      </div>

      {selecting && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleAll}
            className="flex-1 rounded-xl px-3 py-2 text-xs font-semibold border border-[color:var(--border-2)] text-[color:var(--text)] hover:bg-[var(--surface-3)] transition-colors"
          >
            {allSelected ? t('products.deselectAll') : t('products.selectAll')}
          </button>

          <span className="text-xs tabular-nums text-[color:var(--text-dim)]">{selectedCount}</span>

          {/* Il cestino è acceso solo se c'è davvero qualcosa da buttare. */}
          <button
            type="button"
            onClick={onDelete}
            disabled={selectedCount === 0}
            aria-label={t('products.deleteSelected')}
            className="shrink-0 p-2 rounded-xl text-white disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#ef4444' }}
          >
            <IoTrashOutline className="text-base" />
          </button>
        </div>
      )}

      {/* Senza una via di ritorno, nascondere un prodotto per sbaglio sarebbe
          definitivo: la riga compare solo quando c'è davvero qualcosa da ripristinare. */}
      {hiddenCount > 0 && (
        <div className="flex items-center justify-between gap-2 text-xs text-[color:var(--text-dim)]">
          <span>{t('products.hiddenCount', { n: hiddenCount })}</span>
          <button
            type="button"
            onClick={onRestoreHidden}
            className="font-semibold"
            style={{ color: 'var(--accent)' }}
          >
            {t('products.restoreHidden')}
          </button>
        </div>
      )}
    </div>
  )
}

export default FoodFilterBar
