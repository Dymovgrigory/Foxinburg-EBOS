import { useEffect, useMemo, useState } from 'react'
import { getErrorMessage } from '../utils/error'
import Header from '../components/Header'
import { useToast, Card, Loader, EmptyState, Badge } from '../components/ui'
import { systemApi } from '../api'
import type { SystemPermissionsResponse } from '../types'
import { LuShield } from 'react-icons/lu'

const ROLE_LABELS: Record<string, string> = {
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

const PERMISSION_LABELS: Record<string, string> = {
  'user:create': 'Создание пользователей',
  'user:read': 'Просмотр пользователей',
  'user:update': 'Редактирование пользователей',
  'user:delete': 'Удаление пользователей',
  'organization:manage': 'Управление организацией',
  'branch:manage': 'Управление филиалами',
  'course:create': 'Создание курсов',
  'course:read': 'Просмотр курсов',
  'course:update': 'Редактирование курсов',
  'course:delete': 'Удаление курсов',
  'course:publish': 'Публикация курсов',
  'module:create': 'Создание модулей',
  'module:read': 'Просмотр модулей',
  'module:update': 'Редактирование модулей',
  'module:delete': 'Удаление модулей',
  'lesson:create': 'Создание уроков',
  'lesson:read': 'Просмотр уроков',
  'lesson:update': 'Редактирование уроков',
  'lesson:delete': 'Удаление уроков',
  'lesson:complete': 'Завершение уроков',
  'group:read': 'Просмотр групп',
  'group:manage': 'Управление группами',
  'enrollment:manage': 'Управление зачислениями',
  'progress:read': 'Просмотр прогресса',
  'attendance:manage': 'Управление посещаемостью',
  'homework:review': 'Проверка домашних заданий',
  'crm:manage': 'Управление CRM',
  'finance:manage': 'Управление финансами',
  'analytics:read': 'Просмотр аналитики',
  'settings:manage': 'Управление настройками',
  'notification:read': 'Просмотр уведомлений',
  'notification:send': 'Отправка уведомлений',
  'message:read': 'Просмотр сообщений',
  'message:send': 'Отправка сообщений',
  'message:manage': 'Управление сообщениями',
}

const MODULE_LABELS: Record<string, string> = {
  users: 'Пользователи',
  organizations: 'Организации',
  courses_manage: 'Управление курсами',
  courses_view: 'Просмотр курсов',
  homework_review: 'Проверка ДЗ',
  crm: 'CRM',
  finance: 'Финансы',
  analytics: 'Аналитика',
  settings: 'Настройки',
  student_world: 'Мир ученика',
  parent_cabinet: 'Кабинет родителя',
}

export default function RolesPage() {
  const { showToast } = useToast()
  const [data, setData] = useState<SystemPermissionsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    systemApi
      .permissions()
      .then(setData)
      .catch((err) => showToast(getErrorMessage(err, 'Ошибка загрузки прав'), 'error'))
      .finally(() => setLoading(false))
  }, [])

  const roles = useMemo(() => (data ? Object.keys(data.role_permissions) : []), [data])
  const permissions = useMemo(() => {
    if (!data) return []
    const set = new Set<string>()
    Object.values(data.role_permissions).forEach((list) => list.forEach((p) => set.add(p)))
    return Array.from(set).sort()
  }, [data])

  return (
    <div className="min-h-screen bg-fox-light">
      <Header title="Role Ecosystem" subtitle="Роли, права и иерархия доступа" icon={<LuShield />} />

      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        {loading ? (
          <Loader text="Загрузка прав доступа..." />
        ) : !data ? (
          <EmptyState icon={<LuShield />} title="Не удалось загрузить права" description="Попробуй обновить страницу." />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-fox-purple text-white flex items-center justify-center text-xl">🛡️</div>
                <div>
                  <div className="text-2xl font-bold text-fox-dark">{roles.length}</div>
                  <div className="text-xs text-fox-gray">Ролей</div>
                </div>
              </Card>
              <Card className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-fox-gold text-fox-purple flex items-center justify-center text-xl">🔑</div>
                <div>
                  <div className="text-2xl font-bold text-fox-dark">{permissions.length}</div>
                  <div className="text-xs text-fox-gray">Разрешений</div>
                </div>
              </Card>
              <Card className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500 text-white flex items-center justify-center text-xl">🔗</div>
                <div>
                  <div className="text-2xl font-bold text-fox-dark">{data.endpoints_count}</div>
                  <div className="text-xs text-fox-gray">Endpoint'ов</div>
                </div>
              </Card>
            </div>

            <Card>
              <h2 className="text-lg font-bold text-fox-dark mb-4">Матрица прав доступа</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-fox-border">
                      <th className="text-left py-2 px-3 font-semibold text-fox-graphite sticky left-0 bg-white min-w-[220px]">Разрешение</th>
                      {roles.map((role) => (
                        <th key={role} className="text-center py-2 px-3 font-semibold text-fox-graphite min-w-[80px]">
                          {ROLE_LABELS[role] || role}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {permissions.map((permission) => (
                      <tr key={permission} className="border-b border-fox-border/50 hover:bg-fox-light/50">
                        <td className="py-2 px-3 sticky left-0 bg-white">
                          <span className="text-fox-dark">{PERMISSION_LABELS[permission] || permission}</span>
                          <span className="block text-[10px] text-fox-gray/70 font-mono">{permission}</span>
                        </td>
                        {roles.map((role) => {
                          const has = data.role_permissions[role]?.includes(permission)
                          return (
                            <td key={role} className="py-2 px-3 text-center">
                              {has ? (
                                <Badge variant="success" size="sm">✓</Badge>
                              ) : (
                                <span className="text-fox-gray/50">—</span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <h2 className="text-lg font-bold text-fox-dark mb-4">Иерархия ролей</h2>
                <div className="space-y-3">
                  {roles.map((role) => (
                    <div key={role}>
                      <div className="font-medium text-fox-dark">{ROLE_LABELS[role] || role}</div>
                      <div className="text-xs text-fox-gray">
                        {data.role_hierarchy[role]?.length
                          ? `управляет: ${data.role_hierarchy[role].map((r) => ROLE_LABELS[r] || r).join(', ')}`
                          : 'не управляет другими ролями'}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <h2 className="text-lg font-bold text-fox-dark mb-4">Доступ к модулям</h2>
                <div className="space-y-3">
                  {Object.entries(data.module_permissions).map(([module, moduleRoles]) => (
                    <div key={module}>
                      <div className="font-medium text-fox-dark">{MODULE_LABELS[module] || module}</div>
                      <div className="text-xs text-fox-gray">
                        {moduleRoles.map((r) => ROLE_LABELS[r] || r).join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
