'use client';

import { useState } from 'react';
import { LOGIN_ROUTE } from '@/constants/api';
import apiClient from '@/lib/api-client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      const res = await apiClient.post(
        LOGIN_ROUTE,
        {email,password},
        {withCredentials: true}
      );
      const token = res.data.token;
      const user = res.data.user;
      if (res.data.user?.id) {
        alert("Login successful!");
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        console.log(res.data.user);
      }

    } catch (error) {
      let message = error instanceof Error ? error.message : "An error occurred";
      alert(message);
    }
  }
  
  return (
    <div>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button onClick={handleLogin}>Đăng nhập</button>
    </div>
  );
}

