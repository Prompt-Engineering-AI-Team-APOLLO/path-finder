export interface MockHotel {
  id: string;
  name: string;
  location: string;
  image: string;
  pricePerNight: number;
  rating: number;
  roomType: string;
  shortDescription: string;
}

export const HOTEL_MOCK_DATA: MockHotel[] = [
  {
    id: 'h-venice-1',
    name: 'Canal Crown Hotel',
    location: 'Venice, Italy',
    image: 'https://picsum.photos/id/1018/900/600',
    pricePerNight: 420,
    rating: 4.8,
    roomType: 'Deluxe Canal Suite',
    shortDescription: 'Private terrace with sunset gondola pickup.',
  },
  {
    id: 'h-rome-1',
    name: 'Palazzo Aurelia',
    location: 'Rome, Italy',
    image: 'https://picsum.photos/id/1025/900/600',
    pricePerNight: 365,
    rating: 4.7,
    roomType: 'Heritage King Room',
    shortDescription: 'Boutique stay steps from historic landmarks.',
  },
  {
    id: 'h-florence-1',
    name: 'Arno Skyline Residence',
    location: 'Florence, Italy',
    image: 'https://picsum.photos/id/1035/900/600',
    pricePerNight: 310,
    rating: 4.6,
    roomType: 'River View Studio',
    shortDescription: 'Rooftop breakfast lounge overlooking the river.',
  },
  {
    id: 'h-paris-1',
    name: 'Maison Lumiere',
    location: 'Paris, France',
    image: 'https://picsum.photos/id/1043/900/600',
    pricePerNight: 455,
    rating: 4.9,
    roomType: 'Premier Balcony Suite',
    shortDescription: 'Elegant suites near cafes and galleries.',
  },
  {
    id: 'h-tokyo-1',
    name: 'Shibuya Meridian',
    location: 'Tokyo, Japan',
    image: 'https://picsum.photos/id/1050/900/600',
    pricePerNight: 285,
    rating: 4.5,
    roomType: 'Executive City Room',
    shortDescription: 'High-rise comfort with skyline views.',
  },
  {
    id: 'h-bali-1',
    name: 'Ubud Grove Retreat',
    location: 'Ubud, Bali',
    image: 'https://picsum.photos/id/1067/900/600',
    pricePerNight: 250,
    rating: 4.7,
    roomType: 'Pool Villa',
    shortDescription: 'Private plunge pool with rainforest ambiance.',
  },
  {
    id: 'h-nyc-1',
    name: 'Hudson Nocturne Hotel',
    location: 'New York, USA',
    image: 'https://picsum.photos/id/1076/900/600',
    pricePerNight: 510,
    rating: 4.6,
    roomType: 'Skyline Corner Suite',
    shortDescription: 'Modern luxury close to Broadway and parks.',
  },
  {
    id: 'h-santorini-1',
    name: 'Caldera Pearl Suites',
    location: 'Santorini, Greece',
    image: 'https://picsum.photos/id/1084/900/600',
    pricePerNight: 540,
    rating: 4.9,
    roomType: 'Infinity Sea View Suite',
    shortDescription: 'Cliffside suites with panoramic sunset decks.',
  },
];

export const HOTEL_SUGGESTIONS = HOTEL_MOCK_DATA.slice(0, 3);

// Dedicated image for the Home "Hotels" category card (kept unique from hotel listing photos)
export const HOTELS_CATEGORY_IMAGE = 'https://picsum.photos/id/1080/900/600';
