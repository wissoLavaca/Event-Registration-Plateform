import React, { useState, useEffect, useCallback } from 'react';
import './FieldModal.css';

interface FormFieldTypeFromAPI {
  id_type: number;
  field_name: string;
}

interface FieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (fieldData: FieldData & { id_form_field_type: number; id?: string | number }) => void;
  availableFieldTypes: FormFieldTypeFromAPI[];
  initialData?: any;
}

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
}

const getTypeSpecificDefaults = (type: string): Partial<FieldData> => {
  switch (type) {
    case 'text':
    case 'textarea':
      return { minLength: 0, maxLength: 100, options: [] };
    case 'number':
      return { minValue: 0, maxValue: 100, options: [] };
    case 'checkbox':
    case 'radio':
    case 'select':
      return { options: [] };
    case 'file':
      return { acceptedFileTypes: '.pdf,.doc,.docx', options: [] };
    default:
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

  useEffect(() => {
    if (isOpen) {
      setFieldData(getInitialFieldData());
      setNewOption('');
    }
  }, [isOpen, getInitialFieldData]);

  const handleTypeChange = (selectedType: string) => {
    const typeDefaults = getTypeSpecificDefaults(selectedType);
    setFieldData(prevData => ({
      label: prevData.label,
      helpText: prevData.helpText,
      isRequired: prevData.isRequired,
      type: selectedType,
      minLength: typeDefaults.minLength !== undefined ? typeDefaults.minLength : (selectedType === 'text' || selectedType === 'textarea' ? 0 : undefined),
      maxLength: typeDefaults.maxLength !== undefined ? typeDefaults.maxLength : (selectedType === 'text' || selectedType === 'textarea' ? 100 : undefined),
      minValue: typeDefaults.minValue !== undefined ? typeDefaults.minValue : (selectedType === 'number' ? 0 : undefined),
      maxValue: typeDefaults.maxValue !== undefined ? typeDefaults.maxValue : (selectedType === 'number' ? 100 : undefined),
      acceptedFileTypes: typeDefaults.acceptedFileTypes !== undefined ? typeDefaults.acceptedFileTypes : (selectedType === 'file' ? '.pdf,.doc,.docx' : undefined),
      options: typeDefaults.options !== undefined ? typeDefaults.options : [],
    }));
    setNewOption('');
  };

  const handleAddOption = () => {
    if (newOption.trim()) {
      const currentOptions = Array.isArray(fieldData.options) ? fieldData.options : [];
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
                value={fieldData.minLength ?? ''}
                onChange={(e) => setFieldData({ ...fieldData, minLength: parseInt(e.target.value) || 0 })}
              />
              <input
                type="number"
                placeholder="Max"
                value={fieldData.maxLength ?? ''}
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
                value={fieldData.minValue ?? ''}
                onChange={(e) => setFieldData({ ...fieldData, minValue: parseInt(e.target.value) || 0 })}
              />
              <input
                type="number"
                placeholder="Max"
                value={fieldData.maxValue ?? ''}
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
              value={fieldData.acceptedFileTypes ?? ''}
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
      return;
    }

    const dataToSend: FieldData & { id_form_field_type: number; id?: string | number } = {
      ...fieldData,
      id_form_field_type: selectedTypeDefinition.id_type,
    };
    if (initialData?.id) {
      dataToSend.id = initialData.id;
    }

    if (['checkbox', 'radio', 'select'].includes(fieldData.type)) {
      dataToSend.options = Array.isArray(fieldData.options) ? fieldData.options : [];
    } else {
      // @ts-ignore
      delete dataToSend.options;
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
              onChange={(e) => handleTypeChange(e.target.value)}
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
