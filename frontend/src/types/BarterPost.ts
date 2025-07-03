
export interface AvailabilityRange {
  start: string; // ISO date/time string
  end: string;   // ISO date/time string
}

export interface BarterPost {
  id: string;
  userFirebaseUid: string;
  title: string;
  description: string;
  type: string;
  tags: string[];
  preferredExchange: string;
  imageUrl: string;
  location: string;
  availability: AvailabilityRange[];
  status: string;
  createdAt: string;  // ISO string date/time
  displayName: string;
  profileImageUrl: string;
}