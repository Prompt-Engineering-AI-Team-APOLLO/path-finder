import { useEffect, useMemo, useState } from 'react';
import {
  TopNav,
  PageLayout,
  CompanionPanel,
  TravelStyleCard,
  SectionHeader,
  FlightCard,
  EmptyState,
  TripSummaryItem,
  TotalCostBar,
  Badge,
} from '../components/ui';
import type { Message } from '../components/ui';

const PlaneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
  </svg>
);
const BedIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M2 4v16M2 8h18a2 2 0 012 2v8H2M2 12h20"/>
  </svg>
);
const CarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
);
const CompassIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
  </svg>
);
const SearchIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const SmallPlaneIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
  </svg>
);
const SmallBedIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M2 4v16M2 8h18a2 2 0 012 2v8H2M2 12h20"/>
  </svg>
);

const STORAGE_KEY = 'pathfinder_plan_context_v1';
const TRIP_NIGHTS = 4;
const CAR_DAYS = 4;

type PlannerStep = 'route' | 'flight' | 'hotel' | 'car' | 'activity' | 'done';

interface FlightOption {
  id: string;
  airline: string;
  flightNumber: string;
  cabinClass: string;
  departureTime: string;
  departureCode: string;
  departureCity: string;
  departureCountry: string;
  arrivalTime: string;
  arrivalCode: string;
  arrivalCity: string;
  arrivalCountry: string;
  duration: string;
  price: number;
}

interface HotelOption {
  id: string;
  name: string;
  area: string;
  city: string;
  country: string;
  roomType: string;
  pricePerNight: number;
}

interface CarOption {
  id: string;
  name: string;
  type: string;
  city: string;
  country: string;
  transmission: string;
  pricePerDay: number;
}

interface ActivityOption {
  id: string;
  name: string;
  details: string;
  city: string;
  country: string;
  price: number;
}

interface PlannerContext {
  selectedStyle: string;
  outboundCountry: string | null;
  inboundCountry: string | null;
  selectedFlightId: string | null;
  selectedHotelId: string | null;
  selectedCarId: string | null;
  selectedActivityIds: string[];
  step: PlannerStep;
}

