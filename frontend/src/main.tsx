import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard/Dashboard';
import Events from './pages/Events/Events';
import Users from './pages/Users/Users';
import Forms from './pages/Forms/Forms';
import Settings from './pages/Settings/Settings';
import Login from './pages/Login/Login';
import { AuthProvider, useAuth } from './context/authContext';
import EventRegistrationForm from './pages/Registration/EventRegistrationForm';
import EventInscriptionsPage from './pages/Inscriptions/EventInscriptionsPage'; 
import { NotificationProvider } from './context/notificationContext'; 
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';



const ProtectedRoutesLayout = () => {
  const { logout } = useAuth();
  return (
    <Layout onLogout={logout}>
      <Outlet />
    </Layout>
  );
};

const AppRoutes = () => {
  const { isAuthenticated, isLoading, login } = useAuth();
  

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Routes>
      {isAuthenticated ? (
        <Route element={<ProtectedRoutesLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:eventId/register" element={<EventRegistrationForm />} />
          <Route path="/users" element={<Users />} />
          <Route path="/forms" element={<Forms />} />
          <Route path="/admin/events/:eventId/inscriptions" element={<EventInscriptionsPage />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/login" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      ) : (
        <>
          <Route path="/login" element={<Login onLoginSuccess={login} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </>
      )}
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppRoutes />
        <ToastContainer
          position="bottom-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
