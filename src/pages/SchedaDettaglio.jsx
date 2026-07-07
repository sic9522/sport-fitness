import { useLang } from '../context/LanguageContext'

function SchedaDettaglio() {
  const { t } = useLang()
  return <h1>{t('page.scheda')}</h1>
}

export default SchedaDettaglio
