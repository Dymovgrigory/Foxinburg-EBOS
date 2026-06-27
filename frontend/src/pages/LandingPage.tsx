import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import AuthModal from '../components/AuthModal'
import DemoForm from '../components/DemoForm'

function LogoBlock({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src="/brand/fox-head.png"
        alt="FOXINBURG"
        className="h-10 w-auto"
      />
      <div className="flex flex-col leading-tight">
        <span className="font-display font-bold tracking-tight text-lg text-white">
          FOXINBURG
        </span>
        <span className="text-[10px] font-medium tracking-wide uppercase text-white/60">
          EBOS
        </span>
      </div>
    </div>
  )
}
import {
  LuCheck,
  LuGraduationCap,
  LuChartBarBig,
  LuUsers,
  LuBookOpen,
  LuShield,
  LuZap,
  LuArrowRight,
  LuMenu,
  LuX,
  LuChevronDown,
  LuChevronUp,
  LuSparkles,
  LuBuilding2,
  LuUserCheck,
  LuStar,
  LuCoins,
  LuFlame,
  LuTrophy,
  LuMap,
  LuGamepad2,
  LuCrown,
  LuHeart,
} from 'react-icons/lu'

interface LandingPageProps {
  showAuth?: boolean
}

function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.classList.add('reveal')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.08, rootMargin: '0px 0px -60px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return ref
}

const GoldCheck = () => (
  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-fox-gold/20 text-fox-gold shrink-0">
    <LuCheck className="w-3 h-3" />
  </span>
)

const WORLDS = [
  { emoji: '🌲', level: 'A1', title: 'Лес Знакомств' },
  { emoji: '🏙️', level: 'A2', title: 'Город Общения' },
  { emoji: '🏰', level: 'B1', title: 'Королевство Уверенности' },
  { emoji: '🎓', level: 'B2', title: 'Академия Мастеров' },
  { emoji: '👑', level: 'C1', title: 'Империя Английского' },
  { emoji: '🏆', level: 'C2', title: 'Лига Экспертов' },
]

