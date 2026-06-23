import { useEffect, useState } from 'react'
import { getErrorMessage } from '../utils/error'
import Header from '../components/Header'
import { useToast, Button, Card, Badge, Modal, Input, Select, Loader, EmptyState, Tabs, StatCard, PageShell } from '../components/ui'
import { financeApi, usersApi, groupsApi, branchesApi } from '../api'
import type { Payment, Transaction, Invoice, Expense, PayrollResponse, PnLResponse, User, Group, Branch } from '../types'
import {
  LuTrendingUp,
  LuTrendingDown,
  LuFileText,
  LuTriangle,
  LuDollarSign,
  LuCalculator,
  LuUsers,
  LuPlus,
} from 'react-icons/lu'

const TABS = [
  { id: 'invoices', label: 'Счета', icon: <LuFileText /> },
  { id: 'payments', label: 'Платежи', icon: <LuDollarSign /> },
  { id: 'transactions', label: 'Транзакции', icon: <LuTrendingUp /> },
  { id: 'debtors', label: 'Должники', icon: <LuTriangle /> },
  { id: 'expenses', label: 'Расходы', icon: <LuTrendingDown /> },
  { id: 'payroll', label: 'Зарплаты', icon: <LuUsers /> },
  { id: 'pnl', label: 'P&L', icon: <LuCalculator /> },
]

const METHODS = [
  { value: 'cash', label: 'Наличные' },
  { value: 'card', label: 'Карта' },
  { value: 'transfer', label: 'Перевод' },
]

const EXPENSE_CATEGORIES = [
  { value: 'salary', label: 'Зарплата' },
  { value: 'rent', label: 'Аренда' },
  { value: 'marketing', label: 'Маркетинг' },
  { value: 'materials', label: 'Материалы' },
  { value: 'other', label: 'Прочее' },
]

