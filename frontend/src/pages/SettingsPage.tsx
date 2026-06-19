import { useState } from 'react'
import Header from '../components/Header'

export default function SettingsPage() {
  const [profile, setProfile] = useState({
    lastName: 'Петрова',
    firstName: 'Анна',
    middleName: 'Сергеевна',
    phone: '+7 (916) 123-45-67',
    bio: 'Опытный преподаватель английского языка',
    education: 'МГЛУ, факультет английской филологии',
    specialization: 'Английский язык, подготовка к IELTS',
  })

  const [notifications, setNotifications] = useState({
    homeworkEmail: true,
    courseEmail: true,
    messagePush: true,
  })

  const toggle = (key: keyof typeof notifications) => {
    setNotifications((n) => ({ ...n, [key]: !n[key] }))
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <Header title="Настройки" icon="🔧" />

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Profile */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <span className="text-amber-500">👤</span> Профиль
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Фамилия</label>
              <input
                value={profile.lastName}
                onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#E85D4C] focus:ring-2 focus:ring-[#E85D4C]/20 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Имя</label>
              <input
                value={profile.firstName}
                onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#E85D4C] focus:ring-2 focus:ring-[#E85D4C]/20 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Отчество</label>
              <input
                value={profile.middleName}
                onChange={(e) => setProfile({ ...profile, middleName: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#E85D4C] focus:ring-2 focus:ring-[#E85D4C]/20 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                value="teacher@foxinburg.ru"
                disabled
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
              <input
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#E85D4C] focus:ring-2 focus:ring-[#E85D4C]/20 outline-none transition"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">О себе</label>
              <textarea
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#E85D4C] focus:ring-2 focus:ring-[#E85D4C]/20 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Образование</label>
              <input
                value={profile.education}
                onChange={(e) => setProfile({ ...profile, education: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#E85D4C] focus:ring-2 focus:ring-[#E85D4C]/20 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Специализация</label>
              <input
                value={profile.specialization}
                onChange={(e) => setProfile({ ...profile, specialization: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#E85D4C] focus:ring-2 focus:ring-[#E85D4C]/20 outline-none transition"
              />
            </div>
          </div>
          <div className="mt-6">
            <button className="px-6 py-3 bg-[#F5C542] hover:bg-[#E5B532] text-gray-900 font-semibold rounded-xl transition flex items-center gap-2">
              <span>💾</span> Сохранить профиль
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <span className="text-amber-500">🔔</span> Уведомления
          </h3>
          <div className="space-y-5">
            <Toggle
              title="Email-уведомления о домашних заданиях"
              description="Получать письма при назначении нового ДЗ"
              checked={notifications.homeworkEmail}
              onChange={() => toggle('homeworkEmail')}
            />
            <Toggle
              title="Email-уведомления о курсах"
              description="Получать письма об обновлениях курсов"
              checked={notifications.courseEmail}
              onChange={() => toggle('courseEmail')}
            />
            <Toggle
              title="Push-уведомления о сообщениях"
              description="Получать push при новых сообщениях"
              checked={notifications.messagePush}
              onChange={() => toggle('messagePush')}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function Toggle({
  title,
  description,
  checked,
  onChange,
}: {
  title: string
  description: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="font-medium text-gray-900">{title}</div>
        <div className="text-sm text-gray-500">{description}</div>
      </div>
      <button
        onClick={onChange}
        className={[
          'w-12 h-7 rounded-full p-1 transition',
          checked ? 'bg-[#4CAF7E]' : 'bg-gray-200',
        ].join(' ')}
      >
        <div
          className={[
            'w-5 h-5 bg-white rounded-full shadow transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0',
          ].join(' ')}
        />
      </button>
    </div>
  )
}
