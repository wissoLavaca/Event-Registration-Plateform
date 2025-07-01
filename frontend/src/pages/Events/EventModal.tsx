import React, { useState, useEffect, type ChangeEvent, type FormEvent } from "react"
import "./EventModal.css"

interface Event {
  id_event: number;
  title_event: string;
  description: string | null;
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
  status: string;
}

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (eventDataFromModal: EventFormData) => Promise<void> | void; 
  eventDataToEdit: Event | null;
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
  const [isCancelled, setIsCancelled] = useState(false);

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

  useEffect(() => {
    let newCalculatedStatus: string;

    if (isCancelled) {
      newCalculatedStatus = "Annulé";
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0); 
      newCalculatedStatus = "À venir"; 
      if (eventData.registration_start_date && eventData.registration_end_date) {
        try {
          const regStartDate = new Date(eventData.registration_start_date);
          regStartDate.setHours(0, 0, 0, 0); 
          const regEndDate = new Date(eventData.registration_end_date);
          regEndDate.setHours(0, 0, 0, 0); 
          if (isNaN(regStartDate.getTime()) || isNaN(regEndDate.getTime())) {
            newCalculatedStatus = "À venir";
          } else if (regEndDate < today) {
            newCalculatedStatus = "Terminé";
          } else if (regStartDate <= today && regEndDate >= today) {
            newCalculatedStatus = "En cours";
          } else if (regStartDate > today) {
            newCalculatedStatus = "À venir";
          }
        } catch (e) {
          newCalculatedStatus = "À venir";
        }
      } else {
        newCalculatedStatus = "À venir";
      }
    }
    if (newCalculatedStatus !== eventData.status) {
      setEventData((prev) => ({
        ...prev,
        status: newCalculatedStatus,
      }));
    }
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
                value={eventData.registration_start_date || ''}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="registration_end_date">Date de fin d'inscription</label>
              <input
                type="date"
                id="registration_end_date"
                name="registration_end_date" 
                value={eventData.registration_end_date || ''}
                onChange={handleChange}
                min={eventData.registration_start_date || ''}
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>Statut:</label>
            <p className="status-display">{displayStatus}</p> 
          </div>

          {eventDataToEdit && (
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
