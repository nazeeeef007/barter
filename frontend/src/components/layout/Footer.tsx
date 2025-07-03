// src/components/layout/Footer.tsx
import React from 'react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-background border-t text-foreground p-6 text-center text-sm">
      <div className="container mx-auto">
        <p>&copy; {currentYear} Barter. All rights reserved.</p>
        <div className="mt-2 space-x-4">
          <a href="/privacy-policy" className="hover:underline text-muted-foreground">Privacy Policy</a>
          <a href="/terms-of-service" className="hover:underline text-muted-foreground">Terms of Service</a>
          {/* Add more links as needed */}
        </div>
      </div>
    </footer>
  );
};

export default Footer;