const FLIGHT_OPTIONS: FlightOption[] = [
  { id: 'f1', airline: 'British Airways', flightNumber: 'BA 117', cabinClass: 'Economy', departureTime: '08:10', departureCode: 'LHR', departureCity: 'London', departureCountry: 'United Kingdom', arrivalTime: '11:05', arrivalCode: 'JFK', arrivalCity: 'New York', arrivalCountry: 'United States', duration: '7h 55m', price: 720 },
  { id: 'f2', airline: 'Virgin Atlantic', flightNumber: 'VS 003', cabinClass: 'Business', departureTime: '11:00', departureCode: 'LHR', departureCity: 'London', departureCountry: 'United Kingdom', arrivalTime: '13:50', arrivalCode: 'JFK', arrivalCity: 'New York', arrivalCountry: 'United States', duration: '7h 50m', price: 1890 },
  { id: 'f3', airline: 'Delta Air Lines', flightNumber: 'DL 007', cabinClass: 'Premium Economy', departureTime: '14:25', departureCode: 'LHR', departureCity: 'London', departureCountry: 'United Kingdom', arrivalTime: '17:15', arrivalCode: 'JFK', arrivalCity: 'New York', arrivalCountry: 'United States', duration: '7h 50m', price: 1140 },
  { id: 'f4', airline: 'Air France', flightNumber: 'AF 0084', cabinClass: 'Economy', departureTime: '09:45', departureCode: 'CDG', departureCity: 'Paris', departureCountry: 'France', arrivalTime: '12:05', arrivalCode: 'SFO', arrivalCity: 'San Francisco', arrivalCountry: 'United States', duration: '11h 20m', price: 880 },
  { id: 'f5', airline: 'Lufthansa', flightNumber: 'LH 454', cabinClass: 'Business', departureTime: '10:20', departureCode: 'FRA', departureCity: 'Frankfurt', departureCountry: 'Germany', arrivalTime: '14:05', arrivalCode: 'SFO', arrivalCity: 'San Francisco', arrivalCountry: 'United States', duration: '11h 45m', price: 2260 },
  { id: 'f6', airline: 'KLM', flightNumber: 'KL 601', cabinClass: 'Economy', departureTime: '13:10', departureCode: 'AMS', departureCity: 'Amsterdam', departureCountry: 'Netherlands', arrivalTime: '14:45', arrivalCode: 'LAX', arrivalCity: 'Los Angeles', arrivalCountry: 'United States', duration: '11h 35m', price: 845 },
  { id: 'f7', airline: 'Qatar Airways', flightNumber: 'QR 739', cabinClass: 'Economy', departureTime: '07:50', departureCode: 'DOH', departureCity: 'Doha', departureCountry: 'Qatar', arrivalTime: '15:10', arrivalCode: 'JNB', arrivalCity: 'Johannesburg', arrivalCountry: 'South Africa', duration: '8h 20m', price: 670 },
  { id: 'f8', airline: 'Emirates', flightNumber: 'EK 761', cabinClass: 'Business', departureTime: '09:05', departureCode: 'DXB', departureCity: 'Dubai', departureCountry: 'United Arab Emirates', arrivalTime: '14:50', arrivalCode: 'JNB', arrivalCity: 'Johannesburg', arrivalCountry: 'South Africa', duration: '8h 45m', price: 1710 },
  { id: 'f9', airline: 'Singapore Airlines', flightNumber: 'SQ 322', cabinClass: 'Economy', departureTime: '10:15', departureCode: 'SIN', departureCity: 'Singapore', departureCountry: 'Singapore', arrivalTime: '18:20', arrivalCode: 'LHR', arrivalCity: 'London', arrivalCountry: 'United Kingdom', duration: '13h 05m', price: 940 },
  { id: 'f10', airline: 'ANA', flightNumber: 'NH 211', cabinClass: 'Business', departureTime: '11:35', departureCode: 'HND', departureCity: 'Tokyo', departureCountry: 'Japan', arrivalTime: '18:00', arrivalCode: 'LHR', arrivalCity: 'London', arrivalCountry: 'United Kingdom', duration: '14h 25m', price: 2380 },
  { id: 'f11', airline: 'Cathay Pacific', flightNumber: 'CX 255', cabinClass: 'Premium Economy', departureTime: '08:30', departureCode: 'HKG', departureCity: 'Hong Kong', departureCountry: 'China (Hong Kong)', arrivalTime: '17:10', arrivalCode: 'LHR', arrivalCity: 'London', arrivalCountry: 'United Kingdom', duration: '13h 40m', price: 1320 },
  { id: 'f12', airline: 'Qantas', flightNumber: 'QF 001', cabinClass: 'Economy', departureTime: '15:00', departureCode: 'SYD', departureCity: 'Sydney', departureCountry: 'Australia', arrivalTime: '06:10', arrivalCode: 'SIN', arrivalCity: 'Singapore', arrivalCountry: 'Singapore', duration: '8h 10m', price: 590 },
  { id: 'f13', airline: 'Singapore Airlines', flightNumber: 'SQ 221', cabinClass: 'Business', departureTime: '08:55', departureCode: 'SIN', departureCity: 'Singapore', departureCountry: 'Singapore', arrivalTime: '15:15', arrivalCode: 'SYD', arrivalCity: 'Sydney', arrivalCountry: 'Australia', duration: '7h 20m', price: 1610 },
  { id: 'f14', airline: 'Iberia', flightNumber: 'IB 6849', cabinClass: 'Economy', departureTime: '10:10', departureCode: 'MAD', departureCity: 'Madrid', departureCountry: 'Spain', arrivalTime: '13:20', arrivalCode: 'MEX', arrivalCity: 'Mexico City', arrivalCountry: 'Mexico', duration: '12h 10m', price: 810 },
  { id: 'f15', airline: 'Aeromexico', flightNumber: 'AM 002', cabinClass: 'Business', departureTime: '16:40', departureCode: 'MEX', departureCity: 'Mexico City', departureCountry: 'Mexico', arrivalTime: '10:15', arrivalCode: 'MAD', arrivalCity: 'Madrid', arrivalCountry: 'Spain', duration: '10h 35m', price: 1930 },
  { id: 'f16', airline: 'Turkish Airlines', flightNumber: 'TK 079', cabinClass: 'Economy', departureTime: '07:25', departureCode: 'IST', departureCity: 'Istanbul', departureCountry: 'Turkey', arrivalTime: '17:20', arrivalCode: 'SFO', arrivalCity: 'San Francisco', arrivalCountry: 'United States', duration: '12h 55m', price: 860 },
  { id: 'f17', airline: 'Etihad Airways', flightNumber: 'EY 021', cabinClass: 'Business', departureTime: '10:35', departureCode: 'AUH', departureCity: 'Abu Dhabi', departureCountry: 'United Arab Emirates', arrivalTime: '17:55', arrivalCode: 'JFK', arrivalCity: 'New York', arrivalCountry: 'United States', duration: '14h 20m', price: 2110 },
  { id: 'f18', airline: 'LATAM', flightNumber: 'LA 800', cabinClass: 'Economy', departureTime: '09:00', departureCode: 'SCL', departureCity: 'Santiago', departureCountry: 'Chile', arrivalTime: '13:35', arrivalCode: 'AKL', arrivalCity: 'Auckland', arrivalCountry: 'New Zealand', duration: '11h 35m', price: 770 },
  { id: 'f19', airline: 'Air New Zealand', flightNumber: 'NZ 040', cabinClass: 'Premium Economy', departureTime: '16:20', departureCode: 'AKL', departureCity: 'Auckland', departureCountry: 'New Zealand', arrivalTime: '11:45', arrivalCode: 'SCL', arrivalCity: 'Santiago', arrivalCountry: 'Chile', duration: '11h 25m', price: 1240 },
  { id: 'f20', airline: 'South African Airways', flightNumber: 'SA 286', cabinClass: 'Economy', departureTime: '12:45', departureCode: 'JNB', departureCity: 'Johannesburg', departureCountry: 'South Africa', arrivalTime: '22:20', arrivalCode: 'HKG', arrivalCity: 'Hong Kong', arrivalCountry: 'China (Hong Kong)', duration: '11h 35m', price: 820 },
  { id: 'f21', airline: 'Korean Air', flightNumber: 'KE 901', cabinClass: 'Business', departureTime: '08:05', departureCode: 'ICN', departureCity: 'Seoul', departureCountry: 'South Korea', arrivalTime: '06:10', arrivalCode: 'CDG', arrivalCity: 'Paris', arrivalCountry: 'France', duration: '13h 05m', price: 2020 },
  { id: 'f22', airline: 'Thai Airways', flightNumber: 'TG 910', cabinClass: 'Economy', departureTime: '09:40', departureCode: 'BKK', departureCity: 'Bangkok', departureCountry: 'Thailand', arrivalTime: '17:35', arrivalCode: 'LHR', arrivalCity: 'London', arrivalCountry: 'United Kingdom', duration: '12h 55m', price: 860 },
  { id: 'f23', airline: 'Japan Airlines', flightNumber: 'JL 043', cabinClass: 'Economy', departureTime: '12:15', departureCode: 'HND', departureCity: 'Tokyo', departureCountry: 'Japan', arrivalTime: '11:45', arrivalCode: 'CDG', arrivalCity: 'Paris', arrivalCountry: 'France', duration: '14h 30m', price: 930 },
  { id: 'f24', airline: 'United Airlines', flightNumber: 'UA 870', cabinClass: 'Business', departureTime: '17:30', departureCode: 'SFO', departureCity: 'San Francisco', departureCountry: 'United States', arrivalTime: '20:35', arrivalCode: 'SYD', arrivalCity: 'Sydney', arrivalCountry: 'Australia', duration: '15h 05m', price: 2460 },
];

