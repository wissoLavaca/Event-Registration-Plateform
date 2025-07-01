import { useState, useEffect } from 'react';
import './Dashboard.css';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Filler,
  Scale
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { useAuth } from '../../context/authContext';
import { useTheme } from '../../context/themeContext';
import { useNotifications } from '../../context/notificationContext';
import { UINotificationType } from '../../types/notification.types';
import { formatDistanceToNow, parseISO, subDays, isWithinInterval, startOfYear, endOfYear } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const generateHslaColor = (index: number, totalItems: number, saturation: number = 70, lightness: number = 60, alpha: number = 0.6): string => {
  const hue = (index * (360 / Math.max(1, totalItems))) % 360;
  return `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
};

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Filler
);

interface RegistrationsPerEvent {
  eventName: string;
  registrationcount: number;
}
interface RegistrationsOverTime {
  date: string; 
  registrationcount: number;
}
interface RegistrationsByDepartment {
  departmentName: string;
  registrationcount: number;
}

interface MyEvent {
  id_event: string | number;
  title_event: string;
  start_date: string;
  end_date: string;
  description?: string;
  status?: string;
}
interface RegisteredEvent extends MyEvent {
  registrationDate: string;
}

const getNotificationIconClass = (type: UINotificationType): string => {
  switch (type) {
    case UINotificationType.EVENT_CREATED: return "fas fa-briefcase";
    case UINotificationType.REGISTRATION_CONFIRMATION: return "fas fa-building";
    default: return "fas fa-info-circle";
  }
};
const getIconBgClass = (type: UINotificationType): string => {
  switch (type) {
    case UINotificationType.EVENT_CREATED: return 'icon-bg-blue';
    case UINotificationType.REGISTRATION_CONFIRMATION: return 'icon-bg-green';
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
    return dateString;
  }
};

const ITEMS_PER_INSCRIPTIONS_PAGE = 4;
type TimeRange = '30d' | '90d' | '1y';

const AdminDashboardView = () => {
  const { user, token } = useAuth();
  const { notifications, isLoading: isLoadingNotifications, error: notificationsError } = useNotifications();
  const { theme } = useTheme();

  const [chartStyleOptions, setChartStyleOptions] = useState({
    tickColor: '#000000',
    gridColor: 'rgba(0, 0, 0, 0.1)',
    legendLabelColor: '#000000'
  });

  const [eventCount, setEventCount] = useState<number | null>(null);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [registrationsPerEventData, setRegistrationsPerEventData] = useState<RegistrationsPerEvent[]>([]);
  const [allRegistrationsOverTimeData, setAllRegistrationsOverTimeData] = useState<RegistrationsOverTime[]>([]);
  const [filteredRegistrationsOverTimeData, setFilteredRegistrationsOverTimeData] = useState<RegistrationsOverTime[]>([]);
  const [registrationsByDeptData, setRegistrationsByDeptData] = useState<RegistrationsByDepartment[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingRegPerEvent, setIsLoadingRegPerEvent] = useState(true);
  const [isLoadingRegOverTime, setIsLoadingRegOverTime] = useState(true);
  const [isLoadingRegByDept, setIsLoadingRegByDept] = useState(true);

  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('1y');

  const [myUpcomingEvents, setMyUpcomingEvents] = useState<MyEvent[]>([]);
  const [ongoingEvents, setOngoingEvents] = useState<MyEvent[]>([]);
  const [finishedEvents, setFinishedEvents] = useState<MyEvent[]>([]);
  const [cancelledEvents, setCancelledEvents] = useState<MyEvent[]>([]);
  const [myRegisteredEvents, setMyRegisteredEvents] = useState<RegisteredEvent[]>([]);
  const [isLoadingEmployeeData, setIsLoadingEmployeeData] = useState(true);
  const [employeeDataError, setEmployeeDataError] = useState<string | null>(null);
  const [currentInscriptionsPage, setCurrentInscriptionsPage] = useState(1);

  useEffect(() => {
    console.log(`Applying theme: ${theme}`);
    if (theme === 'dark') {
      ChartJS.defaults.color = '#FFFFFF';
      ChartJS.defaults.scale.ticks.color = '#FFFFFF';
      ChartJS.defaults.plugins.legend.labels.color = '#FFFFFF';
      setChartStyleOptions({
        tickColor: '#FFFFFF',
        gridColor: 'rgba(255, 255, 255, 0.15)',
        legendLabelColor: '#FFFFFF'
      });
    } else {
      ChartJS.defaults.color = '#000000';
      ChartJS.defaults.scale.ticks.color = '#000000';
      ChartJS.defaults.plugins.legend.labels.color = '#000000';
      setChartStyleOptions({
        tickColor: '#000000',
        gridColor: 'rgba(0, 0, 0, 0.1)',
        legendLabelColor: '#000000'
      });
    }
  }, [theme]); 

  useEffect(() => {
    if (!token) return;
    const headers = { 'Authorization': `Bearer ${token}` };

    setIsLoadingStats(true);
    fetch('http://localhost:3001/api/events/count', { headers }).then(res => res.json()).then(data => setEventCount(data.count)).catch(() => setEventCount(0));
    fetch('http://localhost:3001/api/users/count', { headers }).then(res => res.json()).then(data => setUserCount(data.count)).catch(() => setUserCount(0)).finally(() => setIsLoadingStats(false));
    setIsLoadingRegPerEvent(true);
    fetch('http://localhost:3001/api/admin/dashboard/registrations-per-event', { headers })
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then((data: RegistrationsPerEvent[]) => setRegistrationsPerEventData(data))
      .catch(err => { console.error("Error fetching registrations per event:", err); setRegistrationsPerEventData([]); })
      .finally(() => setIsLoadingRegPerEvent(false));
    setIsLoadingRegOverTime(true);
    fetch('http://localhost:3001/api/admin/dashboard/registrations-over-time', { headers })
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then((data: RegistrationsOverTime[]) => {
        const sortedData = data.sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
        setAllRegistrationsOverTimeData(sortedData);
      })
      .catch(err => { console.error("Error fetching registrations over time:", err); setAllRegistrationsOverTimeData([]); })
      .finally(() => setIsLoadingRegOverTime(false));
    setIsLoadingRegByDept(true);
    fetch('http://localhost:3001/api/admin/dashboard/registrations-by-department', { headers })
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then((data: RegistrationsByDepartment[]) => setRegistrationsByDeptData(data))
      .catch(err => { console.error("Error fetching registrations by department:", err); setRegistrationsByDeptData([]); })
      .finally(() => setIsLoadingRegByDept(false));
    if (user?.userId) {
      setIsLoadingEmployeeData(true); setEmployeeDataError(null);
      const fetchEventSummary = fetch(`http://localhost:3001/api/events/me/summary`, { headers })
        .then(res => res.ok ? res.json() : res.text().then(text => { throw new Error(`Failed to fetch event summary: ${res.status} ${text}`) }))
        .then(data => { setMyUpcomingEvents(data.upcomingEvents || []); setOngoingEvents(data.ongoingEvents || []); setFinishedEvents(data.finishedEvents || []); setCancelledEvents(data.cancelled || []); });
      const fetchRegisteredEvents = fetch(`http://localhost:3001/api/events/me/registered`, { headers })
        .then(res => res.ok ? res.json() : res.text().then(text => { throw new Error(`Failed to fetch registered events: ${res.status} ${text}`) }))
        .then(data => setMyRegisteredEvents(data || []));
      Promise.all([fetchEventSummary, fetchRegisteredEvents])
        .catch(err => { console.error('Error fetching employee dashboard data:', err); setEmployeeDataError(err.message || 'An error occurred'); })
        .finally(() => setIsLoadingEmployeeData(false));
    } else { setIsLoadingEmployeeData(false); }
  }, [token, user]);

  useEffect(() => {
    if (!allRegistrationsOverTimeData.length) {
      setFilteredRegistrationsOverTimeData([]);
      return;
    }
    const today = new Date();
    let filteredData: RegistrationsOverTime[];

    switch (selectedTimeRange) {
      case '30d':
        const thirtyDaysAgo = subDays(today, 30);
        filteredData = allRegistrationsOverTimeData.filter(d => isWithinInterval(parseISO(d.date), { start: thirtyDaysAgo, end: today }));
        break;
      case '90d':
        const ninetyDaysAgo = subDays(today, 90);
        filteredData = allRegistrationsOverTimeData.filter(d => isWithinInterval(parseISO(d.date), { start: ninetyDaysAgo, end: today }));
        break;
      case '1y':
      default:
        const startOfTheCurrentYear = startOfYear(today);
        const endOfTheCurrentYear = endOfYear(today);
        filteredData = allRegistrationsOverTimeData.filter(d => isWithinInterval(parseISO(d.date), { start: startOfTheCurrentYear, end: endOfTheCurrentYear }));
        break;
    }
    setFilteredRegistrationsOverTimeData(filteredData);
  }, [allRegistrationsOverTimeData, selectedTimeRange]);

  const stats = [
    { title: "Total Événements", value: eventCount, icon: "fas fa-calendar-check", colorClass: "green" },
    { title: "Total Utilisateurs", value: userCount, icon: "fas fa-users", colorClass: "green" },
  ];

  const regPerEventChartData = {
    labels: registrationsPerEventData.map(d => d.eventName),
    datasets: [{
      label: 'Inscriptions par Événement',
      data: registrationsPerEventData.map(d => d.registrationcount),
      backgroundColor: registrationsPerEventData.map((_, index) =>
        generateHslaColor(index, registrationsPerEventData.length, 70, 60, 0.85)
      ),
      borderColor: registrationsPerEventData.map((_, index) =>
        generateHslaColor(index, registrationsPerEventData.length, 70, 60, 1)
      ),
      borderWidth: 1,
    }],
  };
  const regPerEventChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'x' as const,
    layout: {
      padding: {
        bottom: 80
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: chartStyleOptions.legendLabelColor,
        }
      },
      title: {
        display: false,
      },
    },
    scales: {
      x: {
        ticks: {
          color: chartStyleOptions.tickColor,
          callback: function(this: Scale, value: number | string): string {
            const label = this.getLabelForValue(Number(value));
            if (label.length > 25) {
              return label.substring(0, 25) + '...';
            }
            return label;
          }
        },
        grid: { display: false }
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: chartStyleOptions.tickColor,
          stepSize: 1,
        },
        grid: { color: chartStyleOptions.gridColor }
      }
    }
  };

  const regByDeptChartData = {
    labels: registrationsByDeptData.map(d => d.departmentName),
    datasets: [{
      label: 'Inscriptions par Département',
      data: registrationsByDeptData.map(d => d.registrationcount),
      backgroundColor: [
        'rgba(255, 99, 132, 0.85)',
        'rgba(54, 162, 235, 0.85)',
        'rgba(255, 206, 86, 0.85)',
        'rgba(75, 192, 192, 0.85)',
        'rgba(153, 102, 255, 0.85)',
        'rgba(255, 159, 64, 0.85)'
      ],
      borderColor: [
        'rgba(255, 99, 132, 1)',
        'rgba(54, 162, 235, 1)',
        'rgba(255, 206, 86, 1)',
        'rgba(75, 192, 192, 1)',
        'rgba(153, 102, 255, 1)',
        'rgba(255, 159, 64, 1)'
      ],
      borderWidth: 1,
      hoverOffset: 6,
    }],
  };
  const regByDeptChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
          color: chartStyleOptions.legendLabelColor,
        }
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed !== null) {
              label += context.formattedValue;
            }
            return label;
          }
        }
      }
    },
  };

  const regOverTimeChartData = {
    labels: filteredRegistrationsOverTimeData.map(d => d.date),
    datasets: [{
      label: 'Inscriptions',
      data: filteredRegistrationsOverTimeData.map(d => d.registrationcount),
      fill: true,
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.4,
      pointBackgroundColor: 'rgb(75, 192, 192)',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: 'rgb(75, 192, 192)',
      pointRadius: selectedTimeRange === '1y' ? 3 : 4,
      pointHoverRadius: selectedTimeRange === '1y' ? 5 : 6,
    }],
  };
  const regOverTimeChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: { display: false }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: chartStyleOptions.tickColor,
          stepSize: 1, 
          callback: function(value: string | number) {
            if (typeof value === 'number' && Number.isInteger(value)) {
              return value.toString();
            }
            return value;
          }
        },
        grid: { color: chartStyleOptions.gridColor }
      },
      x: {
        ticks: {
          color: chartStyleOptions.tickColor,
          autoSkip: true,
          maxRotation: selectedTimeRange === '1y' ? 0 : 45,
          minRotation: 0,
          callback: function(this: Scale, value: number | string, index: number) {
            const dateStr = filteredRegistrationsOverTimeData[index]?.date;
            if (dateStr) {
              try {
                const dateObj = parseISO(dateStr);
                if (selectedTimeRange === '1y') {
                  const monthIndex = dateObj.getMonth();
                  return fr.localize?.month(monthIndex as (0|1|2|3|4|5|6|7|8|9|10|11), { width: 'abbreviated' });
                }
                return dateObj.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
              } catch (e) {
                return dateStr;
              }
            }
            return value;
          }
        },
        grid: { display: false }
      }
    },
  };
  
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (e) {
      return dateString;
    }
  };

  const renderEventCard = (
    events: MyEvent[],
    title: string,
    statusKey: 'upcoming' | 'ongoing' | 'finished' | 'cancelled',
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

  const latestNotifications = notifications.slice(0, 4);

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

  return (
    <div className={`admin-dashboard-view dashboard ${theme}-mode-active`}>
      <div className="stats-overview-grid">
        {stats.map((stat) => (
          <div key={stat.title} className={`stat-card-item ${stat.colorClass}`}>
            <div className="stat-icon-container">
              <i className={stat.icon}></i>
            </div>
            <div className="stat-text-content">
              <h3>{stat.title}</h3>
              <p className="stat-value">{isLoadingStats ? '...' : (stat.value !== null ? stat.value : 'N/A')}</p>
            </div>
          </div>
        ))}
      </div>
      {isLoadingEmployeeData && <p className="loading-message" style={{ textAlign: 'center', margin: '20px 0' }}>Chargement du résumé des événements...</p>}
      {employeeDataError && <p className="error-message" style={{ color: 'red', textAlign: 'center', margin: '20px 0' }}>Erreur (résumé événements): {employeeDataError}</p>}
      {!isLoadingEmployeeData && !employeeDataError && (
        <div className="event-categories-grid">
          {renderEventCard(myUpcomingEvents, "Événements à Venir", "upcoming")}
          {renderEventCard(ongoingEvents, "Événements en Cours", "ongoing")}
          {renderEventCard(finishedEvents, "Événements Terminés", "finished")}
          {renderEventCard(cancelledEvents, "Événements Annulés", "cancelled")}
        </div>
      )}
      <h2 className="section-title" style={{ marginTop: '40px' }}>Statistiques Administratives Détaillées</h2>
      <div className="charts-section">
        <div className="chart-container chart-container-full">
          <h3>Inscriptions par Événement</h3>
          {isLoadingRegPerEvent ? <p>Chargement...</p> : (registrationsPerEventData.length > 0 ? <Bar options={regPerEventChartOptions} data={regPerEventChartData} /> : <p>Aucune donnée disponible.</p>)}
        </div>
        <div className="chart-row">
          <div className="chart-container chart-container-half">
            <h3>Évolution des Inscriptions</h3>
            <div className="chart-sub-header-controls">
              <div className="time-range-buttons">
                {(['30d', '90d', '1y'] as TimeRange[]).map(range => (
                  <button
                    key={range}
                    className={`time-range-button ${selectedTimeRange === range ? 'active' : ''}`}
                    onClick={() => setSelectedTimeRange(range)}
                  >
                    {range === '30d' ? '30j' : range === '90d' ? '90j' : '1an'}
                  </button>
                ))}
              </div>
              <div className="custom-chart-legend">
                <span className="legend-color-box" style={{ backgroundColor: 'rgb(75, 192, 192)' }}></span>
                <span>Inscriptions</span>
              </div>
            </div>
            {isLoadingRegOverTime ? 
              <p>Chargement...</p> : 
              (filteredRegistrationsOverTimeData.length > 0 ? 
                <div className="chart-canvas-wrapper">
                  <Line options={regOverTimeChartOptions} data={regOverTimeChartData} />
                </div> : 
                <p>Aucune donnée disponible pour la période sélectionnée.</p>
              )
            }
          </div>
          <div className="chart-container chart-container-half chart-container-centered">
            <h3>Inscriptions par Département</h3>
            {isLoadingRegByDept ? 
              <p>Chargement...</p> : 
              (registrationsByDeptData.length > 0 ? 
                <div className="chart-canvas-wrapper">
                  <Pie options={regByDeptChartOptions} data={regByDeptChartData} />
                </div> : 
                <p>Aucune donnée disponible.</p>
              )
            }
          </div>
        </div>
      </div>
      <hr className="dashboard-divider" />
      <div className="dashboard-columns-wrapper">
        <section className="my-registered-events-table-section">
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
          {isLoadingEmployeeData && <p className="loading-message">Chargement...</p>}
          {employeeDataError && <p className="error-message">Erreur: {employeeDataError}</p>}
          {!isLoadingEmployeeData && !employeeDataError && user?.userId && (
            <>
              {myRegisteredEvents.length > 0 ? (
                <ul className="inscription-list">
                  {currentMyInscriptions.map((event) => {
                    let statusClass = ''; const statusText = event.status || 'N/A';
                    switch (statusText.toLowerCase()) {
                      case 'terminé': statusClass = 'status-termine'; break;
                      case 'en cours': statusClass = 'status-en-cours'; break;
                      case 'à venir': statusClass = 'status-a-venir'; break;
                      case 'annulé': statusClass = 'status-annule'; break;
                      default: statusClass = 'status-default';
                    }
                    return (
                      <li key={event.id_event} className="inscription-list-item">
                        <div className="inscription-icon-container icon-bg-blue"><i className="fas fa-calendar-check"></i></div>
                        <div className="inscription-text-content">
                          <h3>{event.title_event}</h3>
                          <div className="inscription-details">
                            <span className={`status-badge ${statusClass}`}>{statusText}</span>
                            <span className="inscription-date"><i className="fas fa-clock" style={{ marginRight: '4px', opacity: 0.7 }}></i>Inscrit le: {formatDate(event.registrationDate)}</span>
                          </div>
                        </div>
                      </li>);
                  })}
                </ul>
              ) : (<p className="no-events-message">Vous n'êtes inscrit à aucun événement.</p>)}
            </>
          )}
          {!isLoadingEmployeeData && !employeeDataError && !user?.userId && (<p style={{ fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>Section inscriptions personnelles non applicable (utilisateur non connecté).</p>)}
        </section>
        <section className="recent-activity-section">
          <div className="section-header-with-pagination">
            <h2 className="section-header">Activités récentes</h2>
          </div>
          {isLoadingNotifications && <p className="loading-message">Chargement...</p>}
          {notificationsError && <p className="error-message" style={{ color: 'red' }}>Erreur: {notificationsError}</p>}
          {!isLoadingNotifications && !notificationsError && latestNotifications.length > 0 ? (
            <ul className="activity-list">
              {latestNotifications.map(notification => {
                const messageLines = notification.message.split('\n');
                const activityTitle = messageLines[0];
                const activitySubtitle = messageLines.length > 1 ? messageLines.slice(1).join(' ') : '';
                return (
                  <li key={notification.id_notification} className="activity-list-item">
                    <div className={`activity-icon-container ${getIconBgClass(notification.type)}`}><i className={getNotificationIconClass(notification.type)}></i></div>
                    <div className="activity-text-content">
                      <h3>{activityTitle}</h3>
                      {activitySubtitle && <p className="activity-subtitle">{activitySubtitle}</p>}
                      <p className="activity-timestamp">{formatRelativeTime(notification.created_at)}</p>
                    </div>
                  </li>);
              })}
            </ul>
          ) : (!isLoadingNotifications && !notificationsError && <p className="no-activity-message">Aucune activité récente.</p>)}
        </section>
      </div>
    </div>
  );
};

export default AdminDashboardView;
