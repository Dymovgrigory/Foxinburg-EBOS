import { useEffect, useRef, useState } from 'react'
import Header from '../components/Header'
import {
  Button,
  Card,
  Input,
  Select,
  Textarea,
  Tabs,
  Loader,
  EmptyState,
} from '../components/ui'
import { useToast } from '../components/ui/Toast'
import { getErrorMessage } from '../utils/error'
import { organizationsApi } from '../api'
import type { Organization } from '../types'
import {
  LuSchool,
  LuUpload,
  LuImage,
  LuSave,
  LuInfo,
  LuPalette,
} from 'react-icons/lu'

const TABS = [
  { id: 'info', label: 'Инфо', icon: <LuInfo /> },
  { id: 'branding', label: 'Брендинг', icon: <LuPalette /> },
]

const TIMEZONES = [
  'Europe/Moscow',
  'Europe/Samara',
  'Europe/Yekaterinburg',
  'Europe/Omsk',
  'Asia/Novosibirsk',
  'Asia/Vladivostok',
]

const DIRECTIONS = ['Языковая школа', 'Детский центр', 'Образовательный центр', 'Другое']

const ASSETS = [
  { key: 'square_logo_url', label: 'Логотип (квадратный)', ratio: '1 / 1' },
  { key: 'wide_logo_url', label: 'Логотип (прямоугольный)', ratio: '3 / 1' },
  { key: 'certificate_bg_url', label: 'Фон для сертификата', ratio: '4 / 3' },
  { key: 'card_bg_url', label: 'Фон для карточки', ratio: '16 / 9' },
] as const

export default function SchoolSettingsPage() {
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState('info')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [org, setOrg] = useState<Organization | null>(null)

  const fetchOrg = async () => {
    setLoading(true)
    try {
      const list = await organizationsApi.list()
      setOrg(list[0] || null)
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка загрузки школы'), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrg()
  }, [])

  const updateField = (field: keyof Organization, value: string | number) => {
    setOrg((prev) => (prev ? { ...prev, [field]: value } : prev))
  }

  const handleSave = async () => {
    if (!org) return
    setSaving(true)
    try {
      const updated = await organizationsApi.update(org.id, {
        name: org.name,
        short_name: org.short_name,
        description: org.description,
        website: org.website,
        email: org.email,
        license_number: org.license_number,
        direction: org.direction,
        city: org.city,
        address: org.address,
        main_phone: org.main_phone,
        timezone: org.timezone,
        currency: org.currency,
        square_logo_url: org.square_logo_url,
        wide_logo_url: org.wide_logo_url,
        certificate_bg_url: org.certificate_bg_url,
        card_bg_url: org.card_bg_url,
      })
      setOrg(updated)
      showToast('Настройки школы сохранены', 'success')
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка сохранения'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleUpload = async (field: keyof Organization, file: File | undefined) => {
    if (!file || !org) return
    try {
      const res = await organizationsApi.uploadImage(file, 'school_asset')
      setOrg((prev) => (prev ? { ...prev, [field]: res.public_url } : prev))
      showToast('Изображение загружено', 'success')
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка загрузки'), 'error')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-fox-light">
        <Header title="Настройки школы" icon={<LuSchool />} />
        <div className="p-6">
          <Loader text="Загрузка..." />
        </div>
      </div>
    )
  }

  if (!org) {
    return (
      <div className="min-h-screen bg-fox-light">
        <Header title="Настройки школы" icon={<LuSchool />} />
        <div className="p-6">
          <EmptyState
            icon={<LuSchool />}
            title="Организация не найдена"
            description="Сначала создайте организацию в разделе OS Center."
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-fox-light">
      <Header title="Настройки школы" icon={<LuSchool />} />

      <div className="p-4 md:p-6 w-full space-y-6">
        <Card>
          <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
        </Card>

        {activeTab === 'info' && (
          <Card>
            <h2 className="text-lg font-bold text-fox-dark mb-6 flex items-center gap-2">
              <LuInfo className="text-fox-gold" /> Основная информация
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSave()
              }}
              className="grid grid-cols-1 md:grid-cols-2 gap-5"
            >
              <Input
                label="Название школы"
                value={org.name || ''}
                onChange={(e) => updateField('name', e.target.value)}
                required
              />
              <Input
                label="Сокращенное название"
                value={org.short_name || ''}
                onChange={(e) => updateField('short_name', e.target.value)}
              />
              <Input
                label="ID"
                value={String(org.id)}
                disabled
              />
              <Input
                label="Email"
                type="email"
                value={org.email || ''}
                onChange={(e) => updateField('email', e.target.value)}
              />
              <Select
                label="Часовой пояс"
                value={org.timezone || 'Europe/Moscow'}
                onChange={(e) => updateField('timezone', e.target.value)}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </Select>
              <Select
                label="Основное направление"
                value={org.direction || 'Языковая школа'}
                onChange={(e) => updateField('direction', e.target.value)}
              >
                {DIRECTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
              <Input
                label="Город"
                value={org.city || ''}
                onChange={(e) => updateField('city', e.target.value)}
              />
              <Input
                label="Основной телефон"
                value={org.main_phone || ''}
                onChange={(e) => updateField('main_phone', e.target.value)}
              />
              <Input
                label="Лицензия"
                value={org.license_number || ''}
                onChange={(e) => updateField('license_number', e.target.value)}
              />
              <Input
                label="Сайт"
                value={org.website || ''}
                onChange={(e) => updateField('website', e.target.value)}
              />
              <div className="md:col-span-2">
                <Textarea
                  label="Адрес"
                  value={org.address || ''}
                  onChange={(e) => updateField('address', e.target.value)}
                  rows={2}
                />
              </div>
              <div className="md:col-span-2">
                <Textarea
                  label="Описание"
                  value={org.description || ''}
                  onChange={(e) => updateField('description', e.target.value)}
                  rows={3}
                />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" loading={saving} leftIcon={<LuSave size={16} />}>
                  Сохранить
                </Button>
              </div>
            </form>
          </Card>
        )}

        {activeTab === 'branding' && (
          <Card>
            <h2 className="text-lg font-bold text-fox-dark mb-6 flex items-center gap-2">
              <LuPalette className="text-fox-gold" /> Брендинг
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {ASSETS.map(({ key, label, ratio }) => (
                <ImageUpload
                  key={key}
                  label={label}
                  ratio={ratio}
                  url={(org[key as keyof Organization] as string) || ''}
                  onUpload={(file) => handleUpload(key as keyof Organization, file)}
                />
              ))}
            </div>
            <div className="mt-6">
              <Button loading={saving} onClick={handleSave} leftIcon={<LuSave size={16} />}>
                Сохранить
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

function ImageUpload({
  label,
  ratio,
  url,
  onUpload,
}: {
  label: string
  ratio: string
  url: string
  onUpload: (file: File | undefined) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-fox-graphite">{label}</div>
      <div
        className="rounded-xl border border-fox-border bg-fox-light/50 flex items-center justify-center overflow-hidden"
        style={{ aspectRatio: ratio.replace(' / ', '/') }}
      >
        {url ? (
          <img src={url} alt={label} className="w-full h-full object-contain" />
        ) : (
          <div className="text-fox-gray flex flex-col items-center gap-2">
            <LuImage size={32} />
            <span className="text-xs">Файл не выбран</span>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        className="hidden"
        onChange={(e) => {
          onUpload(e.target.files?.[0])
          if (inputRef.current) inputRef.current.value = ''
        }}
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => inputRef.current?.click()}
        leftIcon={<LuUpload size={16} />}
      >
        Выбрать файл
      </Button>
    </div>
  )
}
