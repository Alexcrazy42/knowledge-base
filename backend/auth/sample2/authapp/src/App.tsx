import { Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Info from './pages/Info'
import Github from './pages/Github'
import OidcCallback from './pages/OidcCallback'

function App() {
  return (
    <>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/info" element={<Info />} />
      <Route path="/github/sign-in" element={<Github />} />
      <Route path="/oidc/callback" element={<OidcCallback />} />
    </Routes>
    </>
  )
}

export default App
