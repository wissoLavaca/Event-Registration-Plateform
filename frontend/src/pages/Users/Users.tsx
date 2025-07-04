import React, { useState, useEffect, useRef } from 'react';
import UserModal from "./UserModal";
import ConfirmationModal from '../../components/Modal/ConfirmationModal'; 
import './User.css';
import * as XLSX from 'xlsx';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

interface Role {
  id_role: number;
  name_role: string;
}

interface Departement {
  id_departement: number;
  name_departement: string;
}

interface User {
  id_user: number;
  first_name: string;
  last_name: string;
  username: string;
  registration_number?: string;
  role: Role;
  departement: Departement;
  birth_date?: string;
  profile_picture_url?: string;
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

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [bulkUploadError, setBulkUploadError] = useState<string | null>(null);
  const [bulkUploadSuccess, setBulkUploadSuccess] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('Tous');
  const [isUserModalOpen, setIsUserModalOpen] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [availableDepartements, setAvailableDepartements] = useState<Departement[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmModalProps, setConfirmModalProps] = useState({
    message: '',
    onConfirmAction: () => {},
    confirmText: 'OK',
    cancelText: 'Annuler',
    title: 'Confirmation'
  });
  const [userToDeleteId, setUserToDeleteId] = useState<number | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          setError("Token d'authentification non trouvé. Veuillez vous reconnecter.");
          setIsLoading(false);
          return;
        }
        const response = await fetch('http://localhost:3001/api/users', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const responseText = await response.text();
          let errorMsg = `HTTP error! status: ${response.status}`;
          try {
            const errorData = JSON.parse(responseText);
            errorMsg = errorData.message || errorMsg;
          } catch (parseError) {
            if (responseText) {
              errorMsg = responseText;
            }
            if (errorMsg.length > 200) errorMsg = `HTTP error! status: ${response.status}. Server returned a non-JSON error.`;
          }
          throw new Error(errorMsg);
        }
        const data: User[] = await response.json();
        setUsers(data);
      } catch (err: any) {
        console.error("Failed to fetch users:", err);
        setError(err.message || "Échec de la récupération des utilisateurs.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const fetchDropdownData = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.error("Auth token not found for fetching dropdown data");
        return;
      }
      try {
        const rolesResponse = await fetch('http://localhost:3001/api/roles', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!rolesResponse.ok) {
            const errData = await rolesResponse.json();
            throw new Error(errData.message || 'Échec de la récupération des rôles');
        }
        const rolesData: Role[] = await rolesResponse.json();
        setAvailableRoles(rolesData);

        const deptsResponse = await fetch('http://localhost:3001/api/departements', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!deptsResponse.ok) {
            const errData = await deptsResponse.json();
            throw new Error(errData.message || 'Échec de la récupération des départements');
        }
        const deptsData: Departement[] = await deptsResponse.json();
        setAvailableDepartements(deptsData);

      } catch (err: any) {
        console.error("Error fetching dropdown data:", err);
        setError((prevError) => prevError ? `${prevError}\nErreur de chargement des options: ${err.message}` : `Erreur de chargement des options: ${err.message}`);
      }
    };

    fetchDropdownData();
  }, []);

  const handleAddUser = () => {
    setSelectedUser(null);
    setError(null);
    setIsUserModalOpen(true);
  };

  const handleTriggerFileUpload = () => {
    setError(null);
    setBulkUploadError(null);
    setBulkUploadSuccess(null);
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsSaving(true);
    setBulkUploadError(null);
    setBulkUploadSuccess(null);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          if (!data) {
            throw new Error("Failed to read file data.");
          }
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonUsers = XLSX.utils.sheet_to_json<any>(worksheet, { raw: false, dateNF: 'yyyy-mm-dd' });

          const usersToUpload = jsonUsers.map(row => {
            const birthDateValue = row.birthDate || row.birth_date || row["Date de naissance"];

            return {
              first_name: row.firstName || row.first_name || row["Prénom"],
              last_name: row.lastName || row.last_name || row["Nom"], 
              username: row.username || row["Nom d'utilisateur"],
              password: row.password || row.Password || row["Mot de passe"], 
              role_name: row.roleName || row.role_name || row.Role || row["Rôle"],
              departement_name: row.departementName || row.departement_name || row.Departement || row["Département"],
              birth_date: birthDateValue, 
              registration_number: row.registrationNumber || row.registration_number || row["Numéro d'immatriculation"],
            };
          });

          const validUsersToUpload = usersToUpload.filter(user => 
            user.username && user.first_name && user.last_name && user.role_name && user.departement_name
          );

          if (validUsersToUpload.length === 0) {
            throw new Error("Aucune donnée utilisateur valide trouvée dans le fichier Excel. Vérifiez les noms de colonnes (par exemple, firstName, lastName, username, roleName, departementName, pa[...]
          }

          console.log('Utilisateurs à téléverser (données brutes mappées):', JSON.stringify(validUsersToUpload, null, 2));

          const token = localStorage.getItem('authToken');
          if (!token) {
            throw new Error("Token d'authentification non trouvé.");
          }

          const response = await fetch(`${BACKEND_URL}/api/users/bulk`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(validUsersToUpload),
          });

          const result = await response.json();

          if (!response.ok) {
            let detailedErrorMessage = `Échec du téléversement groupé. Statut: ${response.status}.`;
            if (result.message) {
              detailedErrorMessage += ` Message: ${result.message}`;
            }
            if (result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
              const specificErrors = result.errors.map((err: any, index: number) => 
                `Utilisateur ${index + 1} (${err.identifier || 'N/A'}): ${err.error || 'Erreur inconnue'}`
              ).join('\n');
              detailedErrorMessage += `\nErreurs spécifiques:\n${specificErrors}`;
            } else if (typeof result.error === 'string') {
                detailedErrorMessage += `\nErreur: ${result.error}`;
            }
            throw new Error(detailedErrorMessage);
          }
          
          let successMessage = result.message || `${validUsersToUpload.length} utilisateurs traités.`;
          if (result.createdCount !== undefined && result.failedCount !== undefined) {
            successMessage = `Traitement groupé terminé. ${result.createdCount} utilisateurs créés, ${result.failedCount} échoués.`;
          }

          if (result.failedCount > 0 && result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
            const specificErrorDetails = result.errors.map((err: any, index: number) => 
              `Échec pour l'utilisateur ${index + 1} (${err.identifier || 'N/A'}): ${err.error || 'Erreur inconnue'}`
            ).join('\n');
            setBulkUploadError(`Certains utilisateurs n'ont pas pu être créés:\n${specificErrorDetails}`);
          }
          
          setBulkUploadSuccess(successMessage);
          
          const fetchUsersResponse = await fetch(`${BACKEND_URL}/api/users`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (fetchUsersResponse.ok) {
            const updatedUsers: User[] = await fetchUsersResponse.json();
            setUsers(updatedUsers);
          }

        } catch (parseError: any) {
          console.error("Erreur lors du traitement du fichier Excel ou de la réponse du backend:", parseError);
          setBulkUploadError(`Erreur: ${parseError.message}`);
        } finally {
          setIsSaving(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }
      };
      reader.onerror = (error) => {
        console.error("FileReader error:", error);
        setBulkUploadError("Erreur lors de la lecture du fichier.");
        setIsSaving(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
      };
      reader.readAsArrayBuffer(file);

    } catch (uploadError: any) {
      console.error("File upload error:", uploadError);
      setBulkUploadError(uploadError.message);
      setIsSaving(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleEditUser = (userToEdit: User) => {
    setSelectedUser(userToEdit);
    setError(null);
    setIsUserModalOpen(true);
  };

  const handleDeleteUserClick = (userId: number) => {
    setConfirmModalProps({
      message: 'Êtes-vous sûr de vouloir supprimer cet utilisateur ?',
      onConfirmAction: () => performDeleteUser(userId),
      confirmText: "Supprimer",
      cancelText: "Annuler",
      title: "Confirmer la suppression"
    });
    setIsConfirmModalOpen(true);
  };

  const performDeleteUser = async (idToDelete: number | null) => {
    console.log('performDeleteUser called with idToDelete (parameter):', idToDelete); 
    if (idToDelete === null) {
      console.warn('performDeleteUser called but idToDelete parameter is null.'); 
      return;
    }
    setIsConfirmModalOpen(false);

    setIsSaving(true);
    setError(null);
    const token = localStorage.getItem('authToken');
    if (!token) {
      setError("Action non autorisée. Veuillez vous reconnecter.");
      setIsSaving(false);
      return;
    }
    try {
      const response = await fetch(`http://localhost:3001/api/users/${idToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const responseText = await response.text();
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
          const errorData = JSON.parse(responseText);
          errorMsg = errorData.message || errorMsg;
        } catch (parseError) {
          if (responseText) errorMsg = responseText;
          if (errorMsg.length > 200) errorMsg = `HTTP error! status: ${response.status}. Server returned a non-JSON error.`;
        }
        throw new Error(errorMsg);
      }
      setUsers(prevUsers => prevUsers.filter(u => u.id_user !== idToDelete));
      console.log('Utilisateur supprimé avec succès!'); 
    } catch (err: any) {
      console.error("Error deleting user in performDeleteUser:", err); 
      setError(err.message || "Erreur lors de la suppression de l'utilisateur.");
    } finally {
      setIsSaving(false);
      setUserToDeleteId(null);
    }
  };

  const handleModalConfirm = () => {
    console.log('handleModalConfirm called. Current confirmModalProps.onConfirmAction:', confirmModalProps.onConfirmAction);
    if (typeof confirmModalProps.onConfirmAction === 'function') {
      confirmModalProps.onConfirmAction();
    } else {
      console.error('confirmModalProps.onConfirmAction is not a function!');
    }
  };

  const handleModalCancel = () => {
    setIsConfirmModalOpen(false);
    setUserToDeleteId(null);
  };

  const handleSaveUser = async (userDataFromModal: UserFormData) => {
    setIsSaving(true);
    setError(null);
    const token = localStorage.getItem('authToken');
    if (!token) {
      setError("Action non autorisée. Veuillez vous reconnecter.");
      setIsSaving(false);
      return;
    }

    const payload: any = {
        first_name: userDataFromModal.first_name,
        last_name: userDataFromModal.last_name,
        birth_date: userDataFromModal.birth_date || null,
        username: userDataFromModal.username,
        registration_number: userDataFromModal.registration_number || null,
        role: userDataFromModal.role_name,
        departement: userDataFromModal.departement_name,
    };

    if (userDataFromModal.password) {
        payload.password = userDataFromModal.password;
    }

    try {
      const method = (selectedUser && userDataFromModal.id_user) ? 'PUT' : 'POST';
      const url = (selectedUser && userDataFromModal.id_user)
        ? `http://localhost:3001/api/users/${selectedUser.id_user}`
        : `http://localhost:3001/api/users`;

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const responseText = await response.text();
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
          const errorData = JSON.parse(responseText);
          errorMsg = errorData.message || errorMsg;
        } catch (parseError) {
          if (responseText) { 
            errorMsg = responseText;
          }
          if (errorMsg.length > 200) errorMsg = `HTTP error! status: ${response.status}. Server returned a non-JSON error.`;
        }
        throw new Error(errorMsg);
      }

      const savedUserData: User = await response.json(); 

      if (method === 'PUT') {
        setUsers(prevUsers => prevUsers.map(u => (u.id_user === savedUserData.id_user ? savedUserData : u)));
      } else {
        setUsers(prevUsers => [...prevUsers, savedUserData]);
      }
      
      const successMessage = method === 'PUT' ? "Utilisateur mis à jour avec succès!" : "Utilisateur créé avec succès!";
      console.log(successMessage);
      setIsUserModalOpen(false);
      setSelectedUser(null);

    } catch (err: any) {
      console.error("Error saving user:", err);
      setError(err.message || "Erreur lors de l'enregistrement de l'utilisateur.");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesRole = selectedRoleFilter === 'Tous' || (user.role && user.role.name_role === selectedRoleFilter);
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      (user.first_name && user.first_name.toLowerCase().includes(searchLower)) ||
      (user.last_name && user.last_name.toLowerCase().includes(searchLower)) ||
      (user.username && user.username.toLowerCase().includes(searchLower));
    return matchesRole && matchesSearch;
  });

  if (isLoading && users.length === 0 && !error) {
    return <div className="users-page"><p>Chargement des utilisateurs...</p></div>;
  }

  if (isLoading && error) {
    return <div className="users-page"><p className="error-message" style={{textAlign: 'center', color: 'red'}}>{error}</p></div>;
  }

  return (
    <div className="users-page">
      <div className="users-header">
        <div className="title-section">
          <h1>Gestion des Utilisateurs</h1>
          <p>Gérez les utilisateurs et leurs accès à la plateforme.</p>
        </div>
        <div className="header-actions">
          <button className="add-user-btn" onClick={handleAddUser} disabled={isSaving}>
            {isSaving ? 'Opération...' : '+ Ajouter un utilisateur'}
          </button>
          <button className="upload-users-btn" onClick={handleTriggerFileUpload} disabled={isSaving} style={{marginLeft: '10px'}}>
            {isSaving ? 'Opération...' : '↑ Upload Utilisateurs (Excel)'}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            accept=".xlsx, .xls"
          />
        </div>
      </div>

      {error && !isUserModalOpen && !isConfirmModalOpen && <p className="error-message main-error" style={{textAlign: 'center', margin: '10px 0', color: 'red'}}>{error}</p>}
      {bulkUploadError && <p className="error-message bulk-error" style={{textAlign: 'center', margin: '10px 0', color: 'red'}}>{bulkUploadError}</p>}
      {bulkUploadSuccess && <p className="success-message bulk-success" style={{textAlign: 'center', margin: '10px 0', color: 'green'}}>{bulkUploadSuccess}</p>}

      <div className="filters-section">
        <div className="role-filter">
          <label htmlFor="roleFilter">Rôle:</label>
          <select
            id="roleFilter"
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            disabled={availableRoles.length === 0}
          >
            <option value="Tous">Tous</option>
            {availableRoles.map(role => (
                <option key={`filter-${role.id_role}`} value={role.name_role}>{role.name_role}</option>
            ))}
          </select>
        </div>
        <div className="search-bar">
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {isLoading && users.length > 0 && <p style={{textAlign: 'center'}}>Mise à jour de la liste...</p>}

      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Rôle</th>
              <th>Département</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map(user => (
                <tr key={user.id_user}>
                  <td className="user-info">
                    <div className="user-avatar">
                      <img
                        src={
                          user.profile_picture_url
                            ? (user.profile_picture_url.startsWith('http')
                                ? user.profile_picture_url
                                : `${BACKEND_URL}${user.profile_picture_url}`)
                            : '/default-avatar.png'
                        }
                        alt={`${user.first_name} ${user.last_name}`}
                        className="avatar-img"
                        style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
                      />
                      </div>
                      <span className="user-name" style={{ marginLeft: 8 }}>
                        {user.username}
                      </span>
                  </td>
                  <td>
                    <span className={`role-badge ${user.role?.name_role?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`}>
                      {user.role?.name_role || 'N/A'}
                    </span>
                  </td>
                  <td>
                    <div className="department-name">{user.departement?.name_departement || 'N/A'}</div>
                  </td>
                  <td className="actions">
                    <button
                      className="edit-btn"
                      onClick={() => handleEditUser(user)}
                      disabled={isSaving}
                    >
                      Modifier
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteUserClick(user.id_user)}
                      disabled={isSaving}
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center' }}>
                    {!isLoading && users.length === 0 && !error ? "Aucun utilisateur n'a été créé pour le moment." :
                     !isLoading && filteredUsers.length === 0 && !error ? "Aucun utilisateur ne correspond à vos critères." : 
                     error ? "" : "Chargement..."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => {
          setIsUserModalOpen(false);
          setSelectedUser(null);
        }}
        onSave={handleSaveUser}
        userDataToEdit={selectedUser}
        availableRoles={availableRoles}
        availableDepartements={availableDepartements}
      />

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        title={confirmModalProps.title}
        message={confirmModalProps.message}
        onConfirm={handleModalConfirm}
        onCancel={handleModalCancel}
        confirmText={confirmModalProps.confirmText}
        cancelText={confirmModalProps.cancelText}
      />
    </div>
  );
};

export default Users;
