import { useState } from 'react';

interface ModalState {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'danger';
  confirmText: string;
  cancelText: string;
  showCancel: boolean;
  onConfirm?: () => void;
}

const useModal = () => {
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    confirmText: 'OK',
    cancelText: 'Cancel',
    showCancel: false,
  });

  const [showConfetti, setShowConfetti] = useState(false);

  const showAlert = (title: string, message: string, type: 'success' | 'warning' | 'info' | 'danger' = 'info') => {
    setModalState({
      isOpen: true,
      title,
      message,
      type,
      confirmText: 'OK',
      cancelText: 'Cancel',
      showCancel: false,
      onConfirm: () => {},
    });
  };

  const showConfirm = (
    title: string, 
    message: string, 
    onConfirm: () => void,
    type: 'warning' | 'danger' = 'warning'
  ) => {
    setModalState({
      isOpen: true,
      title,
      message,
      type,
      confirmText: type === 'danger' ? 'Delete' : 'Yes',
      cancelText: 'Cancel',
      showCancel: true,
      onConfirm,
    });
  };

  const showSuccess = (title: string, message: string, onConfirm?: () => void) => {
    setModalState({
      isOpen: true,
      title,
      message,
      type: 'success',
      confirmText: 'Awesome!',
      cancelText: 'Cancel',
      showCancel: false,
      onConfirm: onConfirm || (() => {}),
    });
    setShowConfetti(true);
  };

  const closeModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

  const closeConfetti = () => {
    setShowConfetti(false);
  };

  return {
    modalState,
    showConfetti,
    showAlert,
    showConfirm,
    showSuccess,
    closeModal,
    closeConfetti,
  };
};

export default useModal;
