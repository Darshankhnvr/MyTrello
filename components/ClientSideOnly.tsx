import React, { useEffect, useState, ReactNode } from 'react';

interface ClientSideOnlyProps {
  children: ReactNode;
}

const ClientSideOnly: React.FC<ClientSideOnlyProps> = ({ children }) => {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return null;
  }

  return <>{children}</>;
};

export default ClientSideOnly;