export default function FinancePage() {
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState('invoices')
  const [loading, setLoading] = useState(true)

  const [payments, setPayments] = useState<Payment[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [debtors, setDebtors] = useState<{ student_id: number; student_name: string; total_debt_kopecks: number; invoices: Invoice[] }[]>([])
  const [analytics, setAnalytics] = useState({
    income_kopecks: 0,
    refund_kopecks: 0,
    net_kopecks: 0,
    invoices_total_kopecks: 0,
    invoices_paid_kopecks: 0,
    debt_kopecks: 0,
    expenses_kopecks: 0,
    pnl_kopecks: 0,
  })
  const [users, setUsers] = useState<User[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [branches, setBranches] = useState<Branch[]>([])

  // Period filters
  const [periodFrom, setPeriodFrom] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().slice(0, 10)
  })
  const [periodTo, setPeriodTo] = useState(() => new Date().toISOString().slice(0, 10))

  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showPayrollModal, setShowPayrollModal] = useState(false)
  const [payrollResult, setPayrollResult] = useState<PayrollResponse | null>(null)
  const [pnlResult, setPnlResult] = useState<PnLResponse | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [paymentsRes, transactionsRes, invoicesRes, expensesRes, debtorsRes, analyticsRes, usersRes, groupsRes, branchesRes] = await Promise.all([
        financeApi.payments(),
        financeApi.transactions(),
        financeApi.invoices(),
        financeApi.expenses(),
        financeApi.debtors(),
        financeApi.analytics(),
        usersApi.list().catch(() => []),
        groupsApi.list().catch(() => []),
        branchesApi.list().catch(() => []),
      ])
      setPayments(paymentsRes)
      setTransactions(transactionsRes)
      setInvoices(invoicesRes)
      setExpenses(expensesRes)
      setDebtors(debtorsRes)
      setAnalytics(analyticsRes)
      setUsers(usersRes)
      setGroups(groupsRes)
      setBranches(branchesRes)
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка загрузки финансов'), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const fetchPnl = async () => {
    try {
      const res = await financeApi.pnl({ from_date: periodFrom, to_date: periodTo })
      setPnlResult(res)
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка P&L'), 'error')
    }
  }

  useEffect(() => {
    if (activeTab === 'pnl') fetchPnl()
  }, [activeTab, periodFrom, periodTo])

  const formatMoney = (kopecks: number) => new Intl.NumberFormat('ru-RU').format(kopecks / 100) + ' ₽'

  const handleDeletePayment = async (id: number) => {
    if (!confirm('Удалить платёж?')) return
    try {
      await financeApi.deletePayment(id)
      showToast('Платёж удалён', 'success')
      await fetchData()
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка удаления'), 'error')
    }
  }

  const handlePayInvoice = async (invoice: Invoice) => {
    try {
      await financeApi.payInvoice(invoice.id, { amount: invoice.amount, method: 'cash' })
      showToast('Счёт оплачен', 'success')
      await fetchData()
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка оплаты'), 'error')
    }
  }

  const handleDeleteInvoice = async (id: number) => {
    if (!confirm('Удалить счёт?')) return
    try {
      await financeApi.deleteInvoice(id)
      showToast('Счёт удалён', 'success')
      await fetchData()
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка удаления'), 'error')
    }
  }

  const handleDeleteExpense = async (id: number) => {
    if (!confirm('Удалить расход?')) return
    try {
      await financeApi.deleteExpense(id)
      showToast('Расход удалён', 'success')
      await fetchData()
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка удаления'), 'error')
    }
  }

  const handleCalculatePayroll = async (teacherId: number, fromDate: string, toDate: string) => {
    try {
      const res = await financeApi.payroll({ teacher_id: teacherId, from_date: fromDate, to_date: toDate })
      setPayrollResult(res)
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка расчёта'), 'error')
    }
  }

  return (
    <PageShell>
      <Header title="Финансы" subtitle="Учёт платежей, счетов, расходов и зарплат" icon={<LuTrendingUp />} />

      <div className="p-4 md:p-6 w-full space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Доходы" value={formatMoney(analytics.income_kopecks)} icon={<LuTrendingUp />} variant="purple" />
          <StatCard title="Расходы" value={formatMoney(analytics.expenses_kopecks)} icon={<LuTrendingDown />} variant="gold" />
          <StatCard title="Задолженность" value={formatMoney(analytics.debt_kopecks)} icon={<LuTriangle />} variant="outline" />
          <StatCard title="P&L" value={formatMoney(analytics.pnl_kopecks)} icon={<LuCalculator />} variant="graphite" />
        </div>

        <Card>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
            <div className="flex items-center gap-2">
              {activeTab === 'pnl' && (
                <>
                  <Input type="date" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} />
                  <Input type="date" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} />
                </>
              )}
              {activeTab === 'payments' && (
                <Button leftIcon={<LuPlus />} onClick={() => setShowPaymentModal(true)}>Новый платёж</Button>
              )}
              {activeTab === 'invoices' && (
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setShowGenerateModal(true)}>Сгенерировать</Button>
                  <Button leftIcon={<LuPlus />} onClick={() => setShowInvoiceModal(true)}>Новый счёт</Button>
                </div>
              )}
              {activeTab === 'expenses' && (
                <Button leftIcon={<LuPlus />} onClick={() => setShowExpenseModal(true)}>Новый расход</Button>
              )}
              {activeTab === 'payroll' && (
                <Button leftIcon={<LuCalculator />} onClick={() => setShowPayrollModal(true)}>Рассчитать ЗП</Button>
              )}
            </div>
          </div>
        </Card>

        {loading ? (
          <Loader text="Загрузка финансов..." />
        ) : (
          <Card padding="none">
            {activeTab === 'invoices' && (
              <InvoicesTab
                invoices={invoices}
                users={users}
                groups={groups}
                onPay={handlePayInvoice}
                onDelete={handleDeleteInvoice}
              />
            )}
            {activeTab === 'payments' && (
              <PaymentsTab payments={payments} users={users} onDelete={handleDeletePayment} />
            )}
            {activeTab === 'transactions' && (
              <TransactionsTab transactions={transactions} users={users} />
            )}
            {activeTab === 'debtors' && (
              <DebtorsTab debtors={debtors} onPayInvoice={handlePayInvoice} />
            )}
            {activeTab === 'expenses' && (
              <ExpensesTab expenses={expenses} branches={branches} onDelete={handleDeleteExpense} />
            )}
            {activeTab === 'payroll' && (
              <PayrollTab payrollResult={payrollResult} />
            )}
            {activeTab === 'pnl' && (
              <PnLTab pnl={pnlResult} formatMoney={formatMoney} />
            )}
          </Card>
        )}
      </div>

      <PaymentModal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} users={users} onSaved={fetchData} />
      <InvoiceModal isOpen={showInvoiceModal} onClose={() => setShowInvoiceModal(false)} users={users} groups={groups} onSaved={fetchData} />
      <GenerateInvoicesModal isOpen={showGenerateModal} onClose={() => setShowGenerateModal(false)} groups={groups} onSaved={fetchData} />
      <ExpenseModal isOpen={showExpenseModal} onClose={() => setShowExpenseModal(false)} branches={branches} onSaved={fetchData} />
      <PayrollModal
        isOpen={showPayrollModal}
        onClose={() => { setShowPayrollModal(false); setPayrollResult(null) }}
        users={users}
        onCalculate={handleCalculatePayroll}
        payrollResult={payrollResult}
        formatMoney={formatMoney}
      />
    </PageShell>
  )
}

