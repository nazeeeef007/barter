// src/pages/BrowseListingsPage.tsx
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';

import { ListingCard } from '@/components/listings/ListingCard';
import { SearchBar } from '@/components/search/SearchBar';
import { FilterPanel } from '@/components/search/FilterPanel';
import { Pagination } from '@/components/pagination/Pagination';
import { useAuth } from '../context/AuthContext';
import type { BarterPost } from '@/types/BarterPost';
const BASE_URL = import.meta.env.VITE_BASE_URL;

interface FilterOptions {
  skillCategory: string[];
  location: string;
  radius: number;
  availability: string;
  urgency: string;
  // Add other filters as needed
}

const ITEMS_PER_PAGE = 10;

export default function BrowseListingsPage() {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();

  const [listings, setListings] = useState<BarterPost[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    skillCategory: [],
    location: '',
    radius: 0,
    availability: '',
    urgency: '',
  });
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const uploaderId = new URLSearchParams(location.search).get('uploaderId');

  const fetchListings = useCallback(async () => {
    if (authLoading) return;

    setIsLoading(true);
    setError(null);
    let idToken = null;

    try {
      if (user) {
        idToken = await user.getIdToken(true);
      } else {
        console.warn("No user logged in. Fetching listings without an authentication token.");
      }

      const params = new URLSearchParams();
      if (searchTerm) params.append('searchTerm', searchTerm);
      if (filterOptions.skillCategory.length > 0) {
        filterOptions.skillCategory.forEach(cat => params.append('skillCategory', cat));
      }
      if (filterOptions.location) params.append('location', filterOptions.location);
      // ... add other filter params

      // IMPORTANT ADDITION: Always request posts with status 'open'
      params.append('status', 'open'); // <--- ADDED: Filter by status 'open'

      if (uploaderId) {
        params.append('uploaderId', uploaderId);
      }

      params.append('page', String(currentPage - 1));
      params.append('size', String(ITEMS_PER_PAGE));

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      const response = await axios.get<BarterPost[]>(
        `${BASE_URL}/posts?${params.toString()}`,
        { headers }
      );

      setListings(response.data);
      setTotalPages(Math.ceil(response.data.length / ITEMS_PER_PAGE)); // Temporary
    } catch (err) {
      console.error('Error fetching listings:', err);
      if (axios.isAxiosError(err) && err.response && err.response.status === 403) {
        setError('Access Denied: You might need to log in to view listings.');
      } else {
        setError('Failed to fetch listings. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, filterOptions, currentPage, user, authLoading, uploaderId]);

  useEffect(() => {
    if (!authLoading) {
      fetchListings();
    }
  }, [fetchListings, authLoading]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  const handleFilterChange = (newFilters: Partial<FilterOptions>) => {
    setFilterOptions(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="container mx-auto p-4 flex flex-col md:flex-row gap-6">
      <aside className="w-full md:w-1/4">
        <FilterPanel
          filters={filterOptions}
          onFilterChange={handleFilterChange}
          skillCategories={['Art', 'Carpentry', 'Teaching', 'Gardening']}
        />
      </aside>

      <main className="flex-1">
        <SearchBar onSearch={handleSearch} />

        {isLoading && <p className="text-center text-gray-600 mt-8">Loading listings...</p>}
        {error && <p className="text-center text-red-500 mt-8">{error}</p>}

        {!isLoading && !error && listings.length === 0 && (
          <p className="text-center text-gray-600 mt-8">
            {uploaderId
              ? `No listings found for this user matching your criteria.`
              : `No listings found matching your criteria.`
            }
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {!isLoading && !error && listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          className="mt-8 flex justify-center"
        />
      </main>
    </div>
  );
}