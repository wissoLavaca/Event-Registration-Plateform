import React, { useState, useEffect, useCallback } from 'react';
import './FieldModal.css';

// Interface for the structure of form field types fetched from the API
interface FormFieldTypeFromAPI {
  id_type: number;
  field_name: string; // e.g., "text", "number" - used as the value in the select
}

interface FieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (fieldData: FieldData & { id_form_field_type: number; id?: string | number }) => void;
  availableFieldTypes: FormFieldTypeFromAPI[];
  initialData?: any; // Or a more specific type for pre-filling
}

// Local state for the modal's form
interface FieldData {
  type: string;
  label: string;
  helpText: string;
  isRequired: boolean;
  options?: string[];
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  acceptedFileTypes?: string;
  // id?: string | number; // Add if modal handles id for editing directly
}

// Helper to get default values for type-specific properties
const getTypeSpecificDefaults = (type: string): Partial<FieldData> => {
  switch (type) {
    case 'text':
    case 'textarea':
      return { minLength: 0, maxLength: 100, options: [] }; // Text fields should not have options
    case 'number':
      return { minValue: 0, maxValue: 100, options: [] }; // Number fields should not have options
    case 'checkbox':
    case 'radio':
    case 'select':
      return { options: [] }; // Default for option-based types
    case 'file':
      return { acceptedFileTypes: '.pdf,.doc,.docx', options: [] }; // File fields should not have options
    default: // For 'date', 'email', or any other types without specific extra fields
      return { options: [] };
  }
};