export default function LandingPage({ showAuth = false }: LandingPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [authOpen, setAuthOpen] = useState(Boolean(showAuth))
  const [authRegister, setAuthRegister] = useState(false)
  const [authRedirect, setAuthRedirect] = useState('/dashboard')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  useEffect(() => {
    if (location.pathname === '/login') {
      setAuthRegister(false)
      setAuthRedirect('/dashboard')
      setAuthOpen(true)
    }
  }, [location.pathname])

  const openLogin = () => {
    setAuthRegister(false)
    setAuthRedirect('/dashboard')
    setAuthOpen(true)
  }
  const openWorldSignup = () => {
    setAuthRegister(true)
    setAuthRedirect('/world')
    setAuthOpen(true)
  }
  const openAcademySignup = () => {
    setAuthRegister(true)
    setAuthRedirect('/academy')
    setAuthOpen(true)
  }
  const scrollTo = (id: string) => {
    setMobileMenuOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const segments = [
    {
      icon: <LuGamepad2 className="w-6 h-6" />,
      tag: 'Ученикам и родителям',
      title: 'Foxinburg World',
      description:
        'Игровое обучение английскому: 6 миров от A1 до C2, опыт, монеты, достижения и ежедневные серии. Родители видят прогресс ребёнка в личном кабинете.',
      points: ['7 дней бесплатно', 'Затем 500 ₽/мес с автопродлением', 'Родительский контроль'],
      color: 'from-amber-400 to-fox-gold',
      cta: 'Попробовать бесплатно',
      onClick: openWorldSignup,
    },
    {
      icon: <LuBuilding2 className="w-6 h-6" />,
      tag: 'Владельцам школ',
      title: 'EBOS «Всё в одном»',
      description:
        'Полная операционная система школы: LMS, CRM, ERP и HRM в одной платформе. Группы, расписание, финансы, продажи, филиалы и аналитика.',
      points: ['LMS + CRM + ERP + HRM', '9 ролей доступа', 'Российская инфраструктура'],
      color: 'from-violet-400 to-purple-300',
      cta: 'Запросить демо',
      onClick: () => scrollTo('demo'),
    },
    {
      icon: <LuUserCheck className="w-6 h-6" />,
      tag: 'Преподавателям и админам школы',
      title: 'Академия + кабинет',
      description:
        'Сотрудники организации проходят корпоративную Академию педагогов и работают в личном кабинете школы: занятия, проверка работ, расписание.',
      points: ['Академия педагогов', 'Сертификация', 'Рабочий кабинет в школе'],
      color: 'from-emerald-400 to-teal-300',
      cta: 'Войти в кабинет',
      onClick: openLogin,
    },
    {
      icon: <LuGraduationCap className="w-6 h-6" />,
      tag: 'Самостоятельным специалистам',
      title: 'Только Академия',
      description:
        'Преподаватель или администратор без своей школы и хотите развиваться? Получите отдельный доступ к Академии для самостоятельного обучения.',
      points: ['Доступ только к Академии', 'Без управленческих функций', 'Учитесь в своём темпе'],
      color: 'from-sky-400 to-blue-300',
      cta: 'Начать обучение',
      onClick: openAcademySignup,
    },
  ]

  const worldFeatures = [
    { icon: <LuMap className="w-6 h-6" />, title: '6 миров A1→C2', desc: 'Путешествие от «Леса Знакомств» до «Лиги Экспертов» — каждый мир открывает новый уровень английского.' },
    { icon: <LuStar className="w-6 h-6" />, title: 'Опыт и уровни', desc: 'За каждый пройденный урок, тест и домашку ученик получает XP и повышает уровень.' },
    { icon: <LuCoins className="w-6 h-6" />, title: 'Монеты', desc: 'Зарабатывайте монеты за активность и достижения — игровая мотивация учиться каждый день.' },
    { icon: <LuFlame className="w-6 h-6" />, title: 'Ежедневная серия', desc: 'Daily Streak отмечает дни подряд с занятиями и подталкивает не бросать обучение.' },
    { icon: <LuTrophy className="w-6 h-6" />, title: 'Достижения', desc: 'Открывайте награды за первые шаги, серии уроков, пройденные тесты и завершённые миры.' },
    { icon: <LuHeart className="w-6 h-6" />, title: 'Родительский контроль', desc: 'Родители видят прогресс, достижения, посещаемость и оплаты ребёнка в своём кабинете.' },
  ]

  const steps = [
    { num: '01', title: 'Регистрируетесь', desc: 'Создайте аккаунт за минуту и сразу попадёте в Foxinburg World.' },
    { num: '02', title: '7 дней бесплатно', desc: 'Откройте первый мир A1 бесплатно и попробуйте игровое обучение.' },
    { num: '03', title: 'Подписка 500 ₽/мес', desc: 'Оформите подписку — откроются все миры до C2. Автопродление, отмена в любой момент.' },
  ]

  const faq = [
    { q: 'Что такое Foxinburg World?', a: 'Это игровая вселенная для изучения английского: 6 миров от A1 до C2 с уроками, тестами и домашними заданиями. За активность ученик получает опыт, монеты, достижения и поддерживает ежедневную серию занятий.' },
    { q: 'Как работает бесплатный период?', a: 'После регистрации вы получаете 7 дней бесплатного доступа к первому миру A1. Карта банка для триала не требуется — просто начните учиться.' },
    { q: 'Сколько стоит подписка и как её отменить?', a: 'Полный доступ ко всем мирам — 500 ₽ в месяц с автопродлением. Отменить автопродление можно в любой момент в разделе Foxinburg World: доступ сохранится до конца оплаченного периода.' },
    { q: 'Что видят родители?', a: 'В кабинете родителя отображается прогресс ребёнка по мирам, его достижения, уровень и опыт, посещаемость занятий, а также баланс и история оплат.' },
    { q: 'Я преподаватель или владелец школы — это тоже для меня?', a: 'Да. Владельцам школ доступна вся платформа EBOS (LMS, CRM, ERP, HRM). Преподаватели и администраторы школы работают в кабинете и проходят Академию педагогов, а самостоятельные специалисты могут получить доступ только к Академии.' },
  ]

  return (
    <div className="min-h-screen bg-fox-deep text-white overflow-x-hidden font-sans selection:bg-fox-gold/40 selection:text-fox-purple">
      <style>{`
        .bg-fox-deep { background-color: #1c0e36; }
        .text-fox-gold { color: #F5ED75; }
        .bg-fox-gold { background-color: #F5ED75; }
        .border-fox-gold { border-color: #F5ED75; }
        .text-gold-gradient {
          background: linear-gradient(135deg, #F5ED75 0%, #F5ED75 50%, #FFF8C5 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .glass-card {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(20px);
        }
        .glass-header {
          background: rgba(28, 14, 54, 0.75);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(20px);
        }
        .glow-gold {
          box-shadow: 0 0 80px rgba(245, 237, 117, 0.18);
        }
        .glow-purple {
          box-shadow: 0 0 100px rgba(90, 60, 130, 0.35);
        }
        .reveal { opacity: 0; transform: translateY(28px); transition: all 0.8s cubic-bezier(0.22, 1, 0.36, 1); }
        .revealed { opacity: 1; transform: translateY(0); }
        .hero-gradient {
          background: radial-gradient(circle at 80% 20%, rgba(245, 237, 117, 0.12) 0%, transparent 35%),
                      radial-gradient(circle at 20% 80%, rgba(90, 60, 130, 0.25) 0%, transparent 40%),
                      linear-gradient(180deg, #1c0e36 0%, #24133d 50%, #1c0e36 100%);
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float { animation: float 5s ease-in-out infinite; }
        @keyframes slow-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-slow-spin { animation: slow-spin 60s linear infinite; }
      `}</style>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-header">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="hover:opacity-90 transition">
            <LogoBlock />
          </button>

          <nav className="hidden lg:flex items-center gap-8 text-sm text-white/70">
            {[
              { label: 'Foxinburg World', id: 'world' },
              { label: 'Кому подходит', id: 'segments' },
              { label: 'Как начать', id: 'how-it-works' },
              { label: 'Цены', id: 'pricing' },
              { label: 'FAQ', id: 'faq' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className="hover:text-fox-gold transition duration-200"
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-5">
            <button
              onClick={openLogin}
              className="text-sm font-medium text-white/80 hover:text-white transition"
            >
              Войти
            </button>
            <button
              onClick={openWorldSignup}
              className="px-5 py-2.5 rounded-button bg-fox-gold text-fox-purple font-semibold text-sm hover:bg-[#FFF8C5] transition"
            >
              Попробовать бесплатно
            </button>
          </div>

          <button
            className="lg:hidden text-white p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <LuX className="w-6 h-6" /> : <LuMenu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden glass-card border-t border-white/10 px-6 py-6 space-y-4">
            {[
              { label: 'Foxinburg World', id: 'world' },
              { label: 'Кому подходит', id: 'segments' },
              { label: 'Как начать', id: 'how-it-works' },
              { label: 'Цены', id: 'pricing' },
              { label: 'FAQ', id: 'faq' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className="block text-white/80 hover:text-fox-gold"
              >
                {item.label}
              </button>
            ))}
            <div className="pt-4 flex flex-col gap-3">
              <button
                onClick={() => { setMobileMenuOpen(false); openLogin() }}
                className="w-full py-3 rounded-button border border-white/20 text-white font-medium"
              >
                Войти
              </button>
              <button
                onClick={() => { setMobileMenuOpen(false); openWorldSignup() }}
                className="w-full py-3 rounded-button bg-fox-gold text-fox-purple font-semibold"
              >
                Попробовать бесплатно
              </button>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* Hero */}
        <section className="relative min-h-screen flex items-center hero-gradient pt-24 pb-20 px-6 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <img src="/brand/swirl-1.png" alt="" className="absolute -top-20 -right-20 w-[600px] opacity-20 animate-slow-spin" />
            <img src="/brand/wave.png" alt="" className="absolute bottom-0 left-0 w-[500px] opacity-15" />
            <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] rounded-full bg-fox-purple/20 blur-[120px]" />
            <div className="absolute bottom-1/4 right-1/3 w-[300px] h-[300px] rounded-full bg-fox-gold/10 blur-[100px]" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-fox-gold text-sm mb-8">
                <LuGamepad2 className="w-4 h-4" />
                <span>Foxinburg World — игровое обучение английскому</span>
              </div>

              <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight mb-8">
                <span className="text-white">Английский как</span>
                <br />
                <span className="text-gold-gradient">игра и приключение</span>
              </h1>

              <p className="text-lg md:text-xl text-white/70 leading-relaxed mb-10 max-w-xl">
                6 миров от A1 до C2, опыт, монеты, достижения и ежедневные серии.
                Начните бесплатно на 7 дней, дальше — 500 ₽/мес с автопродлением.
              </p>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-12">
                <button
                  onClick={openWorldSignup}
                  className="group px-8 py-4 rounded-button bg-fox-gold text-fox-purple font-bold text-lg hover:bg-[#FFF8C5] transition flex items-center gap-2 glow-gold"
                >
                  Попробовать бесплатно
                  <LuArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
                </button>
                <button
                  onClick={() => scrollTo('pricing')}
                  className="px-8 py-4 rounded-button border border-white/20 text-white font-semibold text-lg hover:bg-white/5 transition"
                >
                  Подписка 500 ₽/мес
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-6 text-sm text-white/60">
                <div className="flex items-center gap-2"><GoldCheck /><span>7 дней бесплатно</span></div>
                <div className="flex items-center gap-2"><GoldCheck /><span>Без карты на старте</span></div>
                <div className="flex items-center gap-2"><GoldCheck /><span>Отмена в любой момент</span></div>
              </div>
            </div>

            <div className="relative flex flex-col items-center justify-center gap-6 lg:gap-8">
              <div className="relative w-full max-w-[300px]">
                <div className="absolute inset-0 bg-gradient-to-t from-fox-gold/10 to-transparent rounded-full blur-2xl" />
                <img
                  src="/brand/mascot-hero.png"
                  alt="FOXINBURG mascot"
                  className="relative z-10 w-full h-auto max-h-[40vh] object-contain mx-auto drop-shadow-[0_0_40px_rgba(245,237,117,0.1)] animate-float"
                />
              </div>
              <div className="grid grid-cols-3 gap-3 w-full max-w-md">
                {WORLDS.map((w) => (
                  <div key={w.level} className="glass-card rounded-2xl p-3 text-center">
                    <div className="text-2xl mb-1">{w.emoji}</div>
                    <div className="text-fox-gold font-bold text-sm">{w.level}</div>
                    <div className="text-white/50 text-[10px] leading-tight mt-0.5">{w.title}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Trust / Stats */}
        <section className="relative z-10 -mt-10 px-6">
          <div className="max-w-6xl mx-auto glass-card rounded-3xl p-8 md:p-10 grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '6', label: 'миров A1→C2' },
              { value: '7 дней', label: 'бесплатно' },
              { value: '500 ₽', label: 'в месяц' },
              { value: '24/7', label: 'доступ онлайн' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-4xl md:text-5xl font-display font-bold text-gold-gradient mb-2">{stat.value}</div>
                <p className="text-sm text-white/60">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Foxinburg World preview */}
        <section id="world" className="py-28 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16 reveal" ref={useReveal()}>
              <p className="text-fox-gold text-sm font-semibold tracking-wider uppercase mb-4">Foxinburg World</p>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-6">Учитесь, играя</h2>
              <p className="text-white/60 max-w-2xl mx-auto text-lg">
                Каждый мир — это уроки, тесты и задания с игровой мотивацией. Проходите уровни, зарабатывайте опыт и открывайте достижения.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {worldFeatures.map((f) => (
                <div key={f.title} className="glass-card rounded-card p-7 hover:bg-white/[0.07] transition duration-300">
                  <div className="w-12 h-12 rounded-xl bg-fox-gold/10 text-fox-gold flex items-center justify-center mb-5">{f.icon}</div>
                  <h3 className="font-display text-xl font-bold text-white mb-2">{f.title}</h3>
                  <p className="text-white/60 leading-relaxed text-sm">{f.desc}</p>
                </div>
              ))}
            </div>

            <div className="text-center">
              <button
                onClick={openWorldSignup}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-button bg-fox-gold text-fox-purple font-bold text-lg hover:bg-[#FFF8C5] transition glow-gold"
              >
                <LuGamepad2 className="w-5 h-5" /> Начать бесплатно
              </button>
            </div>
          </div>
        </section>

        {/* Segments — для кого */}
        <section id="segments" className="py-28 px-6 bg-gradient-to-b from-fox-deep via-[#1f1133] to-fox-deep">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16 reveal" ref={useReveal()}>
              <p className="text-fox-gold text-sm font-semibold tracking-wider uppercase mb-4">Кому подходит</p>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-6">Понятно — что и для кого</h2>
              <p className="text-white/60 max-w-2xl mx-auto text-lg">
                Выберите свой вариант: каждый получает ровно тот доступ, который ему нужен.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {segments.map((s) => (
                <div key={s.title} className="group glass-card rounded-card p-8 flex flex-col hover:bg-white/[0.07] transition duration-300">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center text-fox-purple mb-6`}>{s.icon}</div>
                  <p className="text-fox-gold text-xs font-semibold uppercase tracking-wider mb-2">{s.tag}</p>
                  <h3 className="font-display text-2xl font-bold text-white mb-3">{s.title}</h3>
                  <p className="text-white/60 text-sm leading-relaxed mb-6">{s.description}</p>
                  <ul className="space-y-2 mb-8">
                    {s.points.map((p) => (
                      <li key={p} className="flex items-center gap-2 text-sm text-white/80"><LuCheck className="w-4 h-4 text-fox-gold shrink-0" /> {p}</li>
                    ))}
                  </ul>
                  <button
                    onClick={s.onClick}
                    className="mt-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-button bg-white/10 text-white font-semibold hover:bg-fox-gold hover:text-fox-purple transition"
                  >
                    {s.cta} <LuArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="py-28 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-20 reveal" ref={useReveal()}>
              <p className="text-fox-gold text-sm font-semibold tracking-wider uppercase mb-4">Как начать</p>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-6">Три простых шага</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8 relative">
              <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-fox-gold/30 to-transparent" />
              {steps.map((step) => (
                <div key={step.num} className="relative text-center">
                  <div className="w-24 h-24 mx-auto rounded-full glass-card flex items-center justify-center mb-8 glow-purple">
                    <span className="font-display text-3xl font-bold text-gold-gradient">{step.num}</span>
                  </div>
                  <h3 className="font-display text-xl font-bold text-white mb-4">{step.title}</h3>
                  <p className="text-white/60 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-28 px-6 bg-gradient-to-b from-fox-deep via-[#1a0d2b] to-fox-deep">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16 reveal" ref={useReveal()}>
              <p className="text-fox-gold text-sm font-semibold tracking-wider uppercase mb-4">Цены</p>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-6">Простая и честная подписка</h2>
              <p className="text-white/60 max-w-2xl mx-auto text-lg">Попробуйте бесплатно, продолжайте за 500 ₽/мес. Отмена в любой момент.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Free trial */}
              <div className="glass-card rounded-card p-8 flex flex-col reveal" ref={useReveal()}>
                <h3 className="font-display text-2xl font-bold text-white mb-2">Бесплатный старт</h3>
                <div className="flex items-end gap-2 mb-6">
                  <span className="text-5xl font-display font-bold text-gold-gradient">0 ₽</span>
                  <span className="text-white/50 mb-2">/ 7 дней</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {['Доступ к миру A1 «Лес Знакомств»', 'Опыт, монеты и достижения', 'Без привязки карты'].map((p) => (
                    <li key={p} className="flex items-center gap-3 text-white/80"><GoldCheck /> {p}</li>
                  ))}
                </ul>
                <button onClick={openWorldSignup} className="px-6 py-3.5 rounded-button border border-white/20 text-white font-semibold hover:bg-white/5 transition">
                  Начать бесплатно
                </button>
              </div>

              {/* Paid */}
              <div className="relative rounded-card p-8 flex flex-col border-2 border-fox-gold glow-gold bg-white/[0.04] reveal" ref={useReveal()}>
                <div className="absolute -top-3 right-6 px-3 py-1 rounded-full bg-fox-gold text-fox-purple text-xs font-bold">Полный доступ</div>
                <h3 className="font-display text-2xl font-bold text-white mb-2 flex items-center gap-2"><LuCrown className="w-6 h-6 text-fox-gold" /> Подписка</h3>
                <div className="flex items-end gap-2 mb-6">
                  <span className="text-5xl font-display font-bold text-gold-gradient">500 ₽</span>
                  <span className="text-white/50 mb-2">/ месяц</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {['Все 6 миров от A1 до C2', 'Полная геймификация и лидерборды', 'Автопродление, отмена в любой момент', 'Родительский кабинет'].map((p) => (
                    <li key={p} className="flex items-center gap-3 text-white/80"><GoldCheck /> {p}</li>
                  ))}
                </ul>
                <button onClick={openWorldSignup} className="px-6 py-3.5 rounded-button bg-fox-gold text-fox-purple font-bold hover:bg-[#FFF8C5] transition">
                  Оформить подписку
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* EBOS for school owners */}
        <section id="ebos" className="py-28 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16 reveal" ref={useReveal()}>
              <p className="text-fox-gold text-sm font-semibold tracking-wider uppercase mb-4">Владельцам школ</p>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-6">EBOS — всё для управления школой</h2>
              <p className="text-white/60 max-w-2xl mx-auto text-lg">
                LMS, CRM, ERP и HRM в одной российской платформе. Заявка из CRM становится учеником, оплата формирует группу, прогресс попадает в аналитику.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: <LuBookOpen className="w-6 h-6" />, title: 'LMS', desc: 'Курсы, модули, уроки, тесты, сертификация и геймификация.' },
                { icon: <LuChartBarBig className="w-6 h-6" />, title: 'CRM / ERP', desc: 'Лиды, воронка продаж, группы, зачисления, оплаты и финансы.' },
                { icon: <LuUsers className="w-6 h-6" />, title: 'HRM', desc: '9 ролей доступа, расписание, нагрузка, кадры и задачи.' },
                { icon: <LuShield className="w-6 h-6" />, title: 'Безопасность', desc: 'JWT, ролевая модель, аудит и данные на российских серверах.' },
              ].map((m) => (
                <div key={m.title} className="glass-card rounded-card p-7 hover:bg-white/[0.07] transition">
                  <div className="w-12 h-12 rounded-xl bg-fox-gold/10 text-fox-gold flex items-center justify-center mb-5">{m.icon}</div>
                  <h3 className="font-display text-lg font-bold text-white mb-2">{m.title}</h3>
                  <p className="text-white/60 text-sm leading-relaxed">{m.desc}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-sm text-white/60">
              <div className="flex items-center gap-2"><LuZap className="w-4 h-4 text-fox-gold" /> Замена 4 систем</div>
              <div className="flex items-center gap-2"><LuShield className="w-4 h-4 text-fox-gold" /> Российская инфраструктура</div>
              <div className="flex items-center gap-2"><LuSparkles className="w-4 h-4 text-fox-gold" /> AI-ассистент</div>
            </div>
          </div>
        </section>

        {/* Demo form (school owners) */}
        <section id="demo" className="py-28 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="relative rounded-[2.5rem] overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-fox-purple/40 via-fox-deep to-[#2a1645]" />
              <img src="/brand/swirl-2.png" alt="" className="absolute -top-20 -right-20 w-[400px] opacity-20 animate-slow-spin" />
              <div className="relative grid lg:grid-cols-5 gap-12 p-10 md:p-16">
                <div className="lg:col-span-2">
                  <p className="text-fox-gold text-sm font-semibold tracking-wider uppercase mb-4">Школам и партнёрам</p>
                  <h2 className="font-display text-4xl font-bold text-white mb-6">Запустите свою школу на EBOS</h2>
                  <p className="text-white/60 text-lg leading-relaxed mb-8">
                    Вы владелец школы и хотите управлять обучением, продажами и командой в одной системе? Оставьте заявку — покажем, как это работает.
                  </p>
                  <ul className="space-y-4">
                    {['Персональная демонстрация', 'Расчёт стоимости под вас', 'Помощь с миграцией данных'].map((item) => (
                      <li key={item} className="flex items-center gap-3 text-white/80"><GoldCheck /> {item}</li>
                    ))}
                  </ul>
                </div>
                <div className="lg:col-span-3">
                  <div className="glass-card rounded-3xl p-8 md:p-10">
                    <DemoForm variant="dark" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-28 px-6 bg-gradient-to-b from-fox-deep via-[#1a0d2b] to-fox-deep">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-16 reveal" ref={useReveal()}>
              <p className="text-fox-gold text-sm font-semibold tracking-wider uppercase mb-4">FAQ</p>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-6">Ответы на вопросы</h2>
            </div>

            <div className="space-y-4">
              {faq.map((item, idx) => (
                <div key={idx} className="glass-card rounded-2xl overflow-hidden">
                  <button onClick={() => setOpenFaq(openFaq === idx ? null : idx)} className="w-full flex items-center justify-between p-6 text-left">
                    <span className="font-display font-semibold text-white pr-4">{item.q}</span>
                    {openFaq === idx ? <LuChevronUp className="w-5 h-5 text-fox-gold shrink-0" /> : <LuChevronDown className="w-5 h-5 text-fox-gold shrink-0" />}
                  </button>
                  {openFaq === idx && <div className="px-6 pb-6 text-white/70 leading-relaxed animate-fadeIn">{item.a}</div>}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-28 px-6">
          <div className="max-w-4xl mx-auto text-center reveal" ref={useReveal()}>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-6">
              Готовы <span className="text-gold-gradient">начать приключение?</span>
            </h2>
            <p className="text-white/60 text-lg mb-10 max-w-2xl mx-auto">
              Зарегистрируйтесь и откройте Foxinburg World бесплатно на 7 дней.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={openWorldSignup} className="px-8 py-4 rounded-button bg-fox-gold text-fox-purple font-bold text-lg hover:bg-[#FFF8C5] transition glow-gold">
                Попробовать бесплатно
              </button>
              <button onClick={openLogin} className="px-8 py-4 rounded-button border border-white/20 text-white font-semibold text-lg hover:bg-white/5 transition">
                Войти
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#140a26] px-6 py-16">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12">
          <div className="md:col-span-2">
            <LogoBlock className="mb-6" />
            <p className="text-white/50 max-w-sm leading-relaxed mb-6">
              FOXINBURG — игровое обучение английскому (Foxinburg World) и единая операционная система для школ (EBOS): LMS, CRM, ERP и HRM.
            </p>
            <p className="text-fox-gold font-semibold">Образование, которое вдохновляет</p>
          </div>
          <div>
            <h4 className="font-display font-semibold text-white mb-4">Разделы</h4>
            <ul className="space-y-3 text-white/60 text-sm">
              <li><button onClick={() => scrollTo('world')} className="hover:text-fox-gold transition">Foxinburg World</button></li>
              <li><button onClick={() => scrollTo('segments')} className="hover:text-fox-gold transition">Кому подходит</button></li>
              <li><button onClick={() => scrollTo('pricing')} className="hover:text-fox-gold transition">Цены</button></li>
              <li><button onClick={() => scrollTo('demo')} className="hover:text-fox-gold transition">Школам</button></li>
            </ul>
          </div>
          <div>
            <h4 className="font-display font-semibold text-white mb-4">Контакты</h4>
            <ul className="space-y-3 text-white/60 text-sm">
              <li>ИП Дымова Вероника Александровна</li>
              <li>Дымов Григорий Юрьевич</li>
              <li><a href="https://foxinburg.ru" className="hover:text-fox-gold transition">foxinburg.ru</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/40">
          <p>© {new Date().getFullYear()} FOXINBURG EBOS. Все права защищены.</p>
          <p>Сделано в России. Хостится в Yandex Cloud.</p>
        </div>
      </footer>

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        redirectTo={authRedirect}
        defaultRegister={authRegister}
      />
    </div>
  )
}
