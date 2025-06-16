import { useEffect, useState } from 'react';
import { useAuth } from '../../context/authContext';
import './Dashboard.css';
import { useNotifications } from '../../context/notificationContext'; // Import useNotifications
import { UINotificationType } from '../../types/notification.types'; // Import notification types
import { formatDistanceToNow, parseISO } from 'date-fns'; // For relative time
import { fr } from 'date-fns/locale'; // For French locale
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'; // For pagination icons

// Define types for employee-specific data
interface MyEvent {
  id_event: string | number;
  title_event: string;
  start_date: string;
  end_date: string;
  description?: string;
  status?: string;
}

// Define a new interface for Registered Events, including registrationDate
interface RegisteredEvent extends MyEvent {
  registrationDate: string;
}

// Helper functions (copied from AdminDashboardView or similar)
const getNotificationIconClass = (type: UINotificationType): string => {
  switch (type) {
    case UINotificationType.EVENT_CREATED: return "fas fa-briefcase"; // Example, adjust if needed
    case UINotificationType.REGISTRATION_CONFIRMATION: return "fas fa-building"; // Example, adjust if needed
    // Add other cases from your AdminDashboardView if they are relevant for employee notifications
    default: return "fas fa-info-circle";
  }
};

const getIconBgClass = (type: UINotificationType): string => {
  switch (type) {
    case UINotificationType.EVENT_CREATED: return 'icon-bg-blue'; // Example
    case UINotificationType.REGISTRATION_CONFIRMATION: return 'icon-bg-green'; // Example
    // Add other cases
    default: return 'icon-bg-gray';
  }
};

const formatRelativeTime = (dateString?: string): string => {
  if (!dateString) return "Date inconnue";
  try {
    const date = parseISO(dateString);
    return formatDistanceToNow(date, { addSuffix: true, locale: fr });
  } catch (e) {
    console.error("Error formatting relative time:", e);
    return dateString; // Fallback to original string on error
  }
};

const ITEMS_PER_INSCRIPTIONS_PAGE = 4; // Same as AdminDashboardView

