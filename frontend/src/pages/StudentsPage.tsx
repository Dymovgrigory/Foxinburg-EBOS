import { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header'
import api from '../services/api'
import { usersApi, groupsApi } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage } from '../utils/error'
import { useToast, Button, Card, Badge, Input, Loader, EmptyState, Table, Thead, Th, Tbody, Tr, Td, Modal, Select } from '../components/ui'
import { LuGraduationCap, LuX } from 'react-icons/lu'
import type { User, Group } from '../types'

export default function StudentsPage() {
  const { showToast } = useToast()
  const { user } = useAuth()
  const role = user?.role || ''
  const canCreate = ['owner', 'super_admin', 'admin'].includes(role)
  const canViewCard = ['owner', 'super_admin', 'admin', 'manager', 'methodist'].includes(role)
  const canEdit = ['owner', 'super_admin', 'admin'].includes(role)
  const canDeactivate = ['owner', 'super_admin'].includes(role)
  const [students, setStudents] = useState<User[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', group_id: '' })
  const [selected, setSelected] = useState<User | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [allUsers, groupsRes] = await Promise.all([usersApi.listStudents(), groupsApi.list()])
      setStudents(allUsers.filter((u) => u.role === 'student'))
      setGroups(groupsRes)
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка загрузки'), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filtered = useMemo(() => {
    if (!search) return students
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase())
    )
  }, [students, search])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await api.post('/users', {
        name: form.name,
        email: form.email,
        password: form.password,
        role: 'student',
        plan: 'FREE',
        target_language: 'ru',
      })
      const newId: number | undefined = res.data?.data?.id
      if (newId && form.group_id) {
        await usersApi.update(newId, { group_id: Number(form.group_id) })
      }
      setShowForm(false)
      setForm({ name: '', email: '', password: '', group_id: '' })
      showToast('Ученик добавлен', 'success')
      await fetchData()
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка создания ученика'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-fox-light">
      <Header title="Ученики" subtitle={`Всего: ${filtered.length}`} icon={<LuGraduationCap />} />

      <div className="p-4 md:p-6 w-full space-y-6">
        <Card>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-fox-dark">Список учеников</h2>
              <p className="text-xs text-fox-gray mt-0.5">{filtered.length} из {students.length}</p>
            </div>
            {canCreate && (
              <Button onClick={() => setShowForm(!showForm)} variant={showForm ? 'secondary' : 'primary'} leftIcon={showForm ? <LuX /> : '+'}>
                {showForm ? 'Отмена' : 'Добавить ученика'}
              </Button>
            )}
          </div>

          <div className="mt-5 max-w-sm">
            <Input
              placeholder="Поиск по имени или email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </Card>

        {showForm && (
          <Card>
            <h3 className="text-base font-bold text-fox-dark mb-4">Новый ученик</h3>
            <form onSubmit={handleSubmit} className="grid md:grid-cols-4 gap-4">
              <Input required placeholder="Имя" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Input required type="password" placeholder="Пароль" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <select
                value={form.group_id}
                onChange={(e) => setForm({ ...form, group_id: e.target.value })}
                className="px-4 py-2.5 border border-fox-border rounded-xl text-sm text-fox-graphite focus:outline-none focus:ring-2 focus:ring-fox-gold/50 focus:border-fox-gold bg-white"
              >
                <option value="">Без группы</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              <div className="md:col-span-4">
                <Button type="submit" loading={submitting}>Создать ученика</Button>
              </div>
            </form>
          </Card>
        )}

        {loading ? (
          <Loader text="Загрузка учеников..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<LuGraduationCap />}
            title="Ученики не найдены"
            description={search ? 'Попробуй изменить поиск.' : 'Добавь первого ученика, чтобы начать.'}
            actionLabel={canCreate && !search ? 'Добавить ученика' : undefined}
            onAction={canCreate && !search ? () => setShowForm(true) : undefined}
          />
        ) : (
          <Card padding="none">
            <Table>
              <Thead>
                <tr>
                  <Th>Имя</Th>
                  <Th>Email</Th>
                  <Th>Группа</Th>
                  <Th>Статус</Th>
                </tr>
              </Thead>
              <Tbody>
                {filtered.map((s) => (
                  <Tr
                    key={s.id}
                    className={canViewCard ? 'cursor-pointer hover:bg-fox-light/50' : undefined}
                    onClick={canViewCard ? () => setSelected(s) : undefined}
                  >
                    <Td className="font-medium text-fox-dark">{s.name}</Td>
                    <Td>{s.email}</Td>
                    <Td>{groups.find((g) => g.id === s.group_id)?.name || '—'}</Td>
                    <Td>
                      {s.is_active ? (
                        <Badge variant="success">Активен</Badge>
                      ) : (
                        <Badge variant="default">Неактивен</Badge>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Card>
        )}
      </div>

      {selected && (
        <StudentModal
          student={selected}
          groups={groups}
          canEdit={canEdit}
          canDeactivate={canDeactivate}
          onClose={() => setSelected(null)}
          onSaved={fetchData}
        />
      )}
    </div>
  )
}

function formatMoney(kopecks?: number) {
  return `${((kopecks || 0) / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`
}

function formatDate(value?: string) {
  if (!value) return '—'
  return new Date(value).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' })
}

function StudentModal({
  student,
  groups,
  canEdit,
  canDeactivate,
  onClose,
  onSaved,
}: {
  student: User
  groups: Group[]
  canEdit: boolean
  canDeactivate: boolean
  onClose: () => void
  onSaved: () => Promise<void> | void
}) {
  const { showToast } = useToast()
  const [profile, setProfile] = useState<User>(student)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    usersApi
      .get(student.id)
      .then((u) => {
        if (active) setProfile(u)
      })
      .catch((err: unknown) => showToast(getErrorMessage(err, 'Ошибка загрузки карточки'), 'error'))
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [student.id])

  const handleSave = async () => {
    setSaving(true)
    try {
      await usersApi.update(student.id, {
        name: profile.name,
        phone: profile.phone || null,
        group_id: profile.group_id ?? null,
        plan: profile.plan,
        is_active: profile.is_active,
      })
      showToast('Ученик обновлён', 'success')
      await onSaved()
      onClose()
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка обновления'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async () => {
    if (!confirm('Деактивировать ученика?')) return
    try {
      await usersApi.delete(student.id)
      showToast('Ученик деактивирован', 'success')
      await onSaved()
      onClose()
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка деактивации'), 'error')
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={profile.name}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Закрыть</Button>
          {canEdit && <Button onClick={handleSave} loading={saving}>Сохранить</Button>}
          {canDeactivate && profile.is_active && (
            <Button variant="danger" onClick={handleDeactivate}>Деактивировать</Button>
          )}
        </>
      }
    >
      {loading ? (
        <Loader text="Загрузка карточки..." />
      ) : (
        <div className="space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Имя"
              value={profile.name || ''}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              disabled={!canEdit}
            />
            <Input label="Email" value={profile.email || ''} disabled helper="Email изменить нельзя" />
            <Input
              label="Телефон"
              value={profile.phone || ''}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              disabled={!canEdit}
            />
            <Select
              label="Группа"
              value={profile.group_id ?? ''}
              onChange={(e) => setProfile({ ...profile, group_id: e.target.value ? Number(e.target.value) : null })}
              disabled={!canEdit}
            >
              <option value="">Без группы</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </Select>
            <Select
              label="Тариф"
              value={profile.plan || 'FREE'}
              onChange={(e) => setProfile({ ...profile, plan: e.target.value })}
              disabled={!canEdit}
            >
              <option value="FREE">FREE</option>
              <option value="PREMIUM">PREMIUM</option>
            </Select>
            <Select
              label="Статус"
              value={profile.is_active ? 'active' : 'inactive'}
              onChange={(e) => setProfile({ ...profile, is_active: e.target.value === 'active' })}
              disabled={!canEdit}
            >
              <option value="active">Активен</option>
              <option value="inactive">Неактивен</option>
            </Select>
          </div>

          <div>
            <h4 className="text-sm font-bold text-fox-dark mb-2">Игровой прогресс и финансы</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Card><div className="text-xs text-fox-gray">Уровень</div><div className="font-bold text-fox-dark">{profile.level ?? 0}</div></Card>
              <Card><div className="text-xs text-fox-gray">XP</div><div className="font-bold text-fox-dark">{profile.xp ?? 0}</div></Card>
              <Card><div className="text-xs text-fox-gray">Коины</div><div className="font-bold text-fox-dark">{profile.coins ?? 0}</div></Card>
              <Card><div className="text-xs text-fox-gray">Баланс</div><div className="font-bold text-fox-dark">{formatMoney(profile.balance)}</div></Card>
              <Card><div className="text-xs text-fox-gray">Долг</div><div className="font-bold text-fox-dark">{formatMoney(profile.debt)}</div></Card>
              <Card>
                <div className="text-xs text-fox-gray">Статус</div>
                <div className="mt-0.5">{profile.is_active ? <Badge variant="success">Активен</Badge> : <Badge variant="default">Неактивен</Badge>}</div>
              </Card>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between border-b border-fox-border py-1.5">
              <span className="text-fox-gray">Дата регистрации</span>
              <span className="text-fox-dark">{formatDate(profile.created_at)}</span>
            </div>
            <div className="flex justify-between border-b border-fox-border py-1.5">
              <span className="text-fox-gray">Последний вход</span>
              <span className="text-fox-dark">{formatDate(profile.last_login_at)}</span>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
