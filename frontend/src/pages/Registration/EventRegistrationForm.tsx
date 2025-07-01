import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './EventRegistrationForm.css';
import ConfirmationModal from '../../components/Modal/ConfirmationModal'; // Adjust path as needed

// Interface for the structure of a field fetched from backend
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

// Interface for form data being collected
interface FormDataState {
  [key: string]: any; // Field ID as key (e.g., "field_123"), user's input as value (string, boolean, File, etc.)
}

// Interface for a field response from the backend (when fetching existing registration)
interface FieldResponseFromAPI {
  id_response: number; // Added based on logs
  id_inscription: number; // Added based on logs
  // id_form_field: number; // The ID of the form field this response is for // OLD
  id_field: number; // UPDATED to match backend log property name
  response_text?: string | null;
  response_file_path?: string | null;
  formField?: { // This nested structure seems correct based on logs
    id_field: number; // This is the formField's own id_field, distinct from the response's id_field
    label: string;
    type: { field_name: string };
    // You might also have id_type, is_required, sequence here if your backend sends them nested under formField
  };
}

interface ExistingRegistrationAPIResponse {
  id_inscription: number;
  fieldResponses: FieldResponseFromAPI[];
}

// ADD THIS INTERFACE FOR EVENT DETAILS
interface EventDetails {
  title_event: string;
  status: string; // To store the event's status
  // Add other event properties if needed elsewhere in this component
}

