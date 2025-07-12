import React, { createContext, useCallback, useContext, useState } from 'react';

interface AddProjectModalContextType {
  isVisible: boolean;
  showModal: () => void;
  hideModal: () => void;
  onProjectCreated?: () => void;
  setOnProjectCreated: (callback: () => void) => void;
}

const AddProjectModalContext = createContext<AddProjectModalContextType | undefined>(undefined);

export const useAddProjectModal = () => {
  const context = useContext(AddProjectModalContext);
  if (!context) {
    throw new Error('useAddProjectModal must be used within an AddProjectModalProvider');
  }
  return context;
};

interface AddProjectModalProviderProps {
  children: React.ReactNode;
}

export const AddProjectModalProvider: React.FC<AddProjectModalProviderProps> = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [onProjectCreated, setOnProjectCreatedState] = useState<(() => void) | undefined>(undefined);

  const showModal = useCallback(() => setIsVisible(true), []);
  const hideModal = useCallback(() => setIsVisible(false), []);

  const setOnProjectCreated = useCallback((callback: () => void) => {
    setOnProjectCreatedState(() => callback);
  }, []);

  return (
    <AddProjectModalContext.Provider
      value={{
        isVisible,
        showModal,
        hideModal,
        onProjectCreated,
        setOnProjectCreated,
      }}
    >
      {children}
    </AddProjectModalContext.Provider>
  );
}; 