import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <div className="bg-gradient-to-br from-fox-purple to-purple-800 text-white py-20">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h1 className="text-5xl font-bold mb-6">Говорите на языке мира</h1>
        <p className="text-xl mb-8 text-gray-200">
          Европейские, азиатские, ближневосточные и языки СНГ — всё в одной школе.
        </p>
        <div className="flex gap-4 justify-center">
          <Link to="/login" className="px-8 py-4 bg-fox-gold text-fox-purple font-bold rounded-xl hover:scale-105 transition">
            Начать бесплатно
          </Link>
          <Link to="/login" className="px-8 py-4 border border-white text-white rounded-xl hover:bg-white hover:text-fox-purple transition">
            Уже есть аккаунт
          </Link>
        </div>
      </div>
    </div>
  )
}
