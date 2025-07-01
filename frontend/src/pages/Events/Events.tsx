import React, { useState, useEffect, type ChangeEvent } from "react";
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/authContext';
import EventModal from "./EventModal";
import ConfirmationModal from '../../components/Modal/ConfirmationModal'; 
import "./Events.css";

const getStatusClass = (status: string): string => {
  if (!status) return '';
  return `status-${status
    .toLowerCase()
    .normalize("NFD") 
    .replace(/[\u0300-\u036f]/g, "") 
    .replace(/\s+/g, '-') 
    .replace(/[^a-z0-9-]/g, "")}`; 
};

export interface Event { 
  id_event: number;
  title_event: string;
  description: string | null; 
  start_date: string;
  end_date: string;
  status: string;
  registration_start_date: string;
  registration_end_date: string;
}

 interface EventFormData { 
  id_event?: number;
  title_event: string;
  description: string; 
  start_date: string;
  end_date: string;
  status: string;
  registration_start_date: string;
  registration_end_date: string;
}


const Events: React.FC = () => {
  const { user } = useAuth();
  const isEmployee = user?.roleId === 2;

  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const [isEventModalOpen, setIsEventModalOpen] = useState(false); // Renamed for clarity
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tous");
  const [userRegistrations, setUserRegistrations] = useState<Record<number, boolean>>({});

  const location = useLocation();
  const navigate = useNavigate();

  // --- State for Confirmation Modal ---
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmModalProps, setConfirmModalProps] = useState({
    message: '',
    onConfirmAction: () => {},
    confirmText: 'OK',
    cancelText: 'Annuler',
    title: 'Confirmation'
  });
  const [eventToDeleteId, setEventToDeleteId] = useState<number | null>(null);
  // --- End State for Confirmation Modal ---

  const fetchEvents = async () => { // Moved fetchEvents out for potential re-use
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        setError("Token d'authentification non trouvé. Veuillez vous reconnecter.");
        setIsLoading(false);
        return;
      }
      const response = await fetch("http://localhost:3001/api/events", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const responseText = await response.text();
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
          const errorData = JSON.parse(responseText);
          errorMsg = errorData.message || errorMsg;
        } catch (parseError) {
          if (responseText) errorMsg = responseText;
        }
        throw new Error(errorMsg);
      }
      const data: Event[] = await response.json();
      setEvents(data);
    } catch (err: any) {
      console.error("Failed to fetch events:", err);
      setError(err.message || "Échec de la récupération des événements.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserRegistrations = async () => {
    console.log("Events.tsx: fetchUserRegistrations CALLED");
    const token = localStorage.getItem("authToken");
    if (!token) {
      console.log("Events.tsx: fetchUserRegistrations - No token found");
      return;
    }
    try {
      const response = await fetch("http://localhost:3001/api/events/me/registered", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        console.error("Events.tsx: fetchUserRegistrations - Failed to fetch, status:", response.status, "Response:", await response.text());
        return;
      }
      const data: any[] = await response.json(); 
      console.log("Events.tsx: fetchUserRegistrations - Full Data from API:", data); 

      if (data && data.length > 0) {
        console.log("Events.tsx: fetchUserRegistrations - First item from API data:", data[0]); 
        // MODIFIED: Check for eventId
        console.log("Events.tsx: fetchUserRegistrations - Does first item have 'eventId'?", data[0]?.eventId); 
      }

      const registrations: Record<number, boolean> = {};
      data.forEach((r, index) => {
        // MODIFIED: Use r.eventId
        console.log(`Events.tsx: Processing item ${index}, trying to use key:`, r.eventId, "Full item:", r); 
        if (r.eventId !== undefined && r.eventId !== null) {
          registrations[r.eventId] = true; // USE r.eventId
        } else {
          // This warning will now be for items missing 'eventId'
          console.warn(`Events.tsx: Item at index ${index} has undefined or null eventId. Item:`, r);
        }
      });
      setUserRegistrations(registrations);
      console.log("Events.tsx: fetchUserRegistrations - userRegistrations state UPDATED to:", registrations);
    } catch (e) {
      console.error("Events.tsx: fetchUserRegistrations - Error fetching:", e);
    }
  };

  useEffect(() => {
    console.log("Events page mounted or location state changed. Fetching initial data.");
    fetchEvents();
    fetchUserRegistrations();
  }, []); // This still runs on initial mount

  // Add this useEffect to re-fetch when returning from registration page with a specific state
  useEffect(() => {
    if (location.state?.registrationSuccess) {
      console.log("Detected registration success from navigation state. Re-fetching user registrations.");
      fetchUserRegistrations();
      // Clear the state to prevent re-fetching on unrelated re-renders or if the user navigates away and back
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate]); // Depend on location.state

  const handleOpenEventModal = (eventToEdit: Event | null = null) => { // Renamed for clarity
    setSelectedEvent(eventToEdit);
    setModalError(null);
    setIsEventModalOpen(true);
  };

  const handleCloseEventModal = () => { // Renamed for clarity
    setIsEventModalOpen(false);
    setSelectedEvent(null);
    setModalError(null);
  };

  const handleSaveEvent = async (eventDataFromModal: EventFormData) => {
    setIsSaving(true);
    setModalError(null); 
    const token = localStorage.getItem("authToken");
    if (!token) {
      setModalError("Action non autorisée. Veuillez vous reconnecter.");
      setIsSaving(false);
      return;
    }

    const payload: EventFormData = {
      ...eventDataFromModal,
      description: eventDataFromModal.description || "", 
    };

    if (selectedEvent && selectedEvent.id_event) {
      payload.id_event = selectedEvent.id_event;
    }

    try {
      const method = selectedEvent ? "PUT" : "POST";
      const url = selectedEvent
        ? `http://localhost:3001/api/events/${selectedEvent.id_event}`
        : `http://localhost:3001/api/events`;

      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const responseText = await response.text();
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
          const errorData = JSON.parse(responseText);
          errorMsg = errorData.message || errorMsg;
        } catch (parseError) {
          if (responseText) errorMsg = responseText;
        }
        // Set modalError instead of general page error
        setModalError(errorMsg);
        setIsSaving(false);
        return; // Important: stop execution here if error
      }

      // const savedEventData: Event = await response.json(); // Not strictly needed if just refetching

      // if (method === "PUT") {
      //   setEvents((prevEvents) =>
      //     prevEvents.map((e) =>
      //       e.id_event === savedEventData.id_event ? savedEventData : e
      //     )
      //   );
      // } else {
      //   setEvents((prevEvents) => [savedEventData, ...prevEvents]);
      // }
      
      console.log(method === "PUT" ? "Événement mis à jour!" : "Événement créé!");
      handleCloseEventModal(); // Use renamed function
      fetchEvents(); // Refetch events to get the latest list including the new/updated one
    } catch (err: any) {
      console.error("Error saving event:", err);
      setModalError(err.message || "Erreur lors de l'enregistrement de l'événement.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEventClick = (eventId: number) => {
    // setEventToDeleteId(eventId); // We can set it here for immediate use if needed, but the key is passing it to performDeleteEvent
    setConfirmModalProps({
      message: "Êtes-vous sûr de vouloir supprimer cet événement ?",
      onConfirmAction: () => performDeleteEvent(eventId), // <<<< PASS eventId HERE
      confirmText: "Supprimer",
      cancelText: "Annuler",
      title: "Confirmer la suppression"
    });
    setIsConfirmModalOpen(true);
  };

  const performDeleteEvent = async (idToDelete: number | null) => { // <<<< ACCEPT idToDelete as argument
    console.log('[performDeleteEvent] Called. Event ID to delete:', idToDelete);

    if (idToDelete === null) {
      console.log('[performDeleteEvent] idToDelete is null, exiting.');
      return;
    }
    // No longer need to rely on eventToDeleteId state here for the core logic
    // setEventToDeleteId(null); // We'll clear the state variable at the end or on cancel

    setIsConfirmModalOpen(false);
    setIsSaving(true);
    setError(null);
    const token = localStorage.getItem("authToken");
    if (!token) {
      setError("Action non autorisée. Veuillez vous reconnecter.");
      setIsSaving(false);
      // setEventToDeleteId(null); // Clear state if needed, though idToDelete arg is primary
      console.log('[performDeleteEvent] No auth token found.');
      return;
    }
    try {
      console.log(`[performDeleteEvent] Attempting to delete event ID: ${idToDelete} with token.`);
      const response = await fetch(
        `http://localhost:3001/api/events/${idToDelete}`, // Use idToDelete argument
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log('[performDeleteEvent] API Response Status:', response.status);
      console.log('[performDeleteEvent] API Response OK?:', response.ok);

      if (!response.ok) {
        const responseText = await response.text();
        console.log('[performDeleteEvent] API Error Response Text:', responseText);
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
          const errorData = JSON.parse(responseText);
          errorMsg = errorData.message || errorMsg;
        } catch (parseError) {
          if (responseText) errorMsg = responseText;
        }
        throw new Error(errorMsg);
      }

      console.log('[performDeleteEvent] Event successfully marked as deleted by API. Updating UI.');
      setEvents((prevEvents) => {
        console.log('[performDeleteEvent] Filtering events. Prev count:', prevEvents.length, 'ID to filter:', idToDelete);
        const newEvents = prevEvents.filter((e) => e.id_event !== idToDelete); // Use idToDelete argument
        console.log('[performDeleteEvent] New events count after filter:', newEvents.length);
        return newEvents;
      });
      console.log("Événement supprimé (ou marqué comme supprimé)!");
    } catch (err: any) {
      console.error("[performDeleteEvent] Error deleting event:", err);
      setError(err.message || "Erreur lors de la suppression de l'événement.");
    } finally {
      setIsSaving(false);
      setEventToDeleteId(null); // Clear the state variable now
      console.log('[performDeleteEvent] Finished, isSaving set to false, eventToDeleteId set to null.');
    }
  };

  const handleModalConfirm = () => {
    confirmModalProps.onConfirmAction();
  };

  const handleModalCancel = () => {
    setIsConfirmModalOpen(false);
    setEventToDeleteId(null);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString + "T00:00:00"); 
      return date.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch (e) {
      console.error("Error formatting date:", e);
      return dateString; 
    }
  };

  /* const filteredEvents = events.filter(event => {
    const descriptionForFilter = event.description || ""; // Handle null description for search
    const matchesSearch = event.title_event.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          descriptionForFilter.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "Tous" || event.status === statusFilter;
    return matchesSearch && matchesStatus;
  }); */

  const renderContent = () => {
    if (isLoading && events.length === 0) {
      return <p className="loading-message">Chargement des événements...</p>;
    }
    if (error && !isEventModalOpen && !isConfirmModalOpen) { // Check both modals
      return <p className="error-message">{error}</p>;
    }
    if (events.length === 0 && !isLoading) { // Check !isLoading to avoid showing "No events" during initial load
      return <p className="no-events-message">Aucun événement à afficher pour le moment.</p>;
    }

    const currentFilteredEvents = events.filter(event => {
      const descriptionForFilter = event.description || "";
      const matchesSearch = event.title_event.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          descriptionForFilter.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "Tous" || event.status === statusFilter;
      return matchesSearch && matchesStatus;

    });

    if (currentFilteredEvents.length === 0 && !isLoading) {
        return <p className="no-events-message">Aucun événement ne correspond à vos critères de recherche.</p>;
    }

    return (
      <div className="events-grid">
        {currentFilteredEvents.map((event) => {
          const isAdmin = user?.roleId === 1;
          // const isUserEmployee = user?.roleId === 2; // Defined in your component scope

          let isRegistrationOpen = false;
          let registrationButtonTitle = "Les inscriptions ne sont pas ouvertes";
          const now = new Date();
          
          if (event.registration_start_date && event.registration_end_date) {
            try {
              const regStartDate = new Date(event.registration_start_date);
              regStartDate.setHours(0,0,0,0);

              const regEndDate = new Date(event.registration_end_date);
              regEndDate.setHours(23,59,59,999);

              if (now >= regStartDate && now <= regEndDate && event.status !== "Annulé" && event.status !== "Terminé") {
                isRegistrationOpen = true;
                registrationButtonTitle = "S'inscrire à l'événement";
              } else if (now > regEndDate) {
                registrationButtonTitle = "Les inscriptions sont terminées.";
              } else if (now < regStartDate) {
                // Ensure formatDate is accessible here or use toLocaleDateString directly if formatDate is defined later
                registrationButtonTitle = `Les inscriptions ouvrent le ${new Date(event.registration_start_date).toLocaleDateString('fr-FR')}.`;
              }
            } catch (e) {
              console.error("Error parsing registration dates for event ID " + event.id_event, e);
            }
          }
          if (event.status === "Annulé" || event.status === "Terminé") {
            isRegistrationOpen = false;
            registrationButtonTitle = `Inscriptions fermées (événement ${event.status?.toLowerCase()})`;
          }

          return (
            <div key={event.id_event} className="event-card">
              <div className="event-card-header">
                <h3>{event.title_event}</h3>
                {/* This span is responsible for the status badge */}
                {event.status && ( // Conditionally render if status exists
                  <span className={`event-status-badge ${getStatusClass(event.status)}`}>
                    {event.status}
                  </span>
                )}
              </div>
              <div className="event-details"> 
                <p className="event-description">{event.description || "Pas de description."}</p>
                
                {/* Event Dates Display */}
                <div className="event-dates-container">
                  <div className="event-date-item">
                    <i className="fi fi-rr-calendar date-icon"></i>
                    <span>Début: {formatDate(event.start_date)}</span>
                  </div>
                  <div className="event-date-item">
                    <i className="fi fi-rr-calendar date-icon"></i>
                    <span>Fin: {formatDate(event.end_date)}</span>
                  </div>
                </div>

                {/* Registration Dates Display */}
                {event.registration_start_date && event.registration_end_date && (
                  <div className="event-registration-dates">
                    <i className="fi fi-rr-edit date-icon"></i>
                    <span><strong>Inscriptions:</strong> Du {formatDate(event.registration_start_date)} au {formatDate(event.registration_end_date)}</span>
                  </div>
                )}
              </div>
              <div className="event-actions">
                {isAdmin && event.status !== "Terminé" && event.status !== "En cours" && (
                  <>
                    <button
                      className="action-button edit"
                      onClick={() => handleOpenEventModal(event)} 
                      disabled={isSaving}
                    >
                      Modifier
                    </button>
                    <button
                      className="action-button delete"
                      onClick={() => handleDeleteEventClick(event.id_event)}
                      disabled={isSaving}
                    >
                      Supprimer
                    </button>
                  </>
                )}
                {userRegistrations[event.id_event] ? (
                  <Link
                    to={`/events/${event.id_event}/register`}
                    className="action-button register"
                    title="Voir mon inscription"
                  >
                    Voir
                  </Link>
                ) : (
                  isRegistrationOpen ? (
                    <Link
                      to={`/events/${event.id_event}/register`}
                      className="action-button register"
                      title={registrationButtonTitle}
                    >
                      S'inscrire
                    </Link>
                  ) : (
                    <button
                      className="action-button register disabled"
                      disabled
                      title={registrationButtonTitle}
                    >
                      S'inscrire
                    </button>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="events-container">
      <div className="events-header">
        <h1>Événements</h1>
        {!isEmployee && (
          <button
            className="add-event-button"
            onClick={() => handleOpenEventModal()} // Use renamed function
            disabled={isSaving}
          >
            {isSaving ? "Opération..." : "+ Ajouter un événement"}
          </button>
        )}
      </div>

      <div className="events-filters">
        <div className="filter-group">
          <label htmlFor="statusFilter" className="filter-label">Statut:</label>
          <select
            id="statusFilter"
            className="status-filter-select"
            value={statusFilter}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
          >
            <option value="Tous">Tous</option>
            <option value="À venir">À venir</option>
            <option value="En cours">En cours</option>
            <option value="Terminé">Terminé</option>
            <option value="Annulé">Annulé</option>
          </select>
        </div>
        <div className="search-group">
          <input
            type="text"
            placeholder="Rechercher..."
            className="search-input"
            value={searchQuery}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      {isLoading && events.length > 0 && !error && <p className="loading-message">Mise à jour de la liste...</p>}
      {renderContent()}

      <EventModal
        isOpen={isEventModalOpen} // Use renamed state
        onClose={handleCloseEventModal} // Use renamed function
        onSave={handleSaveEvent}
        eventDataToEdit={selectedEvent}
        errorMessage={modalError}
        isSaving={isSaving}
      />

      {/* Render the Confirmation Modal */}
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        title={confirmModalProps.title}
        message={confirmModalProps.message}
        onConfirm={handleModalConfirm}
        onCancel={handleModalCancel}
        confirmText={confirmModalProps.confirmText}
        cancelText={confirmModalProps.cancelText}
      />
    </div>
  );
};

export default Events;
