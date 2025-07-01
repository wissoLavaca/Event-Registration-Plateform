import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './EventRegistrationForm.css';
import ConfirmationModal from '../../components/Modal/ConfirmationModal';

interface BackendField {
  id_field: number;
  label: string;
  type: {
    id_type: number;
    field_name: string;
  };
  help_text?: string;
  is_required?: boolean;
  options?: string[];
  sequence: number;
  accepted_file_types?: string; 
}

interface FormDataState {
  [key: string]: any;
}

interface FieldResponseFromAPI {
  id_response: number;
  id_inscription: number;
  id_field: number;
  response_text?: string | null;
  response_file_path?: string | null;
  formField?: {
    id_field: number;
    label: string;
    type: { field_name: string };
  };
}

interface ExistingRegistrationAPIResponse {
  id_inscription: number;
  fieldResponses: FieldResponseFromAPI[];
}

interface EventDetails {
  title_event: string;
  status: string;
}

const EventRegistrationForm: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);
  const [fields, setFields] = useState<BackendField[]>([]);
  const [formData, setFormData] = useState<FormDataState>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingRegistrationId, setExistingRegistrationId] = useState<number | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isLoadingRegistration, setIsLoadingRegistration] = useState(false);

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmModalProps, setConfirmModalProps] = useState({
    message: '',
    onConfirmAction: () => {},
    confirmText: 'OK',
    cancelText: 'Annuler',
    title: 'Confirmation'
  });

  const initializeEmptyFormData = (fieldsToInit: BackendField[]) => {
    const initialData: FormDataState = {};
    fieldsToInit.forEach(field => {
      const fieldKey = `field_${field.id_field}`;
      if (field.type.field_name === 'checkbox') {
        if (field.options && field.options.length > 0) {
          initialData[fieldKey] = field.options.reduce((obj, option) => {
            obj[option] = false;
            return obj;
          }, {} as {[key: string]: boolean});
        } else {
          initialData[fieldKey] = false;
        }
      } else if (field.type.field_name === 'radio') {
        initialData[fieldKey] = '';
      } else if (field.type.field_name === 'file') {
        initialData[fieldKey] = null;
      } else {
        initialData[fieldKey] = '';
      }
    });
    setFormData(initialData);
  };

  useEffect(() => {
    const fetchEventAndFields = async () => {
      if (!eventId) return;
      setIsLoading(true);
      setIsLoadingRegistration(true);
      setError(null);
      setExistingRegistrationId(null);
      setIsReadOnly(false);
      setEventDetails(null);
      const token = localStorage.getItem("authToken");

      let fetchedFieldsData: BackendField[] = [];

      try {
        const eventRes = await fetch(`http://localhost:3001/api/events/${eventId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!eventRes.ok) throw new Error('Failed to fetch event details.');
        const eventData: EventDetails = await eventRes.json();
        setEventDetails(eventData);

        const fieldsRes = await fetch(`http://localhost:3001/api/events/${eventId}/form-fields`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!fieldsRes.ok) {
          if (fieldsRes.status === 404) {
            setError("Aucun formulaire n'est configuré pour cet événement.");
          } else {
            throw new Error('Failed to fetch form fields.');
          }
        } else {
          fetchedFieldsData = await fieldsRes.json();
          fetchedFieldsData.sort((a, b) => a.sequence - b.sequence);
          setFields(fetchedFieldsData);
        }

        try {
          const regCheckRes = await fetch(`http://localhost:3001/api/events/${eventId}/inscriptions/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (regCheckRes.ok) {
            const registrationData: ExistingRegistrationAPIResponse = await regCheckRes.json();

            if (registrationData && registrationData.id_inscription && registrationData.fieldResponses) {
              setExistingRegistrationId(registrationData.id_inscription);
              setIsReadOnly(true);

              const populatedFormData: FormDataState = {};
              fetchedFieldsData.forEach(field => {
                const fieldKey = `field_${field.id_field}`;
                const response = registrationData.fieldResponses.find(
                  (r) => r.id_field === field.id_field
                );

                if (response) {
                  if (field.type.field_name === 'file') {
                    populatedFormData[fieldKey] = response.response_file_path
                      ? { name: response.response_file_path.split(/[\\/]/).pop() || 'fichier', path: response.response_file_path, isExisting: true }
                      : null;
                  } else if (field.type.field_name === 'checkbox' && field.options && field.options.length > 0) {
                    try {
                      const selectedOptions = response.response_text ? JSON.parse(response.response_text) : [];
                      populatedFormData[fieldKey] = field.options.reduce((obj, option) => {
                        obj[option] = selectedOptions.includes(option);
                        return obj;
                      }, {} as {[key: string]: boolean});
                    } catch (parseError) {
                      populatedFormData[fieldKey] = field.options.reduce((obj, option) => {obj[option] = false; return obj;}, {} as {[key:string]:boolean});
                    }
                  } else if (field.type.field_name === 'checkbox') {
                    populatedFormData[fieldKey] = response.response_text === 'true';
                  } else {
                    populatedFormData[fieldKey] = response.response_text || '';
                  }
                } else {
                  const tempFieldsForInit = [field];
                  const singleInitialData: FormDataState = {};
                  if (tempFieldsForInit[0].type.field_name === 'checkbox' && tempFieldsForInit[0].options && tempFieldsForInit[0].options.length > 0) {
                    singleInitialData[fieldKey] = tempFieldsForInit[0].options.reduce((obj, option) => {obj[option] = false; return obj;}, {} as {[key:string]:boolean});
                  } else if (tempFieldsForInit[0].type.field_name === 'checkbox') {
                    singleInitialData[fieldKey] = false;
                  } else if (tempFieldsForInit[0].type.field_name === 'file') {
                    singleInitialData[fieldKey] = null;
                  } else {
                    singleInitialData[fieldKey] = '';
                  }
                  populatedFormData[fieldKey] = singleInitialData[fieldKey];
                }
              });
              setFormData(populatedFormData);
            } else {
              initializeEmptyFormData(fetchedFieldsData);
            }
          } else if (regCheckRes.status === 404) {
            initializeEmptyFormData(fetchedFieldsData);
          } else {
            const regErrorText = await regCheckRes.text();
            setError(prev => prev ? `${prev}\nErreur lors de la vérification de l'inscription.` : 'Erreur lors de la vérification de l\'inscription.');
            initializeEmptyFormData(fetchedFieldsData);
          }
        } catch (regErr: any) {
          setError(prev => prev ? `${prev}\nErreur technique lors de la vérification de l'inscription.` : 'Erreur technique lors de la vérification de l\'inscription.');
          initializeEmptyFormData(fetchedFieldsData);
        } finally {
          setIsLoadingRegistration(false);
        }

      } catch (err: any) {
        setError(err.message || 'An error occurred while loading form data.');
        setFields([]);
        initializeEmptyFormData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEventAndFields();
  }, [eventId]);

  const handleInputChange = (fieldId: number, value: any, optionKey?: string) => {
    const fieldKey = `field_${fieldId}`;
    const fieldDefinition = fields.find(f => f.id_field === fieldId);

    if (!fieldDefinition) return;
    const actualFieldType = fieldDefinition.type.field_name;

    if (actualFieldType === 'file') {
      const fileList = value as FileList | null;
      const file = fileList && fileList.length > 0 ? fileList[0] : null;

      if (file) {
        if (!isValidFileType(file, fieldDefinition.accepted_file_types )) {
          alert(
            `Type de fichier invalide pour "${fieldDefinition.label}".\nTypes acceptés: ${
              fieldDefinition.accepted_file_types  || 'Non spécifié (vérifiez la configuration du formulaire)'
            }`
          );
          const inputElement = document.getElementById(`field-${fieldId}`) as HTMLInputElement;
          if (inputElement) {
            inputElement.value = "";
          }
          setFormData(prev => ({ ...prev, [fieldKey]: null }));
          return;
        }
      }
      setFormData(prev => ({
        ...prev,
        [fieldKey]: file,
      }));
    } else if (actualFieldType === 'checkbox' && fieldDefinition.options && fieldDefinition.options.length > 0 && optionKey) {
      setFormData(prev => {
        const currentOptionsState = prev[fieldKey] as { [key: string]: boolean } || {};
        return {
          ...prev,
          [fieldKey]: {
            ...currentOptionsState,
            [optionKey]: value
          }
        };
      });
    } else {
      setFormData(prev => ({
        ...prev,
        [fieldKey]: value,
      }));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
  };

  const handleDrop = (e: React.DragEvent, fieldId: number) => {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    if (isReadOnly) return;

    const fieldDefinition = fields.find(f => f.id_field === fieldId);
    if (!fieldDefinition || fieldDefinition.type.field_name !== 'file') return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (!isValidFileType(droppedFile, fieldDefinition.accepted_file_types )) {
        alert(
          `Type de fichier invalide via glisser-déposer pour "${fieldDefinition.label}".\nTypes acceptés: ${
            fieldDefinition.accepted_file_types  || 'Non spécifié (vérifiez la configuration du formulaire)'
          }`
        );
        return;
      }
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(droppedFile);
      handleInputChange(fieldId, dataTransfer.files, 'file');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const token = localStorage.getItem("authToken");

    for (const field of fields) {
      const fieldKey = `field_${field.id_field}`;
      const fieldValue = formData[fieldKey];
      if (field.is_required) {
        if (field.type.field_name === 'file' && !fieldValue) {
          alert(`Le champ "${field.label}" (fichier) est obligatoire.`);
          setIsSubmitting(false);
          return;
        } else if (field.type.field_name === 'checkbox' && field.options && field.options.length > 0) {
            const selectedCount = fieldValue && typeof fieldValue === 'object' ? Object.values(fieldValue).filter(v => v === true).length : 0;
            if (selectedCount === 0) {
                alert(`Vous devez sélectionner au moins une option pour "${field.label}".`);
                setIsSubmitting(false);
                return;
            }
        } else if (field.type.field_name === 'checkbox' && (!field.options || field.options.length === 0)) { 
          if (fieldValue !== true) {
          }
        } else if (!fieldValue && field.type.field_name !== 'checkbox') { 
          alert(`Le champ "${field.label}" est obligatoire.`);
          setIsSubmitting(false);
          return;
        }
      }
    }

    const submissionFormData = new FormData();
    for (const field of fields) {
      const fieldKey = `field_${field.id_field}`;
      const value = formData[fieldKey];

      if (field.type.field_name === 'file') {
        if (value instanceof File) {
          submissionFormData.append(fieldKey, value, value.name);
        }
      } else if (field.type.field_name === 'checkbox' && field.options && field.options.length > 0) {
        if (value && typeof value === 'object') {
          const selectedOptions = Object.entries(value as {[key: string]: boolean})
            .filter(([,isSelected]) => isSelected)
            .map(([optionName]) => optionName);
          submissionFormData.append(fieldKey, JSON.stringify(selectedOptions));
        } else {
           submissionFormData.append(fieldKey, JSON.stringify([]));
        }
      } else {
        if (value !== undefined && value !== null) {
          submissionFormData.append(fieldKey, typeof value === 'boolean' ? value.toString() : String(value));
        } else {
          submissionFormData.append(fieldKey, '');
        }
      }
    }

    try {
      const response = await fetch(`http://localhost:3001/api/events/${eventId}/inscriptions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: submissionFormData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Échec de la soumission. Réponse non-JSON du serveur.' }));
        throw new Error(errorData.message || 'Échec de la soumission de l\'inscription.');
      }

      setConfirmModalProps({
        title: "Succès",
        message: "Inscription enregistrée avec succès!",
        onConfirmAction: () => {
          navigate('/events', { state: { registrationSuccess: true, eventId: Number(eventId) } });
          setIsConfirmModalOpen(false);
        },
        confirmText: "OK",
        cancelText: "",
      });
      setIsConfirmModalOpen(true);

    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de la soumission.');
      setConfirmModalProps({
        title: "Erreur",
        message: err.message || 'Une erreur est survenue lors de la soumission.',
        onConfirmAction: () => setIsConfirmModalOpen(false),
        confirmText: "OK",
        cancelText: "",
      });
      setIsConfirmModalOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRegistration = async () => {
    if (!existingRegistrationId) return;
    setConfirmModalProps({
      message: "Êtes-vous sûr de vouloir supprimer votre inscription actuelle ? Vous pourrez vous réinscrire ensuite.",
      onConfirmAction: () => performDeleteRegistration(),
      confirmText: "Supprimer",
      cancelText: "Annuler",
      title: "Confirmer la suppression"
    });
    setIsConfirmModalOpen(true);
  };

  const performDeleteRegistration = async () => {
    if (!existingRegistrationId) return;
    setIsConfirmModalOpen(false);
    setIsSubmitting(true);
    setError(null);
    const token = localStorage.getItem("authToken");

    try {
      const response = await fetch(`http://localhost:3001/api/inscriptions/${existingRegistrationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Échec de la suppression. Réponse non-JSON.' }));
        throw new Error(errorData.message || 'Échec de la suppression de l\'inscription.');
      }

      setConfirmModalProps({
        title: "Suppression réussie",
        message: "Inscription supprimée avec succès. Vous pouvez maintenant vous réinscrire.",
        onConfirmAction: () => {
          setExistingRegistrationId(null);
          setIsReadOnly(false);
          initializeEmptyFormData(fields);
          setIsConfirmModalOpen(false);
        },
        confirmText: "OK",
        cancelText: "",
      });
      setIsConfirmModalOpen(true);

    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de la suppression.');
      setConfirmModalProps({
        title: "Erreur",
        message: err.message || 'Une erreur est survenue lors de la suppression.',
        onConfirmAction: () => setIsConfirmModalOpen(false),
        confirmText: "OK",
        cancelText: "",
      });
      setIsConfirmModalOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalConfirm = () => {
    confirmModalProps.onConfirmAction();
  };

  const handleModalCancel = () => {
    setIsConfirmModalOpen(false);
  };

  const isValidFileType = (file: File, acceptedTypesString?: string): boolean => {
    if (!acceptedTypesString || acceptedTypesString.trim() === "") {
      return true;
    }

    const acceptedTypesArray = acceptedTypesString.split(',').map(type => type.trim().toLowerCase());
    const fileName = file.name.toLowerCase();
    const fileMimeType = file.type.toLowerCase();

    return acceptedTypesArray.some(type => {
      if (type === fileMimeType) {
        return true;
      }
      if (type.endsWith('/*') && fileMimeType.startsWith(type.slice(0, -2))) {
        return true;
      }
      if (type.startsWith('.') && fileName.endsWith(type)) {
        return true;
      }
      return false;
    });
  };

  if (isLoading || isLoadingRegistration) return <div className="loading-indicator">Chargement du formulaire...</div>;
  if (!eventDetails) return <div className="loading-indicator">Chargement des détails de l'événement...</div>;

  return (
    <div className="event-registration-form-container">
      <button onClick={() => navigate(-1)} className="back-button">Retour</button>
      <h1>Inscription à: {eventDetails?.title_event || 'Chargement...'}</h1>
      {error && <p className="error-message">{error}</p>}
      
      {fields.length === 0 && !isLoading && !error && (
        <p>Ce formulaire ne contient aucun champ pour le moment ou une erreur est survenue.</p>
      )}

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        title={confirmModalProps.title}
        message={confirmModalProps.message}
        onConfirm={handleModalConfirm}
        onCancel={handleModalCancel}
        confirmText={confirmModalProps.confirmText}
        cancelText={confirmModalProps.cancelText}
      />

      {fields.length > 0 && (
        <form onSubmit={handleSubmit}>
          {fields.map(field => (
            <div key={field.id_field} className="form-group">
              <label htmlFor={`field-${field.id_field}`}>
                {field.label}
                {field.is_required && <span className="required-asterisk">*</span>}
              </label>
              {field.help_text && <small className="help-text">{field.help_text}</small>}
              
              {field.type.field_name === 'text' && (
                <input
                  type="text"
                  id={`field-${field.id_field}`}
                  value={formData[`field_${field.id_field}`] || ''}
                  onChange={e => handleInputChange(field.id_field, e.target.value)}
                  required={!isReadOnly && field.is_required}
                  disabled={isSubmitting || isReadOnly}
                />
              )}
              {field.type.field_name === 'number' && (
                <input
                  type="number"
                  id={`field-${field.id_field}`}
                  value={formData[`field_${field.id_field}`] || ''}
                  onChange={e => handleInputChange(field.id_field, e.target.valueAsNumber || e.target.value)}
                  required={!isReadOnly && field.is_required}
                  disabled={isSubmitting || isReadOnly}
                />
              )}
              {field.type.field_name === 'date' && (
                <input
                  type="date"
                  id={`field-${field.id_field}`}
                  value={formData[`field_${field.id_field}`] || ''}
                  onChange={e => handleInputChange(field.id_field, e.target.value)}
                  required={!isReadOnly && field.is_required}
                  disabled={isSubmitting || isReadOnly}
                />
              )}
              {field.type.field_name === 'checkbox' && field.options && field.options.length > 0 && (
                <div className="checkbox-group">
                  {field.options.map(option => (
                    <label key={option} className="checkbox-option">
                      <input
                        type="checkbox"
                        id={`field-${field.id_field}-${option.replace(/\s+/g, '-')}`}
                        checked={!!(formData[`field_${field.id_field}`] as { [key: string]: boolean })?.[option]}
                        onChange={e => handleInputChange(field.id_field, e.target.checked, option)}
                        disabled={isSubmitting || isReadOnly}
                      />
                      <span className="option-label-text">{option}</span>
                    </label>
                  ))}
                </div>
              )}
              {field.type.field_name === 'checkbox' && (!field.options || field.options.length === 0) && (
                <label className="checkbox-option">
                  <input
                    type="checkbox"
                    id={`field-${field.id_field}`}
                    checked={!!formData[`field_${field.id_field}`]}
                    onChange={e => handleInputChange(field.id_field, e.target.checked)}
                    disabled={isSubmitting || isReadOnly}
                  />
                  <span className="option-label-text">{field.label}</span>
                </label>
              )}
              {field.type.field_name === 'radio' && field.options && field.options.length > 0 && (
                <div className="radio-group">
                  {field.options.map(option => (
                    <label key={option} className="radio-option">
                      <input
                        type="radio"
                        id={`field-${field.id_field}-${option.replace(/\s+/g, '-')}`}
                        name={`field_${field.id_field}`}
                        value={option}
                        checked={formData[`field_${field.id_field}`] === option}
                        onChange={e => handleInputChange(field.id_field, e.target.value)}
                        disabled={isSubmitting || isReadOnly}
                      />
                      <span className="option-label-text">{option}</span>
                    </label>
                  ))}
                </div>
              )}
              {field.type.field_name === 'file' && (
                <div className={`file-input-wrapper ${isReadOnly ? 'read-only' : ''}`}>
                  {isReadOnly && formData[`field_${field.id_field}`] && (formData[`field_${field.id_field}`] as any).isExisting ? (
                    <div className="file-name-display read-only-file">
                      Fichier soumis: {(formData[`field_${field.id_field}`] as any).name}
                    </div>
                  ) : (
                    <div 
                      className="file-input-container"
                      onDragOver={isReadOnly ? undefined : handleDragOver}
                      onDragLeave={isReadOnly ? undefined : handleDragLeave}
                      onDrop={isReadOnly ? undefined : e => handleDrop(e, field.id_field)}
                    >
                      <input
                        type="file"
                        id={`field-${field.id_field}`}
                        className="file-input-hidden"
                        onChange={e => handleInputChange(field.id_field, e.target.files, 'file')}
                        required={!isReadOnly && field.is_required}
                        disabled={isSubmitting || isReadOnly}
                        accept={field.accepted_file_types || ""} 
                      />
                      <label htmlFor={`field-${field.id_field}`} className={`file-drop-label ${isReadOnly ? 'disabled-file-label' : ''}`}>
                        <div className="upload-icon">
                          <i className="fi fi-rr-cloud-upload"></i>
                        </div>
                        <div className="upload-text">
                          {isReadOnly ? "Fichier déjà soumis" : "Cliquez pour choisir ou glissez-déposez"}
                        </div>
                        {!isReadOnly && (
                          <div className="upload-hint">
                            {field.accepted_file_types 
                              ? `Types acceptés: ${field.accepted_file_types .split(',').map(t => t.trim()).join(', ')}`
                              : "Aucune restriction de type spécifiée."}
                          </div>
                        )}
                        {!isReadOnly && formData[`field_${field.id_field}`] && (formData[`field_${field.id_field}`] as File)?.name && (
                          <div className="file-name-display">
                            Fichier sélectionné: {(formData[`field_${field.id_field}`] as File).name}
                          </div>
                        )}
                        {!isReadOnly && !formData[`field_${field.id_field}`] && field.is_required && (
                          <div className="file-name-display hint">
                            Aucun fichier sélectionné
                          </div>
                        )}
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {isReadOnly && eventDetails?.status === "En cours" ? ( 
            <button
              type="button"
              onClick={handleDeleteRegistration} 
              className="delete-registration-button" 
              disabled={isSubmitting}
            >
              Supprimer l'inscription et se réinscrire
            </button>
          ) : isReadOnly ? (
             <p className="info-message">La modification ou suppression n'est pas possible.</p>
          ) : (
            <button
              type="submit"
              className="submit-button"
              disabled={isSubmitting || isLoading || isLoadingRegistration || fields.length === 0 || isReadOnly }
            >
              {isSubmitting ? 'Envoi en cours...' : 'S\'inscrire'}
            </button>
          )}
        </form>
      )}
    </div>
  );
};

export default EventRegistrationForm;
