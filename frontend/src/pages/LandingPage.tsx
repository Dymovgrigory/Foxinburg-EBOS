import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuth, User } from '../contexts/AuthContext'

const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }

function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed')
          observer.unobserve(entry.target)
        }
      })
    }, observerOptions)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return ref
}

interface LandingPageProps {
  showAuth?: boolean
}

export default function LandingPage({ showAuth = false }: LandingPageProps) {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [authOpen, setAuthOpen] = useState(showAuth)
  const [isLogin, setIsLogin] = useState(true)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authName, setAuthName] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => {
      if (!heroRef.current) return
      const scrolled = window.scrollY
      heroRef.current.style.setProperty('--scroll', `${scrolled * 0.4}px`)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    setAuthLoading(true)
    try {
      let response
      if (isLogin) {
        const params = new URLSearchParams()
        params.append('username', authEmail)
        params.append('password', authPassword)
        response = await api.post('/auth/login', params, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
      } else {
        response = await api.post('/auth/register', { email: authEmail, password: authPassword, name: authName })
      }
      const payload = response.data.data ?? response.data
      const token = payload.access_token
      const user: User = payload.user
      if (!token || !user) throw new Error('Некорректный ответ сервера')
      login(user, token)
      navigate('/system-center')
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.detail || err.message || 'Ошибка авторизации'
      setAuthError(msg)
    } finally {
      setAuthLoading(false)
    }
  }

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await api.post('/leads/demo', {
        name: form.name,
        email: form.email,
        phone: form.phone,
        source: 'landing_demo_form',
        status: 'new',
        comment: `Компания: ${form.company || '—'}\nСообщение: ${form.message || '—'}`,
      })
      setSent(true)
      setForm({ name: '', email: '', phone: '', company: '', message: '' })
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Не удалось отправить заявку. Попробуйте позже.')
    } finally {
      setSubmitting(false)
    }
  }

  const Hero = () => {
    const ref = useReveal()
    return (
      <section
        ref={ref}
        className="relative min-h-screen flex items-center justify-center overflow-hidden px-6 pt-20 reveal"
      >
        <div
          className="absolute inset-0 z-0 opacity-20 pointer-events-none"
          style={{
            transform: `translateY(var(--scroll, 0px))`,
            background:
              'radial-gradient(circle at 20% 20%, rgba(245,237,117,0.35), transparent 40%), radial-gradient(circle at 80% 80%, rgba(58,41,83,0.35), transparent 45%)',
          }}
        />
        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F5ED75]/10 border border-[#F5ED75]/30 text-[#F5ED75] text-sm mb-8 animate-float">
            <span className="w-2 h-2 rounded-full bg-[#F5ED75] animate-pulse" />
            EBOS — новое поколение управления школами
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Три системы в одной <span className="text-[#F5ED75]">платформе</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-3xl mx-auto">
            FOXINBURG EBOS объединяет обучение, управление бизнесом и персоналом. Забудьте о
            совместимости LMS, CRM, ERP и HRM — всё работает здесь.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 rounded-xl bg-[#F5ED75] text-[#3A2953] font-bold text-lg hover:bg-[#e8df60] transition transform hover:-translate-y-1 shadow-lg shadow-[#F5ED75]/20"
            >
              Записаться на демо
            </button>
            <button
              onClick={() => setAuthOpen(true)}
              className="px-8 py-4 rounded-xl border border-white/20 text-white font-semibold text-lg hover:bg-white/10 transition"
            >
              Войти в систему
            </button>
          </div>
        </div>
      </section>
    )
  }

  const Systems = () => {
    const ref = useReveal()
    const cards = [
      {
        title: 'World Academy',
        icon: '🎓',
        color: 'from-[#3A2953] to-[#5B427A]',
        description:
          'Управление курсами, уроками, домашними заданиями, тестами и прогрессом учеников. LMS нового поколения.',
        features: ['Курсы и модули', 'Видеоуроки и материалы', 'Тесты и сертификация', 'Прогресс ученика'],
      },
      {
        title: 'CRM / ERP',
        icon: '📊',
        color: 'from-[#FF6B6B] to-[#FF8E8E]',
        description:
          'Лиды, сделки, оплаты, финансы, аналитика и автоматизация воронки продаж. Полный контроль над бизнесом.',
        features: ['Воронка продаж', 'Финансы и отчёты', 'Группы и зачисления', 'Аналитика и прогнозы'],
      },
      {
        title: 'HRM',
        icon: '👥',
        color: 'from-[#F5ED75] to-[#FFF5A5]',
        textDark: true,
        description:
          'Сотрудники, роли, доступы, нагрузка преподавателей и рабочие процессы всей команды в одном месте.',
        features: ['9 ролей доступа', 'Расписание и нагрузка', 'Кадровый учёт', 'Задачи и контроль'],
      },
    ]
    return (
      <section ref={ref} id="systems" className="py-24 px-6 reveal">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">3 системы — 1 платформа</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Модули тесно связаны между собой: заявка из CRM превращается в ученика, оплата формирует
              группу, а прогресс попадает в аналитику.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {cards.map((card) => (
              <div
                key={card.title}
                className="group relative rounded-3xl p-8 bg-gradient-to-br shadow-2xl hover:scale-[1.02] transition duration-300 overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${card.color.includes('from-') ? '' : card.color})` }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-90`} />
                <div className="relative z-10">
                  <div className="text-5xl mb-6 transform group-hover:scale-110 transition duration-300">{card.icon}</div>
                  <h3 className={`text-2xl font-bold mb-3 ${card.textDark ? 'text-[#3A2953]' : 'text-white'}`}>
                    {card.title}
                  </h3>
                  <p className={`mb-6 ${card.textDark ? 'text-[#3A2953]/80' : 'text-white/80'}`}>{card.description}</p>
                  <ul className="space-y-2">
                    {card.features.map((f) => (
                      <li key={f} className={`flex items-center gap-2 text-sm ${card.textDark ? 'text-[#3A2953]/80' : 'text-white/80'}`}>
                        <span className={card.textDark ? 'text-[#3A2953]' : 'text-[#F5ED75]'}>✓</span> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  const Features = () => {
    const ref = useReveal()
    const items = [
      { title: 'Ролевая модель', desc: '9 ролей от гостя до владельца. Каждый видит только своё.' },
      { title: 'API-first', desc: 'Единый REST API /api/v3 для интеграций и мобильных приложений.' },
      { title: 'Безопасность', desc: 'JWT-аутентификация, разграничение прав, аудит действий.' },
      { title: 'Аналитика', desc: 'Финансы, конверсия, успеваемость — в реальном времени.' },
      { title: 'Автоматизация', desc: 'Уведомления, смены статусов, напоминания о занятиях.' },
      { title: 'Масштабирование', desc: 'Филиалы, группы, неограниченные курсы и пользователи.' },
    ]
    return (
      <section ref={ref} className="py-24 px-6 bg-[#1a1229]/50 reveal">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold text-white text-center mb-16">Возможности платформы</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <div
                key={item.title}
                className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-[#F5ED75]/40 hover:bg-white/10 transition"
              >
                <h4 className="text-xl font-bold text-[#F5ED75] mb-2">{item.title}</h4>
                <p className="text-gray-300 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  const Roles = () => {
    const ref = useReveal()
    const roles = [
      { name: 'Владелец', desc: 'Полный контроль и стратегическая аналитика' },
      { name: 'Суперадмин', desc: 'Техническое управление всей платформой' },
      { name: 'Администратор', desc: 'Операционное управление школой' },
      { name: 'Методист', desc: 'Программы, курсы и материалы' },
      { name: 'Преподаватель', desc: 'Занятия, домашние задания, проверка' },
      { name: 'Менеджер', desc: 'Продажи, CRM, оплаты' },
      { name: 'Ученик', desc: 'Обучение, прогресс, сертификаты' },
      { name: 'Родитель', desc: 'Контроль успеваемости ребёнка' },
      { name: 'Гость', desc: 'Демо-доступ к пробным материалам' },
    ]
    return (
      <section ref={ref} className="py-24 px-6 reveal">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-12">9 ролей для любой задачи</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {roles.map((role) => (
              <div
                key={role.name}
                className="px-5 py-3 rounded-full border border-white/10 bg-white/5 hover:bg-[#F5ED75]/10 hover:border-[#F5ED75]/40 transition"
                title={role.desc}
              >
                <span className="text-white font-medium text-sm">{role.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  const Demo = () => {
    const ref = useReveal()
    return (
      <section ref={ref} id="demo" className="py-24 px-6 reveal">
        <div className="max-w-4xl mx-auto rounded-3xl bg-gradient-to-br from-[#3A2953] to-[#241839] p-8 md:p-12 border border-white/10 shadow-2xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Записаться на демонстрацию</h2>
            <p className="text-gray-300">Расскажем, как FOXINBURG EBOS подойдёт именно вашей школе.</p>
          </div>
          {sent ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold text-[#F5ED75] mb-2">Заявка отправлена!</h3>
              <p className="text-gray-300">Мы свяжемся с вами в ближайшее время.</p>
            </div>
          ) : (
            <form onSubmit={handleDemoSubmit} className="space-y-5">
              <div className="grid md:grid-cols-2 gap-5">
                <input
                  required
                  type="text"
                  placeholder="Ваше имя"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-5 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-[#F5ED75]"
                />
                <input
                  required
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-5 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-[#F5ED75]"
                />
                <input
                  type="tel"
                  placeholder="Телефон"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-5 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-[#F5ED75]"
                />
                <input
                  type="text"
                  placeholder="Название школы / компании"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  className="w-full px-5 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-[#F5ED75]"
                />
              </div>
              <textarea
                rows={4}
                placeholder="Что вас интересует?"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full px-5 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-[#F5ED75]"
              />
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 rounded-xl bg-[#F5ED75] text-[#3A2953] font-bold text-lg hover:bg-[#e8df60] transition disabled:opacity-60"
              >
                {submitting ? 'Отправка...' : 'Отправить заявку'}
              </button>
            </form>
          )}
        </div>
      </section>
    )
  }

  const Contacts = () => {
    const ref = useReveal()
    return (
      <section ref={ref} id="contacts" className="py-24 px-6 bg-[#1a1229]/50 reveal">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-12">Контакты</h2>
          <div className="grid md:grid-cols-2 gap-8 text-left">
            <div className="p-8 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="text-xl font-bold text-[#F5ED75] mb-4">ИП Дымова Вероника Александровна</h3>
              <p className="text-gray-300 mb-2">Руководитель проекта FOXINBURG EBOS</p>
              <p className="text-gray-400 text-sm">Организационные вопросы, сотрудничество, демонстрации</p>
            </div>
            <div className="p-8 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="text-xl font-bold text-[#F5ED75] mb-4">Дымов Григорий Юрьевич</h3>
              <p className="text-gray-300 mb-2">Создатель и технический директор</p>
              <p className="text-gray-400 text-sm">Архитектура продукта, интеграции, техническая поддержка</p>
            </div>
          </div>
          <div className="mt-12">
            <p className="text-gray-400">Сайт: <span className="text-white">https://foxinburg.ru</span></p>
            <p className="text-gray-400 mt-2">© {new Date().getFullYear()} FOXINBURG EBOS. Все права защищены.</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0a18] text-white">
      <style>{`
        .reveal { opacity: 0; transform: translateY(30px); transition: all 0.8s cubic-bezier(0.22, 1, 0.36, 1); }
        .revealed { opacity: 1; transform: translateY(0); }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-float { animation: float 4s ease-in-out infinite; }
      `}</style>
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0f0a18]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#F5ED75] to-[#3A2953] flex items-center justify-center text-lg font-bold text-[#3A2953]">
              F
            </div>
            <span className="font-bold text-xl tracking-tight">FOXINBURG <span className="text-[#F5ED75]">EBOS</span></span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-gray-300">
            <a href="#systems" className="hover:text-[#F5ED75] transition">Системы</a>
            <a href="#demo" className="hover:text-[#F5ED75] transition">Демо</a>
            <a href="#contacts" className="hover:text-[#F5ED75] transition">Контакты</a>
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
        <Hero />
        <Systems />
        <Features />
        <Roles />
        <Demo />
        <Contacts />
      </main>
      {authOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setAuthOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-gradient-to-br from-[#3A2953] to-[#241839] border border-white/10 p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">{isLogin ? 'Вход в EBOS' : 'Регистрация'}</h3>
              <button
                onClick={() => setAuthOpen(false)}
                className="text-gray-400 hover:text-white transition text-2xl leading-none"
              >
                ×
              </button>
            </div>
            {authError && <div className="mb-4 p-3 bg-red-500/20 text-red-200 rounded-xl text-sm">{authError}</div>}
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {!isLogin && (
                <input
                  type="text"
                  placeholder="Имя"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  required={!isLogin}
                  className="w-full px-5 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-[#F5ED75]"
                />
              )}
              <input
                type="email"
                placeholder="Email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                required
                className="w-full px-5 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-[#F5ED75]"
              />
              <input
                type="password"
                placeholder="Пароль"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                required
                className="w-full px-5 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-[#F5ED75]"
              />
              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 rounded-xl bg-[#F5ED75] text-[#3A2953] font-bold hover:bg-[#e8df60] transition disabled:opacity-60"
              >
                {authLoading ? 'Загрузка...' : isLogin ? 'Войти' : 'Зарегистрироваться'}
              </button>
            </form>
            <div className="mt-6 text-center text-sm text-gray-400">
              {isLogin ? 'Ещё нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-[#F5ED75] hover:underline font-medium"
              >
                {isLogin ? 'Зарегистрироваться' : 'Войти'}
              </button>
            </div>
          </div>
        </div>
      )}
      <footer className="py-8 px-6 border-t border-white/5 text-center text-gray-500 text-sm">
        FOXINBURG EBOS — единая операционная система для образовательного бизнеса
      </footer>
    </div>
  )
}
