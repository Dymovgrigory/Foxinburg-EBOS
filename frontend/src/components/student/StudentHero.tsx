import { LuTarget, LuCircleCheck } from 'react-icons/lu'

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
    <div className="relative overflow-hidden rounded-card p-6 md:p-8 border border-fox-border/60 bg-white shadow-fox-lg">
      <div
        className="absolute top-0 right-0 w-64 h-64 pointer-events-none opacity-30"
        style={{
          background: 'radial-gradient(circle at 80% 20%, rgba(245, 237, 117, 0.35) 0%, transparent 50%)',
        }}
      />
      <img
        src="/brand/mascot-hero.png"
        alt=""
        className="absolute -right-4 -bottom-8 w-40 h-56 object-contain opacity-20 pointer-events-none select-none"
      />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
        <div className="flex-1 space-y-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-fox-purple mb-2">
              Привет, {name || 'ученик'}!
            </h2>
            <p className="text-fox-gray max-w-xl">
              У тебя{' '}
              <span className="text-fox-purple font-semibold">{upcomingLessons}</span>{' '}
              ближайших занятий и{' '}
              <span className="text-fox-purple font-semibold">{pendingHomeworks}</span>{' '}
              заданий.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-fox-gold/20 text-fox-purple border border-fox-gold/40">
              <LuTarget className="w-4 h-4" />
              <span className="text-sm font-medium">{lessonsPercent}% курса пройдено</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-fox-purple/10 text-fox-purple border border-fox-purple/20">
              <LuCircleCheck className="w-4 h-4" />
              <span className="text-sm font-medium">{completedLessons} уроков завершено</span>
            </div>
          </div>

          <div className="space-y-1.5 max-w-md">
            <div className="flex justify-between text-sm">
              <span className="text-fox-gray">Уровень {level}</span>
              <span className="text-fox-purple font-semibold">{xpIntoLevel} / {baseLevelXp} XP</span>
            </div>
            <div className="h-3 bg-fox-border/60 rounded-full overflow-hidden border border-fox-border/40">
              <div
                className="h-full rounded-full transition-all duration-500 bg-fox-gold"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 flex justify-center md:justify-end">
          <div className="w-28 h-28 md:w-36 md:h-36 rounded-full flex flex-col items-center justify-center border-4 shadow-fox-gold/30 shadow-xl bg-fox-gold border-fox-gold/60 text-fox-purple">
            <span className="text-xs font-bold uppercase tracking-wider">Уровень</span>
            <span className="text-5xl md:text-6xl font-black leading-none">{level}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
