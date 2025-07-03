// src/components/search/SearchBar.tsx
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SearchBarProps {
  onSearch: (searchTerm: string) => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const [term, setTerm] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(term);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        type="text"
        placeholder="Search for skills or requests..."
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        className="flex-1"
      />
      <Button type="submit">Search</Button>
    </form>
  );
}