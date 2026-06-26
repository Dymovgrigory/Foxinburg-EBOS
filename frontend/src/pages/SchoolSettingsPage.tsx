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
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage } from '../utils/error'
import { organizationsApi, systemSettingsApi } from '../api'
import type { Organization, SystemSettings } from '../types'
import {
  LuSchool,
  LuUpload,
  LuImage,
  LuSave,
  LuInfo,
  LuPalette,
  LuSettings,
  LuMail,
  LuSmartphone,
  LuSend,
  LuCloud,
} from 'react-icons/lu'

const ORG_TABS = [
  { id: 'info', label: 'Инфо', icon: <LuInfo /> },
  { id: 'branding', label: 'Брендинг', icon: <LuPalette /> },
]

const SYSTEM_TABS = [
  { id: 'platform', label: 'Платформа', icon: <LuSettings /> },
  { id: 'smtp', label: 'SMTP', icon: <LuMail /> },
  { id: 'sms', label: 'SMS', icon: <LuSmartphone /> },
  { id: 'telegram', label: 'Telegram', icon: <LuSend /> },
  { id: 'yandex', label: 'Yandex', icon: <LuCloud /> },
]

const TIMEZONES = [
  'Europe/Moscow',
  'Europe/Samara',
  'Europe/Yekaterinburg',
  'Europe/Omsk',
  'Asia/Novosibirsk',
  'Asia/Vladivostok',
]

const LANGUAGES = ['ru', 'en']

const DIRECTIONS = ['Языковая школа', 'Детский центр', 'Образовательный центр', 'Другое']

const ASSETS = [
  { key: 'square_logo_url', label: 'Логотип (квадратный)', ratio: '1 / 1' },
  { key: 'wide_logo_url', label: 'Логотип (прямоугольный)', ratio: '3 / 1' },
  { key: 'certificate_bg_url', label: 'Фон для сертификата', ratio: '4 / 3' },
  { key: 'card_bg_url', label: 'Фон для карточки', ratio: '16 / 9' },
] as const

const EMPTY_SYSTEM_SETTINGS: SystemSettings = {
  id: 0,
  school_timezone: 'Europe/Moscow',
  school_currency: 'RUB',
  platform_default_language: 'ru',
  platform_registration_enabled: true,
  platform_maintenance_mode: false,
  platform_max_file_size_mb: 10,
  smtp_use_tls: true,
  telegram_notifications_enabled: false,
  yandex_disk_enabled: false,
  yandex_calendar_enabled: false,
  created_at: '',
  updated_at: '',
}

