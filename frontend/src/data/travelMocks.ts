export interface MockFlightMedia {
  id: string;
  airline: string;
  flightNumber: string;
  originCode: string;
  originCity: string;
  destinationCode: string;
  destinationCity: string;
  pricePerPerson: number;
  currency: string;
  image: string;
}

export interface MockActivityMedia {
  id: string;
  title: string;
  city: string;
  duration: string;
  priceFrom: number;
  currency: string;
  shortDescription: string;
  image: string;
}

export interface MockRestaurantMedia {
  id: string;
  name: string;
  city: string;
  cuisine: string;
  averageCostPerPerson: number;
  priceTier: '$' | '$$' | '$$$' | '$$$$';
  image: string;
  shortDescription: string;
}

export interface MockCarRental {
  id: string;
  name: string;
  location: string;
  category: string;
  transmission: 'Automatic' | 'Manual';
  seats: number;
  pricePerDay: number;
  currency: string;
  image: string;
  shortDescription: string;
}

export interface MockEditorPickActivity {
  id: string;
  name: string;
  time: string;
  location: string;
  price: number;
  currency: string;
  image: string;
  description: string;
}

export interface MockEditorPick {
  id: string;
  title: string;
  city: string;
  label: string;
  description: string;
  image: string;
  activities: MockEditorPickActivity[];
}

export const FLIGHT_MOCK_MEDIA: MockFlightMedia[] = [
  {
    id: 'f-jfk-fco',
    airline: 'Sky Atlantic',
    flightNumber: 'SA 214',
    originCode: 'JFK',
    originCity: 'New York',
    destinationCode: 'FCO',
    destinationCity: 'Rome',
    pricePerPerson: 689,
    currency: 'USD',
    image: 'https://picsum.photos/id/188/900/600',
  },
  {
    id: 'f-lax-nrt',
    airline: 'Pacific Horizon',
    flightNumber: 'PH 778',
    originCode: 'LAX',
    originCity: 'Los Angeles',
    destinationCode: 'NRT',
    destinationCity: 'Tokyo',
    pricePerPerson: 842,
    currency: 'USD',
    image: 'https://picsum.photos/id/251/900/600',
  },
  {
    id: 'f-mia-cdg',
    airline: 'Lumiere Air',
    flightNumber: 'LA 119',
    originCode: 'MIA',
    originCity: 'Miami',
    destinationCode: 'CDG',
    destinationCity: 'Paris',
    pricePerPerson: 725,
    currency: 'USD',
    image: 'https://picsum.photos/id/237/900/600',
  },
];

export const ACTIVITY_MOCK_MEDIA: MockActivityMedia[] = [
  {
    id: 'a-rome-private-tour',
    title: 'Private Historic City Tour',
    city: 'Rome, Italy',
    duration: '4h',
    priceFrom: 185,
    currency: 'USD',
    shortDescription: 'A private guide through ancient landmarks and hidden alleys.',
    image: 'https://picsum.photos/seed/pathfinder-activities-card-1/900/600',
  },
  {
    id: 'a-amalfi-cruise',
    title: 'Coastal Sunset Cruise',
    city: 'Amalfi Coast, Italy',
    duration: '3h 30m',
    priceFrom: 240,
    currency: 'USD',
    shortDescription: 'Small-group yacht cruise with sunset aperitivo and sea views.',
    image: 'https://picsum.photos/seed/pathfinder-activities-card-2/900/600',
  },
  {
    id: 'a-florence-cooking',
    title: 'Tuscan Cooking Class',
    city: 'Florence, Italy',
    duration: '2h 45m',
    priceFrom: 129,
    currency: 'USD',
    shortDescription: 'Hands-on class with local chefs, pasta making, and wine pairing.',
    image: 'https://picsum.photos/seed/pathfinder-activities-card-3/900/600',
  },
];

export const RESTAURANT_MOCK_DATA: MockRestaurantMedia[] = [
  {
    id: 'r-florence-osteria',
    name: 'Osteria di Luna',
    city: 'Florence, Italy',
    cuisine: 'Tuscan Fine Dining',
    averageCostPerPerson: 120,
    priceTier: '$$$',
    image: 'https://picsum.photos/id/292/900/600',
    shortDescription: 'Seasonal tasting menu with handmade pasta and local wines.',
  },
  {
    id: 'r-rome-terrazza',
    name: 'Terrazza Roma',
    city: 'Rome, Italy',
    cuisine: 'Modern Roman',
    averageCostPerPerson: 95,
    priceTier: '$$$',
    image: 'https://picsum.photos/id/312/900/600',
    shortDescription: 'Rooftop dining with skyline views and signature seafood plates.',
  },
  {
    id: 'r-paris-brasserie',
    name: 'Brasserie Etoile',
    city: 'Paris, France',
    cuisine: 'French Contemporary',
    averageCostPerPerson: 140,
    priceTier: '$$$$',
    image: 'https://picsum.photos/id/431/900/600',
    shortDescription: 'Chef-led tasting flights and champagne pairings nightly.',
  },
  {
    id: 'r-tokyo-kappo',
    name: 'Kappo Sora',
    city: 'Tokyo, Japan',
    cuisine: 'Seasonal Japanese',
    averageCostPerPerson: 110,
    priceTier: '$$$',
    image: 'https://picsum.photos/id/488/900/600',
    shortDescription: 'Counter seating with omakase-inspired small courses.',
  },
];

