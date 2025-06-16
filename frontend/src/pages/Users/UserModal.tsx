import React, { useState, useEffect } from "react";
import "./UserModal.css";

interface Role {
  id_role: number;
  name_role: string;
}

interface Departement {
  id_departement: number;
  name_departement: string;
}

interface UserFormData {
  id_user?: number;
  first_name: string;
  last_name: string;
  birth_date: string;
  username: string;
  password?: string;
  registration_number: string;
  role_name: string;
  departement_name: string;
}

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (userData: UserFormData) => void;
  userDataToEdit: {
    id_user: number;
    first_name: string;
    last_name: string;
    username: string;
    registration_number?: string;
    role: Role;
    departement: Departement;
    birth_date?: string;
  } | null;
  availableRoles: Role[]; 
  availableDepartements: Departement[]; 
}

const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  onClose,
  onSave,
  userDataToEdit,
  availableRoles, 
  availableDepartements, 
}) => {
  const initialFormData: UserFormData = {
    first_name: "",
    last_name: "",
    birth_date: "",
    username: "",
    password: "",
    registration_number: "",
    role_name: "", 
    departement_name: "", 
  };

  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (userDataToEdit) {
      setIsEditMode(true);
      setFormData({
        id_user: userDataToEdit.id_user,
        first_name: userDataToEdit.first_name || "",
        last_name: userDataToEdit.last_name || "",
        birth_date: userDataToEdit.birth_date ? new Date(userDataToEdit.birth_date).toISOString().split('T')[0] : "",
        username: userDataToEdit.username || "",
        password: "", 
        registration_number: userDataToEdit.registration_number || "",
        role_name: userDataToEdit.role?.name_role || "",
        departement_name: userDataToEdit.departement?.name_departement || "", 
      });
    } else {
      setIsEditMode(false);
      // When adding a new user, set default role/department if available and desired
      // Otherwise, keep them empty to force selection.
      // If you want to pre-select the first available role/department:
      setFormData({
        ...initialFormData,
        // role_name: availableRoles.length > 0 ? availableRoles[0].name_role : "",
        // departement_name: availableDepartements.length > 0 ? availableDepartements[0].name_departement : "",
      });
    }
  // Add availableRoles and availableDepartements to dependency array if you pre-select defaults
  }, [userDataToEdit, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditMode && !formData.password) {
        alert("Le mot de passe est requis pour les nouveaux utilisateurs.");
        return;
    }
    if (!formData.role_name) { // Ensure role is selected
        alert("Veuillez sélectionner un rôle.");
        return;
    }
    if (!formData.departement_name) { 
        alert("Veuillez sélectionner un département.");
        return;
    }

    const dataToSend = { ...formData };
    if (isEditMode && !dataToSend.password) {
        delete dataToSend.password; 
    }
    onSave(dataToSend);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="user-modal">
        <div className="modal-header">
          <h2>{isEditMode ? "Modifier l'utilisateur" : "Ajouter un utilisateur"}</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Prénom and Nom */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="first_name">Prénom*</label>
              <input type="text" id="first_name" name="first_name" placeholder="Entrez le prénom" value={formData.first_name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="last_name">Nom*</label>
              <input type="text" id="last_name" name="last_name" placeholder="Entrez le nom" value={formData.last_name} onChange={handleChange} required />
            </div>
          </div>

          {/* Date de naissance */}
          <div className="form-group">
            <label htmlFor="birth_date">Date de naissance*</label>
            <input type="date" id="birth_date" name="birth_date" value={formData.birth_date} onChange={handleChange} required={!isEditMode} />
          </div>

          {/* Nom d'utilisateur */}
          <div className="form-group">
            <label htmlFor="username">Nom d'utilisateur*</label>
            <input type="text" id="username" name="username" placeholder="Entrez le nom d'utilisateur" value={formData.username} onChange={handleChange} required />
          </div>

          {/* Mot de passe */}
          <div className="form-group">
            <label htmlFor="password">{isEditMode ? "Nouveau mot de passe (laisser vide pour ne pas changer)" : "Mot de passe*"}</label>
            <input type="password" id="password" name="password" placeholder={isEditMode ? "Nouveau mot de passe" : "Entrez le mot de passe"} value={formData.password || ''} onChange={handleChange} required={!isEditMode} />
          </div>

          {/* Numéro d'inscription */}
          <div className="form-group">
            <label htmlFor="registration_number">Numéro d'immatriculation*</label>
            <input type="text" id="registration_number" name="registration_number" placeholder="Entrez le numéro d'inscription" value={formData.registration_number} onChange={handleChange} required={!isEditMode} />
          </div>

          {/* Rôle Dropdown */}
          <div className="form-group">
            <label htmlFor="role_name">Rôle*</label>
            <select id="role_name" name="role_name" value={formData.role_name} onChange={handleChange} required >
              <option value="">Sélectionnez un rôle</option>
              {availableRoles.map((role) => (
                <option key={role.id_role} value={role.name_role}>
                  {role.name_role}
                </option>
              ))}
            </select>
          </div>

          {/* Département Dropdown */}
          <div className="form-group">
            <label htmlFor="departement_name">Département*</label>
            <select id="departement_name" name="departement_name" value={formData.departement_name} onChange={handleChange} required >
              <option value="">Sélectionnez un département</option>
              {availableDepartements.map((dept) => (
                <option key={dept.id_departement} value={dept.name_departement}>
                  {dept.name_departement}
                </option>
              ))}
            </select>
          </div>

          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="save-button">
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;