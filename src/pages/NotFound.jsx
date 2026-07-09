import { useNavigate } from 'react-router-dom'
import { IoAlertCircleOutline } from 'react-icons/io5'
import TopBar from '../components/TopBar'
import { useLang } from '../context/LanguageContext'

function NotFound() {
  const navigate = useNavigate()
  const { t } = useLang()

  return (
    <div className="flex flex-col pb-28">
      <TopBar icon={IoAlertCircleOutline} title={t('notfound.title')} />

      <div className="flex flex-col items-center justify-center text-center px-8 pt-24 gap-4">
        <IoAlertCircleOutline className="text-6xl" style={{ color: 'var(--accent)' }} />
        <h2 className="text-2xl font-extrabold">{t('notfound.heading')}</h2>
        <p className="text-[color:var(--text-muted)] text-sm">{t('notfound.message')}</p>
        <button
          onClick={() => navigate('/')}
          className="mt-2 rounded-xl px-6 py-3 font-bold text-sm uppercase tracking-widest"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
        >
          {t('notfound.back')}
        </button>
      </div>
    </div>
  )
}

export default NotFound
