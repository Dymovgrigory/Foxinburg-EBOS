import { LuStar, LuZap, LuTarget, LuCircleCheck } from 'react-icons/lu'

interface StudentHeroProps {
  name?: string
  completedLessons: number
  totalLessons: number
  pendingHomeworks: number
  upcomingLessons: number
}

export default function StudentHero({
  name,
  completedLessons,
  totalLessons,
  pendingHomeworks,
  upcomingLessons,
}: StudentHeroProps) {
  const xpPerLesson = 50
  const xpPerHomework = 10
  const xp = completedLessons * xpPerLesson + pendingHomeworks * xpPerHomework
  const baseLevelXp = 200
  const level = Math.floor(xp / baseLevelXp) + 1
  const xpIntoLevel = xp % baseLevelXp
  const xpPercent = Math.round((xpIntoLevel / baseLevelXp) * 100)
  const lessonsPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

  return (
    <div
      className="relative overflow-hidden rounded-card p-6 md:p-8 text-white shadow-fox-lg"
      style={{
        background: 'linear-gradient(135deg, #1c0e36 0%, #2d1b4e 60%, #4a3b6b 100%)',
      }}
    >
      {/* Decorative stars */}
      <LuStar className="absolute top-4 right-12 text-fox-gold/20 w-16 h-16 rotate-12" />
      <LuStar className="absolute bottom-4 right-32 text-fox-gold/10 w-10 h-10 -rotate-12" />
      <LuZap className="absolute top-8 right-48 text-fox-gold/10 w-8 h-8" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
        <div className="flex-1 space-y-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              Привет, {name || 'ученик'}! 👋
            </h2>
            <p className="text-white/80 max-w-xl">
              Продолжай своё приключение в мире знаний. У тебя{' '}
              <span className="text-fox-gold font-semibold">{upcomingLessons}</span>{' '}
              ближайших занятий и{' '}
              <span className="text-fox-gold font-semibold">{pendingHomeworks}</span>{' '}
              заданий.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10">
              <LuTarget className="w-4 h-4 text-fox-gold" />
              <span className="text-sm font-medium">{lessonsPercent}% курса пройдено</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10">
              <LuCircleCheck className="w-4 h-4 text-green-400" />
              <span className="text-sm font-medium">{completedLessons} уроков завершено</span>
            </div>
          </div>

          <div className="space-y-1.5 max-w-md">
            <div className="flex justify-between text-sm">
              <span className="text-white/80">Уровень {level}</span>
              <span className="text-fox-gold font-semibold">{xpIntoLevel} / {baseLevelXp} XP</span>
            </div>
            <div className="h-3 bg-white/10 rounded-full overflow-hidden border border-white/10">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${xpPercent}%`, backgroundColor: '#F9E4A6' }}
              />
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 flex justify-center md:justify-end">
          <div
            className="w-28 h-28 md:w-36 md:h-36 rounded-full flex flex-col items-center justify-center border-4 shadow-fox-gold/30 shadow-xl"
            style={{ backgroundColor: '#F9E4A6', borderColor: 'rgba(249, 228, 166, 0.4)', color: '#1c0e36' }}
          >
            <span className="text-xs font-bold uppercase tracking-wider">Уровень</span>
            <span className="text-5xl md:text-6xl font-black leading-none">{level}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