const HOTEL_OPTIONS: HotelOption[] = [
  { id: 'h1', name: 'Shinjuku Skylight Hotel', area: 'Shinjuku', city: 'Tokyo', country: 'Japan', roomType: 'City View King', pricePerNight: 340 },
  { id: 'h2', name: 'Manhattan Park Lane', area: 'Midtown', city: 'New York', country: 'United States', roomType: 'Deluxe Queen', pricePerNight: 410 },
  { id: 'h3', name: 'Le Marais Belle Maison', area: 'Le Marais', city: 'Paris', country: 'France', roomType: 'Boutique Suite', pricePerNight: 360 },
  { id: 'h4', name: 'Marina Bay Crest', area: 'Marina Bay', city: 'Singapore', country: 'Singapore', roomType: 'Harbor View', pricePerNight: 380 },
  { id: 'h5', name: 'Soho Central Loft', area: 'Soho', city: 'London', country: 'United Kingdom', roomType: 'Modern King', pricePerNight: 335 },
  { id: 'h6', name: 'Opera District Grand', area: '9th Arr.', city: 'Paris', country: 'France', roomType: 'Executive Twin', pricePerNight: 305 },
  { id: 'h7', name: 'Harbourfront Skyline', area: 'Central', city: 'Hong Kong', country: 'China (Hong Kong)', roomType: 'Skyline Suite', pricePerNight: 395 },
  { id: 'h8', name: 'Santa Monica Breeze', area: 'Santa Monica', city: 'Los Angeles', country: 'United States', roomType: 'Ocean Double', pricePerNight: 320 },
  { id: 'h9', name: 'Ginza Prestige Suites', area: 'Ginza', city: 'Tokyo', country: 'Japan', roomType: 'Executive Suite', pricePerNight: 420 },
  { id: 'h10', name: 'Dubai Creek Royale', area: 'Deira', city: 'Dubai', country: 'United Arab Emirates', roomType: 'Premium King', pricePerNight: 290 },
  { id: 'h11', name: 'Sants Design House', area: 'Sants', city: 'Barcelona', country: 'Spain', roomType: 'Studio Twin', pricePerNight: 240 },
  { id: 'h12', name: 'Trastevere Garden Inn', area: 'Trastevere', city: 'Rome', country: 'Italy', roomType: 'Garden Suite', pricePerNight: 265 },
  { id: 'h13', name: 'Myeongdong Urban Stay', area: 'Myeongdong', city: 'Seoul', country: 'South Korea', roomType: 'Business King', pricePerNight: 230 },
  { id: 'h14', name: 'Asakusa Heritage Inn', area: 'Asakusa', city: 'Tokyo', country: 'Japan', roomType: 'Deluxe Twin', pricePerNight: 260 },
  { id: 'h15', name: 'Bondi Shore Retreat', area: 'Bondi', city: 'Sydney', country: 'Australia', roomType: 'Balcony Room', pricePerNight: 310 },
  { id: 'h16', name: 'Canal Ring Boutique', area: 'Canal Ring', city: 'Amsterdam', country: 'Netherlands', roomType: 'Canal View', pricePerNight: 295 },
  { id: 'h17', name: 'Namba Neon Hotel', area: 'Namba', city: 'Osaka', country: 'Japan', roomType: 'Compact Queen', pricePerNight: 205 },
  { id: 'h18', name: 'Recoleta Heritage House', area: 'Recoleta', city: 'Buenos Aires', country: 'Argentina', roomType: 'Classic King', pricePerNight: 215 },
  { id: 'h19', name: 'Copacabana Vista', area: 'Copacabana', city: 'Rio de Janeiro', country: 'Brazil', roomType: 'Sea View King', pricePerNight: 245 },
  { id: 'h20', name: 'Shibuya Nexus Hotel', area: 'Shibuya', city: 'Tokyo', country: 'Japan', roomType: 'Modern King', pricePerNight: 330 },
  { id: 'h21', name: 'Old Quarter Residence', area: 'Old Quarter', city: 'Hanoi', country: 'Vietnam', roomType: 'Premier Double', pricePerNight: 155 },
  { id: 'h22', name: 'V&A Waterfront Suites', area: 'Waterfront', city: 'Cape Town', country: 'South Africa', roomType: 'Bay Suite', pricePerNight: 270 },
  { id: 'h23', name: 'Sultanahmet Courtyard', area: 'Sultanahmet', city: 'Istanbul', country: 'Turkey', roomType: 'Deluxe Room', pricePerNight: 185 },
  { id: 'h24', name: 'Kensington Imperial House', area: 'Kensington', city: 'London', country: 'United Kingdom', roomType: 'Premier Suite', pricePerNight: 430 },
];

const CAR_OPTIONS: CarOption[] = [
  { id: 'c1', name: 'Toyota Alphard', type: 'Premium Van', city: 'Tokyo', country: 'Japan', transmission: 'Automatic', pricePerDay: 145 },
  { id: 'c2', name: 'Lexus ES', type: 'Luxury Sedan', city: 'Dubai', country: 'United Arab Emirates', transmission: 'Automatic', pricePerDay: 165 },
  { id: 'c3', name: 'Nissan Serena', type: 'Family MPV', city: 'Osaka', country: 'Japan', transmission: 'Automatic', pricePerDay: 118 },
  { id: 'c4', name: 'Honda Stepwgn', type: 'Family Van', city: 'Seoul', country: 'South Korea', transmission: 'Automatic', pricePerDay: 112 },
  { id: 'c5', name: 'Mazda CX-5', type: 'SUV', city: 'Auckland', country: 'New Zealand', transmission: 'Automatic', pricePerDay: 126 },
  { id: 'c6', name: 'Subaru Forester', type: 'SUV', city: 'Vancouver', country: 'Canada', transmission: 'Automatic', pricePerDay: 132 },
  { id: 'c7', name: 'Toyota Yaris', type: 'Compact', city: 'Barcelona', country: 'Spain', transmission: 'Automatic', pricePerDay: 74 },
  { id: 'c8', name: 'Honda Fit', type: 'Compact', city: 'Bangkok', country: 'Thailand', transmission: 'Automatic', pricePerDay: 70 },
  { id: 'c9', name: 'Nissan Note', type: 'Compact Hybrid', city: 'Singapore', country: 'Singapore', transmission: 'Automatic', pricePerDay: 78 },
  { id: 'c10', name: 'Toyota Prius', type: 'Hybrid Sedan', city: 'San Francisco', country: 'United States', transmission: 'Automatic', pricePerDay: 92 },
  { id: 'c11', name: 'Lexus RX', type: 'Luxury SUV', city: 'Los Angeles', country: 'United States', transmission: 'Automatic', pricePerDay: 172 },
  { id: 'c12', name: 'BMW 3 Series', type: 'Executive Sedan', city: 'Munich', country: 'Germany', transmission: 'Automatic', pricePerDay: 154 },
  { id: 'c13', name: 'Mercedes C-Class', type: 'Executive Sedan', city: 'Frankfurt', country: 'Germany', transmission: 'Automatic', pricePerDay: 162 },
  { id: 'c14', name: 'Toyota HiAce', type: 'Group Van', city: 'Cape Town', country: 'South Africa', transmission: 'Automatic', pricePerDay: 149 },
  { id: 'c15', name: 'Mitsubishi Delica', type: 'Adventure Van', city: 'Queenstown', country: 'New Zealand', transmission: 'Automatic', pricePerDay: 138 },
  { id: 'c16', name: 'Suzuki Swift', type: 'Economy', city: 'Rome', country: 'Italy', transmission: 'Automatic', pricePerDay: 66 },
  { id: 'c17', name: 'Daihatsu Rocky', type: 'Compact SUV', city: 'Bali', country: 'Indonesia', transmission: 'Automatic', pricePerDay: 88 },
  { id: 'c18', name: 'Audi A4', type: 'Premium Sedan', city: 'Paris', country: 'France', transmission: 'Automatic', pricePerDay: 168 },
  { id: 'c19', name: 'Tesla Model 3', type: 'Electric Sedan', city: 'Amsterdam', country: 'Netherlands', transmission: 'Automatic', pricePerDay: 176 },
  { id: 'c20', name: 'Nissan Sakura EV', type: 'Electric Mini', city: 'Kyoto', country: 'Japan', transmission: 'Automatic', pricePerDay: 90 },
  { id: 'c21', name: 'Toyota Crown', type: 'Luxury Sedan', city: 'London', country: 'United Kingdom', transmission: 'Automatic', pricePerDay: 171 },
  { id: 'c22', name: 'Mazda 3', type: 'Compact Sedan', city: 'Mexico City', country: 'Mexico', transmission: 'Automatic', pricePerDay: 84 },
  { id: 'c23', name: 'Toyota Land Cruiser', type: 'Full-Size SUV', city: 'Doha', country: 'Qatar', transmission: 'Automatic', pricePerDay: 198 },
  { id: 'c24', name: 'Volvo XC60', type: 'Premium SUV', city: 'Stockholm', country: 'Sweden', transmission: 'Automatic', pricePerDay: 179 },
];

