import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

// Preset demo users so you can switch roles easily without a real auth system
export const DEMO_USERS = [
  { employeeId: 'emp_001', name: 'Alex Johnson',  role: 'employee', location: 'loc_NY', avatar: 'AJ' },
  { employeeId: 'emp_002', name: 'Maria Garcia',  role: 'employee', location: 'loc_NY', avatar: 'MG' },
  { employeeId: 'emp_003', name: 'Sam Patel',     role: 'employee', location: 'loc_NY', avatar: 'SP' },
  { employeeId: 'emp_004', name: 'Chris Lee',     role: 'employee', location: 'loc_NY', avatar: 'CL' },
  { employeeId: 'mgr_001', name: 'Jordan Taylor', role: 'manager',  location: 'loc_NY', avatar: 'JT' },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('timeoff_user')) || null;
    } catch {
      return null;
    }
  });

  function login(selectedUser) {
    localStorage.setItem('timeoff_user', JSON.stringify(selectedUser));
    setUser(selectedUser);
  }

  function logout() {
    localStorage.removeItem('timeoff_user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
