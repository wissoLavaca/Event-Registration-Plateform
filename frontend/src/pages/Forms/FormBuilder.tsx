import React, { useState, useEffect, useCallback } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import FieldModal from './FieldModal';
import './FormBuilder.css';
import  { type Event }  from '../Events/Events'; 

// Define this in a shared types file (e.g., src/types/form.types.ts)
// or alongside FieldModalProps if not already shared.
export interface ModalSubmitData {
  label: string;
  is_required: boolean;
  options?: Array<{ id?: string | number; value: string; is_default?: boolean }>;
  placeholder?: string;
  helpText?: string;
  // ... any other common field properties from your 'Field' type

  id_type: number; // The ID of the selected FormFieldType (this is crucial)
  id_form_field_type: number; // This might be redundant if it's the same as id_type.
                             // If so, you can eventually consolidate to just id_type.

  id?: string | number; // Field's own ID, present only when editing
}

interface FormFieldTypeFromAPI {
  id_type: number;
  field_name: string;
}

// Frontend representation of a field
interface Field {
  id: number | string; 
  label: string;
  type: string; 
  id_type: number; 
  isRequired: boolean;
  options?: string[];
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  acceptedFileTypes?: string;
  sequence: number; 
}

// Backend representation of a field (when fetching existing fields)
interface BackendField {
  id_field: number; // This is the ID from the backend
  label: string;
  type: FormFieldTypeFromAPI; 
  help_text?: string;
  is_required: boolean;
  options?: Array<{ id_dropdown_option: number; value_option: string }>; 
  min_length?: number;
  max_length?: number;
  min_value?: number;
  max_value?: number;
  accepted_file_types?: string;
  sequence: number;
}

interface FormBuilderProps {
  eventToManageFieldsFor: Event | null;
  onBack: () => void;
}

const ItemTypes = {
  FIELD: 'field',
};

interface DraggableFieldProps {
  field: Field;
  index: number;
  moveField: (dragIndex: number, hoverIndex: number) => void;
  onEdit: (field: Field) => void;
  onDelete: (id: string | number) => void; // Stays the same, receives the 'id'
  canModify: boolean; 
}

const DraggableField: React.FC<DraggableFieldProps> = ({ field, index, moveField, onDelete, canModify }) => {
  const ref = React.useRef<HTMLDivElement>(null);

  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.FIELD,
    hover(item: { index: number; id: string | number }, monitor) { // item.id refers to field.id
      if (!ref.current || !canModify) return; // Prevent reorder if modifications are locked
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;
      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top;
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;
      moveField(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
    canDrop: () => canModify, 
    collect: monitor => ({
        isOver: monitor.isOver(),
    }),
  });

  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.FIELD,
    item: { index, id: field.id }, // CORRECTED: Uses field.id
    canDrag: () => canModify, 
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drag(drop(ref));

  return (
    <div 
        ref={ref} 
        style={{ 
            opacity: isDragging ? 0.5 : 1,
            cursor: canModify ? 'move' : 'default', 
            border: isOver && canModify ? '2px dashed var(--primary-color)' : '2px dashed transparent',
        }} 
        className="field-item"
    >
      <div className="field-info">
        <span className="field-label-text">{field.label} ({field.type})</span>
        {field.isRequired && <span className="required-badge">Obligatoire</span>}
      </div>
      <div className="field-actions">
        {/* <button onClick={() => onEdit(field)} className="edit-btn" disabled={!canModify}>Modifier</button> */} {/* <-- THIS LINE IS REMOVED/COMMENTED OUT */}
        <button onClick={() => onDelete(field.id)} className="delete-btn" disabled={!canModify}>Supprimer</button> 
      </div>
    </div>
  );
};

// Interface for data coming from FieldModal
interface FieldDataFromModal {
  type: string;
  label: string;
  helpText?: string;
  isRequired: boolean;
  options?: string[];
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  acceptedFileTypes?: string;
  id_form_field_type: number; // This is the numeric ID of the type
  id?: string | number; // Optional: for updates
}

