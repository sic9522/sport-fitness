import { IoAdd, IoEllipsisVertical, IoBarbell } from 'react-icons/io5'
import TopBar from '../components/TopBar'
import { useLang } from '../context/LanguageContext'

const schedeEsempio = [
  { id: 1, nome: 'Push Day', durata: '70 MIN', esercizi: 8 },
  { id: 2, nome: 'Leg Day', durata: '60 MIN', esercizi: 6 },
]

function Palestra() {
  const { t } = useLang()
  return (
    <div className="flex flex-col pb-24">

      <TopBar icon={IoBarbell} title="MYWORKOUT" />

      {/* Section Header */}
      <div className="px-5 pt-2 pb-6">
        <h2 className="text-3xl font-extrabold leading-tight">
          {t('palestra.title')}
        </h2>
        <p className="text-[color:var(--text-muted)] text-sm mt-2">
          {t('palestra.subtitle')}
        </p>
      </div>

      {/* Action Card — Crea Nuova Scheda */}
      <div className="px-5 mb-5">
        <button className="w-full rounded-xl py-4 flex items-center justify-center gap-2 font-bold tracking-widest uppercase text-sm" style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}>
          <IoAdd className="text-xl" />
          {t('palestra.newCard')}
        </button>
      </div>

      {/* Workout Cards */}
      <div className="px-5 flex flex-col gap-3">
        {schedeEsempio.map((scheda) => (
          <div
            key={scheda.id}
            className="relative rounded-xl overflow-hidden h-32 bg-gradient-to-r from-gray-900 to-gray-800 cursor-pointer"
          >
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative p-4 flex justify-between items-start h-full">
              <div className="flex flex-col justify-end h-full">
                <span className="font-bold text-lg">{scheda.nome}</span>
                <span className="text-[color:var(--text-muted)] text-xs mt-1 uppercase tracking-wider">
                  {scheda.durata} · {t('palestra.exercises', { count: scheda.esercizi })}
                </span>
              </div>
              <button className="text-[color:var(--text-dim)] p-1 hover:text-[color:var(--text)] transition-colors">
                <IoEllipsisVertical />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Progress Widget */}
      <div className="px-5 mt-5">
        <div className="bg-[var(--surface)] rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--accent)' }}>
            {t('palestra.weeklyProgress')}
          </p>
          <div className="h-2 bg-[var(--track)] rounded-full overflow-hidden">
            <div className="h-full rounded-full w-[75%]" style={{ backgroundColor: 'var(--accent)' }} />
          </div>
          <p className="text-[color:var(--text-muted)] text-xs mt-2">
            {t('palestra.completed', { done: 3, total: 4 })}
          </p>
        </div>
      </div>

    </div>
  )
}

export default Palestra
