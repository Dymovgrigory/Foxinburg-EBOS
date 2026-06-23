import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast, Button, Card, Loader, EmptyState, Badge } from '../components/ui'
import { LuBookOpen, LuUsers } from 'react-icons/lu'

interface TeacherGroup {
  id: number
  name: string
  description?: string
  course_title?: string
  students_count: number
  max_students: number
  created_at: string
}

export default function TeacherCoursesPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [groups, setGroups] = useState<TeacherGroup[]>([])
  const [loading, setLoading] = useState(true)

  const fetchGroups = async () => {
    setLoading(true)
    try {
      const res = await api.get('/groups/my')
      setGroups(res.data.data || [])
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Ошибка загрузки групп', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGroups()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-fox-light">
        <Header title="Мои курсы" subtitle="Группы и расписание" icon={<LuBookOpen />} />
        <div className="p-6 max-w-7xl mx-auto">
          <Loader text="Загрузка групп..." />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-fox-light">
      <Header title="Мои курсы" subtitle={`${user?.name || 'Педагог'}, здесь ваши группы`} icon={<LuBookOpen />} />
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        {groups.length === 0 ? (
          <EmptyState icon={<LuBookOpen />} title="Нет групп" description="Вам пока не назначены группы." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((g) => (
              <Card key={g.id} className="space-y-4 hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-fox-dark text-lg">{g.name}</h3>
                    <Badge variant="default">{g.course_title || 'Курс'}</Badge>
                  </div>
                  {g.description && <p className="text-sm text-fox-gray mt-1">{g.description}</p>}
                </div>
                <div className="flex items-center gap-4 text-sm text-fox-gray">
                  <span className="inline-flex items-center gap-1"><LuUsers size={14} /> {g.students_count} / {g.max_students}</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => navigate(`/calendar?group_id=${g.id}`)}>
                    Расписание
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => navigate(`/chats`)}>
                    Чат группы
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
