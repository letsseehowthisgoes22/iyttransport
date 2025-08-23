import React, { useState } from 'react';
import { useAuth } from './contexts/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    const result = await login(email, password);
    if (result.success) {
      window.location.href = '/';
    } else {
      setErr(result.error || 'Login failed');
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: '80px auto' }}>
      <h2>Login</h2>
      {err ? <div style={{ color: 'red' }}>{err}</div> : null}
      <form onSubmit={onSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" required style={{ width: '100%' }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Password</label>
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" required style={{ width: '100%' }} />
        </div>
        <button type="submit">Sign in</button>
      </form>
      <div style={{ marginTop: 12 }}>
        <small>Try admin@test.com / password123</small>
      </div>
    </div>
  );
}
