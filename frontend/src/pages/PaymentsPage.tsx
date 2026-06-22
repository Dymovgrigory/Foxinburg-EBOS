import { useEffect, useMemo, useState } from 'react'
import { getErrorMessage } from '../utils/error'
import Header from '../components/Header'
import { useToast, Card, Loader, EmptyState, Badge, Table, Thead, Th, Tbody, Tr, Td } from '../components/ui'
import { financeApi } from '../api'
import type { Payment, Transaction } from '../types'
import { LuCreditCard, LuRefreshCw } from 'react-icons/lu'

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
    <div className="min-h-screen bg-fox-light">
      <Header title="Оплата" subtitle="История платежей и баланс" icon={<LuCreditCard />} />

      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        {loading ? (
          <Loader text="Загрузка платежей..." />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-fox-purple text-white flex items-center justify-center text-xl">💰</div>
                <div>
                  <div className="text-2xl font-bold text-fox-dark">{formatMoney(balance?.balance || 0)}</div>
                  <div className="text-xs text-fox-gray">Текущий баланс</div>
                </div>
              </Card>
              <Card className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-500 text-white flex items-center justify-center text-xl">↗</div>
                <div>
                  <div className="text-2xl font-bold text-fox-dark">{formatMoney(totalPaid)}</div>
                  <div className="text-xs text-fox-gray">Оплачено</div>
                </div>
              </Card>
              <Card className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-500 text-white flex items-center justify-center text-xl">↘</div>
                <div>
                  <div className="text-2xl font-bold text-fox-dark">{formatMoney(totalRefunded)}</div>
                  <div className="text-xs text-fox-gray">Возвратов</div>
                </div>
              </Card>
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
                          <Td className={t.amount >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
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
    </div>
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