const FieldModal: React.FC<FieldModalProps> = ({ isOpen, onClose, onAdd, availableFieldTypes, initialData }) => {
  const getInitialFieldData = useCallback((): FieldData => {
    const initialType = availableFieldTypes.length > 0 ? availableFieldTypes[0].field_name : 'text';
    const typeDefaults = getTypeSpecificDefaults(initialType);
    return {
      type: initialType,
      label: '',
      helpText: '',
      isRequired: false,
      // Apply general defaults and then specific ones
      minLength: typeDefaults.minLength !== undefined ? typeDefaults.minLength : 0,
      maxLength: typeDefaults.maxLength !== undefined ? typeDefaults.maxLength : 100,
      minValue: typeDefaults.minValue !== undefined ? typeDefaults.minValue : 0,
      maxValue: typeDefaults.maxValue !== undefined ? typeDefaults.maxValue : 100,
      acceptedFileTypes: typeDefaults.acceptedFileTypes !== undefined ? typeDefaults.acceptedFileTypes : '.pdf,.doc,.docx',
      options: typeDefaults.options !== undefined ? typeDefaults.options : [],
    };
  }, [availableFieldTypes]);

  const [fieldData, setFieldData] = useState<FieldData>(getInitialFieldData());
  const [newOption, setNewOption] = useState('');

  // Effect to reset form when modal is opened or available types change
  useEffect(() => {
    if (isOpen) {
      setFieldData(getInitialFieldData());
      setNewOption('');
    }
  }, [isOpen, getInitialFieldData]);


  const handleTypeChange = (selectedType: string) => {
    const typeDefaults = getTypeSpecificDefaults(selectedType);
    setFieldData(prevData => ({
      // Preserve some user input if desired, or reset fully
      label: prevData.label, // Keep label
      helpText: prevData.helpText, // Keep help text
      isRequired: prevData.isRequired, // Keep isRequired
      type: selectedType,
      // Apply new type-specific defaults, ensuring all keys are correctly set or cleared
      minLength: typeDefaults.minLength !== undefined ? typeDefaults.minLength : (selectedType === 'text' || selectedType === 'textarea' ? 0 : undefined),
      maxLength: typeDefaults.maxLength !== undefined ? typeDefaults.maxLength : (selectedType === 'text' || selectedType === 'textarea' ? 100 : undefined),
      minValue: typeDefaults.minValue !== undefined ? typeDefaults.minValue : (selectedType === 'number' ? 0 : undefined),
      maxValue: typeDefaults.maxValue !== undefined ? typeDefaults.maxValue : (selectedType === 'number' ? 100 : undefined),
      acceptedFileTypes: typeDefaults.acceptedFileTypes !== undefined ? typeDefaults.acceptedFileTypes : (selectedType === 'file' ? '.pdf,.doc,.docx' : undefined),
      options: typeDefaults.options !== undefined ? typeDefaults.options : [],
    }));
    setNewOption(''); // Reset the new option input field
  };

  const handleAddOption = () => {
    if (newOption.trim()) {
      // Ensure options is an array before spreading
      const currentOptions = Array.isArray(fieldData.options) ? fieldData.options : [];
      console.log("Adding option. Current options:", currentOptions, "New option:", newOption.trim());
      setFieldData(prevData => ({
        ...prevData,
        options: [...currentOptions, newOption.trim()]
      }));
      setNewOption('');
    }
  };

  const handleRemoveOption = (indexToRemove: number) => {
    if (Array.isArray(fieldData.options)) {
      const updatedOptions = fieldData.options.filter((_, i) => i !== indexToRemove);
      console.log("Removing option. Index:", indexToRemove, "New options:", updatedOptions);
      setFieldData(prevData => ({
        ...prevData,
        options: updatedOptions
      }));
    }
  };

  const renderAdditionalFields = () => {
    switch (fieldData.type) {
      case 'text':
      case 'textarea': 
        return (
          <div className="form-group">
            <label>Longueur du texte</label>
            <div className="range-inputs">
              <input
                type="number"
                placeholder="Min"
                value={fieldData.minLength ?? ''} // Use ?? '' for controlled input if value can be undefined
                onChange={(e) => setFieldData({ ...fieldData, minLength: parseInt(e.target.value) || 0 })}
              />
              <input
                type="number"
                placeholder="Max"
                value={fieldData.maxLength ?? ''} // Use ?? ''
                onChange={(e) => setFieldData({ ...fieldData, maxLength: parseInt(e.target.value) || 100 })}
              />
            </div>
          </div>
        );

      case 'number':
        return (
          <div className="form-group">
            <label>Plage de valeurs</label>
            <div className="range-inputs">
              <input
                type="number"
                placeholder="Min"
                value={fieldData.minValue ?? ''} // Use ?? ''
                onChange={(e) => setFieldData({ ...fieldData, minValue: parseInt(e.target.value) || 0 })}
              />
              <input
                type="number"
                placeholder="Max"
                value={fieldData.maxValue ?? ''} // Use ?? ''
                onChange={(e) => setFieldData({ ...fieldData, maxValue: parseInt(e.target.value) || 100 })}
              />
            </div>
          </div>
        );

      case 'select':
      case 'radio':
      case 'checkbox':
        return (
          <div className="form-group">
            <label>Options</label>
            <div className="options-list">
              {/* Ensure fieldData.options is an array before mapping */}
              {Array.isArray(fieldData.options) && fieldData.options.map((option, index) => (
                <div key={index} className="option-item">
                  <span>{option}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(index)}
                    className="remove-option-btn"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="add-option">
              <input
                type="text"
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                placeholder="Nouvelle option"
              />
              <button type="button" onClick={handleAddOption} className="add-option-btn">
                +
              </button>
            </div>
          </div>
        );

      case 'file':
        return (
          <div className="form-group">
            <label>Types de fichiers acceptés</label>
            <input
              type="text"
              value={fieldData.acceptedFileTypes ?? ''} // Use ?? ''
              onChange={(e) => setFieldData({ ...fieldData, acceptedFileTypes: e.target.value })}
              placeholder=".pdf,.doc,.docx"
            />
          </div>
        );
      default:
        return null;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedTypeDefinition = availableFieldTypes.find(t => t.field_name === fieldData.type);
    if (!selectedTypeDefinition) {
      alert(`Erreur: Le type de champ "${fieldData.type}" est invalide ou non trouvé. Veuillez recharger ou contacter le support.`);
      console.error("Available types:", availableFieldTypes, "Selected type string:", fieldData.type);
      return;
    }

    const dataToSend: FieldData & { id_form_field_type: number; id?: string | number } = {
      ...fieldData,
      id_form_field_type: selectedTypeDefinition.id_type,
    };
    if (initialData?.id) { // If editing, include the id
      dataToSend.id = initialData.id;
    }

    // Ensure options is an array, even if empty, for option-based types
    if (['checkbox', 'radio', 'select'].includes(fieldData.type)) {
      dataToSend.options = Array.isArray(fieldData.options) ? fieldData.options : [];
    } else {
      // @ts-ignore
      delete dataToSend.options; // Or set to undefined
    }

    onAdd(dataToSend);
    onClose();
  };

  const getFieldTypeLabel = (fieldName: string): string => {
  const labels: { [key: string]: string } = {
    'text': 'Texte',
    'number': 'Nombre',
    'file': 'Fichier',
    'date': 'Date',
    'checkbox': 'Case à cocher',
    'radio': 'Boutons radio'
  };
  return labels[fieldName] || fieldName;
};

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="field-modal">
        <div className="modal-header">
          <h2>Ajouter un champ</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Type de champ*</label>
            <select
              value={fieldData.type}
              onChange={(e) => handleTypeChange(e.target.value)} // Use the new handler
              required
            >
              {availableFieldTypes.length === 0 && <option value="text">Texte (chargement des types...)</option>}
              {availableFieldTypes.map(typeOption => (
                <option key={typeOption.id_type} value={typeOption.field_name}>
                {getFieldTypeLabel(typeOption.field_name)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Libellé*</label>
            <input
              type="text"
              placeholder="Entrez le libellé du champ"
              value={fieldData.label}
              onChange={(e) => setFieldData({ ...fieldData, label: e.target.value })}
              required
            />
          </div>

          {renderAdditionalFields()}

          <div className="form-group required-field">
            <span>Champ obligatoire</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={fieldData.isRequired}
                onChange={(e) => setFieldData({ ...fieldData, isRequired: e.target.checked })}
              />
              <span className="slider round"></span>
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="add-btn">
              Ajouter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FieldModal;