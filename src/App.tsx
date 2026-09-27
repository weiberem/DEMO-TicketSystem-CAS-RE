import { Route, Routes } from 'react-router-dom'
import { store, useStoreVersion } from './lib/store'
import { Toaster } from './components/ui'
import Hub from './pages/Hub'
import Compare from './pages/Compare'
import Split from './pages/Split'
import LegacyForm from './legacy/LegacyForm'
import Wise from './legacy/Wise'
import Portal from './portal/Portal'
import Desk from './desk/Desk'

export default function App() {
  useStoreVersion()
  if (!store.ready) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
        Demo-Daten werden geladen …
      </div>
    )
  }
  return (
    <>
      <Routes>
        <Route path="/" element={<Hub />} />
        <Route path="/vergleich" element={<Compare />} />
        <Route path="/split" element={<Split />} />
        <Route path="/ist/formular" element={<LegacyForm />} />
        <Route path="/ist/wise/*" element={<Wise />} />
        <Route path="/portal/*" element={<Portal />} />
        <Route path="/desk/*" element={<Desk />} />
        <Route path="*" element={<Hub />} />
      </Routes>
      <Toaster />
    </>
  )
}