const EventRegistrationForm: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null); // Store full event details
  const [fields, setFields] = useState<BackendField[]>([]);
  const [formData, setFormData] = useState<FormDataState>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingRegistrationId, setExistingRegistrationId] = useState<number | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isLoadingRegistration, setIsLoadingRegistration] = useState(false);

  // State for the confirmation modal
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmModalProps, setConfirmModalProps] = useState({
    message: '',
    onConfirmAction: () => {},
    confirmText: 'OK',
    cancelText: 'Annuler', // Default to French
    title: 'Confirmation'
  });

  const initializeEmptyFormData = (fieldsToInit: BackendField[]) => {
    console.log("EventRegistrationForm: Initializing empty form data for fields:", fieldsToInit); // LOG A
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
    console.log("EventRegistrationForm: Empty form data initialized:", initialData); // LOG B
  };

  useEffect(() => {
    const fetchEventAndFields = async () => {
      if (!eventId) return;
      console.log("EventRegistrationForm: useEffect triggered for eventId:", eventId); // LOG 1
      setIsLoading(true);
      setIsLoadingRegistration(true);
      setError(null);
      setExistingRegistrationId(null);
      setIsReadOnly(false);
      setEventDetails(null); // Reset event details
      const token = localStorage.getItem("authToken");

      let fetchedFieldsData: BackendField[] = [];

      try {
        // --- Fetch Event Details ---
        const eventRes = await fetch(`http://localhost:3001/api/events/${eventId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!eventRes.ok) throw new Error('Failed to fetch event details.');
        const eventData: EventDetails = await eventRes.json(); // Use the new interface
        setEventDetails(eventData); // Store all event details including status

        // --- Fetch Form Fields ---
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
        console.log("EventRegistrationForm: Fetched form fields:", JSON.stringify(fetchedFieldsData, null, 2)); // LOG 2

        // --- Check for Existing Registration ---
        try {
          console.log("EventRegistrationForm: Checking for existing registration..."); // LOG 3
          const regCheckRes = await fetch(`http://localhost:3001/api/events/${eventId}/inscriptions/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          console.log("EventRegistrationForm: Existing registration API response status:", regCheckRes.status); // LOG 4

          if (regCheckRes.ok) {
            const registrationData: ExistingRegistrationAPIResponse = await regCheckRes.json();
            console.log("EventRegistrationForm: Existing registration API response data:", JSON.stringify(registrationData, null, 2)); // LOG 5

            if (registrationData && registrationData.id_inscription && registrationData.fieldResponses) {
              console.log("EventRegistrationForm: Existing registration FOUND. ID:", registrationData.id_inscription); // LOG 6
              setExistingRegistrationId(registrationData.id_inscription);
              setIsReadOnly(true);

              const populatedFormData: FormDataState = {};
              fetchedFieldsData.forEach(field => {
                const fieldKey = `field_${field.id_field}`;
                const response = registrationData.fieldResponses.find(
                  // (r) => r.id_form_field === field.id_field // OLD - Likely incorrect based on logs
                  (r) => r.id_field === field.id_field    // NEW - Assuming backend sends 'id_field' in fieldResponses
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
                      console.error(`Error parsing checkbox options for field ${field.id_field} from response_text: "${response.response_text}"`, parseError);
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
              console.log("EventRegistrationForm: Populated formData from existing registration:", JSON.stringify(populatedFormData, null, 2)); // LOG 7
              setFormData(populatedFormData);
            } else {
              console.log("EventRegistrationForm: API returned OK but registration data is incomplete or missing. Initializing empty form. Data:", JSON.stringify(registrationData, null, 2)); // LOG 8
              initializeEmptyFormData(fetchedFieldsData);
            }
          } else if (regCheckRes.status === 404) {
            console.log("EventRegistrationForm: No existing registration found (404). Initializing empty form."); // LOG 9
            initializeEmptyFormData(fetchedFieldsData);
          } else {
            const regErrorText = await regCheckRes.text();
            console.error('EventRegistrationForm: Error checking existing registration. Status:', regCheckRes.status, "Response text:", regErrorText); // LOG 10
            setError(prev => prev ? `${prev}\nErreur lors de la vérification de l'inscription.` : 'Erreur lors de la vérification de l\'inscription.');
            initializeEmptyFormData(fetchedFieldsData);
          }
        } catch (regErr: any) {
          console.error("EventRegistrationForm: Technical error during registration check:", regErr); // LOG 11
          setError(prev => prev ? `${prev}\nErreur technique lors de la vérification de l'inscription.` : 'Erreur technique lors de la vérification de l\'inscription.');
          initializeEmptyFormData(fetchedFieldsData);
        } finally {
          setIsLoadingRegistration(false);
        }

      } catch (err: any) {
        console.error("EventRegistrationForm: Error fetching event/fields data:", err); // LOG 12
        setError(err.message || 'An error occurred while loading form data.');
        setFields([]);
        initializeEmptyFormData([]);
      } finally {
        setIsLoading(false);
        // This console.log will show the state values *as they were when this finally block was entered*.
        // For the most up-to-date state after all setters have potentially queued updates,
        // it's better to log in the component body (like LOG 14).
        // console.log("EventRegistrationForm: useEffect finally block. isReadOnly (at this point):", isReadOnly, "existingRegistrationId (at this point):", existingRegistrationId);
      }
    };

    fetchEventAndFields();
  }, [eventId]);

  // LOG 14: Shows state on each render, good for seeing the result of state updates from useEffect
  console.log("EventRegistrationForm: RENDERING. isReadOnly:", isReadOnly, "existingRegistrationId:", existingRegistrationId, "eventStatus:", eventDetails?.status, "formData:", JSON.stringify(formData, null, 2));


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
          // Clear the file input visually and from state
          const inputElement = document.getElementById(`field-${fieldId}`) as HTMLInputElement;
          if (inputElement) {
            inputElement.value = ""; // Clears the selected file in the input element
          }
          setFormData(prev => ({ ...prev, [fieldKey]: null }));
          return;
        }
      }
      setFormData(prev => ({
        ...prev,
        [fieldKey]: file, // Store the single File object or null
      }));
    } else if (actualFieldType === 'checkbox' && fieldDefinition.options && fieldDefinition.options.length > 0 && optionKey) {
      // Checkbox group
      setFormData(prev => {
        const currentOptionsState = prev[fieldKey] as { [key: string]: boolean } || {};
        return {
          ...prev,
          [fieldKey]: {
            ...currentOptionsState,
            [optionKey]: value // value is the boolean checked state
          }
        };
      });
    } else { // Handles text, number, date, single checkbox, radio
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
    if (isReadOnly) return; // Prevent drop if read-only

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
      // Create a FileList-like object to pass to handleInputChange
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
            // alert(`Vous devez cocher "${field.label}".`); 
            // setIsSubmitting(false);
            // return;
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

      // Replace alert with ConfirmationModal
      setConfirmModalProps({
        title: "Succès",
        message: "Inscription enregistrée avec succès!",
        onConfirmAction: () => {
          // This action is called when "OK" is clicked on the modal
          navigate('/events', { state: { registrationSuccess: true, eventId: Number(eventId) } });
          setIsConfirmModalOpen(false); // Close the modal
        },
        confirmText: "OK",
        cancelText: "", // Pass empty string to hide the cancel button
      });
      setIsConfirmModalOpen(true);

    } catch (err: any) {
      console.error('Submission error:', err);
      setError(err.message || 'Une erreur est survenue lors de la soumission.');
      // Use modal for error message for consistency
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

    // Open the modal instead of window.confirm
    setConfirmModalProps({
      message: "Êtes-vous sûr de vouloir supprimer votre inscription actuelle ? Vous pourrez vous réinscrire ensuite.",
      onConfirmAction: () => performDeleteRegistration(), // Pass the actual delete function
      confirmText: "Supprimer",
      cancelText: "Annuler",
      title: "Confirmer la suppression"
    });
    setIsConfirmModalOpen(true);
  };

  const performDeleteRegistration = async () => {
    // This is the logic that was previously inside the window.confirm block
    if (!existingRegistrationId) return; // Should not happen if modal opened correctly

    setIsConfirmModalOpen(false); // Close modal first
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

      // Use the modal for the success message, replacing the alert
      setConfirmModalProps({
        title: "Suppression réussie",
        message: "Inscription supprimée avec succès. Vous pouvez maintenant vous réinscrire.",
        onConfirmAction: () => {
          setExistingRegistrationId(null);
          setIsReadOnly(false);
          initializeEmptyFormData(fields);
          setIsConfirmModalOpen(false); // Close the success modal
        },
        confirmText: "OK",
        cancelText: "", // Pass empty string to hide the cancel button
      });
      setIsConfirmModalOpen(true);

    } catch (err: any) {
      console.error('Delete registration error:', err);
      setError(err.message || 'Une erreur est survenue lors de la suppression.');
      // Also use the modal for error messages for consistency
      setConfirmModalProps({
        title: "Erreur",
        message: err.message || 'Une erreur est survenue lors de la suppression.',
        onConfirmAction: () => setIsConfirmModalOpen(false),
        confirmText: "OK",
        cancelText: "", // Hide cancel button for error dialog
      });
      setIsConfirmModalOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalConfirm = () => {
    confirmModalProps.onConfirmAction(); // Execute the stored action
  };

  const handleModalCancel = () => {
    setIsConfirmModalOpen(false);
  };

  // Helper function to validate file type
const isValidFileType = (file: File, acceptedTypesString?: string): boolean => {
  if (!acceptedTypesString || acceptedTypesString.trim() === "") {
    // If admin hasn't specified types, browser's default behavior for empty accept attribute applies.
    // For stricter validation, you could return false here or have a default set of allowed types.
    return true;
  }

  const acceptedTypesArray = acceptedTypesString.split(',').map(type => type.trim().toLowerCase());
  const fileName = file.name.toLowerCase();
  const fileMimeType = file.type.toLowerCase();

  return acceptedTypesArray.some(type => {
    // Check for exact MIME type match (e.g., "application/pdf")
    if (type === fileMimeType) {
      return true;
    }
    // Check for wildcard MIME type match (e.g., "image/*")
    if (type.endsWith('/*') && fileMimeType.startsWith(type.slice(0, -2))) {
      return true;
    }
    // Check for file extension match (e.g., ".pdf")
    if (type.startsWith('.') && fileName.endsWith(type)) {
      return true;
    }
    return false;
  });
};

  if (isLoading || isLoadingRegistration) return <div className="loading-indicator">Chargement du formulaire...</div>;
  if (!eventDetails) return <div className="loading-indicator">Chargement des détails de l'événement...</div>; // Handle case where eventDetails is null

  return (
    <div className="event-registration-form-container">
      <button onClick={() => navigate(-1)} className="back-button">Retour</button>
      <h1>Inscription à: {eventDetails?.title_event || 'Chargement...'}</h1>
      {error && <p className="error-message">{error}</p>}
      
      {fields.length === 0 && !isLoading && !error && (
        <p>Ce formulaire ne contient aucun champ pour le moment ou une erreur est survenue.</p>
      )}

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
                  required={!isReadOnly && field.is_required} // Corrected
                  disabled={isSubmitting || isReadOnly} // Corrected
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

