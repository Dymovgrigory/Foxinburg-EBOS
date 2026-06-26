import { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header'
import { useToast, Button, Card, Badge, Input, Loader, EmptyState, Table, Thead, Th, Tbody, Tr, Td, Modal, Tabs, Select, PageShell } from '../components/ui'
import { usersApi, hrApi, financeApi } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage } from '../utils/error'
import type { User, StaffLeave, StaffKpi, PayrollResponse } from '../types'
import { LuUsers, LuX, LuSearch, LuUser, LuBriefcase, LuDollarSign, LuFileText } from 'react-icons/lu'

const ROLE_FILTERS = [
  { key: 'all', label: 'Все' },
  { key: 'owner', label: 'Владелец' },
  { key: 'super_admin', label: 'Супер-админ' },
  { key: 'admin', label: 'Администратор' },
  { key: 'manager', label: 'Менеджер' },
  { key: 'methodist', label: 'Методист' },
  { key: 'teacher', label: 'Педагог' },
  { key: 'student', label: 'Ученик' },
  { key: 'parent', label: 'Родитель' },
  { key: 'guest', label: 'Гость' },
]

const EMPLOYEE_ROLES = ROLE_FILTERS.filter((f) => f.key !== 'all')

const roleVariants: Record<string, Parameters<typeof Badge>[0]['variant']> = {
  owner: 'error',
  super_admin: 'purple',
  admin: 'info',
  manager: 'warning',
  methodist: 'warning',
  teacher: 'success',
  student: 'default',
  parent: 'default',
  guest: 'default',
}

const leaveTypes = [
  { value: 'vacation', label: 'Отпуск' },
  { value: 'sick', label: 'Больничный' },
  { value: 'day_off', label: 'Отгул' },
]

const kpiUnits = [
  { value: 'lessons', label: 'Занятий' },
  { value: 'students', label: 'Учеников' },
  { value: 'percent', label: 'Процент' },
  { value: 'score', label: 'Баллов' },
]

