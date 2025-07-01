import { useAuth } from '../../context/authContext'; 
import AdminDashboardView from './AdminDashboardView';
import EmployeeDashboardView from './EmployeeDashboardView';
import './Dashboard.css';

const Dashboard = () => {
  const { user} = useAuth(); 

  if (!user) {
    return <p>Veuillez vous connecter pour voir le tableau de bord.</p>;
  }

  const welcomeName = user?.username || user?.username ;

  return (
    <div className="dashboard-content-area">
      <div className="welcome-banner-dashboard">
        <div className="content-relative">
          <h1 className="welcome-title">Bienvenue, <span className="user-name-highlight">{welcomeName}</span>!</h1>
          <p className="welcome-subtitle">
            {user.roleId === 1 
              ? "Voici un aperçu de l'activité sur la plateforme."
              : "Voici vos activités récentes et à venir."}
          </p>
        </div>
      </div>

      {user.roleId === 1 && <AdminDashboardView />}
      {user.roleId === 2 && <EmployeeDashboardView />}
      {![1, 2].includes(user.roleId) && (
        <p>Rôle utilisateur non reconnu. Impossible d'afficher le tableau de bord.</p>
      )}
    </div>
  );
};

export default Dashboard;
