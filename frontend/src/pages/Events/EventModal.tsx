import React, { useState, useEffect, type ChangeEvent, type FormEvent } from "react"
import "./EventModal.css"

interface Event {
  id_event: number;
  title_event: string;
  description: string | null; // Made optional to handle cases where description might not be set
  start_date: string; 
  end_date: string;  
  registration_start_date: string;
  registration_end_date: string;
  status: string;

}

interface EventFormData {
  id_event?: number;
  title_event: string;
  description: string;
  start_date: string; 
  end_date: string; 
  registration_start_date: string;
  registration_end_date: string;  
  status: string; // We still need this to store the calculated or "Annulé" status
}

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (eventDataFromModal: EventFormData) => Promise<void> | void; 
  eventDataToEdit: Event | null; // Changed to Event type for clarity
  errorMessage?: string | null;
  isSaving?: boolean;
}

const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  onSave,
  eventDataToEdit,
  errorMessage,
  isSaving,
}) => {
  const initialEventData: EventFormData = {
    title_event: "",
    description: "",
    start_date: "",
    end_date: "",
    registration_start_date: "", 
    registration_end_date: "",
    status: "À venir", 
  };

  const [eventData, setEventData] = useState<EventFormData>(initialEventData);
  const [modalTitle, setModalTitle] = useState("Créer un événement");
  const [isCancelled, setIsCancelled] = useState(false); // New state for "Annulé"

  useEffect(() => {
    if (isOpen) {
      if (eventDataToEdit) {
        setModalTitle("Modifier l'événement");
        const formatToInputDate = (dateString: string | undefined | null) => {
          if (!dateString) return "";
          try {
            return new Date(dateString).toISOString().split('T')[0];
          } catch (e) {
            return ""; 
          }
        };
        setEventData({
          id_event: eventDataToEdit.id_event,
          title_event: eventDataToEdit.title_event || "",
          description: eventDataToEdit.description || "",
          start_date: formatToInputDate(eventDataToEdit.start_date),
          end_date: formatToInputDate(eventDataToEdit.end_date),
          registration_start_date: formatToInputDate(eventDataToEdit.registration_start_date), 
          registration_end_date: formatToInputDate(eventDataToEdit.registration_end_date),     
          status: eventDataToEdit.status || "À venir",
        });
        setIsCancelled(eventDataToEdit.status === "Annulé");
      } else {
        setModalTitle("Créer un événement");
        setEventData(initialEventData);
        setIsCancelled(false);
      }
    }
  }, [isOpen, eventDataToEdit]);

  // useEffect to automatically update status based on dates OR if manually cancelled
  useEffect(() => {
    let newCalculatedStatus: string; // Renamed for clarity

    if (isCancelled) {
      newCalculatedStatus = "Annulé";
    } else {
      // Date-based calculation if not manually cancelled
      const today = new Date();
      today.setHours(0, 0, 0, 0); 

      // Default status if registration dates are not valid or not set
      newCalculatedStatus = "À venir"; 

      // Use registration_start_date and registration_end_date
      if (eventData.registration_start_date && eventData.registration_end_date) {
        try {
          const regStartDate = new Date(eventData.registration_start_date);
          regStartDate.setHours(0, 0, 0, 0); 

          const regEndDate = new Date(eventData.registration_end_date);
          regEndDate.setHours(0, 0, 0, 0); 

          if (isNaN(regStartDate.getTime()) || isNaN(regEndDate.getTime())) {
            // Invalid registration dates, will remain "À venir"
            console.warn("Invalid registration dates provided for status calculation in modal.");
            newCalculatedStatus = "À venir"; // Explicitly set
          } else if (regEndDate < today) {
            newCalculatedStatus = "Terminé"; // Registration period is over
          } else if (regStartDate <= today && regEndDate >= today) {
            newCalculatedStatus = "En cours"; // Registration is active/open
          } else if (regStartDate > today) {
            newCalculatedStatus = "À venir"; // Registration is in the future
          }
        } catch (e) {
          console.error("Error parsing registration dates for status calculation in modal:", e);
          newCalculatedStatus = "À venir"; // Fallback in case of parsing error
        }
      } else {
        // If no registration dates are set, it defaults to "À venir".
        // Consider if this is the desired behavior or if a different status/validation is needed.
        newCalculatedStatus = "À venir";
      }
    }
    
    if (newCalculatedStatus !== eventData.status) {
      setEventData((prev) => ({
        ...prev,
        status: newCalculatedStatus,
      }));
    }
    // Update dependencies to reflect the use of registration dates
  }, [eventData.registration_start_date, eventData.registration_end_date, isCancelled, eventData.status]); 

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setEventData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleToggleCancel = () => {
    setIsCancelled(prev => !prev);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave(eventData);
  };

  if (!isOpen) return null;

  // Determine displayed status (could be different from what's sent if "Annulé" is a separate flag)
  const displayStatus = isCancelled ? "Annulé" : eventData.status;

  return (
    <div className="modal-overlay">
      <div className="event-modal">
        <div className="modal-header">
          <h2>{modalTitle}</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        {errorMessage && <p className="modal-error-message">{errorMessage}</p>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title_event">Titre de l'événement*</label>
            <input
              type="text"
              id="title_event"
              name="title_event"
              placeholder="Entrez le titre de l'événement"
              value={eventData.title_event}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description*</label>
            <textarea
              id="description"
              name="description"
              placeholder="Décrivez l'événement"
              value={eventData.description}
              onChange={handleChange}
              rows={4}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="start_date">Date de début*</label>
              <input
                type="date"
                id="start_date"
                name="start_date" 
                value={eventData.start_date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="end_date">Date de fin*</label>
              <input
                type="date"
                id="end_date"
                name="end_date" 
                value={eventData.end_date}
                onChange={handleChange}
                min={eventData.start_date}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="registration_start_date">Date de début d'inscription</label>
              <input
                type="date"
                id="registration_start_date"
                name="registration_start_date" 
                value={eventData.registration_start_date || ''} // Added || '' for controlled input
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="registration_end_date">Date de fin d'inscription</label>
              <input
                type="date"
                id="registration_end_date"
                name="registration_end_date" 
                value={eventData.registration_end_date || ''} // Added || '' for controlled input
                onChange={handleChange}
                min={eventData.registration_start_date || ''} // Added || '' for controlled input
              />
            </div>
          </div> {/* <-- This was the missing closing div */}
          
          {/* Display Status (Read-Only) */}
          <div className="form-group">
            <label>Statut:</label>
            <p className="status-display">{displayStatus}</p> 
          </div>

          {/* Option to Cancel Event */}
          {eventDataToEdit && ( // Only show cancel for existing events, or always if new can be cancelled
            <div className="form-group">
              <button 
                type="button" 
                onClick={handleToggleCancel} 
                className={`cancel-event-button ${isCancelled ? 'active' : ''}`}
              >
                {isCancelled ? "Réactiver l'événement" : "Annuler l'événement"}
              </button>
            </div>
          )}
          
          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={onClose} disabled={isSaving}>
              Annuler (fermer)
            </button>
            <button type="submit" className="save-button" disabled={isSaving}>
              {isSaving ? 'Sauvegarde...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventModal;