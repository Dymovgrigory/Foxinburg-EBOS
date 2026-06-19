import Header from './Header'

interface PlaceholderPageProps {
  title: string
  subtitle?: string
  icon?: string
}

export default function PlaceholderPage({ title, subtitle, icon }: PlaceholderPageProps) {
  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <Header title={title} subtitle={subtitle} icon={icon} />
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-5xl mb-4">🚧</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
          <p className="text-gray-500">Этот модуль находится в разработке.</p>
        </div>
      </div>
    </div>
  )
}
