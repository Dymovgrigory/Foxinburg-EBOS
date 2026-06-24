import { useEffect, useMemo, useState } from 'react'
import { LuStore, LuPlus, LuPencil, LuTrash, LuUpload } from 'react-icons/lu'
import Header from '../components/Header'
import {
  Button,
  Card,
  Input,
  Textarea,
  Select,
  Modal,
  ModalFooterActions,
  Loader,
  EmptyState,
  PageShell,
} from '../components/ui'
import { useToast } from '../components/ui/Toast'
import { storeApi, coursesApi, groupsApi, organizationsApi } from '../api'
import { getErrorMessage } from '../utils/error'
import type { Product, Course, Group } from '../types'

const PRODUCT_TYPES: { value: Product['product_type']; label: string }[] = [
  { value: 'service', label: 'Услуга' },
  { value: 'course', label: 'Курс' },
  { value: 'subscription', label: 'Абонемент' },
  { value: 'merchandise', label: 'Товар' },
]

const formatMoney = (kopecks: number) => new Intl.NumberFormat('ru-RU').format(kopecks / 100) + ' ₽'

const emptyForm = {
  title: '',
  description: '',
  image_url: '',
  price_rubles: '',
  product_type: 'service' as Product['product_type'],
  target_course_id: '',
  target_group_id: '',
  lessons_count: '',
  subscription_months: '',
  is_active: true,
  sort_order: '0',
}

