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
  LuTrendingUp,
  LuClock,
  LuArrowRight,
  LuMenu,
  LuX,
  LuChevronDown,
  LuChevronUp,
  LuSparkles,
  LuBrain,
  LuBuilding2,
  LuUserCheck,
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

export default function LandingPage({ showAuth = false }: LandingPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [authOpen, setAuthOpen] = useState(Boolean(showAuth))
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (location.pathname === '/login') {
      setAuthOpen(true)
    }
  }, [location.pathname])

  const scrollToDemo = () => {
    document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })
  }

  const audiences = [
    {
      icon: <LuGraduationCap className="w-6 h-6" />,
      title: 'Ученикам',
      description:
        'Персональный трек обучения, интерактивные уроки, домашние задания, прогресс и игровая мотивация в Student World.',
      points: ['Доступ к курсам 24/7', 'Проверка заданий', 'Сертификаты и достижения'],
      color: 'from-amber-400 to-fox-gold',
    },
    {
      icon: <LuUserCheck className="w-6 h-6" />,
      title: 'Преподавателям',
      description:
        'Ведение занятий, проверка работ, журнал посещаемости, расписание и аналитика прогресса группы.',
      points: ['Умное расписание', 'Быстрая проверка', 'Коммуникация с учениками'],
      color: 'from-emerald-400 to-teal-300',
    },
    {
      icon: <LuBuilding2 className="w-6 h-6" />,
      title: 'Управленцам',
      description:
        'Полный контроль школы: лиды, продажи, финансы, отчёты, филиалы и ролевая модель доступа.',
      points: ['Воронка продаж', 'Финансовая аналитика', 'Управление филиалами'],
      color: 'from-violet-400 to-purple-300',
    },
    {
      icon: <LuUsers className="w-6 h-6" />,
      title: 'Родителям',
      description:
        'Прозрачная картина обучения ребёнка: успеваемость, посещаемость, оплаты и общение с школой.',
      points: ['Успеваемость онлайн', 'История оплат', 'Уведомления'],
      color: 'from-sky-400 to-blue-300',
    },
  ]

  const modules = [
    {
      badge: 'LMS',
      title: 'World Academy',
      subtitle: 'Образовательная платформа нового поколения',
      description:
        'Создавайте курсы любой сложности: видеоуроки, интерактивные тесты, задания с автопроверкой, сертификация и геймификация. Всё, что нужно для современного обучения.',
      features: [
        'Конструктор курсов и модулей',
        'Видео, PDF, тесты и задания',
        'Автоматическая сертификация',
        'Прогресс и аналитика ученика',
      ],
      icon: <LuBookOpen className="w-7 h-7" />,
      image: '/brand/mascot-hero.png',
      reverse: false,
    },
    {
      badge: 'CRM / ERP',
      title: 'Foxinburg Business',
      subtitle: 'Управление школой как бизнесом',
      description:
        'От первой заявки до лояльного клиента. Ведите лиды, контролируйте воронку продаж, управляйте группами, зачислениями и финансами в едином окне.',
      features: [
        'Воронка продаж и лиды',
        'Группы и зачисления',
        'Оплаты и финансовые отчёты',
        'Аналитика конверсии и LTV',
      ],
      icon: <LuChartBarBig className="w-7 h-7" />,
      image: '/brand/wave.png',
      reverse: true,
    },
    {
      badge: 'HRM',
      title: 'Team Management',
      subtitle: 'Команда, расписание и задачи',
      description:
        '9 ролей доступа, управление преподавателями, нагрузкой, зарплатами, кадровым учётом и внутренними задачами. Всё для эффективной работы команды.',
      features: [
        '9 ролей и разграничение прав',
        'Расписание и нагрузка',
        'Кадровый учёт',
        'Задачи и контроль исполнения',
      ],
      icon: <LuUsers className="w-7 h-7" />,
      image: '/brand/swirl-2.png',
      reverse: false,
    },
  ]

  const advantages = [
    {
      icon: <LuZap className="w-6 h-6" />,
      title: 'Всё в одной системе',
      desc: 'Не нужно покупать LMS, CRM, ERP и HRM отдельно. EBOS заменяет сразу четыре продукта.',
    },
    {
      icon: <LuShield className="w-6 h-6" />,
      title: 'Безопасность данных',
      desc: 'JWT-аутентификация, ролевая модель, аудит действий и хранение данных на российских серверах.',
    },
    {
      icon: <LuTrendingUp className="w-6 h-6" />,
      title: 'Рост выручки',
      desc: 'Автоматизация продаж, напоминания об оплатах и аналитика помогают увеличить прибыль школы.',
    },
    {
      icon: <LuClock className="w-6 h-6" />,
      title: 'Экономия времени',
      desc: 'Автоматические уведомления, массовые операции и единая база экономят до 20 часов в неделю.',
    },
    {
      icon: <LuBrain className="w-6 h-6" />,
      title: 'AI-ассистент',
      desc: 'Встроенный помощник для преподавателей и администраторов ускоряет рутинные задачи.',
    },
    {
      icon: <LuSparkles className="w-6 h-6" />,
      title: 'Премиальный UX',
      desc: 'Интерфейс мирового уровня: понятный, быстрый и приятный в ежедневной работе.',
    },
  ]

  const steps = [
    {
      num: '01',
      title: 'Демонстрация',
      desc: 'Покажем платформу на живом примере вашей школы и ответим на вопросы.',
    },
    {
      num: '02',
      title: 'Настройка',
      desc: 'Поможем перенести данные, настроить роли, курсы и интеграции под ваши процессы.',
    },
    {
      num: '03',
      title: 'Запуск',
      desc: 'Обучим команду и запустим систему. Поддержка сопровождает на каждом этапе.',
    },
  ]

  const faq = [
    {
      q: 'Что такое FOXINBURG EBOS?',
      a: 'EBOS (Educational Business Operating System) — единая цифровая экосистема для языковых школ и образовательных центров. Она объединяет LMS, CRM, ERP и HRM в одном продукте.',
    },
    {
      q: 'Подходит ли система небольшой школе?',
      a: 'Да. Платформа масштабируется от одного преподавателя до сети филиалов. Вы платите только за нужный функционал и количество пользователей.',
    },
    {
      q: 'Можно ли перенести данные из другой системы?',
      a: 'Да, мы помогаем мигрировать базу учеников, курсов, расписание и финансовую историю из большинства популярных LMS и CRM.',
    },
    {
      q: 'Где хранятся данные?',
      a: 'Данные размещаются на защищённых серверах в российском облаке. Мы не передаём информацию третьим лицам и соблюдаем требования к персональным данным.',
    },
  ]

  const [openFaq, setOpenFaq] = useState<number | null>(0)

  return (
    <div className="min-h-screen bg-fox-deep text-white overflow-x-hidden font-sans selection:bg-fox-gold/40 selection:text-fox-purple">
      <style>{`
        .bg-fox-deep { background-color: #1c0e36; }
        .text-fox-gold { color: #F9E4A6; }
        .bg-fox-gold { background-color: #F9E4A6; }
        .border-fox-gold { border-color: #F9E4A6; }
        .text-gold-gradient {
          background: linear-gradient(135deg, #F9E4A6 0%, #F5ED75 50%, #FFF8C5 100%);
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
          box-shadow: 0 0 80px rgba(249, 228, 166, 0.18);
        }
        .glow-purple {
          box-shadow: 0 0 100px rgba(90, 60, 130, 0.35);
        }
        .reveal { opacity: 0; transform: translateY(28px); transition: all 0.8s cubic-bezier(0.22, 1, 0.36, 1); }
        .revealed { opacity: 1; transform: translateY(0); }
        .hero-gradient {
          background: radial-gradient(circle at 80% 20%, rgba(249, 228, 166, 0.12) 0%, transparent 35%),
                      radial-gradient(circle at 20% 80%, rgba(90, 60, 130, 0.25) 0%, transparent 40%),
                      linear-gradient(180deg, #1c0e36 0%, #24133d 50%, #1c0e36 100%);
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float { animation: float 5s ease-in-out infinite; }
        @keyframes gentle-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        .animate-gentle-pulse { animation: gentle-pulse 6s ease-in-out infinite; }
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
            {['Системы', 'Возможности', 'Как это работает', 'Демо', 'FAQ'].map((item, i) => {
              const ids = ['systems', 'advantages', 'how-it-works', 'demo', 'faq']
              return (
                <a
                  key={item}
                  href={`#${ids[i]}`}
                  className="hover:text-fox-gold transition duration-200"
                >
                  {item}
                </a>
              )
            })}
          </nav>

          <div className="hidden lg:flex items-center gap-5">
            <button
              onClick={() => setAuthOpen(true)}
              className="text-sm font-medium text-white/80 hover:text-white transition"
            >
              Войти
            </button>
            <button
              onClick={scrollToDemo}
              className="px-5 py-2.5 rounded-button bg-fox-gold text-fox-purple font-semibold text-sm hover:bg-[#FFF8C5] transition"
            >
              Демо
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
            {['Системы', 'Возможности', 'Как это работает', 'Демо', 'FAQ'].map((item, i) => {
              const ids = ['systems', 'advantages', 'how-it-works', 'demo', 'faq']
              return (
                <a
                  key={item}
                  href={`#${ids[i]}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-white/80 hover:text-fox-gold"
                >
                  {item}
                </a>
              )
            })}
            <div className="pt-4 flex flex-col gap-3">
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  setAuthOpen(true)
                }}
                className="w-full py-3 rounded-button border border-white/20 text-white font-medium"
              >
                Войти
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  scrollToDemo()
                }}
                className="w-full py-3 rounded-button bg-fox-gold text-fox-purple font-semibold"
              >
                Записаться на демо
              </button>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* Hero */}
        <section className="relative min-h-screen flex items-center hero-gradient pt-24 pb-20 px-6 overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <img
              src="/brand/swirl-1.png"
              alt=""
              className="absolute -top-20 -right-20 w-[600px] opacity-20 animate-slow-spin"
            />
            <img
              src="/brand/wave.png"
              alt=""
              className="absolute bottom-0 left-0 w-[500px] opacity-15"
            />
            <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] rounded-full bg-fox-purple/20 blur-[120px]" />
            <div className="absolute bottom-1/4 right-1/3 w-[300px] h-[300px] rounded-full bg-fox-gold/10 blur-[100px]" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-fox-gold text-sm mb-8">
                <LuSparkles className="w-4 h-4" />
                <span>World Class EdTech Platform 2026</span>
              </div>

              <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight mb-8">
                <span className="text-white">Единая операционная</span>
                <br />
                <span className="text-gold-gradient">система для школ</span>
              </h1>

              <p className="text-lg md:text-xl text-white/70 leading-relaxed mb-10 max-w-xl">
                FOXINBURG EBOS объединяет обучение, продажи, финансы и управление
                командой. Забудьте о совместимости LMS, CRM и ERP — всё работает здесь.
              </p>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-12">
                <button
                  onClick={scrollToDemo}
                  className="group px-8 py-4 rounded-button bg-fox-gold text-fox-purple font-bold text-lg hover:bg-[#FFF8C5] transition flex items-center gap-2 glow-gold"
                >
                  Записаться на демо
                  <LuArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
                </button>
                <button
                  onClick={() => setAuthOpen(true)}
                  className="px-8 py-4 rounded-button border border-white/20 text-white font-semibold text-lg hover:bg-white/5 transition"
                >
                  Войти в систему
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-6 text-sm text-white/60">
                <div className="flex items-center gap-2">
                  <GoldCheck />
                  <span>Бесплатная демонстрация</span>
                </div>
                <div className="flex items-center gap-2">
                  <GoldCheck />
                  <span>Настройка под вас</span>
                </div>
              </div>
            </div>

            <div className="relative flex justify-center lg:justify-end items-center">
              <div className="relative w-full max-w-[380px] lg:max-w-[420px]">
                <div className="absolute inset-0 bg-gradient-to-tr from-fox-purple/40 to-fox-gold/20 rounded-full blur-3xl scale-90" />
                <img
                  src="/brand/mascot-hero.png"
                  alt="FOXINBURG mascot"
                  className="relative z-10 w-full h-auto max-h-[60vh] object-contain mx-auto drop-shadow-[0_0_50px_rgba(249,228,166,0.12)] animate-float"
                />
                {/* Floating stats cards */}
                <div className="absolute top-4 -left-2 glass-card rounded-2xl px-4 py-3 hidden md:flex items-center gap-3 animate-float" style={{ animationDelay: '1s' }}>
                  <div className="w-9 h-9 rounded-full bg-fox-gold/20 flex items-center justify-center text-fox-gold">
                    <LuBookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-white/60">Курсов</p>
                    <p className="font-bold text-sm">∞</p>
                  </div>
                </div>
                <div className="absolute bottom-24 -right-2 glass-card rounded-2xl px-4 py-3 hidden md:flex items-center gap-3 animate-float" style={{ animationDelay: '2s' }}>
                  <div className="w-9 h-9 rounded-full bg-emerald-400/20 flex items-center justify-center text-emerald-300">
                    <LuTrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-white/60">Рост выручки</p>
                    <p className="font-bold text-sm">+35%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust / Stats */}
        <section className="relative z-10 -mt-10 px-6">
          <div className="max-w-6xl mx-auto glass-card rounded-3xl p-8 md:p-10 grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '3', label: 'системы в одной платформе' },
              { value: '9', label: 'ролей доступа' },
              { value: '∞', label: 'курсов и материалов' },
              { value: '1 API', label: 'для всех интеграций' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-4xl md:text-5xl font-display font-bold text-gold-gradient mb-2">
                  {stat.value}
                </div>
                <p className="text-sm text-white/60">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* For whom */}
        <section className="py-28 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20 reveal" ref={useReveal()}>
              <p className="text-fox-gold text-sm font-semibold tracking-wider uppercase mb-4">
                Для кого
              </p>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-6">
                Платформа для всех участников процесса
              </h2>
              <p className="text-white/60 max-w-2xl mx-auto text-lg">
                Каждая роль получает ровно тот функционал, который нужен для эффективной работы.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {audiences.map((item) => (
                <div
                  key={item.title}
                  className="group glass-card rounded-card p-8 hover:bg-white/[0.07] transition duration-300"
                >
                  <div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center text-fox-purple mb-6`}
                  >
                    {item.icon}
                  </div>
                  <h3 className="font-display text-xl font-bold text-white mb-3">{item.title}</h3>
                  <p className="text-white/60 text-sm leading-relaxed mb-6">{item.description}</p>
                  <ul className="space-y-2">
                    {item.points.map((p) => (
                      <li key={p} className="flex items-center gap-2 text-sm text-white/80">
                        <LuCheck className="w-4 h-4 text-fox-gold shrink-0" /> {p}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Modules */}
        <section id="systems" className="py-28 px-6 bg-gradient-to-b from-fox-deep via-[#1f1133] to-fox-deep">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20 reveal" ref={useReveal()}>
              <p className="text-fox-gold text-sm font-semibold tracking-wider uppercase mb-4">
                Модули
              </p>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-6">
                Три системы — одна платформа
              </h2>
              <p className="text-white/60 max-w-2xl mx-auto text-lg">
                Модули тесно связаны: заявка из CRM становится учеником, оплата формирует группу, а прогресс попадает в аналитику.
              </p>
            </div>

            <div className="space-y-24">
              {modules.map((module) => (
                <div
                  key={module.title}
                  className={`grid lg:grid-cols-2 gap-12 lg:gap-20 items-center reveal`}
                  ref={useReveal()}
                >
                  <div className={module.reverse ? 'lg:order-2' : ''}>
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-tr from-fox-purple/30 to-fox-gold/10 rounded-[2rem] blur-2xl" />
                      <div className="relative glass-card rounded-[2rem] p-8 md:p-12 overflow-hidden">
                        <img
                          src={module.image}
                          alt={module.title}
                          className="w-full h-64 md:h-80 object-contain"
                        />
                      </div>
                    </div>
                  </div>

                  <div className={module.reverse ? 'lg:order-1' : ''}>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-fox-gold/10 text-fox-gold text-xs font-bold uppercase tracking-wider mb-6">
                      {module.icon}
                      {module.badge}
                    </div>
                    <h3 className="font-display text-3xl md:text-4xl font-bold text-white mb-3">
                      {module.title}
                    </h3>
                    <p className="text-fox-gold/80 font-medium mb-6">{module.subtitle}</p>
                    <p className="text-white/70 text-lg leading-relaxed mb-8">{module.description}</p>
                    <ul className="space-y-4">
                      {module.features.map((f) => (
                        <li key={f} className="flex items-start gap-3 text-white/80">
                          <GoldCheck />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Advantages */}
        <section id="advantages" className="py-28 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20 reveal" ref={useReveal()}>
              <p className="text-fox-gold text-sm font-semibold tracking-wider uppercase mb-4">
                Преимущества
              </p>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-6">
                Почему школы выбирают FOXINBURG
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {advantages.map((item) => (
                <div
                  key={item.title}
                  className="glass-card rounded-card p-8 hover:bg-white/[0.07] transition duration-300 reveal"
                  ref={useReveal()}
                >
                  <div className="w-12 h-12 rounded-xl bg-fox-gold/10 text-fox-gold flex items-center justify-center mb-6">
                    {item.icon}
                  </div>
                  <h3 className="font-display text-xl font-bold text-white mb-3">{item.title}</h3>
                  <p className="text-white/60 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="py-28 px-6 bg-gradient-to-b from-fox-deep via-[#1a0d2b] to-fox-deep">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-20 reveal" ref={useReveal()}>
              <p className="text-fox-gold text-sm font-semibold tracking-wider uppercase mb-4">
                Как начать
              </p>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-6">
                От демо до запуска за три шага
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8 relative">
              <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-fox-gold/30 to-transparent" />
              {steps.map((step) => (
                <div
                  key={step.num}
                  className="relative text-center reveal"
                  ref={useReveal()}
                >
                  <div className="w-24 h-24 mx-auto rounded-full glass-card flex items-center justify-center mb-8 glow-purple">
                    <span className="font-display text-3xl font-bold text-gold-gradient">
                      {step.num}
                    </span>
                  </div>
                  <h3 className="font-display text-xl font-bold text-white mb-4">{step.title}</h3>
                  <p className="text-white/60 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Demo form */}
        <section id="demo" className="py-28 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="relative rounded-[2.5rem] overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-fox-purple/40 via-fox-deep to-[#2a1645]" />
              <img
                src="/brand/swirl-2.png"
                alt=""
                className="absolute -top-20 -right-20 w-[400px] opacity-20 animate-slow-spin"
              />
              <div className="relative grid lg:grid-cols-5 gap-12 p-10 md:p-16">
                <div className="lg:col-span-2">
                  <p className="text-fox-gold text-sm font-semibold tracking-wider uppercase mb-4">
                    Демонстрация
                  </p>
                  <h2 className="font-display text-4xl font-bold text-white mb-6">
                    Узнайте, как EBOS изменит вашу школу
                  </h2>
                  <p className="text-white/60 text-lg leading-relaxed mb-8">
                    Заполните форму, и мы покажем платформу на живом примере ваших процессов. Без шаблонных презентаций.
                  </p>
                  <ul className="space-y-4">
                    {[
                      'Персональная демонстрация',
                      'Расчёт стоимости под вас',
                      'Помощь с миграцией данных',
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-3 text-white/80">
                        <GoldCheck /> {item}
                      </li>
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
              <p className="text-fox-gold text-sm font-semibold tracking-wider uppercase mb-4">
                FAQ
              </p>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-6">
                Ответы на вопросы
              </h2>
            </div>

            <div className="space-y-4">
              {faq.map((item, idx) => (
                <div
                  key={idx}
                  className="glass-card rounded-2xl overflow-hidden reveal"
                  ref={useReveal()}
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full flex items-center justify-between p-6 text-left"
                  >
                    <span className="font-display font-semibold text-white pr-4">{item.q}</span>
                    {openFaq === idx ? (
                      <LuChevronUp className="w-5 h-5 text-fox-gold shrink-0" />
                    ) : (
                      <LuChevronDown className="w-5 h-5 text-fox-gold shrink-0" />
                    )}
                  </button>
                  {openFaq === idx && (
                    <div className="px-6 pb-6 text-white/70 leading-relaxed animate-fadeIn">
                      {item.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-28 px-6">
          <div className="max-w-4xl mx-auto text-center reveal" ref={useReveal()}>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-6">
              Готовы сделать школу <span className="text-gold-gradient">эффективнее?</span>
            </h2>
            <p className="text-white/60 text-lg mb-10 max-w-2xl mx-auto">
              Присоединяйтесь к школам, которые уже используют FOXINBURG EBOS для роста и масштабирования.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={scrollToDemo}
                className="px-8 py-4 rounded-button bg-fox-gold text-fox-purple font-bold text-lg hover:bg-[#FFF8C5] transition glow-gold"
              >
                Записаться на демо
              </button>
              <button
                onClick={() => setAuthOpen(true)}
                className="px-8 py-4 rounded-button border border-white/20 text-white font-semibold text-lg hover:bg-white/5 transition"
              >
                Войти в систему
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
              FOXINBURG EBOS — единая операционная система для образовательных организаций. LMS, CRM, ERP и HRM в одной платформе.
            </p>
            <p className="text-fox-gold font-semibold">Образование, которое вдохновляет</p>
          </div>
          <div>
            <h4 className="font-display font-semibold text-white mb-4">Разделы</h4>
            <ul className="space-y-3 text-white/60 text-sm">
              <li><a href="#systems" className="hover:text-fox-gold transition">Системы</a></li>
              <li><a href="#advantages" className="hover:text-fox-gold transition">Возможности</a></li>
              <li><a href="#how-it-works" className="hover:text-fox-gold transition">Как это работает</a></li>
              <li><a href="#demo" className="hover:text-fox-gold transition">Демо</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-display font-semibold text-white mb-4">Контакты</h4>
            <ul className="space-y-3 text-white/60 text-sm">
              <li>ИП Дымова Вероника Александровна</li>
              <li>Дымов Григорий Юрьевич</li>
              <li>
                <a href="https://foxinburg.ru" className="hover:text-fox-gold transition">foxinburg.ru</a>
              </li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/40">
          <p>© {new Date().getFullYear()} FOXINBURG EBOS. Все права защищены.</p>
          <p>Сделано в России. Хостится в Yandex Cloud.</p>
        </div>
      </footer>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  )
}