const ACTIVITY_OPTIONS: ActivityOption[] = [
  { id: 'a1', name: 'Mt. Fuji Private Tour', details: 'Full day with private driver', city: 'Tokyo', country: 'Japan', price: 320 },
  { id: 'a2', name: 'Broadway Night Pass', details: 'Top musicals evening bundle', city: 'New York', country: 'United States', price: 180 },
  { id: 'a3', name: 'Louvre After Hours', details: 'Late-entry guided art route', city: 'Paris', country: 'France', price: 95 },
  { id: 'a4', name: 'Dubai Desert Dune Safari', details: 'Sunset camp and dinner', city: 'Dubai', country: 'United Arab Emirates', price: 140 },
  { id: 'a5', name: 'Barcelona Gaudi Walk', details: 'Sagrada + Gothic Quarter', city: 'Barcelona', country: 'Spain', price: 78 },
  { id: 'a6', name: 'Seoul K-Food Night Tour', details: 'Street food tasting trail', city: 'Seoul', country: 'South Korea', price: 88 },
  { id: 'a7', name: 'Sydney Harbour Bridge Climb', details: 'Guided summit climb', city: 'Sydney', country: 'Australia', price: 210 },
  { id: 'a8', name: 'Amsterdam Canal Evening Cruise', details: 'Historic district by boat', city: 'Amsterdam', country: 'Netherlands', price: 52 },
  { id: 'a9', name: 'Rome Colosseum Underground', details: 'Restricted area access', city: 'Rome', country: 'Italy', price: 115 },
  { id: 'a10', name: 'Singapore Hawker Masterclass', details: 'Cook and taste workshop', city: 'Singapore', country: 'Singapore', price: 105 },
  { id: 'a11', name: 'Cape Town Peninsula Drive', details: 'Scenic coastal day trip', city: 'Cape Town', country: 'South Africa', price: 170 },
  { id: 'a12', name: 'Istanbul Bosphorus Twilight Cruise', details: 'Sunset strait journey', city: 'Istanbul', country: 'Turkey', price: 84 },
  { id: 'a13', name: 'Rio Samba Experience', details: 'Dance lesson + live show', city: 'Rio de Janeiro', country: 'Brazil', price: 96 },
  { id: 'a14', name: 'Mexico City Frida & Coyoacan', details: 'Museum and neighborhood walk', city: 'Mexico City', country: 'Mexico', price: 74 },
  { id: 'a15', name: 'Bangkok Temple and Canal Mix', details: 'Longtail boat + temples', city: 'Bangkok', country: 'Thailand', price: 69 },
  { id: 'a16', name: 'Auckland Volcano Trails', details: 'Half-day volcanic hike', city: 'Auckland', country: 'New Zealand', price: 82 },
  { id: 'a17', name: 'London Royal Landmarks Tour', details: 'Westminster to Tower route', city: 'London', country: 'United Kingdom', price: 76 },
  { id: 'a18', name: 'Hong Kong Peak & Markets', details: 'Tram ride and market crawl', city: 'Hong Kong', country: 'China (Hong Kong)', price: 89 },
  { id: 'a19', name: 'Santiago Vineyard Escape', details: 'Andes-side wine tasting', city: 'Santiago', country: 'Chile', price: 132 },
  { id: 'a20', name: 'Hanoi Old Quarter Cyclo Ride', details: 'Street culture immersion', city: 'Hanoi', country: 'Vietnam', price: 43 },
  { id: 'a21', name: 'Doha Museum Triangle', details: 'Museum of Islamic Art route', city: 'Doha', country: 'Qatar', price: 55 },
  { id: 'a22', name: 'San Francisco Alcatraz Combo', details: 'Ferry plus audio island tour', city: 'San Francisco', country: 'United States', price: 98 },
  { id: 'a23', name: 'Munich Beer Hall Heritage', details: 'Historic brewing district walk', city: 'Munich', country: 'Germany', price: 66 },
  { id: 'a24', name: 'Osaka Dotonbori Food Run', details: 'Night bites and neon alleys', city: 'Osaka', country: 'Japan', price: 79 },
];

const PLAN_STEPS = [
  { number: '01', label: 'Search' },
  { number: '02', label: 'Plan' },
  { number: '03', label: 'Confirm' },
];

const COUNTRY_ALIASES: Record<string, string> = {
  us: 'United States',
  usa: 'United States',
  america: 'United States',
  uk: 'United Kingdom',
  uae: 'United Arab Emirates',
};

