import { Component } from 'react'

// Messaggi nelle 5 lingue dell'app. L'ErrorBoundary e' un class component fuori dai
// provider: non puo' usare useLang(), quindi legge la lingua salvata direttamente da
// localStorage (stessa chiave di LanguageContext), con fallback italiano.
const MESSAGES = {
  it: { title: 'Qualcosa è andato storto', body: 'Si è verificato un errore imprevisto. Prova a ricaricare l’app.', reload: 'Ricarica' },
  en: { title: 'Something went wrong', body: 'An unexpected error occurred. Try reloading the app.', reload: 'Reload' },
  es: { title: 'Algo ha ido mal', body: 'Se ha producido un error inesperado. Prueba a recargar la app.', reload: 'Recargar' },
  fr: { title: 'Une erreur est survenue', body: 'Une erreur inattendue s’est produite. Essaie de recharger l’app.', reload: 'Recharger' },
  zh: { title: '出错了', body: '发生了意外错误。请尝试重新加载应用。', reload: '重新加载' },
}

function currentMessages() {
  let lang = 'it'
  try {
    lang = localStorage.getItem('fitpulse-lang') || 'it'
  } catch {
    // localStorage non disponibile → italiano
  }
  return MESSAGES[lang] || MESSAGES.it
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // In produzione niente overlay Vite: logghiamo almeno in console per il debug.
    console.error('ErrorBoundary ha catturato un errore:', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const m = currentMessages()
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-8 text-center bg-[var(--body-bg)] text-[color:var(--text)]">
        <h1 className="text-xl font-extrabold">{m.title}</h1>
        <p className="text-sm text-[color:var(--text-muted)] max-w-xs">{m.body}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-5 py-2.5 rounded-full font-bold"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
        >
          {m.reload}
        </button>
      </div>
    )
  }
}

export default ErrorBoundary
