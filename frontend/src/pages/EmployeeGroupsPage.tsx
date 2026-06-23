import { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header'
import { employeeGroupsApi, usersApi, coursesApi } from '../api'
import { useToast, Button, Card, Input, Loader, EmptyState, Modal, Badge } from '../components/ui'
import type { EmployeeGroup, User, Course } from '../types'
import { LuUsers, LuPencil, LuTrash2 } from 'react-icons/lu'

const GROUP_TYPE_OPTIONS = [
  { value: 'internal', label: 'Сотрудники школы' },
  { value: 'external', label: 'Внешние сотрудники' },
  { value: 'paid', label: 'Платная основа' },
]

const GROUP_TYPE_LABELS: Record<string, string> = {
  internal: 'Сотрудники школы',
  external: 'Внешние сотрудники',
  paid: 'Платная основа',
}

const EMPLOYEE_ROLES = ['teacher', 'methodist', 'admin', 'owner', 'super_admin']

export default function EmployeeGroupsPage() {
  const { showToast } = useToast()

  const [groups, setGroups] = useState<EmployeeGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const [modal, setModal] = useState<Partial<EmployeeGroup> | null>(null)
  const [saving, setSaving] = useState(false)

  const [membersGroup, setMembersGroup] = useState<EmployeeGroup | null>(null)
  const [membersLoading, setMembersLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [adding, setAdding] = useState(false)

  const [enrollGroup, setEnrollGroup] = useState<EmployeeGroup | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [enrolling, setEnrolling] = useState(false)

  const fetchGroups = async () => {
    setLoading(true)
    try {
      const data = await employeeGroupsApi.list(typeFilter || undefined)
      setGroups(data)
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Не удалось загрузить группы', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGroups()
  }, [typeFilter])

  useEffect(() => {
    if (!membersGroup) return
    const loadData = async () => {
      setMembersLoading(true)
      try {
        const [detailed, allUsers] = await Promise.all([
          employeeGroupsApi.get(membersGroup.id),
          usersApi.list(),
        ])
        setMembersGroup(detailed)
        setUsers(allUsers.filter((u) => EMPLOYEE_ROLES.includes(u.role)))
      } catch (err: any) {
        showToast(err.response?.data?.message || 'Не удалось загрузить участников', 'error')
      } finally {
        setMembersLoading(false)
      }
    }
    loadData()
  }, [membersGroup?.id])

  useEffect(() => {
    if (!enrollGroup) return
    const loadCourses = async () => {
      try {
        const data = await coursesApi.list()
        setCourses(data)
      } catch (err: any) {
        showToast(err.response?.data?.message || 'Не удалось загрузить курсы', 'error')
      }
    }
    loadCourses()
  }, [enrollGroup])

  const filteredGroups = useMemo(() => {
    if (!filter.trim()) return groups
    const q = filter.toLowerCase()
    return groups.filter((g) => g.name.toLowerCase().includes(q) || g.description?.toLowerCase().includes(q))
  }, [groups, filter])

  const handleSave = async () => {
    if (!modal?.name?.trim()) {
      showToast('Введите название группы', 'warning')
      return
    }
    setSaving(true)
    try {
      if (modal.id) {
        await employeeGroupsApi.update(modal.id, {
          name: modal.name,
          description: modal.description,
          group_type: modal.group_type,
        })
        showToast('Группа обновлена', 'success')
      } else {
        await employeeGroupsApi.create({
          name: modal.name,
          description: modal.description,
          group_type: modal.group_type || 'internal',
        })
        showToast('Группа создана', 'success')
      }
      setModal(null)
      fetchGroups()
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Ошибка сохранения', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить группу?')) return
    try {
      await employeeGroupsApi.delete(id)
      showToast('Группа удалена', 'success')
      fetchGroups()
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Ошибка удаления', 'error')
    }
  }

  const handleAddMember = async () => {
    if (!membersGroup || !selectedUserId) return
    setAdding(true)
    try {
      await employeeGroupsApi.addMember(membersGroup.id, Number(selectedUserId))
      showToast('Участник добавлен', 'success')
      const updated = await employeeGroupsApi.get(membersGroup.id)
      setMembersGroup(updated)
      setSelectedUserId('')
      fetchGroups()
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Не удалось добавить участника', 'error')
    } finally {
      setAdding(false)
    }
  }

  const handleRemoveMember = async (userId: number) => {
    if (!membersGroup) return
    try {
      await employeeGroupsApi.removeMember(membersGroup.id, userId)
      showToast('Участник удалён', 'success')
      const updated = await employeeGroupsApi.get(membersGroup.id)
      setMembersGroup(updated)
      fetchGroups()
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Не удалось удалить участника', 'error')
    }
  }

  const handleEnroll = async () => {
    if (!enrollGroup || !selectedCourseId) return
    setEnrolling(true)
    try {
      const res = await employeeGroupsApi.enrollToCourse(enrollGroup.id, Number(selectedCourseId))
      showToast(`Зачислено ${res.enrolled_count} участников`, 'success')
      setEnrollGroup(null)
      setSelectedCourseId('')
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Ошибка зачисления', 'error')
    } finally {
      setEnrolling(false)
    }
  }

  return (
    <div className="min-h-screen bg-fox-light">
      <Header title="Группы сотрудников" subtitle="Управление группами педагогов и администраторов" icon={<LuUsers />} />

      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <Card>
          <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
            <div className="flex flex-col md:flex-row gap-3 flex-1">
              <Input
                placeholder="Поиск группы..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="md:max-w-sm"
              />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-fox-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-fox-gold/50"
              >
                <option value="">Все типы</option>
                {GROUP_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <Button onClick={() => setModal({ name: '', description: '', group_type: 'internal' })}>
              + Создать группу
            </Button>
          </div>
        </Card>

        {loading ? (
          <Loader text="Загрузка групп..." />
        ) : filteredGroups.length === 0 ? (
          <EmptyState
            icon={<LuUsers />}
            title="Группы не найдены"
            description="Создайте первую группу сотрудников"
            actionLabel="Создать группу"
            onAction={() => setModal({ name: '', description: '', group_type: 'internal' })}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredGroups.map((group) => (
              <Card key={group.id} className="flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-fox-dark">{group.name}</h3>
                    <p className="text-xs text-fox-gray/70 mt-1">{GROUP_TYPE_LABELS[group.group_type] || group.group_type}</p>
                  </div>
                  <Badge variant="default">{group.member_count || group.members?.length || 0} чел.</Badge>
                </div>
                {group.description && (
                  <p className="text-sm text-fox-gray mt-3 line-clamp-2">{group.description}</p>
                )}
                <div className="mt-auto pt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setMembersGroup(group)}>
                    Участники
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEnrollGroup(group)}>
                    Зачислить на курс
                  </Button>
                  <Button size="sm" variant="ghost" leftIcon={<LuPencil />} onClick={() => setModal({ id: group.id, name: group.name, description: group.description, group_type: group.group_type })} />
                  <Button size="sm" variant="ghost" className="text-fox-error hover:text-fox-error" leftIcon={<LuTrash2 />} onClick={() => handleDelete(group.id)} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit modal */}
      {modal && (
        <Modal
          isOpen={!!modal}
          title={modal.id ? 'Редактировать группу' : 'Новая группа'}
          onClose={() => setModal(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setModal(null)}>Отмена</Button>
              <Button onClick={handleSave} loading={saving}>
                {modal.id ? 'Сохранить' : 'Создать'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              label="Название"
              value={modal.name}
              onChange={(e) => setModal({ ...modal, name: e.target.value })}
              placeholder="Например, Педагоги FOXINBURG"
            />
            <div>
              <label className="block text-sm font-medium text-fox-dark mb-1">Тип группы</label>
              <select
                value={modal.group_type || 'internal'}
                onChange={(e) => setModal({ ...modal, group_type: e.target.value })}
                className="w-full px-3 py-2 border border-fox-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-fox-gold/50"
              >
                {GROUP_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-fox-dark mb-1">Описание</label>
              <textarea
                value={modal.description || ''}
                onChange={(e) => setModal({ ...modal, description: e.target.value })}
                placeholder="Описание группы..."
                rows={3}
                className="w-full px-3 py-2 border border-fox-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-fox-gold/50"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Members modal */}
      {membersGroup && (
        <Modal
          isOpen={!!membersGroup}
          title={`Участники: ${membersGroup.name}`}
          onClose={() => setMembersGroup(null)}
          footer={<Button variant="ghost" onClick={() => setMembersGroup(null)}>Закрыть</Button>}
        >
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="flex-1 min-w-0 px-3 py-2 border border-fox-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-fox-gold/50"
              >
                <option value="">Выберите сотрудника</option>
                {users
                  .filter((u) => !(membersGroup.members || []).some((m) => m.id === u.id))
                  .map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email}) — {u.role}</option>
                  ))}
              </select>
              <Button className="shrink-0" onClick={handleAddMember} loading={adding} disabled={!selectedUserId}>
                Добавить
              </Button>
            </div>
            <div className="max-h-[40vh] overflow-y-auto space-y-2">
              {membersLoading ? (
                <Loader text="Загрузка участников..." />
              ) : (membersGroup.members || []).length === 0 ? (
                <p className="text-sm text-fox-gray text-center py-4">В группе пока нет участников</p>
              ) : (
                (membersGroup.members || []).map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 bg-fox-light rounded-xl">
                    <div>
                      <div className="text-sm font-medium text-fox-dark">{member.name}</div>
                      <div className="text-xs text-fox-gray/70">{member.email} • {member.role}</div>
                    </div>
                    <button
                      className="text-fox-gray/70 hover:text-fox-error p-1"
                      onClick={() => handleRemoveMember(member.id)}
                      aria-label="Удалить"
                    >
                      <LuTrash2 size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Enroll modal */}
      {enrollGroup && (
        <Modal
          isOpen={!!enrollGroup}
          title={`Зачислить группу: ${enrollGroup.name}`}
          onClose={() => setEnrollGroup(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setEnrollGroup(null)}>Отмена</Button>
              <Button onClick={handleEnroll} loading={enrolling} disabled={!selectedCourseId}>
                Зачислить
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-fox-gray">
              Все участники группы ({enrollGroup.members?.length || 0}) будут зачислены на выбранный курс.
            </p>
            <div>
              <label className="block text-sm font-medium text-fox-dark mb-1">Курс</label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full px-3 py-2 border border-fox-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-fox-gold/50"
              >
                <option value="">Выберите курс</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
