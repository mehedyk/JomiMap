import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import MeasurePage from './pages/MeasurePage'
import UnitsGuidePage from './pages/UnitsGuidePage'
import CreditsPage from './pages/CreditsPage'

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex-1">
        {children}
      </div>
      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/"            element={<HomePage />} />
            <Route path="/measure"     element={<MeasurePage />} />
            <Route path="/units-guide" element={<UnitsGuidePage />} />
            <Route path="/credits"     element={<CreditsPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AppProvider>
  )
}
