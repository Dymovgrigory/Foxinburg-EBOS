import { useEffect, useMemo, useState } from 'react'
import { getErrorMessage } from '../utils/error'
import Header from '../components/Header'
import { useToast, Card, Loader, EmptyState, Badge, Table, Thead, Th, Tbody, Tr, Td, PageShell } from '../components/ui'
import StatCard from '../components/ui/StatCard'
import { financeApi } from '../api'
import type { Payment, Transaction } from '../types'
import { LuCreditCard, LuRefreshCw, LuWallet, LuTrendingUp, LuTrendingDown } from 'react-icons/lu'

const METHODS: Record<string, string> = {
  cash: 'Наличные',
  card: 'Карта',
  transfer: 'Перевод',
}

const STATUSES: Record<string, string> = {
  pending: 'В обработке',
  completed: 'Завершён',
  cancelled: 'Отменён',
}

export default function PaymentsPage() {
  const { showToast } = useToast()
  const [payments, setPayments] = useState<Payment[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [balance, setBalance] = useState<{ balance: number; total_paid: number } | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [paymentsRes, transactionsRes, balanceRes] = await Promise.all([
        financeApi.myPayments(),
        financeApi.myTransactions(),
        financeApi.balance(),
      ])
      setPayments(paymentsRes)
      setTransactions(transactionsRes)
      setBalance(balanceRes)
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка загрузки платежей'), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const totalPaid = useMemo(
    () => payments.filter((p) => p.status === 'completed' && p.type === 'income').reduce((sum, p) => sum + p.amount, 0),
    [payments]
  )

  const totalRefunded = useMemo(
    () => payments.filter((p) => p.status === 'completed' && p.type === 'refund').reduce((sum, p) => sum + p.amount, 0),
    [payments]
  )

  const formatMoney = (kopecks: number) => new Intl.NumberFormat('ru-RU').format(kopecks / 100) + ' ₽'
  const formatDate = (s: string) => new Date(s).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <PageShell>
      <Header title="Оплата" subtitle="История платежей и баланс" icon={<LuCreditCard />} />

      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        {loading ? (
          <Loader text="Загрузка платежей..." />
        ) : (
          <>
            <div className="relative overflow-hidden rounded-card p-6 md:p-8 border border-fox-border/60 bg-white shadow-fox-lg">
              <div
                className="absolute top-0 right-0 w-64 h-64 pointer-events-none opacity-[0.04]"
                style={{
                  backgroundImage: 'url(/brand/swirl-2.png)',
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'top right',
                }}
              />
              <div className="relative z-10 flex items-start gap-5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-fox-gold text-fox-purple shadow-md flex-shrink-0">
                  <LuCreditCard size={28} />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-fox-purple mb-2">История платежей</h2>
                  <p className="text-fox-gray max-w-xl">Баланс, оплаты и возвраты по вашему аккаунту.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard title="Текущий баланс" value={formatMoney(balance?.balance || 0)} icon={<LuWallet />} variant="purple" />
              <StatCard title="Оплачено" value={formatMoney(totalPaid)} icon={<LuTrendingUp />} variant="gold" />
              <StatCard title="Возвратов" value={formatMoney(totalRefunded)} icon={<LuTrendingDown />} variant="graphite" />
            </div>

            <Card>
              <h2 className="text-lg font-bold text-fox-dark mb-4">История платежей</h2>
              {payments.length === 0 ? (
                <EmptyState icon={<LuCreditCard />} title="Платежей пока нет" description="Здесь появятся все платежи по твоему аккаунту." />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <Thead>
                      <tr>
                        <Th>Дата</Th>
                        <Th>Тип</Th>
                        <Th>Способ</Th>
                        <Th>Сумма</Th>
                        <Th>Статус</Th>
                        <Th>Описание</Th>
                      </tr>
                    </Thead>
                    <Tbody>
                      {payments.map((p) => (
                        <Tr key={p.id}>
                          <Td>{formatDate(p.created_at)}</Td>
                          <Td>
                            <Badge variant={p.type === 'income' ? 'success' : 'error'}>{p.type === 'income' ? 'Доход' : 'Возврат'}</Badge>
                          </Td>
                          <Td className="capitalize">{METHODS[p.method] || p.method}</Td>
                          <Td className="font-semibold text-fox-dark">{formatMoney(p.amount)}</Td>
                          <Td>
                            <Badge variant={statusVariant(p.status)} size="sm">{STATUSES[p.status] || p.status}</Badge>
                          </Td>
                          <Td className="text-fox-gray">{p.description || '—'}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </div>
              )}
            </Card>

            <Card>
              <h2 className="text-lg font-bold text-fox-dark mb-4">Движения по балансу</h2>
              {transactions.length === 0 ? (
                <EmptyState icon={<LuRefreshCw />} title="Транзакций пока нет" description="Здесь будут отображаться все движения по балансу." />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <Thead>
                      <tr>
                        <Th>Дата</Th>
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
          </>
        )}
      </div>
    </PageShell>
  )
}

function statusVariant(status: string): Parameters<typeof Badge>[0]['variant'] {
  const map: Record<string, Parameters<typeof Badge>[0]['variant']> = {
    completed: 'success',
    pending: 'warning',
    cancelled: 'error',
  }
  return map[status] || 'default'
}
