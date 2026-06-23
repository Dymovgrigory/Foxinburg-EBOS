import { useNavigate } from 'react-router-dom'
import { Button, EmptyState, PageShell } from '../components/ui'
import { LuHouse, LuSearchX } from 'react-icons/lu'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <PageShell>
      <div className="flex-1 flex items-center justify-center p-6">
        <EmptyState
          icon={<LuSearchX />}
          title="Страница не найдена"
          description="Похоже, запрашиваемая страница не существует или была перемещена."
          actionLabel="На главную"
          onAction={() => navigate('/dashboard')}
        />
      </div>
      <div className="pb-8 text-center">
        <Button leftIcon={<LuHouse />} onClick={() => navigate(-1)} variant="ghost">
          Назад
        </Button>
      </div>
    </PageShell>
  )
}
