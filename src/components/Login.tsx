import { useState } from 'react'
import { supabase } from '../supabase'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
  }

  return (
    <div style={{ padding: 20, maxWidth: 300, margin: '0 auto' }}>
      <h2>Вход в систему</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleLogin}>
        <input 
          type="email" placeholder="Email" value={email} 
          onChange={e => setEmail(e.target.value)} required 
          style={{ display: 'block', width: '100%', marginBottom: 10 }} 
        />
        <input 
          type="password" placeholder="Пароль" value={password} 
          onChange={e => setPassword(e.target.value)} required 
          style={{ display: 'block', width: '100%', marginBottom: 10 }} 
        />
        <button type="submit" style={{ width: '100%' }}>Войти</button>
      </form>
    </div>
  )
}