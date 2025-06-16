import React from 'react';
import './InscriptionDetailModal.css'; 

interface User {
  id_user: number;
  username: string;
  first_name: string;
  last_name: string;
  departement: { name_departement: string } | null;
}

interface FormField {
  id_field: number;
  label: string;
}

interface FieldResponse {
  id_field_response: number;
  response_text: string | null;     
  response_file_path: string | null;
  formField: FormField | null;
}

interface Inscription {
  id_inscription: number;
  user: User;
  fieldResponses: FieldResponse[];
  created_at: string;
}

interface InscriptionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  inscription: Inscription | null;
}

const InscriptionDetailModal: React.FC<InscriptionDetailModalProps> = ({ isOpen, onClose, inscription }) => {
  if (!isOpen || !inscription) {
    return null;
  }
  
  const isFileResponse = (response: FieldResponse): boolean => {
    return !!response.response_file_path && response.response_file_path.trim() !== '';
  };

  const getFileName = (filePath: string | null): string => {
    if (!filePath) return 'Fichier';
    return filePath.split(/[\\/]/).pop() || filePath;
  };

  // For Vite projects, environment variables are accessed via import.meta.env
  // and must be prefixed with VITE_ in your .env file
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* MODAL HEADER: Contains main title and close button */}
        <div className="modal-header">
          <h2>Détails de l'inscription #{inscription.id_inscription}</h2>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        {/* USER DETAILS SECTION */}
        <div className="modal-section">
          <div className="detail-item">
            <strong>Utilisateur:</strong>
            <span>{inscription.user.first_name} {inscription.user.last_name} ({inscription.user.username})</span>
          </div>
          <div className="detail-item">
            <strong>Département:</strong>
            <span>{inscription.user.departement?.name_departement || 'N/A'}</span>
          </div>
          <div className="detail-item">
            <strong>Soumis le:</strong>
            <span>{new Date(inscription.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
        
        {/* FORM RESPONSES SECTION */}
        {inscription.fieldResponses && inscription.fieldResponses.length > 0 && (
          <div className="modal-section">
            <h3 className="modal-section-title">Réponses au formulaire:</h3>
            <ul className="field-responses-list">
              {inscription.fieldResponses.map(response => (
                <li key={response.id_field_response}>
                  <div className="detail-item">
                    <strong>{response.formField ? response.formField.label : 'Champ inconnu'}:</strong>
                    {isFileResponse(response) && response.response_file_path ? (
                      <a 
                        href={`${API_BASE_URL}/uploads/${getFileName(response.response_file_path)}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        {getFileName(response.response_file_path)}
                      </a>
                    ) : response.response_text ? (
                      <span> {response.response_text}</span>
                    ) : (
                      <em> (Pas de réponse)</em>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* FALLBACK MESSAGE IF NO FIELD RESPONSES */}
        {(!inscription.fieldResponses || inscription.fieldResponses.length === 0) && (
           <div className="modal-section">
             <p>Aucune réponse de champ spécifique pour cette inscription.</p>
           </div>
        )}
      </div>
    </div>
  );
};

export default InscriptionDetailModal;