const FormBuilder: React.FC<FormBuilderProps> = ({ eventToManageFieldsFor, onBack }) => {
  const [fields, setFields] = useState<Field[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<Field | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [availableFieldTypes, setAvailableFieldTypes] = useState<FormFieldTypeFromAPI[]>([]);
  const [canModifyFields, setCanModifyFields] = useState(true); // State to control modification

  // Fetch available form field types from backend
  useEffect(() => {
    const fetchTypes = async () => {
      const token = localStorage.getItem("authToken");
      try {
        const response = await fetch('http://localhost:3001/api/form-field-types', { // ADJUST API ENDPOINT IF NEEDED
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to fetch form field types');
        const data: FormFieldTypeFromAPI[] = await response.json();
        setAvailableFieldTypes(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching form field types:", error);
        setAvailableFieldTypes([]);
        alert("Erreur lors du chargement des types de champs. Certaines fonctionnalités peuvent être limitées.");
      }
    };
    fetchTypes();
  }, []);

  // Fetch existing fields for the event
  useEffect(() => {
    if (eventToManageFieldsFor) {
      const fetchEventFields = async () => {
        setIsLoading(true);
        const token = localStorage.getItem("authToken");
        try {
          const response = await fetch(`http://localhost:3001/api/events/${eventToManageFieldsFor.id_event}/form-fields`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!response.ok) {
            console.error("Fetch event fields API response not OK:", response);
            throw new Error('Failed to fetch event fields');
          }
          // Assuming the API for GET /form-fields returns options as string[] directly
          // Let's adjust BackendField interface for this specific fetch if needed, or handle it in map
          const data: Array<Omit<BackendField, 'options'> & { options?: string[] | Array<{ id_dropdown_option: number; value_option: string }> }> = await response.json();
          console.log("RAW DATA from API (/form-fields):", JSON.stringify(data, null, 2));

          const mappedFields: Field[] = data.map(backendField => {
            let fieldOptions: string[] = [];
            if (Array.isArray(backendField.options)) {
              // Check if the first element is a string (meaning it's already string[])
              // or an object (meaning it's Array<{ id_dropdown_option: number; value_option: string }>)
              if (backendField.options.length > 0 && typeof backendField.options[0] === 'string') {
                fieldOptions = backendField.options as string[];
              } else if (backendField.options.length > 0 && typeof backendField.options[0] === 'object' && backendField.options[0] !== null && 'value_option' in backendField.options[0]) {
                fieldOptions = (backendField.options as Array<{ id_dropdown_option: number; value_option: string }>).map(opt => opt.value_option);
              }
              // If it's an empty array, it will default to []
            }

            return {
              id: backendField.id_field,
              label: backendField.label,
              type: backendField.type?.field_name,
              id_type: backendField.type?.id_type,
              isRequired: backendField.is_required,
              helpText: backendField.help_text,
              options: fieldOptions, 
              minLength: backendField.min_length,
              maxLength: backendField.max_length,
              minValue: backendField.min_value,
              maxValue: backendField.max_value,
              acceptedFileTypes: backendField.accepted_file_types,
              sequence: backendField.sequence,
            };
          }).sort((a, b) => a.sequence - b.sequence);

          console.log("MAPPED FIELDS before setFields:", JSON.stringify(mappedFields, null, 2));

          setFields(mappedFields);
        } catch (error) {
          console.error("Error fetching event fields:", error);
          alert("Erreur lors du chargement des champs existants pour cet événement.");
          setFields([]);
        } finally {
          setIsLoading(false);
        }
      };
      fetchEventFields();
    } else {
      setFields([]);
    }
  }, [eventToManageFieldsFor]);

  // Determine if fields can be modified based on event's registration start date
  useEffect(() => {
    if (eventToManageFieldsFor?.registration_start_date) {
      try {
        const registrationStartDate = new Date(eventToManageFieldsFor.registration_start_date);
        const now = new Date();
        // Set canModifyFields to true if current date is before registration start date
        setCanModifyFields(now < registrationStartDate);
      } catch (error) {
        console.error("Invalid registration_start_date:", eventToManageFieldsFor.registration_start_date, error);
        setCanModifyFields(false); // Default to false if date is invalid
      }
    } else {
      // If no registration_start_date is provided, or event is not loaded yet,
      // default to allowing modifications. Or you might want to default to false.
      // For safety, if the date is crucial for this rule, and it's missing, consider disallowing modifications.
      console.warn("Registration start date is missing for event. Modifications might be locked by default or allowed based on policy.");
      setCanModifyFields(eventToManageFieldsFor ? false : true); // Example: Lock if event exists but no date, allow if no event yet (initial load)
    }
  }, [eventToManageFieldsFor]);

  const handleAddField = (dataFromModal: FieldDataFromModal) => { // CHANGED parameter type
    if (!canModifyFields) {
        alert("Les modifications sont verrouillées car la période d'inscription a commencé.");
        return;
    }
    const newField: Field = {
      id: Date.now().toString(),
      label: dataFromModal.label,
      type: dataFromModal.type,
      id_type: dataFromModal.id_form_field_type, // Use the numeric type ID from modal
      isRequired: dataFromModal.isRequired,
      options: dataFromModal.options || [], // Ensure options is an array
      minLength: dataFromModal.minLength,
      maxLength: dataFromModal.maxLength,
      minValue: dataFromModal.minValue,
      maxValue: dataFromModal.maxValue,
      acceptedFileTypes: dataFromModal.acceptedFileTypes,
      sequence: fields.length,
    };
    setFields(prevFields => [...prevFields, newField]); // Use functional update
    setEditingField(null);
  };

  const handleEditField = (fieldToEdit: Field) => {
    if (!canModifyFields) {
        alert("Les modifications sont verrouillées car la période d'inscription a commencé.");
        return;
    }
    setEditingField(fieldToEdit); 
    setIsModalOpen(true); 
  };

  // Ensure FieldDataFromModal (if you defined it) matches what FieldModal sends
  // For simplicity, assuming FieldModal sends an object compatible with 'Field' properties plus 'id_form_field_type'
  const handleUpdateField = (dataFromModal: FieldDataFromModal) => { // CHANGED parameter type
    if (!canModifyFields) {
        alert("Les modifications sont verrouillées car la période d'inscription a commencé.");
        return;
    }

    const idToUpdate = editingField?.id || dataFromModal.id;

    if (!idToUpdate) {
        console.error("Cannot update field: No ID found for the field to update.");
        return;
    }

    setFields(prevFields =>
      prevFields.map(f => {
        if (f.id === idToUpdate) {
          return {
            ...f,
            label: dataFromModal.label || f.label,
            type: dataFromModal.type || f.type,
            id_type: dataFromModal.id_form_field_type, // Use numeric type ID from modal
            isRequired: dataFromModal.isRequired !== undefined ? dataFromModal.isRequired : f.isRequired,
            options: dataFromModal.options || f.options || [], // Ensure options is an array
            minLength: dataFromModal.minLength !== undefined ? dataFromModal.minLength : f.minLength,
            maxLength: dataFromModal.maxLength !== undefined ? dataFromModal.maxLength : f.maxLength,
            minValue: dataFromModal.minValue !== undefined ? dataFromModal.minValue : f.minValue,
            maxValue: dataFromModal.maxValue !== undefined ? dataFromModal.maxValue : f.maxValue,
            acceptedFileTypes: dataFromModal.acceptedFileTypes !== undefined ? dataFromModal.acceptedFileTypes : f.acceptedFileTypes,
          };
        }
        return f;
      })
    );
    setEditingField(null);
    setIsModalOpen(false);
  };


  const handleDeleteField = (id: string | number) => {
    if (!canModifyFields) {
        alert("Les modifications sont verrouillées car la période d'inscription a commencé.");
        return;
    }
    // The filter logic is already correct if 'id' is the consistent identifier
    setFields(fields.filter(field => field.id !== id).map((f, index) => ({ ...f, sequence: index })));
  };

  const moveField = useCallback((dragIndex: number, hoverIndex: number) => {
    if (!canModifyFields) return; // Prevent moving if modifications are locked

    setFields((prevFields) => {
      const newFields = [...prevFields];
      const [draggedItem] = newFields.splice(dragIndex, 1);
      newFields.splice(hoverIndex, 0, draggedItem);
      // Update sequence numbers after reordering
      return newFields.map((field, index) => ({ ...field, sequence: index }));
    });
  }, [canModifyFields]); 

  const handleSaveEventFields = async () => {
    if (!canModifyFields) {
      alert("Les modifications sont verrouillées et ne peuvent pas être enregistrées car la période d'inscription a commencé.");
      return;
    }
    if (!eventToManageFieldsFor) return;
    setIsLoading(true);
    const token = localStorage.getItem("authToken");

    console.log("STATE OF 'fields' AT START OF handleSaveEventFields:", JSON.stringify(fields, null, 2)); // <--- ADD THIS

    const payloadFields = fields.map((f, index) => {
      if (typeof f.id_type === 'undefined' || f.id_type === null) {
        console.error('CRITICAL: Field is missing id_form_field_type before sending to backend:', f);
        alert(`Erreur critique: Le type du champ "${f.label}" n'a pas été correctement défini. Veuillez réessayer ou contacter le support.`);
        throw new Error(`Le type du champ "${f.label}" n'a pas été correctement défini.`);
      }

      const fieldPayload: any = {
        label: f.label,
        id_type: f.id_type, 
        is_required: f.isRequired,
        sequence: index, 
      };
      
      // Add type-specific properties
      if (f.type === 'text' || f.type === 'textarea') {
        fieldPayload.min_length = f.minLength;
        fieldPayload.max_length = f.maxLength;
      } else if (f.type === 'number') {
        fieldPayload.min_value = f.minValue;
        fieldPayload.max_value = f.maxValue;
      } else if (f.type === 'select' || f.type === 'radio' || f.type === 'checkbox') {
        console.log(`Field ${f.label} (type ${f.type}) being mapped. f.options:`, f.options); // <--- ADD THIS
        fieldPayload.options = f.options; 
      } else if (f.type === 'file') {
        fieldPayload.accepted_file_types = f.acceptedFileTypes;
      }

      // Only include id_form_field if it's an existing field (numeric ID) AND your backend uses it for updates
      // If your PUT /events/:id/fields replaces all fields, this is not needed.
      // if (typeof f.id === 'number') {
      //   fieldPayload.id_form_field = f.id; 
      // }
      return fieldPayload;
    });
    console.log("FRONTEND PAYLOAD TO /api/events/:eventId/fields (PUT):", JSON.stringify(payloadFields, null, 2)); // <--- THIS LOG IS VITAL

    try {
      const response = await fetch(`http://localhost:3001/api/events/${eventToManageFieldsFor.id_event}/fields`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payloadFields),
      });

      if (!response.ok) {
        const errorData = await response.json(); // Try to parse as JSON
        console.error("Backend error response:", errorData);
        throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
      }
      alert('Champs du formulaire enregistrés avec succès pour l\'événement!');
      onBack(); // Go back after successful save
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement des champs:', error);
      if (error instanceof Error) {
        alert(`Erreur: ${error.message}`);
      } else {
        alert('Une erreur inconnue est survenue lors de l\'enregistrement.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Debugging: Log current field IDs
  useEffect(() => {
    console.log("Current field IDs:", fields.map(f => f.id));
  }, [fields]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="form-builder-container">
        {/* MOVED AND MODIFIED Back Button */}
        <div className="form-builder-top-nav"> {/* New wrapper for the back button */}
          <button onClick={onBack} className="back-btn icon-btn"> {/* Added icon-btn class for styling */}
            <i className="fi fi-rr-arrow-left"></i> {/* Left arrow icon */}
            Retour à la liste des événements
          </button>
        </div>

        <div className="form-builder-header">
          <h2>Champs pour: {eventToManageFieldsFor?.title_event || 'Événement inconnu'}</h2>
          <div className="header-actions">
            <button 
              onClick={() => {
                if (!canModifyFields) {
                    alert("Les modifications sont verrouillées car la période d'inscription a commencé.");
                    return;
                }
                setEditingField(null); // Ensure modal opens for adding, not editing
                setIsModalOpen(true);
              }} 
              className="add-field-btn"
              disabled={!canModifyFields || isLoading} // Disable if cannot modify or is loading
            >
              + Ajouter un champ
            </button>
            {/* The "Retour à la liste des événements" button was originally here */}
          </div>
        </div>

        {!canModifyFields && (
          <p className="modification-locked-message">
            Les inscriptions pour cet événement ont commencé (ou la date de début des inscriptions n'est pas valide/définie).
            La modification et l'ajout de champs sont verrouillés.
          </p>
        )}

        {isLoading && <p>Chargement...</p>}

        <div className="fields-list">
          {fields.length === 0 && !isLoading && <p>Aucun champ défini pour cet événement. Cliquez sur "Ajouter un champ" pour commencer.</p>}
          {fields.map((field, index) => (
            <DraggableField
              key={field.id} // CORRECTED: Uses field.id
              index={index}
              field={field}
              moveField={moveField}
              onEdit={handleEditField}
              onDelete={handleDeleteField}
              canModify={canModifyFields} 
            />
          ))}
        </div>

        <div className="form-builder-footer">
          <button 
            onClick={handleSaveEventFields} 
            className="save-all-btn" 
            disabled={!canModifyFields || isLoading} // Disable if cannot modify or is loading
          >
            {isLoading ? 'Enregistrement...' : 'Enregistrer tous les champs'}
          </button>
        </div>

        <FieldModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingField(null); 
          }}
          onAdd={editingField ? handleUpdateField : handleAddField}
          availableFieldTypes={availableFieldTypes}
          initialData={editingField} // Pass editingField to pre-fill modal
          key={editingField ? `edit-${editingField.id}` : 'add'} // Consider this if modal state isn't resetting properly
        />
      </div>
    </DndProvider>
  );
};

export default FormBuilder;