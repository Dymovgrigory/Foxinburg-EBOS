import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { useToast, Card, Button, Loader, Badge } from '../components/ui'
import { teacherAcademyApi } from '../api'
import { getErrorMessage } from '../utils/error'
import { LuAward, LuGraduationCap, LuMedal } from 'react-icons/lu'

interface ProgressData {
  enrollment_id: number
  status: string
  progress_percent: number
  is_certified: boolean
  completed_at?: string
}

export default function CertificationPage() {
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<ProgressData | null>(null)

  const fetchProgress = async () => {
    setLoading(true)
    try {
      const data = await teacherAcademyApi.progress()
      setProgress(data)
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка загрузки прогресса'), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProgress()
  }, [])

  const openCertificate = async () => {
    try {
      const response = await teacherAcademyApi.certificateRaw()
      const blob = new Blob([response.data], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const win = window.open(url, '_blank')
      if (!win) {
        showToast('Разрешите всплывающие окна для печати сертификата', 'error')
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Не удалось открыть сертификат'), 'error')
    }
  }

  const completed = progress?.status === 'completed'

  return (
    <div className="min-h-screen bg-fox-light">
      <Header title="Сертификация" icon={<LuAward />} />

      <div className="p-4 md:p-6 w-full space-y-6">
        {loading ? (
          <Loader text="Загрузка статуса сертификации..." />
        ) : (
          <>
            <Card className="text-center p-10">
              <div className="flex justify-center mb-4">
                {completed ? (
                  <LuGraduationCap className="w-16 h-16 text-fox-purple" />
                ) : (
                  <LuMedal className="w-16 h-16 text-fox-gold" />
                )}
              </div>
              <h2 className="text-2xl font-bold text-fox-dark mb-2">
                {completed ? 'Сертификат Академии педагогов' : 'Сертификация'}
              </h2>
              <p className="text-fox-gray mb-6 max-w-lg mx-auto">
                {completed
                  ? 'Поздравляем! Вы успешно завершили Академию педагогов FOXINBURG и можете получить сертификат.'
                  : 'Завершите все модули Академии педагогов, чтобы получить сертификат.'}
              </p>

              <div className="flex justify-center gap-3 mb-6">
                <Badge variant={completed ? 'success' : 'warning'} size="md">
                  {completed ? 'Академия пройдена' : `Прогресс ${progress?.progress_percent ?? 0}%`}
                </Badge>
                {progress?.completed_at && (
                  <Badge variant="default" size="md">
                    {new Date(progress.completed_at).toLocaleDateString('ru-RU')}
                  </Badge>
                )}
              </div>

              <div className="flex justify-center gap-3">
                {completed ? (
                  <Button onClick={openCertificate}>Открыть сертификат</Button>
                ) : (
                  <Button onClick={() => navigate('/academy')}>Перейти к Академии</Button>
                )}
              </div>
            </Card>

            {!completed && (
              <Card className="p-6">
                <h3 className="text-lg font-bold text-fox-dark mb-4">Как получить сертификат?</h3>
                <ol className="list-decimal list-inside space-y-2 text-fox-gray">
                  <li>Пройдите все модули Академии педагогов.</li>
                  <li>Выполните итоговое задание (если предусмотрено).</li>
                  <li>Вернитесь на эту страницу — сертификат станет доступен автоматически.</li>
                </ol>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
