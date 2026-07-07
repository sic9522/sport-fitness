import { useLang } from '../context/LanguageContext'

function Profilo() {
  const { t } = useLang()
  return <h1>{t('page.profilo')}</h1>
}

export default Profilo
