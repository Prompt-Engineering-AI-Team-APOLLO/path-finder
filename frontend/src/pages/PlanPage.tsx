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
} from '../components/ui';
import type { Message } from '../components/ui';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const PLAN_STATE_KEY = 'pathfinder_plan_state';

interface FlightOffer {
  offer_id: string;
  flight_number: string;
  airline: string;
  origin: string;
  destination: string;
  origin_city: string;
  destination_city: string;
  departure_at: string;
  arrival_at: string;
  duration_minutes: number;
  stops: number;
  cabin_class: string;
  price_per_person: number;
  total_price: number;
  currency: string;
  baggage_included: boolean;
}

interface FlightSearchResponse {
  outbound_flights: FlightOffer[];
  return_flights?: FlightOffer[] | null;
}

type StyleTagVariant = 'recommended' | 'curated' | 'selected' | 'escape' | 'confirmed' | 'trending' | 'default';

interface StyleSuggestion {
  city: string;
  idea: string;
  image: string;
}

interface TravelStyleOption {
  title: string;
  tag: string;
  tagVariant: StyleTagVariant;
  description: string;
  image: string;
  suggestions: StyleSuggestion[];
  followUpQuestions: string[];
}

interface ActivityOption {
  id: string;
  title: string;
  description: string;
  price: number;
  image: string;
  city: string;
}

interface PersistedPlanState {
  selectedStyle: string;
  origin: string | null;
  destination: string | null;
  destinationTargets?: string[];
  returnTo: string | null;
  selectedActivityIds?: string[];
  outboundFlights: FlightOffer[];
  inboundFlights: FlightOffer[];
  selectedOutboundId: string | null;
  selectedInboundId: string | null;
}

interface PlanPageProps {
  userEmail?: string;
  onNavigate?: (page: string) => void;
  onConfirmSelection?: (payload: {
    outbound: FlightOffer;
    inbound: FlightOffer;
    totalPrice: number;
    currency: string;
  }) => void;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  onClearChat?: () => void;
}

const PLAN_STEPS = [
  { number: '01', label: 'Search' },
  { number: '02', label: 'Plan' },
  { number: '03', label: 'Confirm' },
];

const TRAVEL_STYLES: TravelStyleOption[] = [
  {
    title: 'Luxury',
    tag: 'Luxury',
    tagVariant: 'curated',
    description: 'High-end hotels, private transfers, and signature dining.',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80',
    suggestions: [
      {
        city: 'Paris, France',
        idea: 'Private Seine dinner cruise and couture shopping concierge.',
        image: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=900&q=80',
      },
      {
        city: 'Dubai, UAE',
        idea: 'Skyline penthouse stay with desert sunset private safari.',
        image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=900&q=80',
      },
      {
        city: 'Milan, Italy',
        idea: 'Design district tour with Michelin tasting itinerary.',
        image: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=900&q=80',
      },
    ],
    followUpQuestions: [
      'What is your ideal hotel budget per night in USD?',
      'Do you prefer private experiences or iconic landmarks?',
      'How many nights are you planning for this trip?',
    ],
  },
  {
    title: 'Elite',
    tag: 'Elite',
    tagVariant: 'recommended',
    description: 'Premium comfort, seamless service, and VIP access.',
    image: 'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?auto=format&fit=crop&w=900&q=80',
    suggestions: [
      {
        city: 'Tokyo, Japan',
        idea: 'Executive lounge access and curated omakase reservations.',
        image: 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?auto=format&fit=crop&w=900&q=80',
      },
      {
        city: 'Zurich, Switzerland',
        idea: 'Lake-view suites and private alpine rail experiences.',
        image: 'https://images.unsplash.com/photo-1521292270410-a8c4d716d518?auto=format&fit=crop&w=900&q=80',
      },
      {
        city: 'Singapore',
        idea: 'Luxury city stay with skyline dining and private guide.',
        image: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=900&q=80',
      },
    ],
    followUpQuestions: [
      'Would you like business-class flights, premium economy, or either?',
      'Do you prefer a fast-paced city schedule or a balanced pace?',
      'Any must-have experiences you want VIP access for?',
    ],
  },
  {
    title: 'Urban Adventure',
    tag: 'Selected',
    tagVariant: 'selected',
    description: 'Street culture, nightlife, local eats, and city energy.',
    image: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=900&q=80',
    suggestions: [
      {
        city: 'Seoul, South Korea',
        idea: 'Night markets, cafe hopping, and hidden neighborhood bars.',
        image: 'https://images.unsplash.com/photo-1538485399081-7191377e8241?auto=format&fit=crop&w=900&q=80',
      },
      {
        city: 'New York, USA',
        idea: 'Food crawl, rooftop music nights, and indie art spaces.',
        image: 'https://images.unsplash.com/photo-1518391846015-55a9cc003b25?auto=format&fit=crop&w=900&q=80',
      },
      {
        city: 'Barcelona, Spain',
        idea: 'Street architecture walks, tapas routes, and beach evenings.',
        image: 'https://images.unsplash.com/photo-1543785734-4b45d0f5b3ac?auto=format&fit=crop&w=900&q=80',
      },
    ],
    followUpQuestions: [
      'Do you want more food-focused plans, nightlife, or cultural spots?',
      'What daily pace do you like: packed days or flexible exploration?',
      'Any neighborhoods or city vibe you want me to prioritize?',
    ],
  },
  {
    title: 'Zen Nature',
    tag: 'Escape',
    tagVariant: 'escape',
    description: 'Calm landscapes, wellness stays, and mindful experiences.',
    image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=900&q=80',
    suggestions: [
      {
        city: 'Kyoto, Japan',
        idea: 'Temple mornings, tea ceremony, and peaceful garden paths.',
        image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=900&q=80',
      },
      {
        city: 'Queenstown, New Zealand',
        idea: 'Lakeside lodges, gentle trails, and scenic wellness retreats.',
        image: 'https://images.unsplash.com/photo-1464822759844-d150baec0494?auto=format&fit=crop&w=900&q=80',
      },
      {
        city: 'Bali, Indonesia',
        idea: 'Jungle sanctuary stays, yoga sessions, and waterfall walks.',
        image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=900&q=80',
      },
    ],
    followUpQuestions: [
      'Do you prefer mountain, forest, beach, or mixed nature settings?',
      'Would you like wellness activities included such as yoga or spa?',
      'Are you looking for quiet relaxation or light adventure too?',
    ],
  },
];