const EmployeeDashboardView = () => {
  const { user, token } = useAuth();
  const { notifications, isLoading: isLoadingNotifications, error: notificationsError } = useNotifications(); // Use notifications hook

  const [myUpcomingEvents, setMyUpcomingEvents] = useState<MyEvent[]>([]);
  const [ongoingEvents, setOngoingEvents] = useState<MyEvent[]>([]);
  const [finishedEvents, setFinishedEvents] = useState<MyEvent[]>([]);
  const [cancelledEvents, setCancelledEvents] = useState<MyEvent[]>([]);
  const [myRegisteredEvents, setMyRegisteredEvents] = useState<RegisteredEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentInscriptionsPage, setCurrentInscriptionsPage] = useState(1); // Pagination state

  useEffect(() => {
    if (user?.userId && token) {
      setIsLoading(true);
      setError(null);

      const fetchEventSummary = fetch(`http://localhost:3001/api/events/me/summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => {
        if (!res.ok) {
          return res.text().then(text => { throw new Error(`Failed to fetch event summary: ${res.status} ${text}`) });
        }
        return res.json();
      })
      .then(data => {
        setMyUpcomingEvents(data.upcomingEvents || []);
        setOngoingEvents(data.ongoingEvents || []);
        setFinishedEvents(data.finishedEvents || []);
        setCancelledEvents(data.cancelledEvents || []);
      });

      const fetchRegisteredEvents = fetch(`http://localhost:3001/api/events/me/registered`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => {
        if (!res.ok) {
          return res.text().then(text => { throw new Error(`Failed to fetch registered events: ${res.status} ${text}`) });
        }
        return res.json();
      })
      .then(data => {
        setMyRegisteredEvents(data || []);
      });

      Promise.all([fetchEventSummary, fetchRegisteredEvents])
        .catch(err => {
          console.error('Error fetching dashboard data:', err);
          setError(err.message || 'An error occurred while fetching data.');
          setMyUpcomingEvents([]);
          setOngoingEvents([]);
          setFinishedEvents([]);
          setCancelledEvents([]);
          setMyRegisteredEvents([]);
        })
        .finally(() => {
          setIsLoading(false);
        });

    } else {
      setIsLoading(false); // No user or token, stop loading
      if (!user?.userId) {
        setError("Informations utilisateur non disponibles. Veuillez vous reconnecter.");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    } catch (e) {
        return dateString; // Fallback
    }
  };

  const renderEventCard = (
    events: MyEvent[],
    title: string,
    statusKey: 'upcoming' | 'ongoing' | 'finished' | 'cancelled'
  ) => {
    const iconClass = 'fas fa-calendar-check';
    let styleClass = ''; 

    switch (statusKey) {
      case 'upcoming':
        styleClass = 'event-card-upcoming';
        break;
      case 'ongoing':
        styleClass = 'event-card-ongoing';
        break;
      case 'finished':
        styleClass = 'event-card-finished';
        break;
      case 'cancelled':
        styleClass = 'event-card-cancelled';
        break;
      default:
        styleClass = 'event-card-default';
    }

    return (
      <div className={`event-category-card stat-card-item ${styleClass}`}>
        <div className="stat-icon-container">
          <i className={iconClass}></i>
        </div>
        <div className="stat-text-content">
          <h3>{title}</h3>
          <p className="stat-value">{events.length}</p>
        </div>
      </div>
    );
  };

  // Pagination logic for "Mes Inscriptions"
  const indexOfLastInscription = currentInscriptionsPage * ITEMS_PER_INSCRIPTIONS_PAGE;
  const indexOfFirstInscription = indexOfLastInscription - ITEMS_PER_INSCRIPTIONS_PAGE;
  const currentMyInscriptions = myRegisteredEvents.slice(indexOfFirstInscription, indexOfLastInscription);
  const totalMyInscriptionsPages = Math.ceil(myRegisteredEvents.length / ITEMS_PER_INSCRIPTIONS_PAGE);

  const handleMyInscriptionsNextPage = () => {
    setCurrentInscriptionsPage((prev) => Math.min(prev + 1, totalMyInscriptionsPages));
  };

  const handleMyInscriptionsPrevPage = () => {
    setCurrentInscriptionsPage((prev) => Math.max(prev - 1, 1));
  };

  const latestNotifications = notifications.slice(0, 4); // Get the latest 4 notifications

  if (isLoading) {
    return <p className="loading-message" style={{ textAlign: 'center', margin: '20px 0' }}>Chargement de vos informations...</p>;
  }

  if (error && !isLoading) { // Show general error if not loading and error exists
    return <p className="error-message" style={{ color: 'red', textAlign: 'center', margin: '20px 0' }}>Erreur: {error}</p>;
  }
  
  if (!user && !isLoading) { // If no user and not loading
    return <p style={{ textAlign: 'center', margin: '20px 0', fontStyle: 'italic' }}>Veuillez vous connecter pour voir votre tableau de bord.</p>;
  }

  return (
    <div className="employee-dashboard-view dashboard"> {/* Added 'dashboard' class for shared styles */}
      
      <h2 className="section-title">Récapitulatif des Événements</h2>
      <div className="event-categories-grid">
        {renderEventCard(myUpcomingEvents, "Événements à Venir", "upcoming")}
        {renderEventCard(ongoingEvents, "Événements en Cours", "ongoing")}
        {renderEventCard(finishedEvents, "Événements Terminés", "finished")}
        {renderEventCard(cancelledEvents, "Événements Annulés", "cancelled")}
      </div>

      <hr className="dashboard-divider" />

      <div className="dashboard-columns-wrapper"> {/* Wrapper for two columns */}
        {/* Column 1: Mes Inscriptions */}
        <section className="my-registered-events-table-section"> {/* Use same class as Admin */}
          <div className="section-header-with-pagination">
            <h2 className="section-header">Mes Inscriptions aux Événements</h2>
            {myRegisteredEvents.length > ITEMS_PER_INSCRIPTIONS_PAGE && (
              <div className="pagination-controls">
                <button onClick={handleMyInscriptionsPrevPage} disabled={currentInscriptionsPage === 1} className="pagination-button" aria-label="Page précédente"><FaChevronLeft /></button>
                <span className="page-info">Page {currentInscriptionsPage} / {totalMyInscriptionsPages}</span>
                <button onClick={handleMyInscriptionsNextPage} disabled={currentInscriptionsPage === totalMyInscriptionsPages} className="pagination-button" aria-label="Page suivante"><FaChevronRight /></button>
              </div>
            )}
          </div>
          {/* Removed the extra "Mes Inscriptions Personnelles" stat card from here as it's redundant with the list title */}
          {myRegisteredEvents.length > 0 ? (
            <ul className="inscription-list"> {/* Use <ul> for semantic list */}
              {currentMyInscriptions.map((event) => {
                let statusClass = ''; 
                const statusText = event.status || 'N/A';
                switch (statusText.toLowerCase()) {
                  case 'terminé': statusClass = 'status-termine'; break;
                  case 'en cours': statusClass = 'status-en-cours'; break;
                  case 'à venir': statusClass = 'status-a-venir'; break;
                  case 'annulé': statusClass = 'status-annule'; break;
                  default: statusClass = 'status-default';
                }
                return (
                  <li key={event.id_event} className="inscription-list-item">
                    <div className="inscription-icon-container icon-bg-blue"> {/* Example icon bg */}
                      <i className="fas fa-calendar-check"></i> {/* Example icon */}
                    </div>
                    <div className="inscription-text-content">
                      <h3>{event.title_event}</h3>
                      <div className="inscription-details">
                        <span className={`status-badge ${statusClass}`}>{statusText}</span>
                        <span className="inscription-date">
                          <i className="fas fa-clock" style={{ marginRight: '4px', opacity: 0.7 }}></i>
                          Inscrit le: {formatDate(event.registrationDate)}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="no-events-message">Vous n'êtes inscrit à aucun événement pour le moment.</p>
          )}
        </section>

        {/* Column 2: Activités Récentes */}
        <section className="recent-activity-section"> {/* Use same class as Admin */}
          <div className="section-header-with-pagination"> {/* Keep consistent structure even if no pagination for now */}
            <h2 className="section-header">Activités récentes</h2>
          </div>
          {isLoadingNotifications && <p className="loading-message">Chargement des activités...</p>}
          {notificationsError && <p className="error-message" style={{ color: 'red' }}>Erreur (activités): {notificationsError}</p>}
          {!isLoadingNotifications && !notificationsError && latestNotifications.length > 0 ? (
            <ul className="activity-list">
              {latestNotifications.map(notification => {
                const messageLines = notification.message.split('\n');
                const activityTitle = messageLines[0];
                const activitySubtitle = messageLines.length > 1 ? messageLines.slice(1).join(' ') : '';
                return (
                  <li key={notification.id_notification} className="activity-list-item">
                    <div className={`activity-icon-container ${getIconBgClass(notification.type)}`}>
                      <i className={getNotificationIconClass(notification.type)}></i>
                    </div>
                    <div className="activity-text-content">
                      <h3>{activityTitle}</h3>
                      {activitySubtitle && <p className="activity-subtitle">{activitySubtitle}</p>}
                      <p className="activity-timestamp">{formatRelativeTime(notification.created_at)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (!isLoadingNotifications && !notificationsError && <p className="no-activity-message">Aucune activité récente.</p>)}
        </section>
      </div>
    </div>
  );
};

export default EmployeeDashboardView;