import { Routes, Route, Navigate } from 'react-router-dom';
import { useLocalStorage } from './hooks/useLocalstorage';

import LandingPage  from './components/landing/LandingPage';
import LoginPage    from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import App          from './App';

export default function AppRouter() {
  const [auth, setAuth]           = useLocalStorage('tf_auth', false);
  const [, setUsername]           = useLocalStorage('totalfund_username', 'User123');
  const [, setProfilePic]         = useLocalStorage('totalfund_profilePic', '');

  const handleLogin = ({ email, name, picture } = {}) => {
    if (name)    setUsername(name);
    if (picture) setProfilePic(picture);
    setAuth(true);
  };

  const handleLogout = () => setAuth(false);

  if (auth) {
    return (
      <Routes>
        <Route path="*" element={<App onLogout={handleLogout} />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/"         element={<LandingPage />} />
      <Route path="/login"    element={<LoginPage    onLogin={handleLogin} />} />
      <Route path="/register" element={<RegisterPage onLogin={handleLogin} />} />
      <Route path="*"         element={<Navigate to="/" replace />} />
    </Routes>
  );
}
