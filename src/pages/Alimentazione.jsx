import { useLang } from '../context/LanguageContext'

function Alimentazione() {
  const { t } = useLang()
  return <h1>{t('nav.alimentazione')}</h1>
}

export default Alimentazione