export const CAR_RENTAL_MOCK_DATA: MockCarRental[] = [
  {
    id: 'c-paris-eq',
    name: 'Aurora EQ Sedan',
    location: 'Paris, France',
    category: 'Luxury Electric Sedan',
    transmission: 'Automatic',
    seats: 5,
    pricePerDay: 165,
    currency: 'USD',
    image: 'https://picsum.photos/seed/pathfinder-cars-1/900/600',
    shortDescription: 'Silent electric performance with premium interior finish.',
  },
  {
    id: 'c-nice-cabrio',
    name: 'Cote Azure Cabrio',
    location: 'Nice, France',
    category: 'Convertible',
    transmission: 'Automatic',
    seats: 4,
    pricePerDay: 210,
    currency: 'USD',
    image: 'https://picsum.photos/seed/pathfinder-cars-2/900/600',
    shortDescription: 'Open-top coastal driving with sport handling package.',
  },
  {
    id: 'c-lyon-suv',
    name: 'Rhone Grand SUV',
    location: 'Lyon, France',
    category: 'Premium SUV',
    transmission: 'Automatic',
    seats: 7,
    pricePerDay: 189,
    currency: 'USD',
    image: 'https://picsum.photos/seed/pathfinder-cars-3/900/600',
    shortDescription: 'Spacious family cabin with panoramic sunroof and nav.',
  },
  {
    id: 'c-bordeaux-classic',
    name: 'Bordeaux Classic GT',
    location: 'Bordeaux, France',
    category: 'Grand Tourer',
    transmission: 'Manual',
    seats: 2,
    pricePerDay: 245,
    currency: 'USD',
    image: 'https://picsum.photos/seed/pathfinder-cars-4/900/600',
    shortDescription: 'Iconic touring coupe for scenic vineyard routes.',
  },
];

export const EDITOR_PICK_MOCK_DATA: MockEditorPick[] = [
  {
    id: 'ep-florence-midnight',
    title: 'Midnight in Florence',
    city: 'Florence, Italy',
    label: "Editor's Pick",
    description: 'A curated late-evening route through art, food, and hidden streets.',
    image: 'https://picsum.photos/seed/pathfinder-editorpick-florence/1200/700',
    activities: [
      {
        id: 'epf-1',
        name: 'Oltrarno Moonlight Walk',
        time: '8:30 PM',
        location: 'Oltrarno District',
        price: 35,
        currency: 'USD',
        image: 'https://picsum.photos/seed/pathfinder-editorpick-florence-1/900/600',
        description: 'Guided walk through artisan streets and hidden piazzas.',
      },
      {
        id: 'epf-2',
        name: 'Palazzo Candlelit Dinner',
        time: '9:45 PM',
        location: 'Historic Palazzo, Centro',
        price: 140,
        currency: 'USD',
        image: 'https://picsum.photos/seed/pathfinder-editorpick-florence-2/900/600',
        description: 'Five-course Tuscan menu in a restored 16th-century hall.',
      },
      {
        id: 'epf-3',
        name: 'Rooftop Negroni Session',
        time: '11:20 PM',
        location: 'Arno Skyline Terrace',
        price: 28,
        currency: 'USD',
        image: 'https://picsum.photos/seed/pathfinder-editorpick-florence-3/900/600',
        description: 'Signature cocktails with panoramic nighttime city views.',
      },
    ],
  },
  {
    id: 'ep-kyoto-dusk',
    title: 'Dusk in Kyoto',
    city: 'Kyoto, Japan',
    label: "Editor's Pick",
    description: 'An evening flow of tea houses, lantern alleys, and modern kaiseki.',
    image: 'https://picsum.photos/seed/pathfinder-editorpick-kyoto/1200/700',
    activities: [
      {
        id: 'epk-1',
        name: 'Gion Lantern Stroll',
        time: '6:40 PM',
        location: 'Gion District',
        price: 30,
        currency: 'USD',
        image: 'https://picsum.photos/seed/pathfinder-editorpick-kyoto-1/900/600',
        description: 'Small-group cultural walk through historic entertainment streets.',
      },
      {
        id: 'epk-2',
        name: 'Kaiseki Counter Experience',
        time: '8:00 PM',
        location: 'Higashiyama',
        price: 175,
        currency: 'USD',
        image: 'https://picsum.photos/seed/pathfinder-editorpick-kyoto-2/900/600',
        description: 'Seasonal chef tasting menu with pairing options.',
      },
    ],
  },
];

export const FLIGHTS_CATEGORY_IMAGE = FLIGHT_MOCK_MEDIA[0].image;
export const ACTIVITIES_FEATURE_IMAGE = ACTIVITY_MOCK_MEDIA[0].image;
export const RESTAURANTS_CATEGORY_IMAGE = RESTAURANT_MOCK_DATA[0].image;
export const CAR_RENTALS_CATEGORY_IMAGE = CAR_RENTAL_MOCK_DATA[0].image;
export const EDITOR_PICK_FEATURED = EDITOR_PICK_MOCK_DATA[0];
