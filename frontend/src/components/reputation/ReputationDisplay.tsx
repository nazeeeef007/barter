// src/components/reputation/ReputationDisplay.tsx
import React from 'react';
import { StarIcon } from '@heroicons/react/24/solid'; // Example: using Heroicons, you'd install this library
// Or use a custom SVG star icon if you don't want to add another library

interface ReputationDisplayProps {
  rating: number; // e.g., 4.5
  numReviews?: number; // Optional: e.g., 12 reviews
}

export function ReputationDisplay({ rating, numReviews }: ReputationDisplayProps) {
  // Round to nearest half-star for display
  const displayRating = Math.round(rating * 2) / 2;
  const fullStars = Math.floor(displayRating);
  const hasHalfStar = displayRating % 1 !== 0;

  return (
    <div className="flex items-center space-x-1 text-yellow-500">
      {Array.from({ length: fullStars }).map((_, i) => (
        <StarIcon key={`full-${i}`} className="h-5 w-5" />
      ))}
      {hasHalfStar && (
        // You might need a half-star icon if available in your icon set,
        // or style a full star to look like half (more complex)
        <StarIcon key="half" className="h-5 w-5 text-yellow-500/50" /> // Using a semi-transparent full star as a simple half-star
      )}
      {Array.from({ length: 5 - fullStars - (hasHalfStar ? 1 : 0) }).map((_, i) => (
        <StarIcon key={`empty-${i}`} className="h-5 w-5 text-gray-300" />
      ))}
      <span className="ml-1 text-gray-700 text-sm font-medium">
        {rating.toFixed(1)} {numReviews ? `(${numReviews} reviews)` : ''}
      </span>
      {/* You can also add badges here if applicable */}
      {/* <Badge variant="outline" className="ml-2 text-sm">Top Barterer</Badge> */}
    </div>
  );
}