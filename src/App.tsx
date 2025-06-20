import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [practice, setPractice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedPractice = localStorage.getItem('practice');
    
    if (token && storedPractice) {
      setIsAuthenticated(true);
      setPractice(JSON.parse(storedPractice));
    }
    setLoading(false);
  }, []);

  const handleLogin = (token: string, practiceData: any) => {
    setIsAuthenticated(true);
    setPractice(practiceData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('practice');
    setIsAuthenticated(false);
    setPractice(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="App">
      {isAuthenticated ? (
        <Dashboard practice={practice} onLogout={handleLogout} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;