const normalizeSelectedStyle = (value: string | null | undefined): string => {
  if (!value) return 'Urban Adventure';
  if (value === 'Luxury Elite') return 'Luxury';
  return TRAVEL_STYLES.some((s) => s.title === value) ? value : 'Urban Adventure';
};

const getStyleByTitle = (title: string): TravelStyleOption =>
  TRAVEL_STYLES.find((s) => s.title === title) ?? TRAVEL_STYLES[2];

const LOCATION_TO_IATA: Record<string, string> = {
  tokyo: 'HND',
  haneda: 'HND',
  hnd: 'HND',
  narita: 'NRT',
  nrt: 'NRT',
  osaka: 'KIX',
  kix: 'KIX',
  itami: 'ITM',
  itm: 'ITM',
  sapporo: 'CTS',
  cts: 'CTS',
  fukuoka: 'FUK',
  fuk: 'FUK',
  dallas: 'DFW',
  dfw: 'DFW',
  london: 'LHR',
  lhr: 'LHR',
  newyork: 'JFK',
  'new york': 'JFK',
  jfk: 'JFK',
  losangeles: 'LAX',
  'los angeles': 'LAX',
  lax: 'LAX',
  sanfrancisco: 'SFO',
  'san francisco': 'SFO',
  sfo: 'SFO',
};

const COUNTRY_TO_AIRPORTS: Record<string, string[]> = {
  japan: ['HND', 'NRT', 'KIX', 'ITM', 'CTS', 'FUK'],
  jp: ['HND', 'NRT', 'KIX', 'ITM', 'CTS', 'FUK'],
};

const JAPAN_AIRPORTS = COUNTRY_TO_AIRPORTS.japan;

const JAPAN_ACTIVITIES_BY_STYLE: Record<string, ActivityOption[]> = {
  Luxury: [
    {
      id: 'lux-jp-1',
      title: 'Tokyo Private Omakase Evening',
      description: 'Chef-curated multi-course dinner with private host service.',
      price: 420,
      image: 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=900&q=80',
      city: 'Tokyo',
    },
    {
      id: 'lux-jp-2',
      title: 'Kyoto Temple & Tea Concierge Day',
      description: 'Private car, tea master session, and curated heritage route.',
      price: 360,
      image: 'https://images.unsplash.com/photo-1528164344705-47542687000d?auto=format&fit=crop&w=900&q=80',
      city: 'Kyoto',
    },
    {
      id: 'lux-jp-3',
      title: 'Hakone Onsen Retreat Package',
      description: 'Luxury ryokan access with spa credit and scenic rail pass.',
      price: 310,
      image: 'https://images.unsplash.com/photo-1526481280695-3c46953b95d8?auto=format&fit=crop&w=900&q=80',
      city: 'Hakone',
    },
  ],
  Elite: [
    {
      id: 'elite-jp-1',
      title: 'Tokyo Skyline Helicopter Circuit',
      description: 'Premium aerial city tour with lounge transfer included.',
      price: 520,
      image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=900&q=80',
      city: 'Tokyo',
    },
    {
      id: 'elite-jp-2',
      title: 'Shinkansen First-Class Day Escape',
      description: 'Reserved first-class rail and concierge-planned city stop.',
      price: 260,
      image: 'https://images.unsplash.com/photo-1477901492169-d59e6428fc90?auto=format&fit=crop&w=900&q=80',
      city: 'Osaka',
    },
    {
      id: 'elite-jp-3',
      title: 'VIP TeamLab + Fine Dining Night',
      description: 'Priority entry plus post-exhibit premium dining reservation.',
      price: 230,
      image: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?auto=format&fit=crop&w=900&q=80',
      city: 'Tokyo',
    },
  ],
  'Urban Adventure': [
    {
      id: 'urban-jp-1',
      title: 'Shibuya Street Food Crawl',
      description: 'Guided late-night local eats and hidden alley spots.',
      price: 95,
      image: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=900&q=80',
      city: 'Tokyo',
    },
    {
      id: 'urban-jp-2',
      title: 'Osaka Nightlife District Pass',
      description: 'Bar-hop entry bundle with local host recommendations.',
      price: 120,
      image: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=900&q=80',
      city: 'Osaka',
    },
    {
      id: 'urban-jp-3',
      title: 'Harajuku Culture + Vintage Route',
      description: 'DIY style walk, indie shops, and local dessert stop.',
      price: 75,
      image: 'https://images.unsplash.com/photo-1513407030348-c983a97b98d8?auto=format&fit=crop&w=900&q=80',
      city: 'Tokyo',
    },
  ],
  'Zen Nature': [
    {
      id: 'zen-jp-1',
      title: 'Arashiyama Bamboo + River Walk',
      description: 'Calm guided morning route with tea break included.',
      price: 85,
      image: 'https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?auto=format&fit=crop&w=900&q=80',
      city: 'Kyoto',
    },
    {
      id: 'zen-jp-2',
      title: 'Nikko Forest Shrine Retreat',
      description: 'Nature and heritage day tour with slow-paced schedule.',
      price: 140,
      image: 'https://images.unsplash.com/photo-1568084680786-a84f91d1153c?auto=format&fit=crop&w=900&q=80',
      city: 'Nikko',
    },
    {
      id: 'zen-jp-3',
      title: 'Lake Kawaguchi Reflection Day',
      description: 'Scenic lakeside route, gentle hike, and onsen stop.',
      price: 160,
      image: 'https://images.unsplash.com/photo-1480796927426-f609979314bd?auto=format&fit=crop&w=900&q=80',
      city: 'Yamanashi',
    },
  ],
};

