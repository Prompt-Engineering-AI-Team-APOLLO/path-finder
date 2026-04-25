import { Button, HotelCard, StepIndicator } from '../components/ui';
import type { Message } from '../components/ui';
import { HOTEL_MOCK_DATA } from '../data/hotels';

const STEPS = [
  { number: '01', label: 'Home' },
  { number: '02', label: 'Plan' },
  { number: '03', label: 'Confirm' },
];

interface HotelsPageProps {
  userEmail?: string;
  onNavigate?: (page: string) => void;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  onClearChat?: () => void;
}

export default function HotelsPage({ userEmail, onNavigate }: HotelsPageProps) {
  return (
    <div
      style={{
        minHeight: '100svh',
        background: '#0A0A0F',
        fontFamily: 'var(--font-sans)',
        color: 'var(--color-text-primary)',
      }}
    >
      <div style={{ padding: '24px 32px 12px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', margin: '0 0 8px' }}>
            Mock Hotel Collection
          </p>
          <h1 style={{ margin: 0, fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', lineHeight: 1.15, letterSpacing: 'var(--tracking-tight)' }}>
            Stay Suggestions for {userEmail || 'Your Trip'}
          </h1>
          <p style={{ margin: '10px 0 0', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
            Browse all mock hotels with sample prices and photos.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Button variant="ghost" size="sm" onClick={() => onNavigate?.('home')}>
            ← Back to Home
          </Button>
          <StepIndicator
            steps={STEPS}
            currentStep={0}
            onStepClick={(i) => {
              const pages = ['home', 'plan', 'confirm'];
              if (pages[i]) onNavigate?.(pages[i]);
            }}
          />
        </div>
      </div>

      <div style={{ padding: '12px 32px 32px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {HOTEL_MOCK_DATA.map((hotel) => (
            <HotelCard
              key={hotel.id}
              image={hotel.image}
              name={hotel.name}
              location={hotel.location}
              checkIn="Jun 15"
              checkOut="Jun 19"
              nights={4}
              roomType={hotel.roomType}
              pricePerNight={hotel.pricePerNight}
              currency="USD"
              rating={hotel.rating}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
