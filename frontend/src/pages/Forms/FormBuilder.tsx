import React, { useState, useEffect, useCallback } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import FieldModal from './FieldModal';
import './FormBuilder.css';
import  { type Event }  from '../Events/Events'; 

export interface ModalSubmitData {
  label: string;
  is_required: boolean;
  options?: Array<{ id?: string | number; value: string; is_default?: boolean }>;
  placeholder?: string;
  helpText?: string;
  id_type: number;
  id_form_field_type: number;
  id?: string | number;
}

interface FormFieldTypeFromAPI {
  id_type: number;
  field_name: string;
}

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

interface BackendField {
  id_field: number;
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
  onDelete: (id: string | number) => void;
  canModify: boolean; 
}

const DraggableField: React.FC<DraggableFieldProps> = ({ field, index, moveField, onDelete, canModify }) => {
  const ref = React.useRef<HTMLDivElement>(null);

  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.FIELD,
    hover(item: { index: number; id: string | number }, monitor) {
      if (!ref.current || !canModify) return;
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
    item: { index, id: field.id },
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
        <button onClick={() => onDelete(field.id)} className="delete-btn" disabled={!canModify}>Supprimer</button> 
      </div>
    </div>
  );
};

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
  id_form_field_type: number;
  id?: string | number;
}

const FormBuilder: React.FC<FormBuilderProps> = ({ eventToManageFieldsFor, onBack }) => {
  const [fields, setFields] = useState<Field[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<Field | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [availableFieldTypes, setAvailableFieldTypes] = useState<FormFieldTypeFromAPI[]>([]);
  const [canModifyFields, setCanModifyFields] = useState(true);

  useEffect(() => {
    const fetchTypes = async () => {
      const token = localStorage.getItem("authToken");
      try {
        const response = await fetch('http://localhost:3001/api/form-field-types', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to fetch form field types');
        const data: FormFieldTypeFromAPI[] = await response.json();
        setAvailableFieldTypes(Array.isArray(data) ? data : []);
      } catch (error) {
        setAvailableFieldTypes([]);
        alert("Erreur lors du chargement des types de champs. Certaines fonctionnalités peuvent être limitées.");
      }
    };
    fetchTypes();
  }, []);

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
            throw new Error('Failed to fetch event fields');
          }
          const data: Array<Omit<BackendField, 'options'> & { options?: string[] | Array<{ id_dropdown_option: number; value_option: string }> }> = await response.json();

          const mappedFields: Field[] = data.map(backendField => {
            let fieldOptions: string[] = [];
            if (Array.isArray(backendField.options)) {
              if (backendField.options.length > 0 && typeof backendField.options[0] === 'string') {
                fieldOptions = backendField.options as string[];
              } else if (backendField.options.length > 0 && typeof backendField.options[0] === 'object' && backendField.options[0] !== null && 'value_option' in backendField.options[0]) {
                fieldOptions = (backendField.options as Array<{ id_dropdown_option: number; value_option: string }>).map(opt => opt.value_option);
              }
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

          setFields(mappedFields);
        } catch (error) {
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

  useEffect(() => {
    if (eventToManageFieldsFor?.registration_start_date) {
      try {
        const registrationStartDate = new Date(eventToManageFieldsFor.registration_start_date);
        const now = new Date();
        setCanModifyFields(now < registrationStartDate);
      } catch (error) {
        setCanModifyFields(false);
      }
    } else {
      setCanModifyFields(eventToManageFieldsFor ? false : true);
    }
  }, [eventToManageFieldsFor]);

  const handleAddField = (dataFromModal: FieldDataFromModal) => {
    if (!canModifyFields) {
        alert("Les modifications sont verrouillées car la période d'inscription a commencé.");
        return;
    }
    const newField: Field = {
      id: Date.now().toString(),
      label: dataFromModal.label,
      type: dataFromModal.type,
      id_type: dataFromModal.id_form_field_type,
      isRequired: dataFromModal.isRequired,
      options: dataFromModal.options || [],
      minLength: dataFromModal.minLength,
      maxLength: dataFromModal.maxLength,
      minValue: dataFromModal.minValue,
      maxValue: dataFromModal.maxValue,
      acceptedFileTypes: dataFromModal.acceptedFileTypes,
      sequence: fields.length,
    };
    setFields(prevFields => [...prevFields, newField]);
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

  const handleUpdateField = (dataFromModal: FieldDataFromModal) => {
    if (!canModifyFields) {
        alert("Les modifications sont verrouillées car la période d'inscription a commencé.");
        return;
    }

    const idToUpdate = editingField?.id || dataFromModal.id;

    if (!idToUpdate) {
        return;
    }

    setFields(prevFields =>
      prevFields.map(f => {
        if (f.id === idToUpdate) {
          return {
            ...f,
            label: dataFromModal.label || f.label,
            type: dataFromModal.type || f.type,
            id_type: dataFromModal.id_form_field_type,
            isRequired: dataFromModal.isRequired !== undefined ? dataFromModal.isRequired : f.isRequired,
            options: dataFromModal.options || f.options || [],
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
    setFields(fields.filter(field => field.id !== id).map((f, index) => ({ ...f, sequence: index })));
  };

  const moveField = useCallback((dragIndex: number, hoverIndex: number) => {
    if (!canModifyFields) return;
    setFields((prevFields) => {
      const newFields = [...prevFields];
      const [draggedItem] = newFields.splice(dragIndex, 1);
      newFields.splice(hoverIndex, 0, draggedItem);
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

    const payloadFields = fields.map((f, index) => {
      if (typeof f.id_type === 'undefined' || f.id_type === null) {
        alert(`Erreur critique: Le type du champ "${f.label}" n'a pas été correctement défini. Veuillez réessayer ou contacter le support.`);
        throw new Error(`Le type du champ "${f.label}" n'a pas été correctement défini.`);
      }

      const fieldPayload: any = {
        label: f.label,
        id_type: f.id_type, 
        is_required: f.isRequired,
        sequence: index, 
      };
      
      if (f.type === 'text' || f.type === 'textarea') {
        fieldPayload.min_length = f.minLength;
        fieldPayload.max_length = f.maxLength;
      } else if (f.type === 'number') {
        fieldPayload.min_value = f.minValue;
        fieldPayload.max_value = f.maxValue;
      } else if (f.type === 'select' || f.type === 'radio' || f.type === 'checkbox') {
        fieldPayload.options = f.options; 
      } else if (f.type === 'file') {
        fieldPayload.accepted_file_types = f.acceptedFileTypes;
      }

      return fieldPayload;
    });

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
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
      }
      alert('Champs du formulaire enregistrés avec succès pour l\'événement!');
      onBack();
    } catch (error) {
      if (error instanceof Error) {
        alert(`Erreur: ${error.message}`);
      } else {
        alert('Une erreur inconnue est survenue lors de l\'enregistrement.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
  }, [fields]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="form-builder-container">
        <div className="form-builder-top-nav">
          <button onClick={onBack} className="back-btn icon-btn">
            <i className="fi fi-rr-arrow-left"></i>
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
                setEditingField(null);
                setIsModalOpen(true);
              }} 
              className="add-field-btn"
              disabled={!canModifyFields || isLoading}
            >
              + Ajouter un champ
            </button>
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
              key={field.id}
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
            disabled={!canModifyFields || isLoading}
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
          initialData={editingField}
          key={editingField ? `edit-${editingField.id}` : 'add'}
        />
      </div>
    </DndProvider>
  );
};

export default FormBuilder;
