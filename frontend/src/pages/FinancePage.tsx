import { useEffect, useMemo, useState } from 'react'
import { getErrorMessage } from '../utils/error'
import Header from '../components/Header'
import { useToast, Button, Card, Badge, Modal, Input, Select, Loader, EmptyState, Table, Thead, Th, Tbody, Tr, Td, PageShell } from '../components/ui'
import StatCard from '../components/ui/StatCard'
import { financeApi, usersApi } from '../api'
import type { Payment, Transaction, User } from '../types'
import { LuRefreshCw, LuTrendingUp, LuTrendingDown, LuWallet } from 'react-icons/lu'

const METHODS = [
  { value: 'cash', label: 'Наличные' },
  { value: 'card', label: 'Карта' },
  { value: 'transfer', label: 'Перевод' },
]

const STATUSES = [
  { value: 'pending', label: 'В обработке' },
  { value: 'completed', label: 'Завершён' },
  { value: 'cancelled', label: 'Отменён' },
]

export default function FinancePage() {
  const { showToast } = useToast()
  const [payments, setPayments] = useState<Payment[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [analytics, setAnalytics] = useState({ income_kopecks: 0, refund_kopecks: 0, net_kopecks: 0 })
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    student_id: '',
    amount: '',
    type: 'income' as 'income' | 'refund',
    method: 'cash',
    status: 'completed',
    description: '',
  })

  const students = useMemo(() => users.filter((u) => u.role === 'student'), [users])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [paymentsRes, transactionsRes, analyticsRes, usersRes] = await Promise.all([
        financeApi.payments(),
        financeApi.transactions(),
        financeApi.analytics(),
        usersApi.list().catch(() => []),
      ])
      setPayments(paymentsRes)
      setTransactions(transactionsRes)
      setAnalytics(analyticsRes)
      setUsers(usersRes)
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка загрузки финансов'), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const resetForm = () => {
    setForm({ student_id: '', amount: '', type: 'income', method: 'cash', status: 'completed', description: '' })
    setEditingPayment(null)
  }

  const openCreate = () => {
    resetForm()
    setShowModal(true)
  }

  const openEdit = (payment: Payment) => {
    setEditingPayment(payment)
    setForm({
      student_id: String(payment.student_id),
      amount: String(payment.amount / 100),
      type: payment.type,
      method: payment.method,
      status: payment.status,
      description: payment.description || '',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = {
        student_id: Number(form.student_id),
        amount: Math.round(Number(form.amount) * 100),
        type: form.type,
        method: form.method,
        status: form.status,
        description: form.description,
      }
      if (editingPayment) {
        await financeApi.updatePayment(editingPayment.id, payload)
        showToast('Платёж обновлён', 'success')
      } else {
        await financeApi.createPayment(payload)
        showToast('Платёж создан', 'success')
      }
      setShowModal(false)
      resetForm()
      await fetchData()
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка сохранения платежа'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (payment: Payment) => {
    if (!confirm('Удалить платёж?')) return
    try {
      await financeApi.deletePayment(payment.id)
      showToast('Платёж удалён', 'success')
      await fetchData()
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка удаления'), 'error')
    }
  }

  const formatMoney = (kopecks: number) => new Intl.NumberFormat('ru-RU').format(kopecks / 100) + ' ₽'
  const formatDate = (s: string) => new Date(s).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })

  return (
    <PageShell>
      <Header title="Финансы" subtitle="Финансовая аналитика и управление" icon={<LuTrendingUp />} />

      <div className="p-4 md:p-6 w-full space-y-6">
        <div className="relative overflow-hidden rounded-card p-6 md:p-8 border border-fox-border/60 bg-white shadow-fox-lg">
          <div
            className="absolute top-0 right-0 w-64 h-64 pointer-events-none opacity-[0.04]"
            style={{
              backgroundImage: 'url(/brand/swirl-1.png)',
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'top right',
            }}
          />
          <div className="relative z-10 flex items-start gap-5">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-fox-purple text-fox-gold shadow-md flex-shrink-0">
              <LuTrendingUp size={28} />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-fox-purple mb-2">Финансовая аналитика</h2>
              <p className="text-fox-gray max-w-xl">Учёт платежей, транзакций и чистого дохода школы.</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Доходы" value={formatMoney(analytics.income_kopecks)} icon={<LuTrendingUp />} variant="purple" />
          <StatCard title="Возвраты" value={formatMoney(analytics.refund_kopecks)} icon={<LuTrendingDown />} variant="gold" />
          <StatCard title="Чистый доход" value={formatMoney(analytics.net_kopecks)} icon={<LuWallet />} variant="graphite" />
        </div>

        {/* Payments */}
        <Card>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-fox-dark">Платежи</h2>
              <p className="text-xs text-fox-gray mt-0.5">{payments.length} записей</p>
            </div>
            <Button onClick={openCreate} leftIcon={<span className="text-lg leading-none">+</span>}>Новый платёж</Button>
          </div>

          {loading ? (
            <Loader text="Загрузка платежей..." />
          ) : payments.length === 0 ? (
            <EmptyState
              icon={<LuTrendingUp />}
              title="Платежей пока нет"
              description="Создай первый платёж, чтобы начать учёт финансов."
              actionLabel="Новый платёж"
              onAction={openCreate}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <Thead>
                  <tr>
                    <Th>Дата</Th>
                    <Th>Ученик</Th>
                    <Th>Тип</Th>
                    <Th>Способ</Th>
                    <Th>Сумма</Th>
                    <Th>Статус</Th>
                    <Th>Действия</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {payments.map((p) => (
                    <Tr key={p.id}>
                      <Td>{formatDate(p.created_at)}</Td>
                      <Td>{studentName(students, p.student_id)}</Td>
                      <Td>
                        <Badge variant={p.type === 'income' ? 'success' : 'error'}>
                          {p.type === 'income' ? 'Доход' : 'Возврат'}
                        </Badge>
                      </Td>
                      <Td className="capitalize">{methodLabel(p.method)}</Td>
                      <Td className="font-semibold text-fox-dark">{formatMoney(p.amount)}</Td>
                      <Td>
                        <Badge variant={statusVariant(p.status)}>{statusLabel(p.status)}</Badge>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                            Изменить
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => handleDelete(p)}>
                            Удалить
                          </Button>
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          )}
        </Card>

        {/* Transactions */}
        <Card>
          <h2 className="text-lg font-bold text-fox-dark mb-4">Транзакции</h2>
          {loading ? (
            <Loader text="Загрузка транзакций..." />
          ) : transactions.length === 0 ? (
            <EmptyState icon={<LuRefreshCw />} title="Транзакций пока нет" description="Здесь будут автоматические движения по балансу." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <Thead>
                  <tr>
                    <Th>Дата</Th>
                    <Th>Пользователь</Th>
                    <Th>Тип</Th>
                    <Th>Сумма</Th>
                    <Th>Баланс после</Th>
                    <Th>Описание</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {transactions.map((t) => (
                    <Tr key={t.id}>
                      <Td>{formatDate(t.created_at)}</Td>
                      <Td>{studentName(users, t.user_id)}</Td>
                      <Td className="capitalize">{t.type}</Td>
                      <Td className={t.amount >= 0 ? 'text-fox-success font-semibold' : 'text-fox-error font-semibold'}>
                        {formatMoney(t.amount)}
                      </Td>
                      <Td>{formatMoney(t.balance_after)}</Td>
                      <Td className="text-fox-gray">{t.description || '—'}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingPayment ? 'Редактировать платёж' : 'Новый платёж'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>Отмена</Button>
            <Button type="submit" form="payment-form" loading={submitting}>
              {editingPayment ? 'Сохранить' : 'Создать'}
            </Button>
          </>
        }
      >
        <form id="payment-form" onSubmit={handleSubmit} className="grid gap-4">
          <Select
            label="Ученик"
            required
            value={form.student_id}
            onChange={(e) => setForm({ ...form, student_id: e.target.value })}
          >
            <option value="">Выберите ученика</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Сумма (₽)"
              type="number"
              step="0.01"
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
            <Select
              label="Тип"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as 'income' | 'refund' })}
            >
              <option value="income">Доход</option>
              <option value="refund">Возврат</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Способ"
              value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value })}
            >
              {METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </Select>
            <Select
              label="Статус"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>
          </div>
          <Input
            label="Описание"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </form>
      </Modal>
    </PageShell>
  )
}

function studentName(users: User[], id: number) {
  return users.find((u) => u.id === id)?.name || `ID ${id}`
}

function methodLabel(method: string) {
  return METHODS.find((m) => m.value === method)?.label || method
}

function statusLabel(status: string) {
  return STATUSES.find((s) => s.value === status)?.label || status
}

function statusVariant(status: string): Parameters<typeof Badge>[0]['variant'] {
  const map: Record<string, Parameters<typeof Badge>[0]['variant']> = {
    completed: 'success',
    pending: 'warning',
    cancelled: 'error',
  }
  return map[status] || 'default'
}
