import { useState } from 'react';

export function useModal<T = undefined>(initialState = false) {
  const [isOpen, setIsOpen] = useState(initialState);
  const [data, setData] = useState<T | undefined>(undefined);

  const openModal = (data?: T) => {
    if (data) setData(data);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
  };

  return {
    isOpen,
    data,
    openModal,
    closeModal,
  };
}
