import { createContext, useContext, useState, useEffect } from 'react';
import { apiGetMe, apiLogin, apiRegister, apiCompanySignup } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true); // true while checking stored token

  // On app load — if a token exists, fetch the current user from the backend
  useEffect(() => {
    const token = localStorage.getItem('timeoff_token');
    if (!token) { setLoading(false); return; }

    apiGetMe()
      .then(({ user, company }) => { setUser(user); setCompany(company); })
      .catch(() => { localStorage.removeItem('timeoff_token'); })
      .finally(() => setLoading(false));
  }, []);

  function saveSession({ token, user, company }) {
    localStorage.setItem('timeoff_token', token);
    setUser(user);
    setCompany(company);
  }

  async function login(email, password) {
    const result = await apiLogin({ email, password });
    saveSession(result);
    return result;
  }

  async function register(data) {
    const result = await apiRegister(data);
    saveSession(result);
    return result;
  }

  async function companySignup(data) {
    const result = await apiCompanySignup(data);
    saveSession(result);
    return result;
  }

  function logout() {
    localStorage.removeItem('timeoff_token');
    setUser(null);
    setCompany(null);
  }

  return (
    <AuthContext.Provider value={{ user, company, loading, login, register, companySignup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}