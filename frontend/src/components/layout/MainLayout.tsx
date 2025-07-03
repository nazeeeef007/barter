// src/components/layout/MainLayout.tsx
import React from 'react';
import Navbar from '@/components/navigation/Navbar'; // Adjust path if necessary
import Footer from '@/components/layout/Footer';   // Adjust path if necessary

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;