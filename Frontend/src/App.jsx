import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import DashboardLayout from './layouts/DashboardLayout';

import LoginPage          from './pages/Auth/LoginPage';
import DashboardPage      from './pages/Dashboard/DashboardPage';
import MySubmissionsPage  from './pages/Submissions/MySubmissionsPage';
import NewSubmissionPage  from './pages/Submissions/NewSubmissionPage';
import EditSubmissionPage from './pages/Submissions/EditSubmissionPage';
import ApprovalsPage      from './pages/Approvals/ApprovalsPage';
import GenerationPage     from './pages/Generation/GenerationPage';
import PublicationPage    from './pages/Publication/PublicationPage';
import ArchivesPage       from './pages/Archives/ArchivesPage';

const PrivateRoute = ({ children, adminOnly = false }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'Admin') return <Navigate to="/dashboard" replace />;
  return <DashboardLayout>{children}</DashboardLayout>;
};

const AppRoutes = () => {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
      <Route path="/dashboard"   element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
      <Route path="/submissions" element={<PrivateRoute><MySubmissionsPage /></PrivateRoute>} />
      <Route path="/submissions/new" element={<PrivateRoute><NewSubmissionPage /></PrivateRoute>} />
      <Route path="/submissions/edit/:id" element={<PrivateRoute><EditSubmissionPage /></PrivateRoute>} />
      <Route path="/approvals"   element={<PrivateRoute adminOnly><ApprovalsPage /></PrivateRoute>} />
      <Route path="/generation"  element={<PrivateRoute adminOnly><GenerationPage /></PrivateRoute>} />
      <Route path="/publication" element={<PrivateRoute adminOnly><PublicationPage /></PrivateRoute>} />
      <Route path="/archives"    element={<PrivateRoute><ArchivesPage /></PrivateRoute>} />
      <Route path="*"            element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </AuthProvider>
);

export default App;
