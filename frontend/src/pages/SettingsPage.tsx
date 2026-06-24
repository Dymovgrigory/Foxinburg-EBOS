import React, { useEffect, useState } from 'react'
import { getErrorMessage } from '../utils/error'
import Header from '../components/Header'
import { useToast, Button, Card, Input, Badge } from '../components/ui'
import MaxLinkSection from '../components/MaxLinkSection'
import { useAuth } from '../contexts/AuthContext'
import { authApi } from '../api'
import { LuBell, LuLock, LuUser, LuWrench, LuSave, LuKeyRound } from 'react-icons/lu'

export default function SettingsPage() {
  const { user, login } = useAuth()
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)

  const [profile, setProfile] = useState({ name: '', phone: '', bio: '' })
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' })

  useEffect(() => {
    if (user) {
      setProfile({ name: user.name || '', phone: user.phone || '', bio: user.bio || '' })
    }
  }, [user])

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const updated = await authApi.updateMe(profile)
      login(updated, localStorage.getItem('token') || '')
      showToast('Профиль сохранён', 'success')
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка сохранения'), 'error')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwords.new !== passwords.confirm) {
      showToast('Пароли не совпадают', 'error')
      return
    }
    setLoading(true)
    try {
      await authApi.changePassword(passwords.current, passwords.new)
      setPasswords({ current: '', new: '', confirm: '' })
      showToast('Пароль изменён', 'success')
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка смены пароля'), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-fox-light">
      <Header title="Настройки" icon={<LuWrench />} />

      <div className="p-4 md:p-6 w-full space-y-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <Card className="md:w-64 h-fit p-2">
            <div className="space-y-1">
              <SidebarButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<LuUser />}>
                Профиль
              </SidebarButton>
              <SidebarButton active={activeTab === 'security'} onClick={() => setActiveTab('security')} icon={<LuLock />}>
                Безопасность
              </SidebarButton>
              <SidebarButton active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} icon={<LuBell />}>
                Уведомления
              </SidebarButton>
            </div>
          </Card>

          {/* Content */}
          <div className="flex-1 space-y-6">
            {activeTab === 'profile' && (
              <Card>
                <h2 className="text-lg font-bold text-fox-dark mb-6 flex items-center gap-2">
                  <LuUser className="text-fox-gold" /> Профиль
                </h2>
                <form onSubmit={handleProfileSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Input
                    label="Имя"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  />
                  <Input label="Email" value={user?.email || ''} disabled />
                  <Input
                    label="Телефон"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  />
                  <div>
                    <label className="block text-sm font-medium text-fox-graphite mb-1.5">Роль</label>
                    <div className="px-4 py-2.5 border border-fox-border rounded-xl bg-fox-light/50 text-fox-gray text-sm">
                      <Badge variant="purple">{roleLabel(user?.role)}</Badge>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-fox-graphite mb-1.5">О себе</label>
                    <textarea
                      value={profile.bio}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      rows={4}
                      className="w-full rounded-xl border border-fox-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-fox-gold/50 focus:border-fox-gold"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Button type="submit" loading={loading} leftIcon={<LuSave size={16} />}>
                      Сохранить профиль
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {activeTab === 'security' && (
              <Card>
                <h2 className="text-lg font-bold text-fox-dark mb-6 flex items-center gap-2">
                  <LuLock className="text-fox-gold" /> Безопасность
                </h2>
                <form onSubmit={handlePasswordSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Input
                    label="Текущий пароль"
                    type="password"
                    required
                    value={passwords.current}
                    onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                  />
                  <div />
                  <Input
                    label="Новый пароль"
                    type="password"
                    required
                    value={passwords.new}
                    onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                  />
                  <Input
                    label="Повторите новый пароль"
                    type="password"
                    required
                    value={passwords.confirm}
                    onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                  />
                  <div className="md:col-span-2">
                    <Button type="submit" loading={loading} leftIcon={<LuKeyRound size={16} />}>
                      Изменить пароль
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {activeTab === 'notifications' && (
              <Card>
                <h2 className="text-lg font-bold text-fox-dark mb-6 flex items-center gap-2">
                  <LuBell className="text-fox-gold" /> Уведомления
                </h2>
                <div className="space-y-4">
                  <NotificationRow title="Email-уведомления" description="Получать важные уведомления на email." />
                  <MaxLinkSection />
                  <NotificationRow title="Расписание" description="Уведомления о предстоящих занятиях." />
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function SidebarButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition',
        active ? 'bg-fox-purple text-white shadow-sm' : 'text-fox-gray hover:bg-fox-light',
      ].join(' ')}
    >
      <span>{icon}</span>
      {children}
    </button>
  )
}

function NotificationRow({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-center justify-between p-4 bg-fox-light rounded-xl border border-fox-border/30">
      <div>
        <div className="font-medium text-fox-dark">{title}</div>
        <div className="text-xs text-fox-gray">{description}</div>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" className="sr-only peer" defaultChecked />
        <div className="w-11 h-6 bg-fox-light peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-fox-gold rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-fox-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-fox-purple" />
      </label>
    </div>
  )
}

function roleLabel(role?: string) {
  const labels: Record<string, string> = {
    owner: 'Владелец',
    super_admin: 'Супер-админ',
    admin: 'Администратор',
    methodist: 'Методист',
    teacher: 'Педагог',
    manager: 'Менеджер',
    student: 'Ученик',
    parent: 'Родитель',
    guest: 'Гость',
  }
  return labels[role || ''] || role
}