const formatChoiceList = <T,>(items: T[], toLine: (item: T, index: number) => string, limit = 12): string => {
  const head = items.slice(0, limit).map((item, idx) => toLine(item, idx + 1)).join('\n');
  if (items.length <= limit) return head;
  return `${head}\n...and ${items.length - limit} more options are available in the page list.`;
};

const normalizeLocation = (value: string): string => value.toLowerCase().trim();

const extractLocationFromText = (text: string): string | null => {
  const normalized = text.toLowerCase().trim();
  if (!normalized) return null;

  const alias = COUNTRY_ALIASES[normalized];
  if (alias) return alias;

  const locationTokens = Array.from(new Set(FLIGHT_OPTIONS.flatMap((f) => [
    f.departureCountry,
    f.arrivalCountry,
    f.departureCity,
    f.arrivalCity,
    f.departureCode,
    f.arrivalCode,
  ])));

  const exact = locationTokens.find((token) => token.toLowerCase() === normalized);
  if (exact) return exact;

  const included = locationTokens.find((token) => normalized.includes(token.toLowerCase()));
  if (included) return included;

  const aliasIncluded = Object.entries(COUNTRY_ALIASES).find(([key]) => normalized.includes(key));
  if (aliasIncluded) return aliasIncluded[1];

  return null;
};

const matchesArrivalLocation = (flight: FlightOption, location: string): boolean => {
  const q = normalizeLocation(location);
  return [flight.arrivalCountry, flight.arrivalCity, flight.arrivalCode].some((value) => normalizeLocation(value) === q);
};

const matchesDepartureLocation = (flight: FlightOption, location: string): boolean => {
  const q = normalizeLocation(location);
  return [flight.departureCountry, flight.departureCity, flight.departureCode].some((value) => normalizeLocation(value) === q);
};

function NoHotelSlot() {
  return (
    <div
      style={{
        border: '1.5px dashed var(--color-border-light-strong)',
        borderRadius: 'var(--radius-lg)',
        padding: '14px',
        textAlign: 'center',
        color: 'var(--color-text-dark-muted)',
        fontSize: 'var(--text-xs)',
        fontWeight: 'var(--weight-semibold)',
        letterSpacing: 'var(--tracking-wider)',
        textTransform: 'uppercase',
      }}
    >
      No Hotel Selected
    </div>
  );
}

interface PlanPageProps {
  userEmail?: string;
  onNavigate?: (page: string) => void;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  onClearChat?: () => void;
}

