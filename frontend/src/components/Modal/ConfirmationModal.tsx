import React from 'react';
import './ConfirmationModal.css'; // We'll create this CSS file next

interface ConfirmationModalProps {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  title?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  message,
  onConfirm,
  onCancel,
  confirmText = 'OK',
  cancelText = 'Cancel',
  title = 'Confirmation',
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="confirmation-modal-overlay">
      <div className="confirmation-modal-content">
        <div className="confirmation-modal-header">
          <h3>{title}</h3>
          <button onClick={onCancel} className="confirmation-modal-close-btn">&times;</button>
        </div>
        <div className="confirmation-modal-body">
          <p>{message}</p>
        </div>
        <div className="confirmation-modal-footer">
          {cancelText && (
            <button onClick={onCancel} className="confirmation-modal-btn cancel">
              {cancelText}
            </button>
          )}
          <button onClick={onConfirm} className="confirmation-modal-btn confirm">
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
