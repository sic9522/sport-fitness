import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IoDownloadOutline, IoCloudUploadOutline } from 'react-icons/io5'
import TopBar from '../components/TopBar'
import ConfirmModal from '../components/ConfirmModal'
import { useLang } from '../context/LanguageContext'
import { buildBackup, applyBackup, isValidBackup } from '../utils/backup'

function ImpostazioniBackup() {
  const navigate = useNavigate()
  const { t } = useLang()
  const fileRef = useRef(null)
  const [pending, setPending] = useState(null) // backup letto, in attesa di conferma import
  const [error, setError] = useState('')
  const [exported, setExported] = useState(false)

  function handleExport() {
    const backup = buildBackup(localStorage, new Date().toISOString())
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const d = new Date()
    const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    a.download = `fitpulse-backup-${stamp}.json`
    a.click()
    URL.revokeObjectURL(url)
    setExported(true)
    setTimeout(() => setExported(false), 2500)
  }

  async function handleFile(e) {
    setError('')
    const file = e.target.files?.[0]
    e.target.value = '' // consente di riselezionare lo stesso file
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text())
      if (!isValidBackup(parsed)) throw new Error('invalid')
      setPending(parsed)
    } catch {
      setError(t('backup.invalid'))
    }
  }

  function confirmImport() {
    try {
      applyBackup(pending, localStorage)
      setPending(null)
      window.location.reload() // ri-legge tutto lo stato dai dati ripristinati
    } catch {
      setPending(null)
      setError(t('backup.invalid'))
    }
  }

  return (
    <div className="flex flex-col pb-28">
      <TopBar title={t('title.backup')} onBack={() => navigate('/impostazioni')} />

      <div className="px-5 pt-5">
        <h2 className="text-2xl font-extrabold mb-1">{t('settings.backup.title')}</h2>
        <p className="text-[color:var(--text-muted)] text-sm mb-6">{t('backup.subtitle')}</p>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleExport}
            className="bg-[var(--surface)] rounded-xl p-4 flex items-center gap-4 w-full text-left hover:bg-[var(--surface-3)] transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-[var(--fill-1)] flex items-center justify-center shrink-0">
              <IoDownloadOutline className="text-xl" style={{ color: 'var(--accent)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{exported ? t('backup.exported') : t('backup.export')}</p>
              <p className="text-[color:var(--text-dim)] text-xs mt-0.5">{t('backup.exportHint')}</p>
            </div>
          </button>

          <button
            onClick={() => fileRef.current?.click()}
            className="bg-[var(--surface)] rounded-xl p-4 flex items-center gap-4 w-full text-left hover:bg-[var(--surface-3)] transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-[var(--fill-1)] flex items-center justify-center shrink-0">
              <IoCloudUploadOutline className="text-xl" style={{ color: 'var(--accent)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{t('backup.import')}</p>
              <p className="text-[color:var(--text-dim)] text-xs mt-0.5">{t('backup.importHint')}</p>
            </div>
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={handleFile} className="hidden" />

          {error && <p className="text-red-400 text-sm px-1">{error}</p>}
        </div>
      </div>

      {pending && (
        <ConfirmModal
          title={t('backup.confirmTitle')}
          message={t('backup.confirmMsg')}
          confirmLabel={t('common.yes')}
          cancelLabel={t('common.no')}
          danger
          onConfirm={confirmImport}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  )
}

export default ImpostazioniBackup