const isJapanRoute = (targets: string[]): boolean =>
  targets.length > 0 && targets.every((t) => JAPAN_AIRPORTS.includes(t));

const getStyleActivities = (styleTitle: string, targets: string[]): ActivityOption[] => {
  if (isJapanRoute(targets)) {
    return JAPAN_ACTIVITIES_BY_STYLE[styleTitle] ?? [];
  }

  // Fallback mock activities (non-Japan)
  return [
    {
      id: `fallback-${styleTitle}-1`,
      title: `${styleTitle} City Highlights`,
      description: 'A curated starter experience based on your selected travel style.',
      price: 110,
      image: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=900&q=80',
      city: 'Destination City',
    },
    {
      id: `fallback-${styleTitle}-2`,
      title: `${styleTitle} Premium Day Plan`,
      description: 'Flexible day plan with timed recommendations and local spots.',
      price: 165,
      image: 'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?auto=format&fit=crop&w=900&q=80',
      city: 'Destination City',
    },
  ];
};

const PlaneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
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

const normalizeKey = (v: string): string => v.toLowerCase().replace(/[^a-z]/g, '');

const resolveIata = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const asIata = trimmed.toUpperCase();
  if (/^[A-Z]{3}$/.test(asIata)) return asIata;

  const normalized = normalizeKey(trimmed);
  const direct = LOCATION_TO_IATA[trimmed.toLowerCase()] || LOCATION_TO_IATA[normalized];
  if (direct) return direct;

  const entry = Object.entries(LOCATION_TO_IATA).find(([key]) => normalizeKey(key) === normalized);
  return entry ? entry[1] : null;
};

const resolveDestinationTargets = (raw: string): string[] | null => {
  const normalized = normalizeKey(raw);
  const countryTargets = COUNTRY_TO_AIRPORTS[raw.toLowerCase()] || COUNTRY_TO_AIRPORTS[normalized];
  if (countryTargets) return [...countryTargets];

  const single = resolveIata(raw);
  return single ? [single] : null;
};

