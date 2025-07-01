import { useState, useEffect} from 'react';
import { useNavigate } from 'react-router-dom';
import FormBuilder from './FormBuilder';
import {type Event} from '../Events/Events';
import ConfirmationModal from '../../components/Modal/ConfirmationModal';
import './Forms.css';

const EventFieldManager = () => {
  const [showFieldBuilder, setShowFieldBuilder] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventForFields, setSelectedEventForFields] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmModalProps, setConfirmModalProps] = useState({
    message: '',
    onConfirmAction: () => {},
    confirmText: 'OK',
    cancelText: 'Annuler',
    title: 'Confirmation'
  });
  const [itemToDeleteId, setItemToDeleteId] = useState<number | null>(null);

  const fetchEvents = () => {
    setIsLoading(true);
    const token = localStorage.getItem("authToken");
    fetch('http://localhost:3001/api/events', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
      .then(res => {
        if (!res.ok) {
          return res.text().then(text => { throw new Error(text || 'Failed to fetch events') });
        }
        return res.json();
      })
      .then(data => {
        setEvents(Array.isArray(data) ? data : []);
      })
      .catch(error => {
        console.error("Erreur lors de la récupération des événements:", error);
        alert(`Erreur de chargement des événements: ${error.message}`);
        setEvents([]);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleDeleteEventFields = async (eventId: number) => {
    setItemToDeleteId(eventId);
    setConfirmModalProps({
      message: 'Êtes-vous sûr de vouloir supprimer tous les champs de formulaire pour cet événement ? Les réponses existantes pourraient être affectées.',
      onConfirmAction: () => performDeleteEventFields(),
      confirmText: "Supprimer les champs",
      cancelText: "Annuler",
      title: "Confirmer la suppression des champs"
    });
    setIsConfirmModalOpen(true);
  };

  const performDeleteEventFields = async () => {
    if (itemToDeleteId === null) return;
    setIsConfirmModalOpen(false);

    const token = localStorage.getItem("authToken");
    try {
      const response = await fetch(`http://localhost:3001/api/events/${itemToDeleteId}/fields`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || `Failed to delete fields for event with status: ${response.status}`);
      }
      alert('Champs de formulaire pour l\'événement supprimés avec succès!');
    } catch (error) {
      console.error('Erreur lors de la suppression des champs pour l\'événement:', error);
      if (error instanceof Error) {
        alert(`Erreur: ${error.message}`);
      } else {
        alert('Une erreur inconnue est survenue.');
      }
    } finally {
      setItemToDeleteId(null);
    }
  };

  const handleModalConfirm = () => {
    confirmModalProps.onConfirmAction();
  };

  const handleModalCancel = () => {
    setIsConfirmModalOpen(false);
    setItemToDeleteId(null);
  };

  const handleManageEventFields = (event: Event) => {
    setSelectedEventForFields(event);
    setShowFieldBuilder(true);
  };

  const handleBackFromFieldBuilder = () => {
    setShowFieldBuilder(false);
    setSelectedEventForFields(null);
  };

  const handleViewInscriptions = (eventId: number) => {
    if (eventId === undefined || eventId === null) {
      return;
    }
    navigate(`/admin/events/${eventId}/inscriptions`);
  };

  const filteredEvents = events
    .filter(event => event.title_event.toLowerCase().includes(searchTerm.toLowerCase()));

  if (isLoading) {
    return <div className="loading-indicator">Chargement des événements...</div>;
  }

  if (showFieldBuilder && selectedEventForFields) {
    return <FormBuilder onBack={handleBackFromFieldBuilder} eventToManageFieldsFor={selectedEventForFields} />;
  }

  return (
    <div className="forms-page">
      <div className="forms-header">
        <div className="title-section">
          <h1>Gestion des Champs par Événement</h1>
          <p>Configurez les champs de formulaire pour chaque événement.</p>
        </div>
      </div>

      <div className="forms-filters">
        <div className="search-bar">
          <i className="fi fi-rr-search"></i>
          <input
            type="text"
            placeholder="Rechercher un événement par titre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        title={confirmModalProps.title}
        message={confirmModalProps.message}
        onConfirm={handleModalConfirm}
        onCancel={handleModalCancel}
        confirmText={confirmModalProps.confirmText}
        cancelText={confirmModalProps.cancelText}
      />

      <div className="forms-grid">
        {filteredEvents.length === 0 ? (
          <div className="no-forms-message">
            <p>Aucun événement trouvé.</p>
          </div>
        ) : (
          filteredEvents.map(event => (
            <div key={event.id_event} className="form-card">
              <div className="form-card-header">
                <h3>{event.title_event}</h3>
              </div>
              <p className="form-description">{event.description || 'Pas de description.'}</p>
              <div className="form-meta">
                {event.start_date && (
                  <div className="meta-item">
                    <i className="fi fi-rr-calendar"></i>
                    <span>Début: {new Date(event.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                )}
              </div>
              <div className="form-actions">
                <button className="edit-btn" onClick={() => handleManageEventFields(event)}>
                  <i className="fi fi-rr-settings"></i>
                  Gérer les Champs
                </button>
                <button onClick={() => handleViewInscriptions(event.id_event)} className="view-inscriptions-btn">
                  Voir les inscriptions
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EventFieldManager;
