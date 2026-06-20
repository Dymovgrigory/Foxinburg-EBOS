import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import AuthModal from '../components/AuthModal'
import DemoForm from '../components/DemoForm'

interface LandingPageProps {
  showAuth?: boolean
}

const CheckIcon = () => (
  <svg className="w-5 h-5 text-[#F5ED75] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
)

const SystemIcon = ({ children }: { children: React.ReactNode }) => (
  <div className="w-12 h-12 rounded-xl bg-[#F5ED75]/10 flex items-center justify-center text-[#F5ED75] mb-6">
    {children}
  </div>
)

function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return ref
}

export default function LandingPage({ showAuth = false }: LandingPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [authOpen, setAuthOpen] = useState(Boolean(showAuth))

  useEffect(() => {
    if (location.pathname === '/login') {
      setAuthOpen(true)
    }
  }, [location.pathname])

  const systems = [
    {
      title: 'World Academy',
      description:
        'LMS нового поколения: курсы, модули, видеоуроки, тесты, домашние задания и прогресс каждого ученика.',
      features: ['Курсы и модули', 'Видео и материалы', 'Тесты и сертификация', 'Прогресс ученика'],
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M12 14l9-5-9-5-9 5 9 5z" />
          <path d="M12 14l6.16-3.422A12.083 12.083 0 0112 21.5a12.083 12.083 0 01-6.16-10.922L12 14z" />
        </svg>
      ),
    },
    {
      title: 'CRM / ERP',
      description:
        'Полный цикл продаж и финансов: лиды, сделки, оплаты, группы, зачисления и аналитика в реальном времени.',
      features: ['Воронка продаж', 'Финансы и отчёты', 'Группы и зачисления', 'Аналитика и прогнозы'],
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      title: 'HRM',
      description:
        'Управление командой: 9 ролей доступа, расписание, нагрузка преподавателей, кадровый учёт и задачи.',
      features: ['9 ролей доступа', 'Расписание и нагрузка', 'Кадровый учёт', 'Задачи и контроль'],
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
  ]

  const features = [
    { title: 'Ролевая модель', desc: '9 ролей от гостя до владельца. Каждый видит только своё.' },
    { title: 'API-first', desc: 'Единый REST API /api/v3 для интеграций и мобильных приложений.' },
    { title: 'Безопасность', desc: 'JWT-аутентификация, разграничение прав, аудит действий.' },
    { title: 'Аналитика', desc: 'Финансы, конверсия, успеваемость — в реальном времени.' },
    { title: 'Автоматизация', desc: 'Уведомления, смены статусов, напоминания о занятиях.' },
    { title: 'Масштабирование', desc: 'Филиалы, группы, неограниченные курсы и пользователи.' },
  ]

  const roles = [
    'Владелец',
    'Суперадмин',
    'Администратор',
    'Методист',
    'Преподаватель',
    'Менеджер',
    'Ученик',
    'Родитель',
    'Гость',
  ]

  const scrollToDemo = () => {
    document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-[#0a0612] text-white overflow-x-hidden">
      <style>{`
        .reveal { opacity: 0; transform: translateY(24px); transition: all 0.7s cubic-bezier(0.22, 1, 0.36, 1); }
        .revealed { opacity: 1; transform: translateY(0); }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .animate-scaleIn { animation: scaleIn 0.2s ease-out; }
      `}</style>

      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0612]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-3 hover:opacity-90 transition"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#F5ED75] to-[#3A2953] flex items-center justify-center text-lg font-bold text-[#1a1229]">
              F
            </div>
            <span className="font-bold text-xl tracking-tight">
              FOXINBURG <span className="text-[#F5ED75]">EBOS</span>
            </span>
          </button>
          <nav className="hidden md:flex items-center gap-8 text-sm text-gray-300">
            <a href="#systems" className="hover:text-white transition">Системы</a>
            <a href="#features" className="hover:text-white transition">Возможности</a>
            <a href="#demo" className="hover:text-white transition">Демо</a>
            <a href="#contacts" className="hover:text-white transition">Контакты</a>
          </nav>
          <button
            onClick={() => setAuthOpen(true)}
            className="px-5 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition text-sm font-medium"
          >
            Войти
          </button>
        </div>
      </header>

      <main>
        <section className="relative min-h-screen flex items-center justify-center px-6 pt-20">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#3A2953]/30 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#F5ED75]/10 rounded-full blur-3xl" />
          </div>
          <div className="relative z-10 max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F5ED75]/10 border border-[#F5ED75]/20 text-[#F5ED75] text-sm mb-8">
              <span className="w-2 h-2 rounded-full bg-[#F5ED75] animate-pulse" />
              EBOS — единая операционная система для школ
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight tracking-tight">
              Три системы в одной <span className="text-[#F5ED75]">платформе</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-3xl mx-auto leading-relaxed">
              FOXINBURG EBOS объединяет обучение, управление бизнесом и персоналом. Забудьте о
              совместимости LMS, CRM, ERP и HRM — всё работает здесь.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={scrollToDemo}
                className="px-8 py-4 rounded-xl bg-[#F5ED75] text-[#1a1229] font-bold text-lg hover:bg-[#e8df60] transition shadow-lg shadow-[#F5ED75]/10"
              >
                Записаться на демо
              </button>
              <button
                onClick={() => setAuthOpen(true)}
                className="px-8 py-4 rounded-xl border border-white/20 text-white font-semibold text-lg hover:bg-white/5 transition"
              >
                Войти в систему
              </button>
            </div>
          </div>
        </section>

        <section className="py-16 px-6 border-y border-white/5 bg-[#0f0a18]">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-[#F5ED75] mb-2">3</div>
              <p className="text-gray-400 text-sm">системы в одной платформе</p>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-[#F5ED75] mb-2">9</div>
              <p className="text-gray-400 text-sm">ролей доступа</p>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-[#F5ED75] mb-2">1 API</div>
              <p className="text-gray-400 text-sm">для всех интеграций</p>
            </div>
          </div>
        </section>

        <section id="systems" className="py-24 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16 reveal" ref={useReveal()}>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">3 системы — 1 платформа</h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Модули тесно связаны между собой: заявка из CRM превращается в ученика, оплата формирует
                группу, а прогресс попадает в аналитику.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {systems.map((system) => (
                <div
                  key={system.title}
                  className="group rounded-2xl p-8 bg-white/[0.03] border border-white/10 hover:border-[#F5ED75]/30 hover:bg-white/[0.05] transition duration-300"
                >
                  <SystemIcon>{system.icon}</SystemIcon>
                  <h3 className="text-2xl font-bold text-white mb-3">{system.title}</h3>
                  <p className="text-gray-400 mb-6 leading-relaxed">{system.description}</p>
                  <ul className="space-y-3">
                    {system.features.map((f) => (
                      <li key={f} className="flex items-center gap-3 text-sm text-gray-300">
                        <CheckIcon /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="py-24 px-6 bg-[#0f0a18]">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16 reveal" ref={useReveal()}>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Возможности платформы</h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Всё необходимое для управления современной образовательной организацией.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((item) => (
                <div
                  key={item.title}
                  className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#F5ED75]/30 hover:bg-white/[0.05] transition"
                >
                  <h4 className="text-xl font-bold text-[#F5ED75] mb-2">{item.title}</h4>
                  <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 px-6">
          <div className="max-w-5xl mx-auto text-center reveal" ref={useReveal()}>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-12">9 ролей для любой задачи</h2>
            <div className="flex flex-wrap justify-center gap-3">
              {roles.map((role) => (
                <div
                  key={role}
                  className="px-5 py-2.5 rounded-full border border-white/10 bg-white/[0.03] text-gray-300 text-sm hover:border-[#F5ED75]/40 hover:text-[#F5ED75] transition"
                >
                  {role}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="demo" className="py-24 px-6 bg-[#0f0a18]">
          <div className="max-w-4xl mx-auto rounded-3xl bg-[#161026] p-8 md:p-12 border border-white/10 shadow-2xl">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Записаться на демонстрацию</h2>
              <p className="text-gray-400">Расскажем, как FOXINBURG EBOS подойдёт именно вашей школе.</p>
            </div>
            <DemoForm />
          </div>
        </section>

        <section id="contacts" className="py-24 px-6">
          <div className="max-w-5xl mx-auto text-center reveal" ref={useReveal()}>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-12">Контакты</h2>
            <div className="grid md:grid-cols-2 gap-8 text-left">
              <div className="p-8 rounded-2xl bg-[#161026] border border-white/10">
                <h3 className="text-xl font-bold text-[#F5ED75] mb-2">ИП Дымова Вероника Александровна</h3>
                <p className="text-gray-300 mb-1">Руководитель проекта FOXINBURG EBOS</p>
                <p className="text-gray-500 text-sm">Организационные вопросы, сотрудничество, демонстрации</p>
              </div>
              <div className="p-8 rounded-2xl bg-[#161026] border border-white/10">
                <h3 className="text-xl font-bold text-[#F5ED75] mb-2">Дымов Григорий Юрьевич</h3>
                <p className="text-gray-300 mb-1">Создатель и технический директор</p>
                <p className="text-gray-500 text-sm">Архитектура продукта, интеграции, техническая поддержка</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-10 px-6 border-t border-white/5 bg-[#0a0612]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <p>© {new Date().getFullYear()} FOXINBURG EBOS. Все права защищены.</p>
          <p>Сайт: <span className="text-gray-300">https://foxinburg.ru</span></p>
        </div>
      </footer>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  )
}