export default function PlanPage({ userEmail, onNavigate, messages, setMessages, onClearChat }: PlanPageProps) {
  const [context, setContext] = useState<PlannerContext>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return {
          selectedStyle: 'Urban Adventure',
          outboundCountry: null,
          inboundCountry: null,
          selectedFlightId: null,
          selectedHotelId: null,
          selectedCarId: null,
          selectedActivityIds: [],
          step: 'route',
        };
      }
      return JSON.parse(raw) as PlannerContext;
    } catch {
      return {
        selectedStyle: 'Urban Adventure',
        outboundCountry: null,
        inboundCountry: null,
        selectedFlightId: null,
        selectedHotelId: null,
        selectedCarId: null,
        selectedActivityIds: [],
        step: 'route',
      };
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(context));
  }, [context]);

  const selectedFlight = useMemo(
    () => FLIGHT_OPTIONS.find((f) => f.id === context.selectedFlightId) ?? null,
    [context.selectedFlightId],
  );
  const selectedHotel = useMemo(
    () => HOTEL_OPTIONS.find((h) => h.id === context.selectedHotelId) ?? null,
    [context.selectedHotelId],
  );
  const selectedCar = useMemo(
    () => CAR_OPTIONS.find((c) => c.id === context.selectedCarId) ?? null,
    [context.selectedCarId],
  );
  const selectedActivities = useMemo(
    () => ACTIVITY_OPTIONS.filter((a) => context.selectedActivityIds.includes(a.id)),
    [context.selectedActivityIds],
  );

  const outboundFlightOptions = useMemo(() => {
    const outbound = context.outboundCountry;
    if (!outbound) return FLIGHT_OPTIONS;
    return FLIGHT_OPTIONS.filter((f) => matchesArrivalLocation(f, outbound));
  }, [context.outboundCountry]);

  const inboundFlightOptions = useMemo(() => {
    const inbound = context.inboundCountry;
    if (!inbound) return FLIGHT_OPTIONS;
    return FLIGHT_OPTIONS.filter((f) => {
      const outboundMatch = context.outboundCountry ? matchesDepartureLocation(f, context.outboundCountry) : true;
      const inboundMatch = matchesArrivalLocation(f, inbound);
      return outboundMatch && inboundMatch;
    });
  }, [context.inboundCountry, context.outboundCountry]);

  const totalCost =
    (selectedFlight?.price ?? 0) +
    (selectedHotel ? selectedHotel.pricePerNight * TRIP_NIGHTS : 0) +
    (selectedCar ? selectedCar.pricePerDay * CAR_DAYS : 0) +
    selectedActivities.reduce((sum, a) => sum + a.price, 0);

  const appendAssistantMessage = (content: string) => {
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msg: Message = {
      id: String(Date.now() + Math.floor(Math.random() * 1000)),
      role: 'assistant',
      content,
      timestamp: ts,
    };
    setMessages((prev) => [...prev, msg]);
  };

  const parseSingleChoice = (text: string, max: number): number | null => {
    const n = Number(text.trim());
    if (!Number.isNaN(n) && n >= 1 && n <= max) return n;
    return null;
  };

  const parseMultiChoice = (text: string, max: number): number[] => {
    const parts = text.split(/[ ,]+/).map((p) => Number(p.trim())).filter((n) => !Number.isNaN(n));
    const uniques = Array.from(new Set(parts)).filter((n) => n >= 1 && n <= max);
    return uniques;
  };

  const askNextQuestion = (nextStep: PlannerStep) => {
    if (nextStep === 'hotel') {
      appendAssistantMessage(
        `Great, flight saved. Next: choose your hotel. Reply with a number.\n\n${formatChoiceList(HOTEL_OPTIONS, (h, i) => `${i}) ${h.name} · ${h.city}, ${h.country} ($${h.pricePerNight}/night)`)}`,
      );
      return;
    }
    if (nextStep === 'car') {
      appendAssistantMessage(
        `Nice hotel choice. Next: pick a car rental (${CAR_DAYS} days). Reply with a number.\n\n${formatChoiceList(CAR_OPTIONS, (c, i) => `${i}) ${c.name} · ${c.city}, ${c.country} ($${c.pricePerDay}/day)`)}`,
      );
      return;
    }
    if (nextStep === 'activity') {
      appendAssistantMessage(
        `Perfect. Pick activities you want. You can choose multiple, like: 1 3 8\n\n${formatChoiceList(ACTIVITY_OPTIONS, (a, i) => `${i}) ${a.name} · ${a.city}, ${a.country} ($${a.price})`)}`,
      );
      return;
    }
    if (nextStep === 'done') {
      appendAssistantMessage('All set. Your trip summary now includes flights, hotel, car rental, activities, and total pricing.');
    }
  };

  const startGuidedFlowForStyle = (style: string) => {
    setContext((prev) => ({
      ...prev,
      selectedStyle: style,
      outboundCountry: null,
      inboundCountry: null,
      selectedFlightId: null,
      selectedHotelId: null,
      selectedCarId: null,
      selectedActivityIds: [],
      step: 'route',
    }));

    appendAssistantMessage(
      `Great choice: ${style}. I will guide you step-by-step and auto-fill your trip summary.\n\nStep 1: where do you want to go? Reply with a location, for example Japan, Tokyo, or HND.`,
    );
  };

  const handleSend = async (text: string) => {
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: Message = { id: String(Date.now()), role: 'user', content: text, timestamp: ts };
    setMessages((prev) => [...prev, userMsg]);

    const normalized = text.toLowerCase().trim();
    if (!normalized) return;

    if (normalized === 'reset' || normalized === 'restart') {
      startGuidedFlowForStyle(context.selectedStyle);
      return;
    }

    if (context.step === 'route') {
      const location = extractLocationFromText(text);
      if (!context.outboundCountry) {
        if (!location) {
          appendAssistantMessage('Please tell me the destination location first (country, city, or airport code), for example: Japan, Tokyo, or HND.');
          return;
        }

        setContext((prev) => ({ ...prev, outboundCountry: location, selectedFlightId: null }));
        appendAssistantMessage(`Great. I will filter outbound flights to ${location}. Now tell me where you want to return to (country, city, or airport code).`);
        return;
      }

      if (!context.inboundCountry) {
        if (!location) {
          appendAssistantMessage('Please tell me your return location (country, city, or airport code), for example: United States, New York, or JFK.');
          return;
        }

        const outbound = context.outboundCountry;
        const filteredOutbound = outbound
          ? FLIGHT_OPTIONS.filter((f) => matchesArrivalLocation(f, outbound))
          : [];
        setContext((prev) => ({ ...prev, inboundCountry: location, step: 'flight' }));

        if (filteredOutbound.length === 0) {
          appendAssistantMessage(`I could not find outbound flights to ${context.outboundCountry}. Try another destination location.`);
          return;
        }

        appendAssistantMessage(
          `Perfect. Outbound is now filtered to ${context.outboundCountry}, and inbound is filtered to ${location}.\n\nSelect your outbound flight by number:\n\n${formatChoiceList(filteredOutbound, (f, i) => `${i}) ${f.departureCity} (${f.departureCode}) -> ${f.arrivalCity} (${f.arrivalCode}) · ${f.airline} ${f.flightNumber} ${f.cabinClass} ($${f.price})`)}`,
        );
        return;
      }
    }

    if (context.step === 'flight') {
      if (!context.outboundCountry) {
        const destinationLocation = extractLocationFromText(text);
        if (destinationLocation) {
          setContext((prev) => ({
            ...prev,
            outboundCountry: destinationLocation,
            inboundCountry: null,
            selectedFlightId: null,
            step: 'route',
          }));
          appendAssistantMessage(`Got it. I will filter outbound flights to ${destinationLocation}. Now tell me where you want to return to (country, city, or airport code).`);
          return;
        }

        appendAssistantMessage('First tell me your destination location (country, city, or airport code), for example: Japan, Tokyo, or HND.');
        return;
      }

      const choice = parseSingleChoice(text, outboundFlightOptions.length);
      if (!choice) {
        appendAssistantMessage(`Please select a flight by replying with a number from 1 to ${outboundFlightOptions.length}.`);
        return;
      }
      const selected = outboundFlightOptions[choice - 1];
      setContext((prev) => ({ ...prev, selectedFlightId: selected.id, step: 'hotel' }));
      appendAssistantMessage(`Saved flight: ${selected.airline} ${selected.flightNumber} (${selected.cabinClass}) for $${selected.price}.`);
      askNextQuestion('hotel');
      return;
    }

    if (context.step === 'hotel') {
      const choice = parseSingleChoice(text, HOTEL_OPTIONS.length);
      if (!choice) {
        appendAssistantMessage(`Please select a hotel by replying with a number from 1 to ${HOTEL_OPTIONS.length}.`);
        return;
      }
      const selected = HOTEL_OPTIONS[choice - 1];
      setContext((prev) => ({ ...prev, selectedHotelId: selected.id, step: 'car' }));
      appendAssistantMessage(`Saved hotel: ${selected.name} at $${selected.pricePerNight}/night.`);
      askNextQuestion('car');
      return;
    }

    if (context.step === 'car') {
      const choice = parseSingleChoice(text, CAR_OPTIONS.length);
      if (!choice) {
        appendAssistantMessage(`Please select a car by replying with a number from 1 to ${CAR_OPTIONS.length}.`);
        return;
      }
      const selected = CAR_OPTIONS[choice - 1];
      setContext((prev) => ({ ...prev, selectedCarId: selected.id, step: 'activity' }));
      appendAssistantMessage(`Saved car rental: ${selected.name} at $${selected.pricePerDay}/day.`);
      askNextQuestion('activity');
      return;
    }

    if (context.step === 'activity') {
      const choices = parseMultiChoice(text, ACTIVITY_OPTIONS.length);
      if (choices.length === 0) {
        appendAssistantMessage('Please choose at least one activity, for example: 1 3 8');
        return;
      }
      const activityIds = choices.map((c) => ACTIVITY_OPTIONS[c - 1].id);
      setContext((prev) => ({ ...prev, selectedActivityIds: activityIds, step: 'done' }));
      const names = choices.map((c) => ACTIVITY_OPTIONS[c - 1].name).join(', ');
      appendAssistantMessage(`Saved activities: ${names}.`);
      askNextQuestion('done');
      return;
    }

    appendAssistantMessage('Your trip is already planned. Type reset to start over with a new style.');
  };

  const leftPanel = (
    <CompanionPanel
      messages={messages}
      onSendMessage={handleSend}
      onClearChat={onClearChat}
      assistantName="Pathfinder AI"
      assistantSubtitle="Your Travel Curator"
      isOnline
      inputPlaceholder="Ask your companion..."
      quickActions={[
        { icon: <SmallPlaneIcon />, label: 'Search flights', onClick: () => onNavigate?.('home') },
        { icon: <SmallBedIcon />, label: 'Start guided planner', onClick: () => startGuidedFlowForStyle(context.selectedStyle) },
      ]}
    />
  );

  const rightPanel = (
    <div className="surface-light" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-bg-page-light)' }}>
      <div style={{ padding: '20px 20px 0', flexShrink: 0 }}>
        <h2 style={{ color: 'var(--color-text-dark)', fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)', letterSpacing: 'var(--tracking-tight)', margin: '0 0 16px' }}>
          Trip Summary
        </h2>

        <TripSummaryItem icon={<PlaneIcon />} label="Flights" value={selectedFlight ? `${selectedFlight.departureCity} -> ${selectedFlight.arrivalCity}` : 'Not selected'} price={selectedFlight?.price}>
          <p style={{ color: 'var(--color-text-dark-secondary)', fontSize: 'var(--text-xs)' }}>
            {selectedFlight ? `${selectedFlight.departureCountry} -> ${selectedFlight.arrivalCountry} · ${selectedFlight.airline} ${selectedFlight.flightNumber} · ${selectedFlight.cabinClass}` : 'Choose a flight in guided flow'}
          </p>
        </TripSummaryItem>

        <TripSummaryItem
          icon={<BedIcon />}
          label="Accommodation"
          value={selectedHotel ? `${selectedHotel.name} (${selectedHotel.city}, ${selectedHotel.country})` : 'No hotel selected yet'}
          price={selectedHotel ? selectedHotel.pricePerNight * TRIP_NIGHTS : undefined}
        >
          {selectedHotel ? (
            <p style={{ color: 'var(--color-text-dark-secondary)', fontSize: 'var(--text-xs)', margin: 0 }}>
              {selectedHotel.roomType} · {TRIP_NIGHTS} nights at ${selectedHotel.pricePerNight}/night
            </p>
          ) : (
            <NoHotelSlot />
          )}
        </TripSummaryItem>

        <TripSummaryItem
          icon={<CarIcon />}
          label="Transportation"
          value={selectedCar ? `${selectedCar.name} (${selectedCar.city}, ${selectedCar.country})` : 'Not added'}
          price={selectedCar ? selectedCar.pricePerDay * CAR_DAYS : undefined}
        >
          {selectedCar && (
            <p style={{ color: 'var(--color-text-dark-secondary)', fontSize: 'var(--text-xs)', margin: 0 }}>
              {selectedCar.transmission} · {CAR_DAYS} days at ${selectedCar.pricePerDay}/day
            </p>
          )}
        </TripSummaryItem>

        <TripSummaryItem
          icon={<CompassIcon />}
          label="Activities"
          value={selectedActivities.length > 0 ? `${selectedActivities.length} selected` : 'Not added'}
          price={selectedActivities.reduce((sum, a) => sum + a.price, 0) || undefined}
          expandable
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {selectedActivities.length > 0 ? (
              selectedActivities.map((activity) => (
                <p key={activity.id} style={{ color: 'var(--color-text-dark-secondary)', fontSize: 'var(--text-xs)', margin: 0 }}>
                  {activity.name} · {activity.city}, {activity.country} · ${activity.price}
                </p>
              ))
            ) : (
              <p style={{ color: 'var(--color-text-dark-secondary)', fontSize: 'var(--text-xs)', margin: 0 }}>
                Choose activities in the guided flow.
              </p>
            )}
            {selectedActivities.length > 0 && <Badge variant="confirmed">Included</Badge>}
          </div>
        </TripSummaryItem>
      </div>

      <div style={{ flex: 1 }} />
      <TotalCostBar
        label="Total Trip Cost"
        totalPrice={totalCost}
        subLabel="Inc. taxes & fees"
        ctaLabel="Review and Confirm ->"
        ctaDisabled={!selectedFlight || !selectedHotel || !selectedCar || selectedActivities.length === 0}
        breakdown={[
          ...(selectedFlight ? [{ label: `${selectedFlight.airline} ${selectedFlight.flightNumber}`, amount: selectedFlight.price }] : []),
          ...(selectedHotel ? [{ label: `${selectedHotel.name} (${TRIP_NIGHTS} nights)`, amount: selectedHotel.pricePerNight * TRIP_NIGHTS }] : []),
          ...(selectedCar ? [{ label: `${selectedCar.name} (${CAR_DAYS} days)`, amount: selectedCar.pricePerDay * CAR_DAYS }] : []),
          ...selectedActivities.map((a) => ({ label: a.name, amount: a.price })),
        ]}
      />
    </div>
  );

  return (
    <>
      <TopNav
        steps={PLAN_STEPS}
        currentStep={1}
        userName={userEmail}
        notificationCount={0}
        onStepClick={(i) => {
          const pages = ['home', 'plan', 'confirm'];
          if (pages[i] && pages[i] !== 'plan') onNavigate?.(pages[i]);
        }}
      />
      <PageLayout leftPanel={leftPanel} rightPanel={rightPanel} leftWidth={300} rightWidth={290} bg="var(--color-bg-page-light)">
        <div className="surface-light" style={{ padding: '24px 28px', minHeight: '100%', background: 'var(--color-bg-page-light)' }}>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ color: 'var(--color-text-dark)', fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)', letterSpacing: 'var(--tracking-tight)', margin: '0 0 16px' }}>
              Choose Your Travel Style
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <TravelStyleCard
                imageCss="linear-gradient(160deg, #3B2A1A 0%, #5C3D1E 50%, #2A1A0A 100%)"
                tag="Curated"
                tagVariant="curated"
                title="Luxury Elite"
                description="Private villas, Michelin dining, chauffeur service"
                selected={context.selectedStyle === 'Luxury Elite'}
                onSelect={() => startGuidedFlowForStyle('Luxury Elite')}
              />
              <TravelStyleCard
                imageCss="linear-gradient(160deg, #0D0D2E 0%, #1A0D3A 40%, #0A1A3A 100%)"
                tag="Selected"
                tagVariant="selected"
                title="Urban Adventure"
                description="Rooftop bars, street food, cultural deep dives"
                selected={context.selectedStyle === 'Urban Adventure'}
                onSelect={() => startGuidedFlowForStyle('Urban Adventure')}
              />
              <TravelStyleCard
                imageCss="linear-gradient(160deg, #0A2A1A 0%, #1A3A0A 50%, #0A1A0A 100%)"
                tag="Escape"
                tagVariant="escape"
                title="Zen Nature"
                description="Ryokans, onsen, forest hikes, sacred shrines"
                selected={context.selectedStyle === 'Zen Nature'}
                onSelect={() => startGuidedFlowForStyle('Zen Nature')}
              />
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <SectionHeader
              icon={<PlaneIcon />}
              heading="Outbound Flights"
              subheading={context.outboundCountry ? `Filtered to ${context.outboundCountry} · ${outboundFlightOptions.length} options` : `Global Routes · ${FLIGHT_OPTIONS.length} options`}
              theme="light"
              className="mb-4"
            />
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(outboundFlightOptions.length > 0 ? outboundFlightOptions : FLIGHT_OPTIONS).slice(0, 12).map((flight, idx) => (
                <FlightCard
                  key={flight.id}
                  airline={flight.airline}
                  flightNumber={flight.flightNumber}
                  cabinClass={flight.cabinClass}
                  departureTime={flight.departureTime}
                  departureCode={flight.departureCode}
                  arrivalTime={flight.arrivalTime}
                  arrivalCode={flight.arrivalCode}
                  duration={flight.duration}
                  stops={0}
                  price={flight.price}
                  recommended={idx === 1}
                  selected={context.selectedFlightId === flight.id}
                  onSelect={() => setContext((prev) => ({ ...prev, selectedFlightId: prev.selectedFlightId === flight.id ? null : flight.id }))}
                />
              ))}
            </div>
          </div>

          <div>
            <SectionHeader
              icon={<PlaneIcon />}
              heading="Inbound Flights"
              subheading={context.inboundCountry ? `Filtered to ${context.inboundCountry}` : 'Multi-country inbound options'}
              theme="light"
              className="mb-4"
            />
            <div style={{ marginTop: 14 }}>
              {context.outboundCountry && context.inboundCountry ? (
                inboundFlightOptions.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {inboundFlightOptions.slice(0, 6).map((flight) => (
                      <FlightCard
                        key={`in-${flight.id}`}
                        airline={flight.airline}
                        flightNumber={flight.flightNumber}
                        cabinClass={flight.cabinClass}
                        departureTime={flight.departureTime}
                        departureCode={flight.departureCode}
                        arrivalTime={flight.arrivalTime}
                        arrivalCode={flight.arrivalCode}
                        duration={flight.duration}
                        stops={0}
                        price={flight.price}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<SearchIcon />}
                    message="No inbound flights found"
                    description="Try a different return country in chat."
                  />
                )
              ) : (
                <EmptyState icon={<SearchIcon />} message="Set route in chat first" description="Tell Pathfinder your destination country and return country to filter inbound flights." />
              )}
            </div>
          </div>

          <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 12, background: 'var(--color-bg-card)', maxHeight: 360, overflowY: 'auto' }}>
              <h3 style={{ margin: '0 0 10px', color: 'var(--color-text-dark)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)' }}>Hotel Suggestions ({HOTEL_OPTIONS.length})</h3>
              {HOTEL_OPTIONS.map((h, idx) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setContext((prev) => ({ ...prev, selectedHotelId: h.id }))}
                  style={{ width: '100%', textAlign: 'left', marginBottom: 8, borderRadius: 'var(--radius-md)', border: context.selectedHotelId === h.id ? '1px solid var(--color-primary)' : '1px solid var(--color-border)', background: 'transparent', padding: '8px 10px', cursor: 'pointer' }}
                >
                  <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-text-dark)', fontWeight: 'var(--weight-semibold)' }}>{idx + 1}) {h.name}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-text-dark-secondary)' }}>{h.city}, {h.country} · ${h.pricePerNight}/night</p>
                </button>
              ))}
            </div>

            <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 12, background: 'var(--color-bg-card)', maxHeight: 360, overflowY: 'auto' }}>
              <h3 style={{ margin: '0 0 10px', color: 'var(--color-text-dark)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)' }}>Car Rentals ({CAR_OPTIONS.length})</h3>
              {CAR_OPTIONS.map((c, idx) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setContext((prev) => ({ ...prev, selectedCarId: c.id }))}
                  style={{ width: '100%', textAlign: 'left', marginBottom: 8, borderRadius: 'var(--radius-md)', border: context.selectedCarId === c.id ? '1px solid var(--color-primary)' : '1px solid var(--color-border)', background: 'transparent', padding: '8px 10px', cursor: 'pointer' }}
                >
                  <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-text-dark)', fontWeight: 'var(--weight-semibold)' }}>{idx + 1}) {c.name}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-text-dark-secondary)' }}>{c.city}, {c.country} · ${c.pricePerDay}/day</p>
                </button>
              ))}
            </div>

            <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 12, background: 'var(--color-bg-card)', maxHeight: 360, overflowY: 'auto' }}>
              <h3 style={{ margin: '0 0 10px', color: 'var(--color-text-dark)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)' }}>Activities ({ACTIVITY_OPTIONS.length})</h3>
              {ACTIVITY_OPTIONS.map((a, idx) => {
                const selected = context.selectedActivityIds.includes(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      setContext((prev) => ({
                        ...prev,
                        selectedActivityIds: selected
                          ? prev.selectedActivityIds.filter((id) => id !== a.id)
                          : [...prev.selectedActivityIds, a.id],
                      }));
                    }}
                    style={{ width: '100%', textAlign: 'left', marginBottom: 8, borderRadius: 'var(--radius-md)', border: selected ? '1px solid var(--color-primary)' : '1px solid var(--color-border)', background: 'transparent', padding: '8px 10px', cursor: 'pointer' }}
                  >
                    <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-text-dark)', fontWeight: 'var(--weight-semibold)' }}>{idx + 1}) {a.name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-text-dark-secondary)' }}>{a.city}, {a.country} · ${a.price}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </PageLayout>
    </>
  );
}
