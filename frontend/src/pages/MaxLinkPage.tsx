import { useEffect, useState } from 'react'
import { Loader, Button, Input, Card } from '../components/ui'
import { useToast } from '../components/ui/Toast'
import { authApi, storeApi } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { LuShoppingCart, LuStore, LuPlus, LuMinus, LuTrash, LuPackage } from 'react-icons/lu'
import type { Product, CartItem, Order } from '../types'

interface MaxWebApp {
  ready: () => void
  initData: string
  initDataUnsafe: {
    start_param?: string
    user?: { id: number; first_name?: string; last_name?: string; username?: string }
    [key: string]: any
  }
  openLink?: (url: string) => void
}

declare global {
  interface Window {
    WebApp?: MaxWebApp
  }
}

type Screen = 'loading' | 'login' | 'linking' | 'success' | 'store' | 'order' | 'error'
type Tab = 'catalog' | 'cart' | 'orders'

const formatMoney = (kopecks: number) => new Intl.NumberFormat('ru-RU').format(kopecks / 100) + ' ₽'

export default function MaxLinkPage() {
  const { user, login, isLoading: authLoading } = useAuth()
  const { showToast } = useToast()
  const [screen, setScreen] = useState<Screen>('loading')
  const [message, setMessage] = useState('Открываем мини-приложение FOXINBURG...')
  const [initData, setInitData] = useState('')
  const [linkToken, setLinkToken] = useState('')
  const [initialOrderId, setInitialOrderId] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)

  const [tab, setTab] = useState<Tab>('catalog')
  const [products, setProducts] = useState<Product[]>([])
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [storeLoading, setStoreLoading] = useState(false)
  const [order, setOrder] = useState<Order | null>(null)

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://st.max.ru/js/max-web-app.js'
    script.async = true
    script.onload = () => {
      const WebApp = window.WebApp
      if (!WebApp) {
        setScreen('error')
        setMessage('Не удалось загрузить MAX Bridge. Откройте приложение из чата с ботом MAX.')
        return
      }
      WebApp.ready()
      const urlParams = new URLSearchParams(window.location.search)
      const token =
        WebApp.initDataUnsafe?.start_param ||
        urlParams.get('token') ||
        urlParams.get('startapp') ||
        ''
      const data = WebApp.initData || ''
      const orderIdParam = urlParams.get('order_id')
      setInitData(data)
      setLinkToken(token)
      if (orderIdParam) {
        setInitialOrderId(orderIdParam)
        setMessage('Загружаем результат оплаты...')
      }

      if (!data) {
        if (!orderIdParam) {
          setScreen('error')
          setMessage('Данные из MAX не получены. Откройте приложение из чата с ботом.')
        }
        return
      }

      if (token) {
        linkByToken(token, data)
      } else {
        setScreen('login')
        setMessage('Войдите, чтобы привязать MAX и открыть магазин услуг.')
      }
    }
    script.onerror = () => {
      setScreen('error')
      setMessage('Ошибка загрузки MAX Bridge. Откройте приложение из чата с ботом MAX.')
    }
    document.body.appendChild(script)
    return () => {
      document.body.removeChild(script)
    }
  }, [])

  useEffect(() => {
    if (authLoading || !user || linkToken) return

    if (initialOrderId) {
      fetchOrder(Number(initialOrderId))
    } else if (initData && screen === 'login') {
      linkAuthenticated(initData)
    }
  }, [authLoading, user, initData, linkToken, screen, initialOrderId])

  const fetchOrder = async (id: number) => {
    try {
      const orderRes = await storeApi.getOrder(id)
      setOrder(orderRes)
      setScreen('order')
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Ошибка загрузки заказа', 'error')
      setScreen('store')
    }
  }

  const loadStore = async () => {
    setStoreLoading(true)
    try {
      const [productsRes, cartRes, ordersRes] = await Promise.all([
        storeApi.products(),
        storeApi.cart(),
        storeApi.orders(),
      ])
      setProducts(productsRes)
      setCartItems(cartRes.items)
      setOrders(ordersRes)
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Ошибка загрузки магазина', 'error')
    } finally {
      setStoreLoading(false)
    }
  }

  const linkByToken = async (token: string, data: string) => {
    setScreen('linking')
    setMessage('Привязываем ваш MAX-аккаунт...')
    try {
      const res = await fetch('/api/v3/max/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, init_data: data }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        setScreen('success')
        setMessage('Аккаунт MAX успешно привязан! Можете закрыть это окно.')
      } else {
        setScreen('error')
        setMessage(json.message || 'Ошибка привязки')
      }
    } catch (e) {
      setScreen('error')
      setMessage('Ошибка соединения с сервером')
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      showToast('Введите email и пароль', 'error')
      return
    }
    setLoggingIn(true)
    try {
      const { access_token, user } = await authApi.login(email, password)
      login(user, access_token)
      showToast('Вход выполнен', 'success')
      if (initialOrderId) {
        await fetchOrder(Number(initialOrderId))
      } else if (initData) {
        await linkAuthenticated(initData)
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Ошибка входа', 'error')
    } finally {
      setLoggingIn(false)
    }
  }

  const linkAuthenticated = async (data: string) => {
    setScreen('linking')
    setMessage('Привязываем ваш MAX-аккаунт...')
    try {
      await authApi.linkMaxInApp({ init_data: data })
      setScreen('store')
      await loadStore()
    } catch (err: any) {
      setScreen('error')
      setMessage(err?.response?.data?.message || 'Ошибка привязки MAX')
    }
  }

  const addToCart = async (product: Product) => {
    try {
      const existing = cartItems.find((i) => i.product_id === product.id)
      const quantity = existing ? existing.quantity + 1 : 1
      await storeApi.addToCart({ product_id: product.id, quantity })
      const cartRes = await storeApi.cart()
      setCartItems(cartRes.items)
      showToast('Добавлено в корзину', 'success')
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Ошибка', 'error')
    }
  }

  const updateQuantity = async (item: CartItem, delta: number) => {
    const quantity = item.quantity + delta
    if (quantity <= 0) {
      await removeFromCart(item.id)
      return
    }
    try {
      await storeApi.updateCartItem(item.id, quantity)
      const cartRes = await storeApi.cart()
      setCartItems(cartRes.items)
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Ошибка', 'error')
    }
  }

  const removeFromCart = async (itemId: number) => {
    try {
      await storeApi.removeCartItem(itemId)
      const cartRes = await storeApi.cart()
      setCartItems(cartRes.items)
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Ошибка', 'error')
    }
  }

  const checkout = async () => {
    if (cartItems.length === 0) return
    try {
      const orderRes = await storeApi.checkout()
      setOrder(orderRes)
      setCartItems([])
      setOrders((prev) => [orderRes, ...prev])
      setScreen('order')
      showToast(`Заказ №${orderRes.id} создан`, 'success')
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Ошибка оформления заказа', 'error')
    }
  }

  const cartTotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  const openPayment = () => {
    if (!order?.payment_url) return
    if (window.WebApp) {
      // Открываем внутри вебвью MAX, чтобы после оплаты вернуться с сохранением контекста
      window.location.href = order.payment_url
    } else {
      window.open(order.payment_url, '_blank')
    }
  }

  const renderOrder = () => {
    if (!order) return null
    const isPaid = order.status === 'paid'
    return (
      <div className="space-y-5 text-center">
        <div className="text-5xl">{isPaid ? '✅' : '💳'}</div>
        <div>
          <div className="text-lg font-bold text-fox-purple">Заказ #{order.id}</div>
          <div className="text-sm text-fox-gray">
            {isPaid ? 'Оплачен' : 'В обработке'}
          </div>
        </div>
        <div className="text-2xl font-bold text-fox-purple">{formatMoney(order.total_amount)}</div>

        {!isPaid && order.payment_url && (
          <Button className="w-full" onClick={openPayment}>
            Оплатить через Тинькофф
          </Button>
        )}

        <div className="text-xs text-fox-gray space-y-1">
          {order.items.map((it) => (
            <div key={it.id} className="flex justify-between">
              <span>{it.title_snapshot} × {it.quantity}</span>
              <span>{formatMoney(it.price_snapshot * it.quantity)}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => { setOrder(null); setScreen('store'); setTab('orders') }}
          className="text-sm text-fox-purple hover:underline"
        >
          ← В магазин
        </button>
      </div>
    )
  }

  const renderStore = () => {
    if (storeLoading) return <Loader text="Загружаем магазин..." />

    if (order) {
      return (
        <div className="space-y-6 text-center">
          <div className="text-5xl">🦊</div>
          <div className="text-green-600 font-medium">Заказ успешно оформлен!</div>
          <div className="text-sm text-fox-gray">Номер заказа: <span className="font-bold text-fox-purple">#{order.id}</span></div>
          <div className="text-lg font-bold text-fox-purple">{formatMoney(order.total_amount)}</div>
          <Button onClick={() => { setOrder(null); setTab('orders') }}>К моим заказам</Button>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-2 p-1 bg-fox-purple/5 rounded-xl">
          <button
            onClick={() => setTab('catalog')}
            className={[
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition',
              tab === 'catalog' ? 'bg-white text-fox-purple shadow-sm' : 'text-fox-gray hover:text-fox-purple',
            ].join(' ')}
          >
            <LuStore size={16} /> Каталог
          </button>
          <button
            onClick={() => setTab('cart')}
            className={[
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition',
              tab === 'cart' ? 'bg-white text-fox-purple shadow-sm' : 'text-fox-gray hover:text-fox-purple',
            ].join(' ')}
          >
            <LuShoppingCart size={16} /> Корзина {cartCount > 0 && `(${cartCount})`}
          </button>
          <button
            onClick={() => setTab('orders')}
            className={[
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition',
              tab === 'orders' ? 'bg-white text-fox-purple shadow-sm' : 'text-fox-gray hover:text-fox-purple',
            ].join(' ')}
          >
            <LuPackage size={16} /> Заказы
          </button>
        </div>

        {tab === 'catalog' && (
          <div className="grid grid-cols-1 gap-3">
            {products.length === 0 ? (
              <p className="text-sm text-fox-gray text-center py-8">Пока нет товаров. Загляните позже!</p>
            ) : (
              products.map((product) => (
                <div key={product.id} className="flex gap-3 p-3 rounded-xl bg-white border border-fox-border/50">
                  <div className="w-20 h-20 rounded-lg bg-fox-light flex-shrink-0 overflow-hidden">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-fox-gray">
                        <LuStore size={24} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-fox-purple text-sm">{product.title}</h3>
                    <p className="text-xs text-fox-gray line-clamp-2 mt-0.5">{product.description || ''}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-bold text-fox-purple text-sm">{formatMoney(product.price)}</span>
                      <Button size="sm" leftIcon={<LuPlus size={14} />} onClick={() => addToCart(product)}>
                        В корзину
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'cart' && (
          <div className="space-y-3">
            {cartItems.length === 0 ? (
              <p className="text-sm text-fox-gray text-center py-8">Корзина пуста</p>
            ) : (
              <>
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-3 p-3 rounded-xl bg-white border border-fox-border/50">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-fox-purple text-sm">{item.product.title}</h3>
                      <div className="text-xs text-fox-gray mt-0.5">{formatMoney(item.product.price)} / шт.</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item, -1)}
                        className="w-7 h-7 rounded-lg bg-fox-light flex items-center justify-center text-fox-purple"
                      >
                        <LuMinus size={14} />
                      </button>
                      <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item, 1)}
                        className="w-7 h-7 rounded-lg bg-fox-light flex items-center justify-center text-fox-purple"
                      >
                        <LuPlus size={14} />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="w-7 h-7 rounded-lg bg-fox-error/10 flex items-center justify-center text-fox-error ml-1"
                      >
                        <LuTrash size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t border-fox-border">
                  <span className="text-sm text-fox-gray">Итого</span>
                  <span className="text-lg font-bold text-fox-purple">{formatMoney(cartTotal)}</span>
                </div>
                <Button className="w-full" onClick={checkout}>
                  Оформить заказ
                </Button>
              </>
            )}
          </div>
        )}

        {tab === 'orders' && (
          <div className="space-y-3">
            {orders.length === 0 ? (
              <p className="text-sm text-fox-gray text-center py-8">У вас пока нет заказов</p>
            ) : (
              orders.map((o) => (
                <div key={o.id} className="p-3 rounded-xl bg-white border border-fox-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-fox-purple">Заказ #{o.id}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-fox-purple/10 text-fox-purple capitalize">
                      {o.status === 'pending' ? 'В обработке' : o.status === 'paid' ? 'Оплачен' : 'Отменён'}
                    </span>
                  </div>
                  <div className="text-xs text-fox-gray space-y-1">
                    {o.items.map((it) => (
                      <div key={it.id} className="flex justify-between">
                        <span>{it.title_snapshot} × {it.quantity}</span>
                        <span>{formatMoney(it.price_snapshot * it.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-2 pt-2 border-t border-fox-border">
                    <span className="text-xs text-fox-gray">Итого</span>
                    <span className="text-sm font-bold text-fox-purple">{formatMoney(o.total_amount)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-fox-light flex items-start justify-center p-4 pt-6">
      <Card className="max-w-md w-full p-6">
        {screen === 'loading' && <Loader text={message} />}

        {screen === 'login' && (
          <div className="space-y-6">
            <div className="space-y-2 text-center">
              <h1 className="text-xl font-bold text-fox-dark">FOXINBURG</h1>
              <p className="text-sm text-fox-gray">{message}</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4 text-left">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                type="password"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button type="submit" className="w-full" loading={loggingIn}>
                Войти и привязать MAX
              </Button>
            </form>
          </div>
        )}

        {screen === 'linking' && <Loader text={message} />}

        {screen === 'success' && (
          <div className="space-y-4 text-center">
            <div className="text-5xl">🦊</div>
            <div className="text-green-600 font-medium">{message}</div>
          </div>
        )}

        {screen === 'store' && renderStore()}

        {screen === 'order' && renderOrder()}

        {screen === 'error' && (
          <div className="space-y-4 text-center">
            <div className="text-5xl">⚠️</div>
            <div className="text-red-500 font-medium">{message}</div>
          </div>
        )}
      </Card>
    </div>
  )
}
