import React, { useState, type FormEvent, type ChangeEvent } from 'react';
import { useAuth } from '../../context/authContext';
import './Settings.css';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';


const Settings: React.FC = () => {
  // State for password change
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // State for profile picture
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string>(''); // For preview
  const [isProfileImageSaving, setIsProfileImageSaving] = useState(false);
  const [profileImageMessage, setProfileImageMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Auth context
  const { user, updateUserProfilePicture, token } = useAuth(); // Assuming token is from useAuth for consistency

  // Set initial preview image to current user's profile picture
  React.useEffect(() => {
    if (user?.profilePictureUrl) {
      const initialUrl = user.profilePictureUrl.startsWith('http') || user.profilePictureUrl.startsWith('blob:')
        ? user.profilePictureUrl
        : `${BACKEND_URL}${user.profilePictureUrl}`;
      setPreviewImage(initialUrl);
    } else {
      setPreviewImage(''); // For default avatar
    }
  }, [user?.profilePictureUrl]);

  // Handle password input change
  const handlePasswordInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    setPasswordMessage(null);
  };

  // Handle image file selection
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setProfileImageMessage({ type: 'error', text: 'Veuillez sélectionner un fichier image valide.' });
        setProfileImage(null);
        return;
      }
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        setProfileImageMessage({ type: 'error', text: 'L\'image est trop grande (max 2Mo).' });
        setProfileImage(null);
        return;
      }
      setProfileImage(file);
      setPreviewImage(URL.createObjectURL(file));
      setProfileImageMessage(null);
    }
  };

  // Handle password form submit
  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Les nouveaux mots de passe ne correspondent pas.' });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Le nouveau mot de passe doit comporter au moins 6 caractères.' });
      return;
    }

    setIsPasswordSaving(true);
    const token = localStorage.getItem("authToken");
    if (!token) {
      setPasswordMessage({ type: 'error', text: "Session expirée. Veuillez vous reconnecter." });
      setIsPasswordSaving(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/api/users/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || `Erreur ${response.status}: Impossible de mettre à jour le mot de passe.`);
      }
      setPasswordMessage({ type: 'success', text: 'Mot de passe mis à jour avec succès !' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      setPasswordMessage({ type: 'error', text: error.message || 'Une erreur est survenue lors de la mise à jour du mot de passe.' });
    } finally {
      setIsPasswordSaving(false);
    }
  };

  // Handle profile picture form submit
  const handleProfilePictureSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setProfileImageMessage(null);

    if (!profileImage) {
      setProfileImageMessage({ type: 'error', text: 'Veuillez sélectionner une nouvelle image.' });
      return;
    }

    setIsProfileImageSaving(true);
    // const token = localStorage.getItem("authToken"); // Prefer token from context if available
    if (!token) {
      setProfileImageMessage({ type: 'error', text: "Session expirée. Veuillez vous reconnecter." });
      setIsProfileImageSaving(false);
      return;
    }

    const formData = new FormData();
    formData.append('profilePicture', profileImage);

    try {
      const response = await fetch(`${BACKEND_URL}/api/users/profile-picture`, { // Use BACKEND_URL
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Erreur lors de l'envoi de l'image.");
      }

      setProfileImageMessage({ type: 'success', text: 'Photo de profil mise à jour avec succès !' });

      if (result.newProfilePictureUrl) {
        // Ensure the URL is absolute before setting it for preview and context
        const fullNewUrl = result.newProfilePictureUrl.startsWith('http')
          ? result.newProfilePictureUrl
          : `${BACKEND_URL}${result.newProfilePictureUrl}`;
        
        console.log("New profile picture URL from backend:", result.newProfilePictureUrl);
        console.log("Setting preview and context URL to:", fullNewUrl);

        setPreviewImage(fullNewUrl); // Update preview on settings page
        updateUserProfilePicture(fullNewUrl); // Update context
      }
      setProfileImage(null); // Clear the selected file

    } catch (error: any) {
      setProfileImageMessage({ type: 'error', text: error.message || 'Une erreur est survenue lors de la mise à jour de la photo.' });
    } finally {
      setIsProfileImageSaving(false);
    }
  };

  const handleDeleteProfilePicture = async () => {
    setProfileImageMessage(null);
    setIsProfileImageSaving(true);
    // const token = localStorage.getItem("authToken"); // Prefer token from context
    if (!token) {
      setProfileImageMessage({ type: 'error', text: "Session expirée. Veuillez vous reconnecter." });
      setIsProfileImageSaving(false);
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/users/profile-picture`, { // Use BACKEND_URL
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Erreur lors de la suppression de la photo.");
      }
      
      setProfileImageMessage({ type: 'success', text: 'Photo de profil supprimée.' });
      setPreviewImage(''); // For default avatar
      updateUserProfilePicture(''); // Update context to reflect no picture
    } catch (error: any) {
      setProfileImageMessage({ type: 'error', text: error.message || 'Une erreur est survenue lors de la suppression.' });
    } finally {
      setIsProfileImageSaving(false);
    }
  };


  return (
    <div className="settings-page">
      <h1>Paramètres du compte</h1>
      <div className="settings-container">
        <div className="settings-section">
          <h2>Photo de profil</h2>
          <form onSubmit={handleProfilePictureSubmit} className="profile-picture-form">
            <div className="profile-picture-container">
              <img
                src={previewImage || '/default-avatar.png'}
                alt="Aperçu du profil"
                className="profile-preview"
                onError={(e) => { (e.target as HTMLImageElement).src = '/default-avatar.png'; console.error("Error loading profile image:", previewImage);}}
              />
              <div className="upload-actions-container"> {/* Added a wrapper for buttons */}
                <div className="upload-button-wrapper"> {/* Wrapper for input and label */}
                  <input
                    type="file"
                    id="profile-picture-input"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="file-input"
                    disabled={isProfileImageSaving}
                  />
                  <label htmlFor="profile-picture-input" className="upload-button">
                    Changer la photo
                  </label>
                </div>
                {user?.profilePictureUrl && previewImage && !previewImage.endsWith('/default-avatar.png') && (
                  <button
                    type="button"
                    className="upload-button delete-picture-button" // Added 'upload-button' for base style, 'delete-picture-button' for color
                    onClick={handleDeleteProfilePicture}
                    disabled={isProfileImageSaving}
                  >
                    Supprimer la photo
                  </button>
                )}
              </div>
            </div>
            {profileImageMessage && (
              <p className={`message ${profileImageMessage.type}`}>
                {profileImageMessage.text}
              </p>
            )}
            {profileImage && (
              <button type="submit" className="save-button" disabled={isProfileImageSaving}>
                {isProfileImageSaving ? 'Enregistrement...' : 'Enregistrer la photo'}
              </button>
            )}
          </form>
        </div>

        {/* Password Change Section */}
        <div className="settings-section">
          <h2>Changer le mot de passe</h2>
          <form onSubmit={handlePasswordSubmit} className="password-form">
            {passwordMessage && (
              <p className={`message ${passwordMessage.type}`}>
                {passwordMessage.text}
              </p>
            )}
            <div className="form-group">
              <label htmlFor="currentPassword">Mot de passe actuel</label>
              <input
                type="password"
                id="currentPassword"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordInputChange}
                required
                disabled={isPasswordSaving}
              />
            </div>
            <div className="form-group">
              <label htmlFor="newPassword">Nouveau mot de passe</label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordInputChange}
                required
                disabled={isPasswordSaving}
              />
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirmer le mot de passe</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordInputChange}
                required
                disabled={isPasswordSaving}
              />
            </div>
            <button type="submit" className="save-button" disabled={isPasswordSaving}>
              {isPasswordSaving ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Settings;