function InvoicesTab({
  invoices,
  users,
  groups,
  onPay,
  onDelete,
}: {
  invoices: Invoice[]
  users: User[]
  groups: Group[]
  onPay: (invoice: Invoice) => void
  onDelete: (id: number) => void
}) {
  const userName = (id?: number | null) => users.find((u) => u.id === id)?.name || `ID ${id}`
  const groupName = (id?: number | null) => groups.find((g) => g.id === id)?.name || `ID ${id}`
  const statusVariant = (status: string): Parameters<typeof Badge>[0]['variant'] => {
    const map: Record<string, Parameters<typeof Badge>[0]['variant']> = {
      draft: 'default',
      sent: 'info',
      paid: 'success',
      cancelled: 'default',
      overdue: 'error',
    }
    return map[status] || 'default'
  }
  const statusLabel = (status: string) => {
    const map: Record<string, string> = { draft: 'Черновик', sent: 'Выставлен', paid: 'Оплачен', cancelled: 'Отменён', overdue: 'Просрочен' }
    return map[status] || status
  }
  const formatMoney = (k: number) => new Intl.NumberFormat('ru-RU').format(k / 100) + ' ₽'
  const formatDate = (s?: string | null) => (s ? new Date(s).toLocaleDateString('ru-RU') : '—')

  if (invoices.length === 0) return <EmptyState icon={<LuFileText />} title="Счетов пока нет" description="Создайте счёт вручную или сгенерируйте по группе." />

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-fox-light/60 text-fox-graphite">
          <tr>
            <th className="text-left py-3 px-4 font-semibold">Дата</th>
            <th className="text-left py-3 px-4 font-semibold">Ученик</th>
            <th className="text-left py-3 px-4 font-semibold">Группа</th>
            <th className="text-left py-3 px-4 font-semibold">Период</th>
            <th className="text-left py-3 px-4 font-semibold">Сумма</th>
            <th className="text-left py-3 px-4 font-semibold">Статус</th>
            <th className="text-left py-3 px-4 font-semibold">Действия</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id} className="border-t border-fox-border/50">
              <td className="py-3 px-4 whitespace-nowrap">{formatDate(inv.created_at)}</td>
              <td className="py-3 px-4">{userName(inv.student_id)}</td>
              <td className="py-3 px-4">{groupName(inv.group_id)}</td>
              <td className="py-3 px-4 whitespace-nowrap">{formatDate(inv.period_start)} – {formatDate(inv.period_end)}</td>
              <td className="py-3 px-4 font-semibold text-fox-dark">{formatMoney(inv.amount)}</td>
              <td className="py-3 px-4"><Badge variant={statusVariant(inv.status)}>{statusLabel(inv.status)}</Badge></td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                    <Button size="sm" onClick={() => onPay(inv)}>Оплатить</Button>
                  )}
                  <Button size="sm" variant="danger" onClick={() => onDelete(inv.id)}>Удалить</Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PaymentsTab({ payments, users, onDelete }: { payments: Payment[]; users: User[]; onDelete: (id: number) => void }) {
  const userName = (id?: number) => users.find((u) => u.id === id)?.name || `ID ${id}`
  const formatMoney = (k: number) => new Intl.NumberFormat('ru-RU').format(k / 100) + ' ₽'
  const formatDate = (s: string) => new Date(s).toLocaleDateString('ru-RU')
  if (payments.length === 0) return <EmptyState icon={<LuDollarSign />} title="Платежей пока нет" description="Создайте первый платёж." />
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-fox-light/60 text-fox-graphite"><tr><th className="text-left py-3 px-4 font-semibold">Дата</th><th className="text-left py-3 px-4 font-semibold">Ученик</th><th className="text-left py-3 px-4 font-semibold">Тип</th><th className="text-left py-3 px-4 font-semibold">Способ</th><th className="text-left py-3 px-4 font-semibold">Сумма</th><th className="text-left py-3 px-4 font-semibold">Статус</th><th className="text-left py-3 px-4 font-semibold">Действия</th></tr></thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id} className="border-t border-fox-border/50">
              <td className="py-3 px-4 whitespace-nowrap">{formatDate(p.created_at)}</td>
              <td className="py-3 px-4">{userName(p.student_id)}</td>
              <td className="py-3 px-4"><Badge variant={p.type === 'income' ? 'success' : 'error'}>{p.type === 'income' ? 'Доход' : 'Возврат'}</Badge></td>
              <td className="py-3 px-4 capitalize">{p.method}</td>
              <td className="py-3 px-4 font-semibold text-fox-dark">{formatMoney(p.amount)}</td>
              <td className="py-3 px-4"><Badge variant={p.status === 'completed' ? 'success' : p.status === 'pending' ? 'warning' : 'error'}>{p.status}</Badge></td>
              <td className="py-3 px-4"><Button size="sm" variant="danger" onClick={() => onDelete(p.id)}>Удалить</Button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TransactionsTab({ transactions, users }: { transactions: Transaction[]; users: User[] }) {
  const userName = (id: number) => users.find((u) => u.id === id)?.name || `ID ${id}`
  const formatMoney = (k: number) => new Intl.NumberFormat('ru-RU').format(k / 100) + ' ₽'
  const formatDate = (s: string) => new Date(s).toLocaleDateString('ru-RU')
  if (transactions.length === 0) return <EmptyState icon={<LuTrendingUp />} title="Транзакций пока нет" description="Здесь будут автоматические движения по балансу." />
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-fox-light/60 text-fox-graphite"><tr><th className="text-left py-3 px-4 font-semibold">Дата</th><th className="text-left py-3 px-4 font-semibold">Пользователь</th><th className="text-left py-3 px-4 font-semibold">Тип</th><th className="text-left py-3 px-4 font-semibold">Сумма</th><th className="text-left py-3 px-4 font-semibold">Баланс после</th><th className="text-left py-3 px-4 font-semibold">Описание</th></tr></thead>
        <tbody>
          {transactions.map((t) => (
            <tr key={t.id} className="border-t border-fox-border/50">
              <td className="py-3 px-4 whitespace-nowrap">{formatDate(t.created_at)}</td>
              <td className="py-3 px-4">{userName(t.user_id)}</td>
              <td className="py-3 px-4">{t.type}</td>
              <td className={['py-3 px-4 font-semibold', t.amount >= 0 ? 'text-fox-success' : 'text-fox-error'].join(' ')}>{formatMoney(t.amount)}</td>
              <td className="py-3 px-4">{formatMoney(t.balance_after)}</td>
              <td className="py-3 px-4 text-fox-gray">{t.description || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DebtorsTab({ debtors, onPayInvoice }: { debtors: { student_id: number; student_name: string; total_debt_kopecks: number; invoices: Invoice[] }[]; onPayInvoice: (invoice: Invoice) => void }) {
  const formatMoney = (k: number) => new Intl.NumberFormat('ru-RU').format(k / 100) + ' ₽'
  if (debtors.length === 0) return <EmptyState icon={<LuTriangle />} title="Должников нет" description="Все счета оплачены." />
  return (
    <div className="space-y-4 p-4">
      {debtors.map((d) => (
        <div key={d.student_id} className="border border-fox-border rounded-xl p-4 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="font-bold text-fox-dark text-lg">{d.student_name}</div>
            <Badge variant="error">Долг: {formatMoney(d.total_debt_kopecks)}</Badge>
          </div>
          <div className="space-y-2">
            {d.invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between text-sm py-2 border-t border-fox-border/40">
                <span className="text-fox-gray">Счёт #{inv.id} · {formatMoney(inv.amount)} · до {inv.due_date ? new Date(inv.due_date).toLocaleDateString('ru-RU') : '—'}</span>
                <Button size="sm" onClick={() => onPayInvoice(inv)}>Оплатить</Button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function ExpensesTab({ expenses, branches, onDelete }: { expenses: Expense[]; branches: Branch[]; onDelete: (id: number) => void }) {
  const branchName = (id?: number | null) => branches.find((b) => b.id === id)?.name || `ID ${id}`
  const formatMoney = (k: number) => new Intl.NumberFormat('ru-RU').format(k / 100) + ' ₽'
  const formatDate = (s: string) => new Date(s).toLocaleDateString('ru-RU')
  const catLabel = (c: string) => EXPENSE_CATEGORIES.find((x) => x.value === c)?.label || c
  if (expenses.length === 0) return <EmptyState icon={<LuTrendingDown />} title="Расходов пока нет" description="Добавьте первый расход." />
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-fox-light/60 text-fox-graphite"><tr><th className="text-left py-3 px-4 font-semibold">Дата</th><th className="text-left py-3 px-4 font-semibold">Категория</th><th className="text-left py-3 px-4 font-semibold">Филиал</th><th className="text-left py-3 px-4 font-semibold">Сумма</th><th className="text-left py-3 px-4 font-semibold">Описание</th><th className="text-left py-3 px-4 font-semibold">Действия</th></tr></thead>
        <tbody>
          {expenses.map((e) => (
            <tr key={e.id} className="border-t border-fox-border/50">
              <td className="py-3 px-4 whitespace-nowrap">{formatDate(e.expense_date)}</td>
              <td className="py-3 px-4">{catLabel(e.category)}</td>
              <td className="py-3 px-4">{branchName(e.branch_id)}</td>
              <td className="py-3 px-4 font-semibold text-fox-error">{formatMoney(e.amount)}</td>
              <td className="py-3 px-4 text-fox-gray">{e.description || '—'}</td>
              <td className="py-3 px-4"><Button size="sm" variant="danger" onClick={() => onDelete(e.id)}>Удалить</Button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PayrollTab({ payrollResult }: { payrollResult: PayrollResponse | null }) {
  const formatMoney = (k: number) => new Intl.NumberFormat('ru-RU').format(k / 100) + ' ₽'
  const formatDateTime = (s: string) => new Date(s).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  if (!payrollResult) return <EmptyState icon={<LuCalculator />} title="Расчёт не выполнен" description="Выберите преподавателя и период, чтобы рассчитать зарплату." />
  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><div className="text-xs text-fox-gray">Преподаватель</div><div className="font-bold text-fox-dark">{payrollResult.teacher_name}</div></Card>
        <Card><div className="text-xs text-fox-gray">Академических часов</div><div className="font-bold text-fox-dark">{payrollResult.total_academic_hours}</div></Card>
        <Card accent="gold"><div className="text-xs text-fox-gray">К выплате</div><div className="font-bold text-fox-purple text-xl">{formatMoney(payrollResult.total_amount_kopecks)}</div></Card>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-fox-light/60 text-fox-graphite"><tr><th className="text-left py-3 px-4 font-semibold">Занятие</th><th className="text-left py-3 px-4 font-semibold">Группа</th><th className="text-left py-3 px-4 font-semibold">Время</th><th className="text-left py-3 px-4 font-semibold">Часы</th><th className="text-left py-3 px-4 font-semibold">Сумма</th></tr></thead>
          <tbody>
            {payrollResult.lessons.map((l) => (
              <tr key={l.schedule_id} className="border-t border-fox-border/50">
                <td className="py-3 px-4">{l.title}</td>
                <td className="py-3 px-4">{l.group_name || '—'}</td>
                <td className="py-3 px-4 whitespace-nowrap">{formatDateTime(l.start_time)}</td>
                <td className="py-3 px-4">{l.academic_hours}</td>
                <td className="py-3 px-4 font-semibold">{formatMoney(l.amount_kopecks)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PnLTab({ pnl, formatMoney }: { pnl: PnLResponse | null; formatMoney: (k: number) => string }) {
  if (!pnl) return <Loader text="Расчёт P&L..." />
  return (
    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card><div className="text-xs text-fox-gray">Доходы</div><div className="font-bold text-fox-success text-xl">{formatMoney(pnl.income_kopecks)}</div></Card>
      <Card><div className="text-xs text-fox-gray">Возвраты</div><div className="font-bold text-fox-error text-xl">{formatMoney(pnl.refund_kopecks)}</div></Card>
      <Card><div className="text-xs text-fox-gray">Расходы</div><div className="font-bold text-fox-error text-xl">{formatMoney(pnl.expense_kopecks)}</div></Card>
      <Card accent="gold"><div className="text-xs text-fox-gray">Чистая прибыль</div><div className="font-bold text-fox-purple text-xl">{formatMoney(pnl.net_kopecks)}</div></Card>
    </div>
  )
}

// ---------- Modals ----------

function PaymentModal({ isOpen, onClose, users, onSaved }: { isOpen: boolean; onClose: () => void; users: User[]; onSaved: () => void }) {
  const { showToast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ student_id: '', amount: '', type: 'income' as 'income' | 'refund', method: 'cash', status: 'completed', description: '', invoice_id: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await financeApi.createPayment({
        student_id: Number(form.student_id),
        amount: Math.round(Number(form.amount) * 100),
        type: form.type,
        method: form.method,
        status: form.status,
        description: form.description,
        invoice_id: form.invoice_id ? Number(form.invoice_id) : undefined,
      })
      showToast('Платёж создан', 'success')
      onClose()
      onSaved()
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка создания платежа'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Новый платёж" footer={<><Button variant="ghost" onClick={onClose}>Отмена</Button><Button type="submit" form="payment-form" loading={submitting}>Создать</Button></>}>
      <form id="payment-form" onSubmit={handleSubmit} className="grid gap-4">
        <Select label="Ученик" required value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })}>
          <option value="">Выберите</option>
          {users.filter((u) => u.role === 'student').map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </Select>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Сумма (₽)" type="number" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Select label="Тип" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'income' | 'refund' })}>
            <option value="income">Доход</option>
            <option value="refund">Возврат</option>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select label="Способ" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
            {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </Select>
          <Select label="Статус" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="completed">Завершён</option>
            <option value="pending">В обработке</option>
            <option value="cancelled">Отменён</option>
          </Select>
        </div>
        <Input label="Счёт ID (опционально)" value={form.invoice_id} onChange={(e) => setForm({ ...form, invoice_id: e.target.value })} />
        <Input label="Описание" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </form>
    </Modal>
  )
}

function InvoiceModal({ isOpen, onClose, users, groups, onSaved }: { isOpen: boolean; onClose: () => void; users: User[]; groups: Group[]; onSaved: () => void }) {
  const { showToast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({ student_id: '', group_id: '', amount: '', due_date: today, period_start: today, period_end: today, description: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await financeApi.createInvoice({
        student_id: Number(form.student_id),
        group_id: form.group_id ? Number(form.group_id) : undefined,
        amount: Math.round(Number(form.amount) * 100),
        due_date: form.due_date,
        period_start: form.period_start,
        period_end: form.period_end,
        description: form.description,
      })
      showToast('Счёт создан', 'success')
      onClose()
      onSaved()
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка создания счёта'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Новый счёт" footer={<><Button variant="ghost" onClick={onClose}>Отмена</Button><Button type="submit" form="invoice-form" loading={submitting}>Создать</Button></>}>
      <form id="invoice-form" onSubmit={handleSubmit} className="grid gap-4">
        <Select label="Ученик" required value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })}>
          <option value="">Выберите</option>
          {users.filter((u) => u.role === 'student').map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </Select>
        <Select label="Группа" value={form.group_id} onChange={(e) => setForm({ ...form, group_id: e.target.value })}>
          <option value="">Без группы</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </Select>
        <Input label="Сумма (₽)" type="number" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Оплатить до" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          <Input label="Период с" type="date" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} />
        </div>
        <Input label="Период по" type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} />
        <Input label="Описание" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </form>
    </Modal>
  )
}

function GenerateInvoicesModal({ isOpen, onClose, groups, onSaved }: { isOpen: boolean; onClose: () => void; groups: Group[]; onSaved: () => void }) {
  const { showToast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({ group_id: '', period_start: today, period_end: today, due_date: today })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await financeApi.generateInvoices({
        group_id: Number(form.group_id),
        period_start: form.period_start,
        period_end: form.period_end,
        due_date: form.due_date,
      })
      showToast('Счета сгенерированы', 'success')
      onClose()
      onSaved()
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка генерации'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Сгенерировать счета по группе" footer={<><Button variant="ghost" onClick={onClose}>Отмена</Button><Button type="submit" form="generate-form" loading={submitting}>Сгенерировать</Button></>}>
      <form id="generate-form" onSubmit={handleSubmit} className="grid gap-4">
        <Select label="Группа" required value={form.group_id} onChange={(e) => setForm({ ...form, group_id: e.target.value })}>
          <option value="">Выберите</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </Select>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Период с" type="date" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} />
          <Input label="Период по" type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} />
        </div>
        <Input label="Оплатить до" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
      </form>
    </Modal>
  )
}

function ExpenseModal({ isOpen, onClose, branches, onSaved }: { isOpen: boolean; onClose: () => void; branches: Branch[]; onSaved: () => void }) {
  const { showToast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({ branch_id: '', category: 'other', amount: '', expense_date: today, description: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await financeApi.createExpense({
        branch_id: form.branch_id ? Number(form.branch_id) : undefined,
        category: form.category,
        amount: Math.round(Number(form.amount) * 100),
        expense_date: form.expense_date,
        description: form.description,
      })
      showToast('Расход добавлен', 'success')
      onClose()
      onSaved()
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка создания расхода'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Новый расход" footer={<><Button variant="ghost" onClick={onClose}>Отмена</Button><Button type="submit" form="expense-form" loading={submitting}>Создать</Button></>}>
      <form id="expense-form" onSubmit={handleSubmit} className="grid gap-4">
        <Select label="Филиал" value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })}>
          <option value="">Общий</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </Select>
        <Select label="Категория" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          {EXPENSE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </Select>
        <Input label="Сумма (₽)" type="number" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        <Input label="Дата" type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
        <Input label="Описание" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </form>
    </Modal>
  )
}

function PayrollModal({
  isOpen,
  onClose,
  users,
  onCalculate,
  payrollResult,
  formatMoney,
}: {
  isOpen: boolean
  onClose: () => void
  users: User[]
  onCalculate: (teacherId: number, from: string, to: string) => void
  payrollResult: PayrollResponse | null
  formatMoney: (k: number) => string
}) {
  const today = new Date().toISOString().slice(0, 10)
  const firstDay = new Date(); firstDay.setDate(1)
  const [teacherId, setTeacherId] = useState('')
  const [fromDate, setFromDate] = useState(firstDay.toISOString().slice(0, 10))
  const [toDate, setToDate] = useState(today)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Расчёт зарплаты" size="lg" footer={<><Button variant="ghost" onClick={onClose}>Закрыть</Button><Button onClick={() => onCalculate(Number(teacherId), fromDate, toDate)} disabled={!teacherId}>Рассчитать</Button></>}>
      <div className="grid gap-4 mb-4">
        <Select label="Преподаватель" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
          <option value="">Выберите</option>
          {users.filter((u) => u.role === 'teacher').map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </Select>
        <div className="grid grid-cols-2 gap-4">
          <Input label="С" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <Input label="По" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
      </div>
      {payrollResult && (
        <div className="border-t border-fox-border pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-fox-dark">{payrollResult.teacher_name}</span>
            <span className="font-bold text-fox-purple text-lg">{formatMoney(payrollResult.total_amount_kopecks)}</span>
          </div>
          <div className="text-sm text-fox-gray">Часов: {payrollResult.total_academic_hours} · Ставка: {formatMoney(payrollResult.rate_kopecks)}</div>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {payrollResult.lessons.map((l) => (
              <div key={l.schedule_id} className="flex justify-between text-sm py-2 border-t border-fox-border/40">
                <span>{l.title} · {l.group_name || '—'}</span>
                <span className="font-semibold">{formatMoney(l.amount_kopecks)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  )
}
