import { useLang } from '../context/LanguageContext'

function Registrazione() {
  const { t } = useLang()
  return <h1>{t('page.registrazione')}</h1>
}

export default Registrazione
