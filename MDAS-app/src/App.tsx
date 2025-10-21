import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-sky-100 text-center">
      <h1 className="text-4xl font-bold text-sky-700">Tailwind is Working!</h1>
      <p className="mt-4 text-lg text-sky-500">🚀 Styled with Tailwind v4</p>
    </div>
  );
}

export default App