export default function EmployeesPage() {
  const { showToast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [filter, setFilter] = useState('all')
  const [hrStatusFilter, setHrStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const params: { role?: string; hr_status?: string; search?: string } = {}
      if (filter !== 'all') params.role = filter
      if (hrStatusFilter) params.hr_status = hrStatusFilter
      if (search.trim()) params.search = search.trim()
      const res = await usersApi.employees(params)
      setUsers(res)
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка загрузки'), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [filter, hrStatusFilter])

  useEffect(() => {
    const t = setTimeout(fetchUsers, 300)
    return () => clearTimeout(t)
  }, [search])

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    plan: 'FREE',
    target_language: 'ru',
    position: '',
    salary_type: 'hourly',
    salary_rate: '',
    hr_status: 'active',
    employment_date: '',
    contract_number: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await usersApi.create({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        plan: form.plan,
        position: form.position || undefined,
        salary_type: form.salary_type,
        salary_rate: Number(form.salary_rate) || 0,
        hr_status: form.hr_status,
        employment_date: form.employment_date || undefined,
        contract_number: form.contract_number || undefined,
      })
      setShowForm(false)
      setForm({ name: '', email: '', password: '', role: 'student', plan: 'FREE', target_language: 'ru', position: '', salary_type: 'hourly', salary_rate: '', hr_status: 'active', employment_date: '', contract_number: '' })
      showToast('Пользователь создан', 'success')
      await fetchUsers()
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка создания пользователя'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = useMemo(() => users, [users])

  return (
    <PageShell>
      <Header title="Сотрудники" subtitle={`Всего: ${filtered.length}`} icon={<LuUsers />} />

      <div className="p-4 md:p-6 w-full space-y-6">
        <Card>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-fox-dark">Список сотрудников</h2>
              <p className="text-xs text-fox-gray mt-0.5">{filtered.length} записей</p>
            </div>
            <Button onClick={() => setShowForm(!showForm)} variant={showForm ? 'secondary' : 'primary'} leftIcon={showForm ? <LuX /> : <LuUser />}>
              {showForm ? 'Отмена' : 'Добавить сотрудника'}
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-5">
            <Input
              placeholder="Поиск по имени или email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<LuSearch />}
              className="sm:max-w-sm"
            />
            <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="sm:max-w-xs">
              {ROLE_FILTERS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
            </Select>
            <Select value={hrStatusFilter} onChange={(e) => setHrStatusFilter(e.target.value)} className="sm:max-w-xs">
              <option value="">Все HR-статусы</option>
              <option value="active">Активен</option>
              <option value="on_leave">В отпуске</option>
              <option value="fired">Уволен</option>
              <option value="trial">Испытательный срок</option>
            </Select>
          </div>
        </Card>

        {showForm && (
          <Card>
            <h3 className="text-base font-bold text-fox-dark mb-4">Новый сотрудник / пользователь</h3>
            <form onSubmit={handleSubmit} className="grid md:grid-cols-3 gap-4">
              <Input required placeholder="Имя" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Input required type="password" placeholder="Пароль" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {ROLE_FILTERS.filter((f) => f.key !== 'all').map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
              </Select>
              <Select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}>
                <option value="FREE">FREE</option>
                <option value="PREMIUM">PREMIUM</option>
              </Select>
              <Select value={form.target_language} onChange={(e) => setForm({ ...form, target_language: e.target.value })}>
                <option value="ru">Русский</option>
                <option value="en">English</option>
                <option value="de">Deutsch</option>
              </Select>
              <Input placeholder="Должность" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
              <Select value={form.salary_type} onChange={(e) => setForm({ ...form, salary_type: e.target.value })}>
                <option value="hourly">Почасовая</option>
                <option value="fixed">Фиксированная</option>
                <option value="percent">Процент</option>
              </Select>
              <Input placeholder="Ставка (коп.)" type="number" value={form.salary_rate} onChange={(e) => setForm({ ...form, salary_rate: e.target.value })} />
              <Input placeholder="Дата приёма" type="date" value={form.employment_date} onChange={(e) => setForm({ ...form, employment_date: e.target.value })} />
              <Input placeholder="Номер договора" value={form.contract_number} onChange={(e) => setForm({ ...form, contract_number: e.target.value })} />
              <div className="md:col-span-3">
                <Button type="submit" loading={submitting}>Создать</Button>
              </div>
            </form>
          </Card>
        )}

        {loading ? (
          <Loader text="Загрузка пользователей..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<LuUsers />}
            title="Пользователи не найдены"
            description={search || filter !== 'all' || hrStatusFilter ? 'Попробуй изменить фильтры.' : 'Добавь первого пользователя.'}
            actionLabel={!search && filter === 'all' && !hrStatusFilter ? 'Добавить пользователя' : undefined}
            onAction={!search && filter === 'all' && !hrStatusFilter ? () => setShowForm(true) : undefined}
          />
        ) : (
          <Card padding="none">
            <Table>
              <Thead>
                <tr>
                  <Th>Имя</Th>
                  <Th>Email</Th>
                  <Th>Роль</Th>
                  <Th>Должность</Th>
                  <Th>HR-статус</Th>
                  <Th>Ставка</Th>
                </tr>
              </Thead>
              <Tbody>
                {filtered.map((u) => (
                  <Tr key={u.id} className="cursor-pointer hover:bg-fox-light/50" onClick={() => setSelectedUser(u)}>
                    <Td className="font-medium text-fox-dark">{u.name}</Td>
                    <Td>{u.email}</Td>
                    <Td><Badge variant={roleVariants[u.role] || 'default'}>{roleLabel(u.role)}</Badge></Td>
                    <Td>{u.position || '—'}</Td>
                    <Td>{hrStatusLabel(u.hr_status)}</Td>
                    <Td>{u.salary_rate ? formatMoney(u.salary_rate) : '—'}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Card>
        )}
      </div>

      {selectedUser && (
        <EmployeeModal user={selectedUser} onClose={() => setSelectedUser(null)} onSaved={fetchUsers} />
      )}
    </PageShell>
  )
}

const EMPLOYEE_TABS = [
  { id: 'profile', label: 'Профиль', icon: <LuUser /> },
  { id: 'hr', label: 'Кадры', icon: <LuBriefcase /> },
  { id: 'payroll', label: 'Зарплата', icon: <LuDollarSign /> },
  { id: 'documents', label: 'Документы', icon: <LuFileText /> },
]

function EmployeeModal({ user, onClose, onSaved }: { user: User; onClose: () => void; onSaved: () => void }) {
  const { showToast } = useToast()
  const { user: currentUser } = useAuth()
  const canDeactivate = ['owner', 'super_admin'].includes(currentUser?.role || '')
  const [tab, setTab] = useState('profile')
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState({ ...user })
  const [leaves, setLeaves] = useState<StaffLeave[]>([])
  const [kpis, setKpis] = useState<StaffKpi[]>([])
  const [payroll, setPayroll] = useState<PayrollResponse | null>(null)
  const [documents, setDocuments] = useState<{ id: number; original_name: string; public_url?: string; file_type?: string; size_bytes?: number; created_at: string }[]>([])
  const [payrollDates, setPayrollDates] = useState({ from_date: firstDayOfMonth(), to_date: today() })

  const fetchDetails = async () => {
    try {
      const [u, leavesRes, kpisRes, docsRes] = await Promise.all([
        usersApi.get(user.id),
        hrApi.leaves({ user_id: user.id }),
        hrApi.kpis({ user_id: user.id }),
        usersApi.documents(user.id),
      ])
      setProfile(u)
      setLeaves(leavesRes)
      setKpis(kpisRes)
      setDocuments(docsRes)
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка загрузки карточки'), 'error')
    }
  }

  useEffect(() => {
    fetchDetails()
  }, [user.id])

  useEffect(() => {
    if (tab === 'payroll' && (profile.role === 'teacher' || profile.salary_rate)) {
      financeApi.payroll({ teacher_id: user.id, from_date: payrollDates.from_date, to_date: payrollDates.to_date })
        .then(setPayroll)
        .catch((err: unknown) => showToast(getErrorMessage(err, 'Ошибка расчёта зарплаты'), 'error'))
    }
  }, [tab, payrollDates])

  const handleUpdate = async () => {
    setSaving(true)
    try {
      await usersApi.update(user.id, {
        name: profile.name,
        email: profile.email,
        role: profile.role,
        position: profile.position || undefined,
        salary_type: profile.salary_type,
        salary_rate: profile.salary_rate,
        hr_status: profile.hr_status,
        employment_date: profile.employment_date || undefined,
        contract_number: profile.contract_number || undefined,
      })
      showToast('Сотрудник обновлён', 'success')
      await onSaved()
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка обновления'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async () => {
    if (!confirm('Деактивировать пользователя?')) return
    try {
      await usersApi.delete(user.id)
      showToast('Пользователь деактивирован', 'success')
      onClose()
      await onSaved()
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка деактивации'), 'error')
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={profile.name} size="lg" footer={<><Button variant="ghost" onClick={onClose}>Закрыть</Button><Button onClick={handleUpdate} loading={saving}>Сохранить</Button>{canDeactivate && <Button variant="danger" onClick={handleDeactivate}>Деактивировать</Button>}</>}>
      <Tabs tabs={EMPLOYEE_TABS} activeTab={tab} onChange={setTab} />
      <div className="mt-4">
        {tab === 'profile' && (
          <div className="grid md:grid-cols-2 gap-4">
            <Input label="Имя" value={profile.name || ''} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
            <Input label="Email" value={profile.email || ''} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
            <Select label="Роль" value={profile.role || ''} onChange={(e) => setProfile({ ...profile, role: e.target.value })}>
              {EMPLOYEE_ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </Select>
            <Input label="Телефон" value={profile.phone || ''} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
            <Input label="Telegram chat ID" value={profile.telegram_chat_id || ''} onChange={(e) => setProfile({ ...profile, telegram_chat_id: e.target.value })} />
            <Input label="Филиал ID" value={profile.branch_id ?? ''} onChange={(e) => setProfile({ ...profile, branch_id: Number(e.target.value) || undefined })} />
          </div>
        )}
        {tab === 'hr' && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Input label="Должность" value={profile.position || ''} onChange={(e) => setProfile({ ...profile, position: e.target.value })} />
              <Select label="HR-статус" value={profile.hr_status || 'active'} onChange={(e) => setProfile({ ...profile, hr_status: e.target.value })}>
                <option value="active">Активен</option>
                <option value="on_leave">В отпуске</option>
                <option value="fired">Уволен</option>
                <option value="trial">Испытательный срок</option>
              </Select>
              <Input label="Дата приёма" type="date" value={profile.employment_date || ''} onChange={(e) => setProfile({ ...profile, employment_date: e.target.value })} />
              <Input label="Номер договора" value={profile.contract_number || ''} onChange={(e) => setProfile({ ...profile, contract_number: e.target.value })} />
              <Select label="Тип зарплаты" value={profile.salary_type || 'hourly'} onChange={(e) => setProfile({ ...profile, salary_type: e.target.value })}>
                <option value="hourly">Почасовая</option>
                <option value="fixed">Фиксированная</option>
                <option value="percent">Процент</option>
              </Select>
              <Input label="Ставка (коп./час или фикс)" type="number" value={profile.salary_rate ?? ''} onChange={(e) => setProfile({ ...profile, salary_rate: Number(e.target.value) })} />
            </div>
            <LeavesSection userId={user.id} leaves={leaves} onChange={setLeaves} />
            <KpiSection userId={user.id} kpis={kpis} onChange={setKpis} />
          </div>
        )}
        {tab === 'payroll' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="С" type="date" value={payrollDates.from_date} onChange={(e) => setPayrollDates({ ...payrollDates, from_date: e.target.value })} />
              <Input label="По" type="date" value={payrollDates.to_date} onChange={(e) => setPayrollDates({ ...payrollDates, to_date: e.target.value })} />
            </div>
            {payroll ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <Card><div className="text-xs text-fox-gray">Часов</div><div className="font-bold text-fox-dark">{payroll.total_academic_hours}</div></Card>
                  <Card><div className="text-xs text-fox-gray">Ставка</div><div className="font-bold text-fox-dark">{formatMoney(payroll.rate_kopecks)}</div></Card>
                  <Card accent="gold"><div className="text-xs text-fox-gray">К выплате</div><div className="font-bold text-fox-purple text-xl">{formatMoney(payroll.total_amount_kopecks)}</div></Card>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-fox-light/60 text-fox-graphite"><tr><th className="text-left py-2 px-3">Занятие</th><th className="text-left py-2 px-3">Группа</th><th className="text-left py-2 px-3">Часы</th><th className="text-left py-2 px-3">Сумма</th></tr></thead>
                    <tbody>
                      {payroll.lessons.map((l) => (
                        <tr key={l.schedule_id} className="border-t border-fox-border/50">
                          <td className="py-2 px-3">{l.title}</td>
                          <td className="py-2 px-3">{l.group_name || '—'}</td>
                          <td className="py-2 px-3">{l.academic_hours}</td>
                          <td className="py-2 px-3 font-semibold">{formatMoney(l.amount_kopecks)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <EmptyState icon={<LuDollarSign />} title="Нет данных" description="Выберите период и убедитесь, что у сотрудника есть проведённые занятия." />
            )}
          </div>
        )}
        {tab === 'documents' && (
          <div>
            {documents.length === 0 ? (
              <EmptyState icon={<LuFileText />} title="Документов нет" description="Здесь будут отображаться кадровые документы." />
            ) : (
              <ul className="space-y-2">
                {documents.map((d) => (
                  <li key={d.id} className="flex items-center justify-between p-3 border border-fox-border rounded-xl bg-white">
                    <div>
                      <div className="font-medium text-fox-dark">{d.original_name}</div>
                      <div className="text-xs text-fox-gray">{d.file_type} · {(d.size_bytes ?? 0) / 1024} KB · {new Date(d.created_at).toLocaleDateString('ru-RU')}</div>
                    </div>
                    {d.public_url && <a href={d.public_url} target="_blank" rel="noreferrer" className="text-fox-purple font-semibold text-sm">Открыть</a>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

function LeavesSection({ userId, leaves, onChange }: { userId: number; leaves: StaffLeave[]; onChange: (l: StaffLeave[]) => void }) {
  const { showToast } = useToast()
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({ leave_type: 'vacation', start_date: today, end_date: today, status: 'approved', notes: '' })

  const handleAdd = async () => {
    try {
      const created = await hrApi.createLeave({ user_id: userId, ...form })
      onChange([created, ...leaves])
      showToast('Запись добавлена', 'success')
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка'), 'error')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить запись?')) return
    try {
      await hrApi.deleteLeave(id)
      onChange(leaves.filter((l) => l.id !== id))
      showToast('Запись удалена', 'success')
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка удаления'), 'error')
    }
  }

  return (
    <Card>
      <h4 className="font-bold text-fox-dark mb-3">Отпуска / больничные / отгулы</h4>
      <div className="grid md:grid-cols-5 gap-3 mb-3">
        <Select value={form.leave_type} onChange={(e) => setForm({ ...form, leave_type: e.target.value })}>
          {leaveTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </Select>
        <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
        <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
        <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option value="approved">Утверждено</option>
          <option value="pending">На согласовании</option>
          <option value="rejected">Отклонено</option>
        </Select>
        <Input placeholder="Примечание" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
      <Button size="sm" onClick={handleAdd}>Добавить</Button>
      <div className="mt-3 space-y-2">
        {leaves.map((l) => (
          <div key={l.id} className="flex items-center justify-between p-2 border border-fox-border rounded-lg bg-white text-sm">
            <span>{leaveTypes.find((t) => t.value === l.leave_type)?.label} · {new Date(l.start_date).toLocaleDateString('ru-RU')} – {new Date(l.end_date).toLocaleDateString('ru-RU')} · {l.status}</span>
            <Button size="sm" variant="danger" onClick={() => handleDelete(l.id)}>Удалить</Button>
          </div>
        ))}
      </div>
    </Card>
  )
}

function KpiSection({ userId, kpis, onChange }: { userId: number; kpis: StaffKpi[]; onChange: (k: StaffKpi[]) => void }) {
  const { showToast } = useToast()
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({ period_start: today, period_end: today, metric: '', target: '', actual: '', unit: 'lessons', notes: '' })

  const handleAdd = async () => {
    try {
      const created = await hrApi.createKpi({
        user_id: userId,
        period_start: form.period_start,
        period_end: form.period_end,
        metric: form.metric,
        target: Number(form.target),
        actual: Number(form.actual),
        unit: form.unit,
        notes: form.notes,
      })
      onChange([created, ...kpis])
      showToast('KPI добавлен', 'success')
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка'), 'error')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить KPI?')) return
    try {
      await hrApi.deleteKpi(id)
      onChange(kpis.filter((k) => k.id !== id))
      showToast('KPI удалён', 'success')
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка удаления'), 'error')
    }
  }

  return (
    <Card>
      <h4 className="font-bold text-fox-dark mb-3">KPI</h4>
      <div className="grid md:grid-cols-6 gap-3 mb-3">
        <Input type="date" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} />
        <Input type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} />
        <Input placeholder="Метрика" value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })} />
        <Input placeholder="Цель" type="number" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} />
        <Input placeholder="Факт" type="number" value={form.actual} onChange={(e) => setForm({ ...form, actual: e.target.value })} />
        <Select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
          {kpiUnits.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
        </Select>
      </div>
      <Button size="sm" onClick={handleAdd}>Добавить KPI</Button>
      <div className="mt-3 space-y-2">
        {kpis.map((k) => (
          <div key={k.id} className="flex items-center justify-between p-2 border border-fox-border rounded-lg bg-white text-sm">
            <span>{k.metric} · {k.actual}/{k.target} {kpiUnits.find((u) => u.value === k.unit)?.label} · {Math.round(k.completion_percent)}%</span>
            <Button size="sm" variant="danger" onClick={() => handleDelete(k.id)}>Удалить</Button>
          </div>
        ))}
      </div>
    </Card>
  )
}

function roleLabel(role: string) {
  const labels: Record<string, string> = {
    owner: 'Владелец', super_admin: 'Супер-админ', admin: 'Администратор', manager: 'Менеджер',
    methodist: 'Методист', teacher: 'Педагог', student: 'Ученик', parent: 'Родитель', guest: 'Гость',
  }
  return labels[role] || role
}

function hrStatusLabel(status?: string | null) {
  const labels: Record<string, string> = { active: 'Активен', on_leave: 'В отпуске', fired: 'Уволен', trial: 'Испытательный срок' }
  return labels[status || ''] || status || '—'
}

function formatMoney(k: number) {
  return new Intl.NumberFormat('ru-RU').format(k / 100) + ' ₽'
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function firstDayOfMonth() {
  const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10)
}
