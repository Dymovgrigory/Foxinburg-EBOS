import { useState, useCallback } from 'react'
import api from '../services/api'

export default function DemoForm() {
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

  if (sent) {
    return (
      <div className="text-center py-12 animate-fadeIn">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#F5ED75]/10 text-[#F5ED75] text-3xl mb-4">
          ✓
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">Заявка отправлена!</h3>
        <p className="text-gray-300">Мы свяжемся с вами в ближайшее время.</p>
        <button
          onClick={() => setSent(false)}
          className="mt-6 text-[#F5ED75] hover:underline text-sm"
        >
          Отправить ещё одну заявку
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Ваше имя *</label>
          <input
            required
            type="text"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#F5ED75] focus:ring-1 focus:ring-[#F5ED75]/30 transition"
            placeholder="Иван Иванов"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Email *</label>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#F5ED75] focus:ring-1 focus:ring-[#F5ED75]/30 transition"
            placeholder="name@school.ru"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Телефон</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#F5ED75] focus:ring-1 focus:ring-[#F5ED75]/30 transition"
            placeholder="+7 (999) 000-00-00"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Название школы / компании</label>
          <input
            type="text"
            value={form.company}
            onChange={(e) => updateField('company', e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#F5ED75] focus:ring-1 focus:ring-[#F5ED75]/30 transition"
            placeholder="Foxinburg School"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Что вас интересует?</label>
        <textarea
          rows={4}
          value={form.message}
          onChange={(e) => updateField('message', e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#F5ED75] focus:ring-1 focus:ring-[#F5ED75]/30 transition resize-none"
          placeholder="Расскажите о задачах, которые хотите решить..."
        />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full py-4 rounded-xl bg-[#F5ED75] text-[#1a1229] font-bold text-lg hover:bg-[#e8df60] transition disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {submitting ? 'Отправка...' : 'Отправить заявку'}
      </button>
    </form>
  )
}
