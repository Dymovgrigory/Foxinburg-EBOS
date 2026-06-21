import { useEffect, useMemo, useState } from 'react'
import { getErrorMessage } from '../utils/error'
import Header from '../components/Header'
import { useToast, Button, Card, Badge, Modal, Input, Loader, EmptyState, Table, Thead, Th, Tbody, Tr, Td } from '../components/ui'
import { financeApi, usersApi } from '../api'
import type { Payment, Transaction, User } from '../types'

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
    <div className="min-h-screen bg-fox-light">
      <Header title="Финансы" subtitle="Финансовая аналитика и управление" icon="💹" />

      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500 text-white flex items-center justify-center text-xl">↗</div>
            <div>
              <div className="text-2xl font-bold text-fox-dark">{formatMoney(analytics.income_kopecks)}</div>
              <div className="text-xs text-gray-500">Доходы</div>
            </div>
          </Card>
          <Card className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-500 text-white flex items-center justify-center text-xl">↘</div>
            <div>
              <div className="text-2xl font-bold text-fox-dark">{formatMoney(analytics.refund_kopecks)}</div>
              <div className="text-xs text-gray-500">Возвраты</div>
            </div>
          </Card>
          <Card className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-fox-purple text-white flex items-center justify-center text-xl">💰</div>
            <div>
              <div className="text-2xl font-bold text-fox-dark">{formatMoney(analytics.net_kopecks)}</div>
              <div className="text-xs text-gray-500">Чистый доход</div>
            </div>
          </Card>
        </div>

        {/* Payments */}
        <Card>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-fox-dark">Платежи</h2>
              <p className="text-xs text-gray-500 mt-0.5">{payments.length} записей</p>
            </div>
            <Button onClick={openCreate} leftIcon="+">Новый платёж</Button>
          </div>

          {loading ? (
            <Loader text="Загрузка платежей..." />
          ) : payments.length === 0 ? (
            <EmptyState
              icon="💹"
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
            <EmptyState icon="🔄" title="Транзакций пока нет" description="Здесь будут автоматические движения по балансу." />
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
                      <Td className={t.amount >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                        {formatMoney(t.amount)}
                      </Td>
                      <Td>{formatMoney(t.balance_after)}</Td>
                      <Td className="text-gray-500">{t.description || '—'}</Td>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Ученик</label>
            <select
              required
              value={form.student_id}
              onChange={(e) => setForm({ ...form, student_id: e.target.value })}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-fox-gold/50 focus:border-fox-gold bg-white"
            >
              <option value="">Выберите ученика</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Сумма (₽)"
              type="number"
              step="0.01"
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Тип</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as 'income' | 'refund' })}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-fox-gold/50 focus:border-fox-gold bg-white"
              >
                <option value="income">Доход</option>
                <option value="refund">Возврат</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Способ</label>
              <select
                value={form.method}
                onChange={(e) => setForm({ ...form, method: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-fox-gold/50 focus:border-fox-gold bg-white"
              >
                {METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Статус</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-fox-gold/50 focus:border-fox-gold bg-white"
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
          <Input
            label="Описание"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </form>
      </Modal>
    </div>
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