export default function SchoolSettingsPage() {
  const { showToast } = useToast()
  const { user } = useAuth()
  const canManageSystem = ['owner', 'super_admin'].includes(user?.role || '')
  const tabs = canManageSystem ? [...ORG_TABS, ...SYSTEM_TABS] : ORG_TABS
  const [activeTab, setActiveTab] = useState('info')
  const [loading, setLoading] = useState(true)
  const [savingOrg, setSavingOrg] = useState(false)
  const [savingSystem, setSavingSystem] = useState(false)
  const [org, setOrg] = useState<Organization | null>(null)
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(EMPTY_SYSTEM_SETTINGS)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [list, settings] = await Promise.all([
        organizationsApi.list(),
        canManageSystem ? systemSettingsApi.get().catch(() => null) : Promise.resolve(null),
      ])
      setOrg(list[0] || null)
      if (settings) {
        setSystemSettings(settings)
      }
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка загрузки настроек'), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const updateOrgField = (field: keyof Organization, value: string | number) => {
    setOrg((prev) => (prev ? { ...prev, [field]: value } : prev))
  }

  const updateSystemField = (field: keyof SystemSettings, value: unknown) => {
    setSystemSettings((prev) => ({ ...prev, [field]: value }))
  }

  const handleSaveOrg = async () => {
    if (!org) return
    setSavingOrg(true)
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
      setSavingOrg(false)
    }
  }

  const handleSaveSystem = async () => {
    setSavingSystem(true)
    try {
      const payload: Partial<SystemSettings> = {
        school_name: systemSettings.school_name || undefined,
        school_legal_name: systemSettings.school_legal_name || undefined,
        school_address: systemSettings.school_address || undefined,
        school_phone: systemSettings.school_phone || undefined,
        school_email: systemSettings.school_email || undefined,
        school_website: systemSettings.school_website || undefined,
        school_logo_url: systemSettings.school_logo_url || undefined,
        school_timezone: systemSettings.school_timezone,
        school_currency: systemSettings.school_currency,
        platform_default_language: systemSettings.platform_default_language,
        platform_registration_enabled: systemSettings.platform_registration_enabled,
        platform_maintenance_mode: systemSettings.platform_maintenance_mode,
        platform_max_file_size_mb: systemSettings.platform_max_file_size_mb,
        smtp_host: systemSettings.smtp_host || undefined,
        smtp_port: systemSettings.smtp_port || undefined,
        smtp_username: systemSettings.smtp_username || undefined,
        smtp_use_tls: systemSettings.smtp_use_tls,
        smtp_sender_name: systemSettings.smtp_sender_name || undefined,
        smtp_sender_email: systemSettings.smtp_sender_email || undefined,
        sms_provider: systemSettings.sms_provider || undefined,
        sms_sender_name: systemSettings.sms_sender_name || undefined,
        telegram_channel_id: systemSettings.telegram_channel_id || undefined,
        telegram_notifications_enabled: systemSettings.telegram_notifications_enabled,
        yandex_client_id: systemSettings.yandex_client_id || undefined,
        yandex_redirect_uri: systemSettings.yandex_redirect_uri || undefined,
        yandex_disk_enabled: systemSettings.yandex_disk_enabled,
        yandex_calendar_enabled: systemSettings.yandex_calendar_enabled,
      }
      const updated = await systemSettingsApi.update(payload)
      setSystemSettings(updated)
      showToast('Системные настройки сохранены', 'success')
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка сохранения'), 'error')
    } finally {
      setSavingSystem(false)
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
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        </Card>

        {activeTab === 'info' && (
          <Card>
            <h2 className="text-lg font-bold text-fox-dark mb-6 flex items-center gap-2">
              <LuInfo className="text-fox-gold" /> Основная информация
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSaveOrg()
              }}
              className="grid grid-cols-1 md:grid-cols-2 gap-5"
            >
              <Input
                label="Название школы"
                value={org.name || ''}
                onChange={(e) => updateOrgField('name', e.target.value)}
                required
              />
              <Input
                label="Сокращенное название"
                value={org.short_name || ''}
                onChange={(e) => updateOrgField('short_name', e.target.value)}
              />
              <Input label="ID" value={String(org.id)} disabled />
              <Input
                label="Email"
                type="email"
                value={org.email || ''}
                onChange={(e) => updateOrgField('email', e.target.value)}
              />
              <Select
                label="Часовой пояс"
                value={org.timezone || 'Europe/Moscow'}
                onChange={(e) => updateOrgField('timezone', e.target.value)}
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
                onChange={(e) => updateOrgField('direction', e.target.value)}
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
                onChange={(e) => updateOrgField('city', e.target.value)}
              />
              <Input
                label="Основной телефон"
                value={org.main_phone || ''}
                onChange={(e) => updateOrgField('main_phone', e.target.value)}
              />
              <Input
                label="Лицензия"
                value={org.license_number || ''}
                onChange={(e) => updateOrgField('license_number', e.target.value)}
              />
              <Input
                label="Сайт"
                value={org.website || ''}
                onChange={(e) => updateOrgField('website', e.target.value)}
              />
              <div className="md:col-span-2">
                <Textarea
                  label="Адрес"
                  value={org.address || ''}
                  onChange={(e) => updateOrgField('address', e.target.value)}
                  rows={2}
                />
              </div>
              <div className="md:col-span-2">
                <Textarea
                  label="Описание"
                  value={org.description || ''}
                  onChange={(e) => updateOrgField('description', e.target.value)}
                  rows={3}
                />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" loading={savingOrg} leftIcon={<LuSave size={16} />}>
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
              <Button loading={savingOrg} onClick={handleSaveOrg} leftIcon={<LuSave size={16} />}>
                Сохранить
              </Button>
            </div>
          </Card>
        )}

        {activeTab === 'platform' && (
          <Card>
            <h2 className="text-lg font-bold text-fox-dark mb-6 flex items-center gap-2">
              <LuSettings className="text-fox-gold" /> Настройки платформы
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSaveSystem()
              }}
              className="grid grid-cols-1 md:grid-cols-2 gap-5"
            >
              <Select
                label="Язык по умолчанию"
                value={systemSettings.platform_default_language}
                onChange={(e) => updateSystemField('platform_default_language', e.target.value)}
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang === 'ru' ? 'Русский' : 'English'}
                  </option>
                ))}
              </Select>
              <Input
                label="Максимальный размер файла (МБ)"
                type="number"
                min={1}
                max={100}
                value={systemSettings.platform_max_file_size_mb}
                onChange={(e) => updateSystemField('platform_max_file_size_mb', Number(e.target.value))}
              />
              <Select
                label="Регистрация открыта"
                value={systemSettings.platform_registration_enabled ? 'true' : 'false'}
                onChange={(e) => updateSystemField('platform_registration_enabled', e.target.value === 'true')}
              >
                <option value="true">Да</option>
                <option value="false">Нет</option>
              </Select>
              <Select
                label="Режим обслуживания"
                value={systemSettings.platform_maintenance_mode ? 'true' : 'false'}
                onChange={(e) => updateSystemField('platform_maintenance_mode', e.target.value === 'true')}
              >
                <option value="true">Включён</option>
                <option value="false">Выключен</option>
              </Select>
              <div className="md:col-span-2">
                <Button type="submit" loading={savingSystem} leftIcon={<LuSave size={16} />}>
                  Сохранить
                </Button>
              </div>
            </form>
          </Card>
        )}

        {activeTab === 'smtp' && (
          <Card>
            <h2 className="text-lg font-bold text-fox-dark mb-6 flex items-center gap-2">
              <LuMail className="text-fox-gold" /> SMTP
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSaveSystem()
              }}
              className="grid grid-cols-1 md:grid-cols-2 gap-5"
            >
              <Input
                label="SMTP сервер"
                value={systemSettings.smtp_host || ''}
                onChange={(e) => updateSystemField('smtp_host', e.target.value || null)}
              />
              <Input
                label="SMTP порт"
                type="number"
                value={systemSettings.smtp_port || ''}
                onChange={(e) => updateSystemField('smtp_port', e.target.value ? Number(e.target.value) : null)}
              />
              <Input
                label="Имя пользователя"
                value={systemSettings.smtp_username || ''}
                onChange={(e) => updateSystemField('smtp_username', e.target.value || null)}
              />
              <Input
                label="Пароль"
                type="password"
                value={''}
                placeholder="Введите новый пароль"
                onChange={(e) => updateSystemField('smtp_password', e.target.value || null)}
              />
              <Select
                label="Использовать TLS"
                value={systemSettings.smtp_use_tls ? 'true' : 'false'}
                onChange={(e) => updateSystemField('smtp_use_tls', e.target.value === 'true')}
              >
                <option value="true">Да</option>
                <option value="false">Нет</option>
              </Select>
              <Input
                label="Имя отправителя"
                value={systemSettings.smtp_sender_name || ''}
                onChange={(e) => updateSystemField('smtp_sender_name', e.target.value || null)}
              />
              <Input
                label="Email отправителя"
                type="email"
                value={systemSettings.smtp_sender_email || ''}
                onChange={(e) => updateSystemField('smtp_sender_email', e.target.value || null)}
              />
              <div className="md:col-span-2">
                <Button type="submit" loading={savingSystem} leftIcon={<LuSave size={16} />}>
                  Сохранить
                </Button>
              </div>
            </form>
          </Card>
        )}

        {activeTab === 'sms' && (
          <Card>
            <h2 className="text-lg font-bold text-fox-dark mb-6 flex items-center gap-2">
              <LuSmartphone className="text-fox-gold" /> SMS
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSaveSystem()
              }}
              className="grid grid-cols-1 md:grid-cols-2 gap-5"
            >
              <Input
                label="Провайдер"
                value={systemSettings.sms_provider || ''}
                onChange={(e) => updateSystemField('sms_provider', e.target.value || null)}
              />
              <Input
                label="API-ключ"
                type="password"
                value={''}
                placeholder="Введите новый API-ключ"
                onChange={(e) => updateSystemField('sms_api_key', e.target.value || null)}
              />
              <Input
                label="Имя отправителя"
                value={systemSettings.sms_sender_name || ''}
                onChange={(e) => updateSystemField('sms_sender_name', e.target.value || null)}
              />
              <div className="md:col-span-2">
                <Button type="submit" loading={savingSystem} leftIcon={<LuSave size={16} />}>
                  Сохранить
                </Button>
              </div>
            </form>
          </Card>
        )}

        {activeTab === 'telegram' && (
          <Card>
            <h2 className="text-lg font-bold text-fox-dark mb-6 flex items-center gap-2">
              <LuSend className="text-fox-gold" /> Telegram
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSaveSystem()
              }}
              className="grid grid-cols-1 md:grid-cols-2 gap-5"
            >
              <Input
                label="Токен бота"
                type="password"
                value={''}
                placeholder="Введите новый токен"
                onChange={(e) => updateSystemField('telegram_bot_token', e.target.value || null)}
              />
              <Input
                label="ID канала/группы"
                value={systemSettings.telegram_channel_id || ''}
                onChange={(e) => updateSystemField('telegram_channel_id', e.target.value || null)}
              />
              <Select
                label="Уведомления включены"
                value={systemSettings.telegram_notifications_enabled ? 'true' : 'false'}
                onChange={(e) => updateSystemField('telegram_notifications_enabled', e.target.value === 'true')}
              >
                <option value="true">Да</option>
                <option value="false">Нет</option>
              </Select>
              <div className="md:col-span-2">
                <Button type="submit" loading={savingSystem} leftIcon={<LuSave size={16} />}>
                  Сохранить
                </Button>
              </div>
            </form>
          </Card>
        )}

        {activeTab === 'yandex' && (
          <Card>
            <h2 className="text-lg font-bold text-fox-dark mb-6 flex items-center gap-2">
              <LuCloud className="text-fox-gold" /> Yandex
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSaveSystem()
              }}
              className="grid grid-cols-1 md:grid-cols-2 gap-5"
            >
              <Input
                label="Client ID"
                value={systemSettings.yandex_client_id || ''}
                onChange={(e) => updateSystemField('yandex_client_id', e.target.value || null)}
              />
              <Input
                label="Client Secret"
                type="password"
                value={''}
                placeholder="Введите новый secret"
                onChange={(e) => updateSystemField('yandex_client_secret', e.target.value || null)}
              />
              <Input
                label="Redirect URI"
                value={systemSettings.yandex_redirect_uri || ''}
                onChange={(e) => updateSystemField('yandex_redirect_uri', e.target.value || null)}
              />
              <Select
                label="Yandex Disk"
                value={systemSettings.yandex_disk_enabled ? 'true' : 'false'}
                onChange={(e) => updateSystemField('yandex_disk_enabled', e.target.value === 'true')}
              >
                <option value="true">Включён</option>
                <option value="false">Выключен</option>
              </Select>
              <Select
                label="Yandex Calendar"
                value={systemSettings.yandex_calendar_enabled ? 'true' : 'false'}
                onChange={(e) => updateSystemField('yandex_calendar_enabled', e.target.value === 'true')}
              >
                <option value="true">Включён</option>
                <option value="false">Выключен</option>
              </Select>
              <div className="md:col-span-2">
                <Button type="submit" loading={savingSystem} leftIcon={<LuSave size={16} />}>
                  Сохранить
                </Button>
              </div>
            </form>
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
