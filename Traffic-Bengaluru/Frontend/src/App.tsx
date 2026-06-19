import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import HotspotMap from './pages/HotspotMap'
import Analytics from './pages/Analytics'
import ModelInsights from './pages/ModelInsights'
import VehicleSearch from './pages/VehicleSearch'
import Settings from './pages/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="map" element={<HotspotMap />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="model" element={<ModelInsights />} />
          <Route path="vehicles" element={<VehicleSearch />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
