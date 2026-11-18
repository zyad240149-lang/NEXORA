import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Subscriptions from './pages/Subscriptions';
import Accounts from './pages/Accounts';
import Sales from './pages/Sales';
import Login from './pages/Login';
import Goals from './pages/Goals';
import { useAuth } from './services/auth';

export default function App() {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (!user) return <Login />;
  const admin = user.role === 'admin';
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/subscriptions" element={<Subscriptions />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/goals" element={<Goals />} />
        {admin && <Route path="/accounts" element={<Accounts />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
