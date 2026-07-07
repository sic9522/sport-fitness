import { useLang } from '../context/LanguageContext'

function Login() {
  const { t } = useLang()
  return <h1>{t('page.login')}</h1>
}

export default Login
