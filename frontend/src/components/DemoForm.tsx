import { useState, useCallback } from 'react'
import { LuCheck } from 'react-icons/lu'
import api from '../services/api'
import { Button, Input } from './ui'

interface DemoFormProps {
  variant?: 'light' | 'dark'
}

export default function DemoForm({ variant = 'light' }: DemoFormProps) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const updateField = useCallback((field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
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
        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.detail ||
          'Не удалось отправить заявку. Попробуйте позже.'
        setError(msg)
      } finally {
        setSubmitting(false)
      }
    },
    [form]
  )

  const isDark = variant === 'dark'

  if (sent) {
    return (
      <div className="text-center py-12 animate-fadeIn">
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-full text-3xl mb-4"
          style={{ backgroundColor: 'var(--fox-gold)', color: 'var(--fox-purple)' }}
        >
          <LuCheck />
        </div>
        <h3 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-fox-purple'}`}>
          Заявка отправлена!
        </h3>
        <p className={isDark ? 'text-white/60' : 'text-fox-gray'}>Мы свяжемся с вами в ближайшее время.</p>
        <button
          onClick={() => setSent(false)}
          className={`mt-6 text-sm font-medium hover:underline ${isDark ? 'text-fox-gold' : 'text-fox-purple'}`}
        >
          Отправить ещё одну заявку
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid md:grid-cols-2 gap-5">
        <Input
          label="Ваше имя *"
          required
          type="text"
          value={form.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="Иван Иванов"
          variant={variant}
        />
        <Input
          label="Email *"
          required
          type="email"
          value={form.email}
          onChange={(e) => updateField('email', e.target.value)}
          placeholder="name@school.ru"
          variant={variant}
        />
        <Input
          label="Телефон"
          type="tel"
          value={form.phone}
          onChange={(e) => updateField('phone', e.target.value)}
          placeholder="+7 (999) 000-00-00"
          variant={variant}
        />
        <Input
          label="Название школы / компании"
          type="text"
          value={form.company}
          onChange={(e) => updateField('company', e.target.value)}
          placeholder="Foxinburg School"
          variant={variant}
        />
      </div>
      <div>
        <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-white/80' : 'text-fox-graphite'}`}>
          Что вас интересует?
        </label>
        <textarea
          rows={4}
          value={form.message}
          onChange={(e) => updateField('message', e.target.value)}
          className={`w-full px-4 py-3 rounded-button focus:ring-2 focus:outline-none transition duration-200 resize-none ${
            isDark
              ? 'bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:border-fox-gold focus:ring-fox-gold/20'
              : 'fox-input'
          }`}
          placeholder="Расскажите о задачах, которые хотите решить..."
        />
      </div>
      {error && <p className="text-sm" style={{ color: 'var(--fox-error)' }}>{error}</p>}
      <Button
        type="submit"
        loading={submitting}
        disabled={submitting}
        className="w-full justify-center"
      >
        {submitting ? 'Отправка...' : 'Отправить заявку'}
      </Button>
    </form>
  )
}