export default function StoreProductsPage() {
  const { showToast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [uploading, setUploading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [productsRes, coursesRes, groupsRes] = await Promise.all([
        storeApi.products(),
        coursesApi.list(),
        groupsApi.list(),
      ])
      setProducts(productsRes)
      setCourses(coursesRes)
      setGroups(groupsRes)
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка загрузки магазина'), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (product: Product) => {
    setEditing(product)
    setForm({
      title: product.title,
      description: product.description || '',
      image_url: product.image_url || '',
      price_rubles: String(product.price / 100),
      product_type: product.product_type,
      target_course_id: product.target_course_id ? String(product.target_course_id) : '',
      target_group_id: product.target_group_id ? String(product.target_group_id) : '',
      lessons_count: product.lessons_count ? String(product.lessons_count) : '',
      subscription_months: product.subscription_months ? String(product.subscription_months) : '',
      is_active: product.is_active,
      sort_order: String(product.sort_order),
    })
    setModalOpen(true)
  }

  const buildPayload = (): Partial<Product> => {
    const price = Math.round(parseFloat(form.price_rubles || '0') * 100)
    return {
      title: form.title.trim(),
      description: form.description.trim() || null,
      image_url: form.image_url.trim() || null,
      price,
      product_type: form.product_type,
      target_course_id: form.target_course_id ? Number(form.target_course_id) : null,
      target_group_id: form.target_group_id ? Number(form.target_group_id) : null,
      lessons_count: form.lessons_count ? Number(form.lessons_count) : null,
      subscription_months: form.subscription_months ? Number(form.subscription_months) : null,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
    }
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.price_rubles) {
      showToast('Заполните название и цену', 'error')
      return
    }
    setSaving(true)
    try {
      const payload = buildPayload()
      if (editing) {
        await storeApi.updateProduct(editing.id, payload)
        showToast('Товар обновлён', 'success')
      } else {
        await storeApi.createProduct(payload)
        showToast('Товар создан', 'success')
      }
      setModalOpen(false)
      await fetchData()
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка сохранения'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (product: Product) => {
    if (!confirm(`Удалить товар «${product.title}»?`)) return
    try {
      await storeApi.deleteProduct(product.id)
      showToast('Товар удалён', 'success')
      await fetchData()
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка удаления'), 'error')
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const res = await organizationsApi.uploadImage(file, 'product_image')
      setForm((prev) => ({ ...prev, image_url: res.public_url }))
      showToast('Изображение загружено', 'success')
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка загрузки изображения'), 'error')
    } finally {
      setUploading(false)
    }
  }

  const activeProducts = useMemo(
    () => products.filter((p) => p.is_active).sort((a, b) => a.sort_order - b.sort_order),
    [products]
  )

  return (
    <PageShell>
      <Header title="Магазин услуг" subtitle="Карточки товаров и услуг для MAX-магазина" icon={<LuStore />} />

      <div className="p-4 md:p-6 w-full space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-fox-purple">Каталог</h2>
            <p className="text-sm text-fox-gray">Активных товаров: {activeProducts.length}</p>
          </div>
          <Button leftIcon={<LuPlus />} onClick={openCreate}>
            Добавить товар
          </Button>
        </div>

        {loading ? (
          <Loader text="Загрузка товаров..." />
        ) : products.length === 0 ? (
          <EmptyState
            title="Пока нет товаров"
            description="Добавьте первую услугу или курс, чтобы она появилась в мини-приложении MAX."
            actionLabel="Добавить товар"
            onAction={openCreate}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((product) => (
              <Card key={product.id} className={product.is_active ? '' : 'opacity-60'}>
                <div className="aspect-[4/3] rounded-lg bg-fox-light overflow-hidden mb-4">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-fox-gray">
                      <LuStore size={40} />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-fox-purple line-clamp-2">{product.title}</h3>
                    <span className="text-sm font-bold text-fox-purple whitespace-nowrap">
                      {formatMoney(product.price)}
                    </span>
                  </div>
                  <p className="text-xs text-fox-gray line-clamp-2">{product.description || 'Нет описания'}</p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-fox-purple/10 text-fox-purple">
                      {PRODUCT_TYPES.find((t) => t.value === product.product_type)?.label || product.product_type}
                    </span>
                    {!product.is_active && (
                      <span className="px-2 py-0.5 rounded-full bg-fox-gray/10 text-fox-gray">Неактивен</span>
                    )}
                  </div>
                  <div className="pt-3 flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<LuPencil size={14} />}
                      onClick={() => openEdit(product)}
                    >
                      Редактировать
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      leftIcon={<LuTrash size={14} />}
                      onClick={() => handleDelete(product)}
                    >
                      Удалить
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Редактировать товар' : 'Новый товар'}
        footer={
          <ModalFooterActions
            onCancel={() => setModalOpen(false)}
            onConfirm={handleSave}
            confirmText={editing ? 'Сохранить' : 'Создать'}
            loading={saving}
          />
        }
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Название"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Например, Пробный урок английского"
          />
          <Textarea
            label="Описание"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Что входит в услугу"
            rows={3}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Цена, ₽"
              type="number"
              min={0}
              step={0.01}
              value={form.price_rubles}
              onChange={(e) => setForm({ ...form, price_rubles: e.target.value })}
            />
            <Select
              label="Тип"
              value={form.product_type}
              onChange={(e) => setForm({ ...form, product_type: e.target.value as Product['product_type'] })}
            >
              {PRODUCT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Привязка к курсу"
              value={form.target_course_id}
              onChange={(e) => setForm({ ...form, target_course_id: e.target.value })}
            >
              <option value="">—</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </Select>
            <Select
              label="Привязка к группе"
              value={form.target_group_id}
              onChange={(e) => setForm({ ...form, target_group_id: e.target.value })}
            >
              <option value="">—</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Количество занятий"
              type="number"
              min={0}
              value={form.lessons_count}
              onChange={(e) => setForm({ ...form, lessons_count: e.target.value })}
            />
            <Input
              label="Месяцев подписки"
              type="number"
              min={0}
              value={form.subscription_months}
              onChange={(e) => setForm({ ...form, subscription_months: e.target.value })}
            />
            <Input
              label="Порядок сортировки"
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              id="is_active"
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="w-5 h-5 rounded border-fox-border text-fox-purple focus:ring-fox-purple"
            />
            <label htmlFor="is_active" className="text-sm text-fox-graphite">
              Активен и виден в каталоге
            </label>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-fox-graphite">Изображение</label>
            <div className="flex items-center gap-3">
              {form.image_url && (
                <img
                  src={form.image_url}
                  alt="Превью"
                  className="w-16 h-16 rounded-lg object-cover border border-fox-border"
                />
              )}
              <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-button border border-fox-border bg-white text-sm font-semibold text-fox-purple hover:bg-fox-light transition cursor-pointer">
                <LuUpload size={16} />
                {uploading ? 'Загрузка...' : form.image_url ? 'Заменить' : 'Загрузить'}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
              </label>
            </div>
          </div>
        </div>
      </Modal>
    </PageShell>
  )
}
