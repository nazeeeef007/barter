// src/components/listings/ListingCard.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import type { BarterPost } from '@/types/BarterPost';
import { formatDistanceToNow, parseISO, format } from 'date-fns'; // Import 'format' from date-fns
import { PencilLine } from 'lucide-react'; // Import the edit icon

interface ListingCardProps {
    listing: BarterPost;
}

export function ListingCard({ listing }: ListingCardProps) {
    const { user } = useAuth();
    const navigate = useNavigate();

    const displayName = listing.displayName ?? 'Anonymous';
    const avatarSeed = encodeURIComponent(displayName);

    const postImageUrl = listing.imageUrl && listing.imageUrl !== 'null'
        ? listing.imageUrl
        : `https://via.placeholder.com/400x200?text=${encodeURIComponent(listing.title)}`;

    const timeAgo = listing.createdAt ? formatDistanceToNow(parseISO(listing.createdAt), { addSuffix: true }) : 'N/A';

    const isOwner = user && user.uid === listing.userFirebaseUid;

    const handleEditClick = (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation(); // Crucial: Prevents the outer Link from being triggered
        navigate(`/edit-post/${listing.id}`);
    };

    return (
        <Link to={`/profile/${listing.userFirebaseUid}`} className="block h-full group">
            <Card className="h-full flex flex-col border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden
                             hover:shadow-xl transition-shadow duration-300 ease-in-out">

                {/* Image Display at the top of the card */}
                {postImageUrl && (
                    <div className="relative w-full h-48 overflow-hidden">
                        <img
                            src={postImageUrl}
                            alt={listing.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                        {/* Edit button on top of the image for owners */}
                        {isOwner && (
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={handleEditClick}
                                className="absolute top-2 right-2 rounded-full p-2 bg-white/80 hover:bg-white text-gray-700 hover:text-gray-900 shadow-md"
                                title="Edit Listing"
                            >
                                <PencilLine className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                )}

                <CardHeader className="p-4 pb-3 flex-grow">
                    <div className="flex items-center gap-3 mb-2">
                        <Avatar className="h-9 w-9">
                            {listing.profileImageUrl ? (
                                <AvatarImage src={listing.profileImageUrl} alt={displayName} />
                            ) : (
                                <AvatarImage
                                    src={`https://api.dicebear.com/7.x/initials/svg?seed=${avatarSeed}`}
                                    alt={displayName}
                                />
                            )}
                            {!listing.profileImageUrl && !displayName && <AvatarFallback>?</AvatarFallback>}
                            {!listing.profileImageUrl && displayName && <AvatarFallback>{displayName.charAt(0)}</AvatarFallback>}
                        </Avatar>
                        <div className="flex-1">
                            <p className="text-sm font-semibold leading-none text-gray-900 dark:text-gray-100">{displayName}</p>
                            <p className="text-xs text-muted-foreground">{listing.location}</p>
                        </div>
                    </div>
                    <CardTitle className="text-lg font-bold line-clamp-2 text-gray-900 dark:text-gray-100 mt-2">{listing.title}</CardTitle>
                    <CardDescription className="text-sm text-muted-foreground mt-1">
                        {listing.type === 'offer' ? 'Offering' : 'Requesting'}
                    </CardDescription>
                </CardHeader>

                <CardContent className="flex-1 p-4 pt-0">
                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3 mb-3">{listing.description}</p>

                    {listing.preferredExchange && (
                        <div className="mb-3">
                            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Preferred Exchange:</p>
                            <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">{listing.preferredExchange}</p>
                        </div>
                    )}

                    {listing.tags && listing.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {listing.tags.map((tag, index) => (
                                <Badge key={index} variant="secondary" className="px-2 py-0.5 text-xs rounded-full">{tag}</Badge>
                            ))}
                        </div>
                    )}

                    {listing.availability && listing.availability.length > 0 && (
                        <div className="mt-2">
                            <p className="text-xs font-semibold text-gray-600">Availability:</p>
                            {listing.availability.map((range, index) => (
                                <span key={index} className="text-xs text-gray-700">
                                    {/* Use parseISO and format for reliable date parsing and display */}
                                    {format(parseISO(range.start), 'MMM dd, yyyy')} - {format(parseISO(range.end), 'MMM dd, yyyy')}
                                    {index < listing.availability.length - 1 ? ', ' : ''}
                                </span>
                            ))}
                        </div>
                    )}
                </CardContent>

                <CardFooter className="flex justify-between items-center p-4 pt-0 text-xs">
                    <span className="text-gray-600 dark:text-gray-400 font-medium">Status: {listing.status}</span>
                    <span className="text-muted-foreground">{timeAgo}</span>
                </CardFooter>
            </Card>
        </Link>
    );
}