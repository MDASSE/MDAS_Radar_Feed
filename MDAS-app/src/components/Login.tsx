import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    //VH - Add login logic here once we have the backend working
    console.log('Login attempt:', { email, password })
    navigate('/dashboard')
  }

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      background: 'linear-gradient(to bottom right, #0f172a, #1e293b, #0f172a)'
    }}>
      <div style={{
        backgroundColor: '#1e293b',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
        border: '1px solid #334155'
      }}>
        <h1 style={{ 
          marginTop: 0, 
          marginBottom: '30px', 
          textAlign: 'center',
          fontSize: '2.5rem',
          fontWeight: 'bold',
          color: '#22d3ee',
          textShadow: '0 0 10px rgba(34, 211, 238, 0.3)'
        }}>MDAS Radar Feed</h1>
        <form onSubmit={handleSubmit} style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              color: '#cbd5e1',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Email:
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid #475569',
                backgroundColor: '#0f172a',
                color: '#f1f5f9',
                fontSize: '16px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#22d3ee'}
              onBlur={(e) => e.target.style.borderColor = '#475569'}
            />
          </div>
          <div style={{ marginBottom: '25px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              color: '#cbd5e1',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Password:
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid #475569',
                backgroundColor: '#0f172a',
                color: '#f1f5f9',
                fontSize: '16px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#22d3ee'}
              onBlur={(e) => e.target.style.borderColor = '#475569'}
            />
          </div>
          <button 
            type="submit"
            style={{
              padding: '12px 24px',
              backgroundColor: '#0891b2',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              width: '100%'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0e7490'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0891b2'}
          >
            Login
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login

