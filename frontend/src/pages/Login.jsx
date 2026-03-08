import React, { useState } from 'react';
import axios from 'axios';

// Configure axios to use backend URL
const API_BASE_URL = 'http://localhost:3001';

const Login = ({ onLogin, language, setLanguage }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log("📤 Sending login to backend:", `${API_BASE_URL}/api/auth/login`);
      
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const response = await axios.post(`${API_BASE_URL}${endpoint}`, { username, password });

      console.log("📥 Backend response:", response.data);

      if (response.data.success) {
        if (isRegister) {
          setIsRegister(false);
          setError(language === 'en' ? 'Registration successful! Please login.' : 'Pendaftaran berhasil! Silakan login.');
        } else {
          const token = response.data.data.token;
          localStorage.setItem('token', token);
          onLogin(token);
        }
      }
    } catch (err) {
      console.error("❌ Login error:", err);
      setError(err.response?.data?.error || (language === 'en' ? 'An error occurred' : 'Terjadi kesalahan'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">ClipperAi2026</h1>
          <p className="text-gray-400">
            {language === 'en' ? 'AI Content Research & Video Clipping System' : 'Sistem Riset Konten AI & Pemotongan Video'}
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-8">
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setLanguage(language === 'en' ? 'id' : 'en')}
              className="text-gray-400 hover:text-white text-sm"
            >
              {language?.toUpperCase?.() || "EN"}
            </button>
          </div>

          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            {isRegister
              ? (language === 'en' ? 'Register' : 'Daftar')
              : (language === 'en' ? 'Login' : 'Masuk')
            }
          </h2>

          {error && (
            <div className="bg-red-600 text-white p-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                {language === 'en' ? 'Username' : 'Nama Pengguna'}
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={language === 'en' ? 'Enter username' : 'Masukkan nama pengguna'}
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                {language === 'en' ? 'Password' : 'Kata Sandi'}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={language === 'en' ? 'Enter password' : 'Masukkan kata sandi'}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              {loading
                ? (language === 'en' ? 'Processing...' : 'Memproses...')
                : (isRegister
                  ? (language === 'en' ? 'Register' : 'Daftar')
                  : (language === 'en' ? 'Login' : 'Masuk')
                )
              }
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              {isRegister
                ? (language === 'en' ? 'Already have an account? Login' : 'Sudah punya akun? Masuk')
                : (language === 'en' ? 'Need an account? Register' : 'Butuh akun? Daftar')
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
