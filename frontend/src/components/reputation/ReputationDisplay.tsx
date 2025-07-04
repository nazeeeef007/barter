import { StarIcon } from '@heroicons/react/24/solid';

interface ReputationDisplayProps {
  rating: number;
  numReviews?: number;
  className?: string;  // <-- add this line
}

export function ReputationDisplay({ rating, numReviews, className }: ReputationDisplayProps) {
  const displayRating = Math.round(rating * 2) / 2;
  const fullStars = Math.floor(displayRating);
  const hasHalfStar = displayRating % 1 !== 0;

  return (
    <div className={`flex items-center space-x-1 text-yellow-500 ${className ?? ''}`}>
      {Array.from({ length: fullStars }).map((_, i) => (
        <StarIcon key={`full-${i}`} className="h-5 w-5" />
      ))}
      {hasHalfStar && (
        <StarIcon key="half" className="h-5 w-5 text-yellow-500/50" />
      )}
      {Array.from({ length: 5 - fullStars - (hasHalfStar ? 1 : 0) }).map((_, i) => (
        <StarIcon key={`empty-${i}`} className="h-5 w-5 text-gray-300" />
      ))}
      <span className="ml-1 text-gray-700 text-sm font-medium">
        {rating.toFixed(1)} {numReviews ? `(${numReviews} reviews)` : ''}
      </span>
    </div>
  );
}
