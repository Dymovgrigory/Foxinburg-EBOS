import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import AuthModal from '../components/AuthModal'
import DemoForm from '../components/DemoForm'
import BrandLogo from '../components/BrandLogo'

interface LandingPageProps {
  showAuth?: boolean
}

const CheckIcon = () => (
  <svg className="w-5 h-5 text-[#3A2953] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
)

const SystemIcon = ({ children }: { children: React.ReactNode }) => (
  <div className="w-12 h-12 rounded-xl bg-[#F5ED75] flex items-center justify-center text-[#3A2953] mb-6">
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
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">
      <style>{`
        .reveal { opacity: 0; transform: translateY(24px); transition: all 0.7s cubic-bezier(0.22, 1, 0.36, 1); }
        .revealed { opacity: 1; transform: translateY(0); }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .animate-scaleIn { animation: scaleIn 0.2s ease-out; }
      `}</style>

      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="hover:opacity-90 transition">
            <BrandLogo variant="light" />
          </button>
          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-600">
            <a href="#systems" className="hover:text-[#3A2953] transition">Системы</a>
            <a href="#features" className="hover:text-[#3A2953] transition">Возможности</a>
            <a href="#demo" className="hover:text-[#3A2953] transition">Демо</a>
            <a href="#contacts" className="hover:text-[#3A2953] transition">Контакты</a>
          </nav>
          <button
            onClick={() => setAuthOpen(true)}
            className="px-5 py-2.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition text-sm font-medium"
          >
            Войти
          </button>
        </div>
      </header>

      <main>
        <section className="relative min-h-screen flex items-center justify-center px-6 pt-28 pb-20">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#F5ED75]/20 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#3A2953]/5 rounded-full blur-3xl" />
          </div>
          <div className="relative z-10 max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-sm mb-10">
              <span className="w-2 h-2 rounded-full bg-[#3A2953] animate-pulse" />
              EBOS — единая операционная система для школ
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-slate-900 mb-8 leading-[1.1] tracking-tight">
              Три системы <br className="hidden md:block" />
              <span className="text-[#3A2953]">в одной платформе</span>
            </h1>
            <p className="text-lg md:text-2xl text-slate-500 mb-12 max-w-3xl mx-auto leading-relaxed">
              FOXINBURG EBOS объединяет обучение, управление бизнесом и персоналом.
              Забудьте о совместимости LMS, CRM, ERP и HRM — всё работает здесь.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={scrollToDemo}
                className="px-8 py-4 rounded-xl bg-[#F5ED75] text-slate-900 font-bold text-lg hover:bg-[#e8df60] transition shadow-lg shadow-[#F5ED75]/20"
              >
                Записаться на демо
              </button>
              <button
                onClick={() => setAuthOpen(true)}
                className="px-8 py-4 rounded-xl border border-slate-200 text-slate-700 font-semibold text-lg hover:bg-slate-50 transition"
              >
                Войти в систему
              </button>
            </div>
          </div>
        </section>

        <section className="py-20 px-6 border-y border-slate-100 bg-slate-50/50">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            <div>
              <div className="text-4xl md:text-5xl font-bold text-[#3A2953] mb-2">3</div>
              <p className="text-slate-500">системы в одной платформе</p>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-[#3A2953] mb-2">9</div>
              <p className="text-slate-500">ролей доступа</p>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-[#3A2953] mb-2">1 API</div>
              <p className="text-slate-500">для всех интеграций</p>
            </div>
          </div>
        </section>

        <section id="systems" className="py-32 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20 reveal" ref={useReveal()}>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-5">3 системы — 1 платформа</h2>
              <p className="text-slate-500 max-w-2xl mx-auto text-lg">
                Модули тесно связаны между собой: заявка из CRM превращается в ученика, оплата формирует
                группу, а прогресс попадает в аналитику.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {systems.map((system) => (
                <div
                  key={system.title}
                  className="group rounded-2xl p-10 bg-white border border-slate-100 hover:border-[#F5ED75] hover:shadow-xl hover:shadow-[#F5ED75]/10 transition duration-300"
                >
                  <SystemIcon>{system.icon}</SystemIcon>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4">{system.title}</h3>
                  <p className="text-slate-500 mb-8 leading-relaxed">{system.description}</p>
                  <ul className="space-y-3">
                    {system.features.map((f) => (
                      <li key={f} className="flex items-center gap-3 text-sm text-slate-700">
                        <CheckIcon /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="py-32 px-6 bg-slate-50/50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-20 reveal" ref={useReveal()}>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-5">Возможности платформы</h2>
              <p className="text-slate-500 max-w-2xl mx-auto text-lg">
                Всё необходимое для управления современной образовательной организацией.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((item) => (
                <div
                  key={item.title}
                  className="p-8 rounded-2xl bg-white border border-slate-100 hover:border-slate-200 hover:shadow-lg transition"
                >
                  <h4 className="text-xl font-bold text-[#3A2953] mb-3">{item.title}</h4>
                  <p className="text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-32 px-6">
          <div className="max-w-5xl mx-auto text-center reveal" ref={useReveal()}>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-14">9 ролей для любой задачи</h2>
            <div className="flex flex-wrap justify-center gap-3">
              {roles.map((role) => (
                <div
                  key={role}
                  className="px-6 py-2.5 rounded-full border border-slate-200 bg-white text-slate-600 text-sm hover:border-[#3A2953] hover:text-[#3A2953] transition"
                >
                  {role}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="demo" className="py-32 px-6 bg-slate-50/50">
          <div className="max-w-3xl mx-auto">
            <div className="rounded-3xl bg-white p-10 md:p-14 border border-slate-100 shadow-xl shadow-slate-200/50">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Записаться на демонстрацию</h2>
                <p className="text-slate-500 text-lg">Расскажем, как FOXINBURG EBOS подойдёт именно вашей школе.</p>
              </div>
              <DemoForm />
            </div>
          </div>
        </section>

        <section id="contacts" className="py-32 px-6">
          <div className="max-w-5xl mx-auto text-center reveal" ref={useReveal()}>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-14">Контакты</h2>
            <div className="grid md:grid-cols-2 gap-8 text-left">
              <div className="p-10 rounded-2xl bg-white border border-slate-100">
                <h3 className="text-xl font-bold text-[#3A2953] mb-2">ИП Дымова Вероника Александровна</h3>
                <p className="text-slate-600 mb-1">Руководитель проекта FOXINBURG EBOS</p>
                <p className="text-slate-400 text-sm">Организационные вопросы, сотрудничество, демонстрации</p>
              </div>
              <div className="p-10 rounded-2xl bg-white border border-slate-100">
                <h3 className="text-xl font-bold text-[#3A2953] mb-2">Дымов Григорий Юрьевич</h3>
                <p className="text-slate-600 mb-1">Создатель и технический директор</p>
                <p className="text-slate-400 text-sm">Архитектура продукта, интеграции, техническая поддержка</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-12 px-6 border-t border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <p>© {new Date().getFullYear()} FOXINBURG EBOS. Все права защищены.</p>
          <p>
            Сайт: <span className="text-slate-600">https://foxinburg.ru</span>
          </p>
        </div>
      </footer>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  )
}
