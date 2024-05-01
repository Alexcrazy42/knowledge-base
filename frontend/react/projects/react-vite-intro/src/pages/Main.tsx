import '@styles/App.css'
import Button from '@components/Button'
import { useNavigate  } from 'react-router-dom'
import { ROUTES } from '@constants/routes'
import About from '@pages/About'

function Main() {
  let navigate = useNavigate(); 
  const routeChange = () =>{ 
    let path = ROUTES.ABOUT; 
    navigate(path);
  }

  return (
    <>
      <h1>Vite + React</h1>
      <div className="card">
        <Button name = "1" onClick={routeChange} />
      </div>
      
      
    </>
  )
}

export default Main
