import { useLang } from '../context/LanguageContext'

function AiChat() {
  const { t } = useLang()
  return <h1>{t('nav.aichat')}</h1>
}

export default AiChat
