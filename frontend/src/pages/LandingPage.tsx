import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import AuthModal from '../components/AuthModal'
import DemoForm from '../components/DemoForm'
import BrandLogo from '../components/BrandLogo'
import { LuCheck, LuGraduationCap, LuChartBarBig, LuUsers } from 'react-icons/lu'

interface LandingPageProps {
  showAuth?: boolean
}

const CheckIcon = () => (
  <LuCheck className="w-5 h-5 text-fox-purple shrink-0" />
)

const SystemIcon = ({ children }: { children: React.ReactNode }) => (
  <div className="w-12 h-12 rounded-xl bg-fox-gold flex items-center justify-center text-fox-purple mb-6">
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
      icon: <LuGraduationCap className="w-6 h-6" />,
    },
    {
      title: 'CRM / ERP',
      description:
        'Полный цикл продаж и финансов: лиды, сделки, оплаты, группы, зачисления и аналитика в реальном времени.',
      features: ['Воронка продаж', 'Финансы и отчёты', 'Группы и зачисления', 'Аналитика и прогнозы'],
      icon: <LuChartBarBig className="w-6 h-6" />,
    },
    {
      title: 'HRM',
      description:
        'Управление командой: 9 ролей доступа, расписание, нагрузка преподавателей, кадровый учёт и задачи.',
      features: ['9 ролей доступа', 'Расписание и нагрузка', 'Кадровый учёт', 'Задачи и контроль'],
      icon: <LuUsers className="w-6 h-6" />,
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
    <div className="min-h-screen bg-white text-fox-purple overflow-x-hidden">
      <style>{`
        .reveal { opacity: 0; transform: translateY(24px); transition: all 0.7s cubic-bezier(0.22, 1, 0.36, 1); }
        .revealed { opacity: 1; transform: translateY(0); }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .animate-scaleIn { animation: scaleIn 0.2s ease-out; }
      `}</style>

      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-fox-border">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="hover:opacity-90 transition">
            <BrandLogo variant="light" />
          </button>
          <nav className="hidden md:flex items-center gap-8 text-sm text-fox-gray">
            <a href="#systems" className="hover:text-fox-purple transition">Системы</a>
            <a href="#features" className="hover:text-fox-purple transition">Возможности</a>
            <a href="#demo" className="hover:text-fox-purple transition">Демо</a>
            <a href="#contacts" className="hover:text-fox-purple transition">Контакты</a>
          </nav>
          <button
            onClick={() => setAuthOpen(true)}
            className="px-5 py-2.5 rounded-lg bg-fox-purple text-white hover:bg-fox-purple-light transition text-sm font-medium"
          >
            Войти
          </button>
        </div>
      </header>

      <main>
        <section className="relative min-h-screen flex items-center justify-center px-6 pt-28 pb-20">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-fox-gold/20 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-fox-purple/5 rounded-full blur-3xl" />
          </div>
          <div className="relative z-10 max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-fox-light border border-fox-border text-fox-graphite text-sm mb-10">
              <span className="w-2 h-2 rounded-full bg-fox-purple animate-pulse" />
              EBOS — единая операционная система для школ
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-fox-purple mb-8 leading-[1.1] tracking-tight">
              Три системы <br className="hidden md:block" />
              <span className="text-fox-purple">в одной платформе</span>
            </h1>
            <p className="text-lg md:text-2xl text-fox-gray mb-12 max-w-3xl mx-auto leading-relaxed">
              FOXINBURG EBOS объединяет обучение, управление бизнесом и персоналом.
              Забудьте о совместимости LMS, CRM, ERP и HRM — всё работает здесь.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={scrollToDemo}
                className="px-8 py-4 rounded-xl bg-fox-gold text-fox-purple font-bold text-lg hover:bg-fox-gold-dark transition shadow-lg shadow-[#F9E4A6]/20"
              >
                Записаться на демо
              </button>
              <button
                onClick={() => setAuthOpen(true)}
                className="px-8 py-4 rounded-xl border border-fox-border text-fox-graphite font-semibold text-lg hover:bg-fox-light transition"
              >
                Войти в систему
              </button>
            </div>
          </div>
        </section>

        <section className="py-20 px-6 border-y border-fox-border bg-fox-light/50">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            <div>
              <div className="text-4xl md:text-5xl font-bold text-fox-purple mb-2">3</div>
              <p className="text-fox-gray">системы в одной платформе</p>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-fox-purple mb-2">9</div>
              <p className="text-fox-gray">ролей доступа</p>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-fox-purple mb-2">1 API</div>
              <p className="text-fox-gray">для всех интеграций</p>
            </div>
          </div>
        </section>

        <section id="systems" className="py-32 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20 reveal" ref={useReveal()}>
              <h2 className="text-4xl md:text-5xl font-bold text-fox-purple mb-5">3 системы — 1 платформа</h2>
              <p className="text-fox-gray max-w-2xl mx-auto text-lg">
                Модули тесно связаны между собой: заявка из CRM превращается в ученика, оплата формирует
                группу, а прогресс попадает в аналитику.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {systems.map((system) => (
                <div
                  key={system.title}
                  className="group rounded-2xl p-10 bg-white border border-fox-border hover:border-fox-gold hover:shadow-xl hover:shadow-fox-md transition duration-300"
                >
                  <SystemIcon>{system.icon}</SystemIcon>
                  <h3 className="text-2xl font-bold text-fox-purple mb-4">{system.title}</h3>
                  <p className="text-fox-gray mb-8 leading-relaxed">{system.description}</p>
                  <ul className="space-y-3">
                    {system.features.map((f) => (
                      <li key={f} className="flex items-center gap-3 text-sm text-fox-graphite">
                        <CheckIcon /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="py-32 px-6 bg-fox-light/50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-20 reveal" ref={useReveal()}>
              <h2 className="text-4xl md:text-5xl font-bold text-fox-purple mb-5">Возможности платформы</h2>
              <p className="text-fox-gray max-w-2xl mx-auto text-lg">
                Всё необходимое для управления современной образовательной организацией.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((item) => (
                <div
                  key={item.title}
                  className="p-8 rounded-2xl bg-white border border-fox-border hover:border-fox-border hover:shadow-lg transition"
                >
                  <h4 className="text-xl font-bold text-fox-purple mb-3">{item.title}</h4>
                  <p className="text-fox-gray leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-32 px-6">
          <div className="max-w-5xl mx-auto text-center reveal" ref={useReveal()}>
            <h2 className="text-4xl md:text-5xl font-bold text-fox-purple mb-14">9 ролей для любой задачи</h2>
            <div className="flex flex-wrap justify-center gap-3">
              {roles.map((role) => (
                <div
                  key={role}
                  className="px-6 py-2.5 rounded-full border border-fox-border bg-white text-fox-gray text-sm hover:border-fox-purple hover:text-fox-purple transition"
                >
                  {role}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="demo" className="py-32 px-6 bg-fox-light/50">
          <div className="max-w-3xl mx-auto">
            <div className="rounded-3xl bg-white p-10 md:p-14 border border-fox-border shadow-xl shadow-fox">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-fox-purple mb-4">Записаться на демонстрацию</h2>
                <p className="text-fox-gray text-lg">Расскажем, как FOXINBURG EBOS подойдёт именно вашей школе.</p>
              </div>
              <DemoForm />
            </div>
          </div>
        </section>

        <section id="contacts" className="py-32 px-6">
          <div className="max-w-5xl mx-auto text-center reveal" ref={useReveal()}>
            <h2 className="text-4xl md:text-5xl font-bold text-fox-purple mb-14">Контакты</h2>
            <div className="grid md:grid-cols-2 gap-8 text-left">
              <div className="p-10 rounded-2xl bg-white border border-fox-border">
                <h3 className="text-xl font-bold text-fox-purple mb-2">ИП Дымова Вероника Александровна</h3>
                <p className="text-fox-gray mb-1">Руководитель проекта FOXINBURG EBOS</p>
                <p className="text-fox-gray/70 text-sm">Организационные вопросы, сотрудничество, демонстрации</p>
              </div>
              <div className="p-10 rounded-2xl bg-white border border-fox-border">
                <h3 className="text-xl font-bold text-fox-purple mb-2">Дымов Григорий Юрьевич</h3>
                <p className="text-fox-gray mb-1">Создатель и технический директор</p>
                <p className="text-fox-gray/70 text-sm">Архитектура продукта, интеграции, техническая поддержка</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-12 px-6 border-t border-fox-border bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-fox-gray/70">
          <p>© {new Date().getFullYear()} FOXINBURG EBOS. Все права защищены.</p>
          <p>
            Сайт: <span className="text-fox-gray">https://foxinburg.ru</span>
          </p>
        </div>
      </footer>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  )
}
