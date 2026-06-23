import { useCallback, useEffect, useMemo, useState } from 'react'
import { getErrorMessage } from '../utils/error'
import Header from '../components/Header'
import { useToast, Card, Badge, Loader, EmptyState, PageShell, Tabs } from '../components/ui'
import { groupsApi } from '../api'
import type { Group } from '../types'
import { LuUsers, LuCalendar, LuBookOpen, LuUser } from 'react-icons/lu'

const TABS = [
  { id: 'current', label: 'Текущие' },
  { id: 'planned', label: 'Запланированные' },
  { id: 'closed', label: 'Закрытые' },
]

const statusMeta: Record<string, { label: string; variant: Parameters<typeof Badge>[0]['variant'] }> = {
  current: { label: 'Текущая', variant: 'success' },
  planned: { label: 'Запланирована', variant: 'warning' },
  closed: { label: 'Закрыта', variant: 'default' },
}

export default function TeacherGroupsPage() {
  const { showToast } = useToast()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('current')

  const fetchGroups = useCallback(async () => {
    setLoading(true)
    try {
      const res = await groupsApi.my()
      setGroups(res)
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка загрузки групп'), 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  const filtered = useMemo(
    () => groups.filter((g) => (g.status || 'current') === activeTab),
    [groups, activeTab]
  )

  return (
    <PageShell>
      <Header title="Группы" subtitle="Мои учебные группы" icon={<LuUsers />} />

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
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-fox-purple mb-2">Мои группы</h2>
              <p className="text-fox-gray">{groups.length} групп</p>
            </div>
          </div>
        </div>

        <Card>
          <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
        </Card>

        {loading ? (
          <Loader text="Загрузка групп..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<LuUsers />}
            title="Групп не найдено"
            description={`У вас нет ${activeTab === 'current' ? 'текущих' : activeTab === 'planned' ? 'запланированных' : 'закрытых'} групп.`}
          />
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filtered.map((group) => {
              const meta = statusMeta[group.status || 'current'] || { label: group.status || '—', variant: 'default' as const }
              return (
                <Card key={group.id} hover className="flex flex-col">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <h3 className="text-lg font-bold text-fox-dark leading-tight">{group.name}</h3>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                  </div>

                  <div className="space-y-2 text-sm mb-5">
                    {group.course_title && (
                      <div className="flex items-center gap-2 text-fox-gray">
                        <LuBookOpen size={16} />
                        <span>{group.course_title}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-fox-gray">
                      <LuUser size={16} />
                      <span>Учеников: {group.students_count ?? 0} / {group.max_students ?? 12}</span>
                    </div>
                    <div className="flex items-center gap-2 text-fox-gray">
                      <LuCalendar size={16} />
                      <span>Создана: {group.created_at ? new Date(group.created_at).toLocaleDateString('ru-RU') : '—'}</span>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </PageShell>
  )
}
