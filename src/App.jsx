/* ============================================
   App.jsx - Root Component
   จัดการ routing และ layout หลักของแอป
   ============================================ */

import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import VocabularyPage from './pages/VocabularyPage'
import QuizPage from './pages/QuizPage'
import StatsPage from './pages/StatsPage'

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* แถบนำทางด้านบน */}
      <Navbar />

      {/* เนื้อหาหลัก - เว้นระยะด้านบนสำหรับ fixed navbar */}
      <main className="flex-1 pt-20 pb-8 px-4 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<VocabularyPage />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/stats" element={<StatsPage />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-text-muted text-sm">
        <p>LearnXNot &copy; {new Date().getFullYear()} — เรียนรู้คำศัพท์อย่างมีประสิทธิภาพ</p>
      </footer>
    </div>
  )
}

export default App