const formatTime = (iso: string): string => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const formatDuration = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const toIsoDate = (d: Date): string => {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const loadPlanState = (): PersistedPlanState | null => {
  try {
    const raw = sessionStorage.getItem(PLAN_STATE_KEY);
    return raw ? (JSON.parse(raw) as PersistedPlanState) : null;
  } catch {
    return null;
  }
};

export default function PlanPage({ userEmail, onNavigate, onConfirmSelection, messages, setMessages, onClearChat }: PlanPageProps) {
  type AwaitingField = 'destination' | 'origin' | 'return' | null;

  const persisted = loadPlanState();

  const [selectedStyle, setSelectedStyle] = useState<string>(normalizeSelectedStyle(persisted?.selectedStyle));
  const [origin, setOrigin] = useState<string | null>(persisted?.origin ?? null);
  const [destination, setDestination] = useState<string | null>(persisted?.destination ?? null);
  const [destinationTargets, setDestinationTargets] = useState<string[]>(persisted?.destinationTargets ?? (persisted?.destination ? [persisted.destination] : []));
  const [returnTo, setReturnTo] = useState<string | null>(persisted?.returnTo ?? null);
  const [selectedActivityIds, setSelectedActivityIds] = useState<string[]>(persisted?.selectedActivityIds ?? []);
  const [activityPromptKey, setActivityPromptKey] = useState<string | null>(null);
  const [awaitingField, setAwaitingField] = useState<AwaitingField>(null);
  const [styleFollowupActive, setStyleFollowupActive] = useState(false);
  const [styleFollowupIndex, setStyleFollowupIndex] = useState(-1);
  const [styleAnswers, setStyleAnswers] = useState<string[]>([]);
  const [outboundFlights, setOutboundFlights] = useState<FlightOffer[]>(persisted?.outboundFlights ?? []);
  const [inboundFlights, setInboundFlights] = useState<FlightOffer[]>(persisted?.inboundFlights ?? []);
  const [selectedOutboundId, setSelectedOutboundId] = useState<string | null>(persisted?.selectedOutboundId ?? null);
  const [selectedInboundId, setSelectedInboundId] = useState<string | null>(persisted?.selectedInboundId ?? null);
  const [selectionGuidanceShown, setSelectionGuidanceShown] = useState(false);
  const [flightGuidancePromptKey, setFlightGuidancePromptKey] = useState<string | null>(null);
  const [loadingFlights, setLoadingFlights] = useState(false);
  const [flightError, setFlightError] = useState<string | null>(null);

  const selectedOutbound = useMemo(
    () => outboundFlights.find((f) => f.offer_id === selectedOutboundId) ?? null,
    [outboundFlights, selectedOutboundId],
  );

  const selectedInbound = useMemo(
    () => inboundFlights.find((f) => f.offer_id === selectedInboundId) ?? null,
    [inboundFlights, selectedInboundId],
  );

  const availableActivities = useMemo(
    () => getStyleActivities(selectedStyle, destinationTargets),
    [selectedStyle, destinationTargets],
  );

  const selectedActivities = useMemo(
    () => availableActivities.filter((activity) => selectedActivityIds.includes(activity.id)),
    [availableActivities, selectedActivityIds],
  );

  const activitiesTotal = selectedActivities.reduce((sum, activity) => sum + activity.price, 0);

  const totalCost = (selectedOutbound?.price_per_person ?? 0) + (selectedInbound?.price_per_person ?? 0) + activitiesTotal;
  const selectedStyleConfig = useMemo(() => getStyleByTitle(selectedStyle), [selectedStyle]);

  const getFlightGuidancePrompt = () => {
    if (!destinationTargets.length) {
      return 'I will guide your flight search step by step. Where are you traveling to? For example: Japan, Tokyo, or HND.';
    }

    if (!origin) {
      return destinationTargets.length > 1
        ? `Great. I can search across Japan airports (${destinationTargets.join(', ')}). What is your departure airport? For example: DFW.`
        : `Great. I can search flights to ${destinationTargets[0]}. What is your departure airport? For example: DFW.`;
    }

    if (!returnTo) {
      return `Nice. For the return trip, where should I bring you back from ${destinationTargets[0]}? For example: Dallas or DFW.`;
    }

    if (!selectedOutbound || !selectedInbound) {
      return 'Your route is ready. I am showing outbound and inbound options below. Pick one of each and I will update the trip summary and total price.';
    }

    return 'Your flights are selected. If you want, I can now help you add activities or adjust the trip before you confirm.';
  };

  useEffect(() => {
    const nextState: PersistedPlanState = {
      selectedStyle,
      origin,
      destination,
      destinationTargets,
      returnTo,
      selectedActivityIds,
      outboundFlights,
      inboundFlights,
      selectedOutboundId,
      selectedInboundId,
    };
    sessionStorage.setItem(PLAN_STATE_KEY, JSON.stringify(nextState));
  }, [
    selectedStyle,
    origin,
    destination,
    destinationTargets,
    returnTo,
    selectedActivityIds,
    outboundFlights,
    inboundFlights,
    selectedOutboundId,
    selectedInboundId,
  ]);

  useEffect(() => {
    if (selectedActivities.length === 0) return;

    const names = selectedActivities.map((a) => a.title).join(', ');
    appendAssistant(`Added to your trip plan: ${names}. I included this in your trip summary and total cost.`);
  }, [selectedActivities.length]);

  useEffect(() => {
    if (availableActivities.length === 0) return;

    const promptKey = `${selectedStyle}|${destinationTargets.join(',')}`;
    if (promptKey === activityPromptKey) return;

    const picks = availableActivities
      .slice(0, 3)
      .map((activity, idx) => `${idx + 1}) ${activity.title}`)
      .join(' | ');

    appendAssistant(`Based on your ${selectedStyle} style, I can suggest activities: ${picks}. Reply with numbers like 1,2 or click the cards below to add them.`);
    setActivityPromptKey(promptKey);
  }, [availableActivities, selectedStyle, destinationTargets, activityPromptKey]);

  useEffect(() => {
    if (selectedOutbound && selectedInbound && !selectionGuidanceShown) {
      appendAssistant(
        `Nice picks. Your outbound and inbound flights are selected. If this looks good, click Confirm to continue to the confirm page. If you want changes, tell me what to adjust.`,
      );
      setSelectionGuidanceShown(true);
    }
  }, [selectedOutbound, selectedInbound, selectionGuidanceShown]);

  useEffect(() => {
    if (messages.length > 0) return;

    const promptKey = [
      selectedStyle,
      origin ?? '',
      destinationTargets.join(','),
      returnTo ?? '',
      selectedOutboundId ?? '',
      selectedInboundId ?? '',
    ].join('|');

    if (flightGuidancePromptKey === promptKey) return;

    appendAssistant(getFlightGuidancePrompt());
    setFlightGuidancePromptKey(promptKey);
  }, [
    messages.length,
    selectedStyle,
    origin,
    destinationTargets,
    returnTo,
    selectedOutboundId,
    selectedInboundId,
    flightGuidancePromptKey,
  ]);

  const appendAssistant = (content: string) => {
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [
      ...prev,
      { id: `assistant-${Date.now()}-${Math.random()}`, role: 'assistant', content, timestamp: ts },
    ]);
  };

  const searchFlights = async (originIata: string, destinationIatas: string[], returnIata: string) => {
    const depDate = new Date();
    depDate.setDate(depDate.getDate() + 7);
    const retDate = new Date();
    retDate.setDate(retDate.getDate() + 14);

    const outboundResults = await Promise.all(destinationIatas.map(async (dest) => {
      const outboundReq = {
        origin: originIata,
        destination: dest,
        departure_date: toIsoDate(depDate),
        passengers: 1,
        cabin_class: 'economy',
      };
      const res = await fetch(`${API_BASE}/flights/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(outboundReq),
      });
      const data = (await res.json().catch(() => null)) as FlightSearchResponse | null;
      return { ok: res.ok, flights: data?.outbound_flights ?? [] };
    }));

    const inboundResults = await Promise.all(destinationIatas.map(async (dest) => {
      const inboundReq = {
        origin: dest,
        destination: returnIata,
        departure_date: toIsoDate(retDate),
        passengers: 1,
        cabin_class: 'economy',
      };
      const res = await fetch(`${API_BASE}/flights/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inboundReq),
      });
      const data = (await res.json().catch(() => null)) as FlightSearchResponse | null;
      return { ok: res.ok, flights: data?.outbound_flights ?? [] };
    }));

    const outFlights = outboundResults.flatMap((r) => r.flights);
    const inFlights = inboundResults.flatMap((r) => r.flights);
    const hasAnyRoute = outboundResults.some((r) => r.ok) || inboundResults.some((r) => r.ok);

    if (!hasAnyRoute) {
      throw new Error('No flights found for this route right now.');
    }

    outFlights.sort((a, b) => a.price_per_person - b.price_per_person);
    inFlights.sort((a, b) => a.price_per_person - b.price_per_person);

    setOutboundFlights(outFlights);
    setInboundFlights(inFlights);
    setSelectedOutboundId(null);
    setSelectedInboundId(null);
    setSelectionGuidanceShown(false);
  };

  const handleStyleSelect = (style: TravelStyleOption) => {
    setSelectedStyle(style.title);
    setStyleAnswers([]);
    setStyleFollowupIndex(0);
    setStyleFollowupActive(true);
    setSelectedActivityIds([]);
    setActivityPromptKey(null);

    const cityList = style.suggestions.map((s) => s.city).join(', ');
    const ideas = style.suggestions.map((s) => s.idea).join(' | ');

    appendAssistant(`Great choice. ${style.title} style is selected.`);
    appendAssistant(`Suggestions for your vibe: ${cityList}.`);
    appendAssistant(`Top experiences: ${ideas}`);
    appendAssistant(style.followUpQuestions[0]);
  };

  const handleClearChat = () => {
    setFlightGuidancePromptKey(null);
    onClearChat?.();
  };

  const handleSend = async (text: string) => {
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: 'user', content: text, timestamp: ts }]);

    const lower = text.toLowerCase();
    const hasFlightSignal = /(?:\bfrom\b|\bto\b|\bairport\b|\bdepart\b|\breturn\b|\bback\b|\bflight\b|\biata\b)/i.test(lower);
    const wantsToSkipStyleQuestions = /(?:\bskip\b|\bdone\b|\bcontinue\b|\bnext\b|no more questions)/i.test(lower);

    if (styleFollowupActive && !awaitingField) {
      if (wantsToSkipStyleQuestions) {
        setStyleFollowupActive(false);
        setStyleFollowupIndex(-1);
        appendAssistant('No problem. Tell me your destination and departure airport, and I will start filtering flights.');
        return;
      }

      if (!hasFlightSignal) {
        const updatedAnswers = [...styleAnswers, text.trim()];
        setStyleAnswers(updatedAnswers);

        const nextIndex = styleFollowupIndex + 1;
        if (nextIndex < selectedStyleConfig.followUpQuestions.length) {
          setStyleFollowupIndex(nextIndex);
          appendAssistant(selectedStyleConfig.followUpQuestions[nextIndex]);
        } else {
          setStyleFollowupActive(false);
          setStyleFollowupIndex(-1);
          appendAssistant(
            `Perfect. I tailored your ${selectedStyleConfig.title} profile with your preferences. Next, tell me where you are traveling to and your departure airport so I can filter outbound and inbound flights.`,
          );
        }
        return;
      }

      setStyleFollowupActive(false);
      setStyleFollowupIndex(-1);
      appendAssistant('Switching to flights now. Tell me your destination and departure airport.');
    }

    if (availableActivities.length > 0) {
      const matchedByNumber = Array.from(text.matchAll(/\b([1-9])\b/g))
        .map((m) => Number(m[1]) - 1)
        .filter((idx) => idx >= 0 && idx < availableActivities.length)
        .map((idx) => availableActivities[idx]?.id)
        .filter((id): id is string => Boolean(id));

      const matchedByTitle = availableActivities
        .filter((activity) => lower.includes(activity.title.toLowerCase()))
        .map((activity) => activity.id);

      const matched = Array.from(new Set([...matchedByNumber, ...matchedByTitle]));

      if (matched.length > 0) {
        setSelectedActivityIds((prev) => Array.from(new Set([...prev, ...matched])));
        const chosen = availableActivities
          .filter((activity) => matched.includes(activity.id))
          .map((activity) => `${activity.title} ($${activity.price})`)
          .join(', ');
        appendAssistant(`Great choice. I added: ${chosen}. I updated your trip summary and pricing.`);
        return;
      }
    }

    const fromMatch = lower.match(/(?:from|depart(?:ing)?\s+from|leaving\s+from)\s+([a-z\s]{2,40})/i);
    const toMatch = lower.match(/(?:to|towards)\s+([a-z\s]{2,40})/i);
    const backMatch = lower.match(/(?:back|return)\s+to\s+([a-z\s]{2,40})/i);
    const standaloneIata = (!fromMatch && !toMatch && !backMatch) ? resolveIata(text) : null;
    const standaloneDestinationTargets = (!fromMatch && !toMatch && !backMatch) ? resolveDestinationTargets(text) : null;

    const genericFlightIntent = /\bflight(s)?\b/.test(lower)
      && !fromMatch
      && !toMatch
      && !backMatch
      && !standaloneIata
      && !standaloneDestinationTargets;

    if (genericFlightIntent) {
      setOrigin(null);
      setDestination(null);
      setDestinationTargets([]);
      setReturnTo(null);
      setAwaitingField('destination');
      appendAssistant('Great, let us start with outbound flights. Where are you traveling to? (for example Japan, Tokyo, or HND)');
      return;
    }

    let nextOrigin = fromMatch ? resolveIata(fromMatch[1]) : origin;
    let nextDestinationTargets: string[] =
      (toMatch ? (resolveDestinationTargets(toMatch[1]) ?? []) : [])
      || [];

    if (nextDestinationTargets.length === 0) {
      nextDestinationTargets = destinationTargets.length > 0 ? destinationTargets : (destination ? [destination] : []);
    }

    let nextDestination = nextDestinationTargets[0] ?? destination;
    let nextReturn = backMatch ? resolveIata(backMatch[1]) : returnTo;

    if (standaloneDestinationTargets || standaloneIata) {
      const firstStandaloneDestination = standaloneDestinationTargets?.[0] ?? standaloneIata;

      if (awaitingField === 'destination' && !nextDestination) {
        nextDestinationTargets = standaloneDestinationTargets ?? (firstStandaloneDestination ? [firstStandaloneDestination] : []);
        nextDestination = firstStandaloneDestination ?? nextDestination;
      } else if (awaitingField === 'origin' && !nextOrigin) {
        nextOrigin = standaloneIata;
      } else if (awaitingField === 'return' && !nextReturn) {
        nextReturn = standaloneIata;
      } else if (!nextDestination) {
        nextDestinationTargets = standaloneDestinationTargets ?? (firstStandaloneDestination ? [firstStandaloneDestination] : []);
        nextDestination = firstStandaloneDestination ?? nextDestination;
      } else if (!nextOrigin) {
        nextOrigin = standaloneIata;
      } else if (!nextReturn) {
        nextReturn = standaloneIata;
      }
    }

    if (fromMatch && !nextOrigin) {
      setAwaitingField('origin');
      appendAssistant('I could not recognize that departure airport. Try city or IATA, for example Dallas or DFW.');
      return;
    }
    if (toMatch && !nextDestinationTargets[0]) {
      setAwaitingField('destination');
      appendAssistant('I could not recognize that destination. Try a city, country, or IATA code, for example Japan, Tokyo, or HND.');
      return;
    }
    if (backMatch && !nextReturn) {
      setAwaitingField('return');
      appendAssistant('I could not recognize that return destination. Try city or IATA, for example Dallas or DFW.');
      return;
    }

    if (awaitingField && !standaloneIata && !standaloneDestinationTargets && !fromMatch && !toMatch && !backMatch) {
      appendAssistant('I could not recognize that location yet. Try a country, city, or 3-letter airport code like Japan, Tokyo, HND, Dallas, or DFW.');
      return;
    }

    if (nextOrigin !== origin) setOrigin(nextOrigin ?? null);
    if (nextDestination !== destination) setDestination(nextDestination ?? null);
    setDestinationTargets(nextDestinationTargets);
    if (nextReturn !== returnTo) setReturnTo(nextReturn ?? null);

    const inferredReturn = nextReturn ?? nextOrigin;

    if (!nextDestinationTargets[0]) {
      setAwaitingField('destination');
      appendAssistant('Where are you traveling to? Tell me a city, country, or airport code, for example Japan, Tokyo, or HND.');
      return;
    }

    if (!nextOrigin) {
      setAwaitingField('origin');
      if (nextDestinationTargets.length > 1) {
        appendAssistant(
          `Great. I will search flights across Japan airports (${nextDestinationTargets.join(', ')}). What is your departure airport? (for example DFW)`,
        );
      } else {
        appendAssistant(`Great. I will search flights to ${nextDestination}. What is your departure airport? (for example DFW)`);
      }
      return;
    }

    if (!nextReturn) {
      setAwaitingField('return');
      appendAssistant(`Perfect for outbound. For inbound flights, where do you want to return to from ${nextDestinationTargets[0]}? (for example Dallas or DFW)`);
      return;
    }

    setAwaitingField(null);

    setLoadingFlights(true);
    setFlightError(null);
    try {
      await searchFlights(nextOrigin, nextDestinationTargets, inferredReturn ?? nextOrigin);
      setOrigin(nextOrigin);
      setDestination(nextDestinationTargets[0] ?? nextDestination);
      setDestinationTargets(nextDestinationTargets);
      setReturnTo(inferredReturn ?? nextOrigin);

      if (nextDestinationTargets.length > 1) {
        appendAssistant(
          `Found flights from ${nextOrigin} to Japan airports: ${nextDestinationTargets.join(', ')}. Outbound and inbound options are now filtered and listed below.`,
        );
      } else {
        appendAssistant(
          `Found flights: ${nextOrigin} -> ${nextDestinationTargets[0]} and return ${nextDestinationTargets[0]} -> ${inferredReturn ?? nextOrigin}. Select the outbound and inbound options shown on the page.`,
        );
      }
    } catch (e) {
      setOutboundFlights([]);
      setInboundFlights([]);
      setFlightError(e instanceof Error ? e.message : 'Failed to load flights.');
      appendAssistant('I could not load flights for that route. Try another origin/destination pair.');
    } finally {
      setLoadingFlights(false);
    }
  };

  const leftPanel = (
    <CompanionPanel
      messages={messages}
      onSendMessage={handleSend}
      onClearChat={handleClearChat}
      assistantName="Pathfinder AI"
      assistantSubtitle="Your Travel Curator"
      isOnline={true}
      inputPlaceholder="Tell me your destination, departure airport, or a flight shortcut..."
      quickActions={[
        { icon: <SmallPlaneIcon />, label: 'Start flight questions', onClick: () => handleSend('Help me plan my flights.') },
        { icon: <SmallPlaneIcon />, label: 'Tokyo from DFW', onClick: () => handleSend('I am going to Tokyo from DFW and returning to Dallas') },
      ]}
      quickActionsLabel="Flight shortcuts"
    />
  );

  const rightPanel = (
    <div className="surface-light" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-bg-page-light)' }}>
      <div style={{ padding: '20px 20px 0', flexShrink: 0 }}>
        <h2 style={{ color: 'var(--color-text-dark)', fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)', letterSpacing: 'var(--tracking-tight)', margin: '0 0 16px' }}>
          Trip Summary
        </h2>

        <TripSummaryItem
          icon={<PlaneIcon />}
          label="Outbound"
          value={selectedOutbound ? `${selectedOutbound.origin} -> ${selectedOutbound.destination}` : 'Not selected'}
          price={selectedOutbound?.price_per_person}
        >
          <p style={{ color: 'var(--color-text-dark-secondary)', fontSize: 'var(--text-xs)' }}>
            {selectedOutbound
              ? `${selectedOutbound.airline} ${selectedOutbound.flight_number} · ${formatTime(selectedOutbound.departure_at)} to ${formatTime(selectedOutbound.arrival_at)}`
              : 'Select an outbound flight from the center panel.'}
          </p>
        </TripSummaryItem>

        <TripSummaryItem
          icon={<PlaneIcon />}
          label="Inbound"
          value={selectedInbound ? `${selectedInbound.origin} -> ${selectedInbound.destination}` : 'Not selected'}
          price={selectedInbound?.price_per_person}
        >
          <p style={{ color: 'var(--color-text-dark-secondary)', fontSize: 'var(--text-xs)' }}>
            {selectedInbound
              ? `${selectedInbound.airline} ${selectedInbound.flight_number} · ${formatTime(selectedInbound.departure_at)} to ${formatTime(selectedInbound.arrival_at)}`
              : 'Select an inbound flight from the center panel.'}
          </p>
        </TripSummaryItem>
      </div>

      <div style={{ flex: 1 }} />
      <TotalCostBar
        label="Total Flight Cost"
        totalPrice={totalCost}
        subLabel="Per traveler"
        ctaLabel="Confirm"
        onCta={() => {
          if (!selectedOutbound || !selectedInbound) return;
          onConfirmSelection?.({
            outbound: selectedOutbound,
            inbound: selectedInbound,
            totalPrice: totalCost,
            currency: selectedOutbound.currency || selectedInbound.currency || 'USD',
          });
          onNavigate?.('confirm');
        }}
        ctaDisabled={!selectedOutbound || !selectedInbound}
        breakdown={[
          ...(selectedOutbound ? [{ label: `Outbound ${selectedOutbound.flight_number}`, amount: selectedOutbound.price_per_person }] : []),
          ...(selectedInbound ? [{ label: `Inbound ${selectedInbound.flight_number}`, amount: selectedInbound.price_per_person }] : []),
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))', gap: 12 }}>
              {TRAVEL_STYLES.map((style) => (
                <TravelStyleCard
                  key={style.title}
                  image={style.image}
                  tag={style.tag}
                  tagVariant={style.tagVariant}
                  title={style.title}
                  description={style.description}
                  selected={selectedStyle === style.title}
                  onSelect={() => handleStyleSelect(style)}
                />
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <SectionHeader
              icon={<SearchIcon />}
              heading={`${selectedStyleConfig.title} Suggestions`}
              subheading="Places and activities tailored to your selected travel style"
              theme="light"
              className="mb-4"
            />
            <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
              {selectedStyleConfig.suggestions.map((suggestion) => (
                <div
                  key={suggestion.city}
                  style={{
                    borderRadius: 'var(--radius-xl)',
                    overflow: 'hidden',
                    border: '1.5px solid var(--color-border)',
                    background: 'var(--color-bg-surface)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div
                    style={{
                      height: 130,
                      backgroundImage: `linear-gradient(180deg, rgba(6,7,18,0.08) 0%, rgba(6,7,18,0.45) 100%), url(${suggestion.image})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                  <div style={{ padding: '10px 12px' }}>
                    <p style={{ margin: 0, color: 'var(--color-text-dark)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)' }}>
                      {suggestion.city}
                    </p>
                    <p style={{ margin: '4px 0 0', color: 'var(--color-text-dark-secondary)', fontSize: 'var(--text-xs)', lineHeight: 1.5 }}>
                      {suggestion.idea}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <SectionHeader
              icon={<PlaneIcon />}
              heading="Outbound Flights"
              subheading={origin && destinationTargets.length > 0
                ? destinationTargets.length > 1
                  ? `${origin} -> ${destinationTargets.join(', ')}`
                  : `${origin} -> ${destinationTargets[0]}`
                : 'Flights will appear after you provide destination and departure airport in chat.'}
              theme="light"
              className="mb-4"
            />
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {loadingFlights ? (
                <EmptyState icon={<SearchIcon />} message="Searching outbound flights..." description="Loading matched outbound offers." />
              ) : outboundFlights.length > 0 ? (
                outboundFlights.map((flight, i) => (
                  <FlightCard
                    key={flight.offer_id}
                    airline={flight.airline}
                    flightNumber={flight.flight_number}
                    cabinClass={flight.cabin_class}
                    departureTime={formatTime(flight.departure_at)}
                    departureCode={flight.origin}
                    arrivalTime={formatTime(flight.arrival_at)}
                    arrivalCode={flight.destination}
                    duration={formatDuration(flight.duration_minutes)}
                    stops={flight.stops}
                    price={flight.price_per_person}
                    selected={selectedOutboundId === flight.offer_id}
                    recommended={i === 0}
                    onSelect={() => setSelectedOutboundId(selectedOutboundId === flight.offer_id ? null : flight.offer_id)}
                  />
                ))
              ) : (
                <EmptyState
                  icon={<SearchIcon />}
                  message={flightError ?? 'No outbound flights yet'}
                  description="Tell the chatbot your destination and departure airport (example: I am going to Tokyo from DFW)."
                />
              )}
            </div>
          </div>

          <div>
            <SectionHeader
              icon={<PlaneIcon />}
              heading="Inbound Flights"
              subheading={destination && returnTo ? `${destination} -> ${returnTo}` : 'Inbound flights will appear after route search.'}
              theme="light"
              className="mb-4"
            />
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {loadingFlights ? (
                <EmptyState icon={<SearchIcon />} message="Searching inbound flights..." description="Loading matched return offers." />
              ) : inboundFlights.length > 0 ? (
                inboundFlights.map((flight, i) => (
                  <FlightCard
                    key={flight.offer_id}
                    airline={flight.airline}
                    flightNumber={flight.flight_number}
                    cabinClass={flight.cabin_class}
                    departureTime={formatTime(flight.departure_at)}
                    departureCode={flight.origin}
                    arrivalTime={formatTime(flight.arrival_at)}
                    arrivalCode={flight.destination}
                    duration={formatDuration(flight.duration_minutes)}
                    stops={flight.stops}
                    price={flight.price_per_person}
                    selected={selectedInboundId === flight.offer_id}
                    recommended={i === 0}
                    onSelect={() => setSelectedInboundId(selectedInboundId === flight.offer_id ? null : flight.offer_id)}
                  />
                ))
              ) : (
                <EmptyState
                  icon={<SearchIcon />}
                  message={flightError ?? 'No inbound flights yet'}
                  description="Inbound flights appear when destination and return route are known."
                />
              )}
            </div>
          </div>
        </div>
      </PageLayout>
    </>
  );
}
