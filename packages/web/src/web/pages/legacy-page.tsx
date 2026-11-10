import { useLocation } from 'wouter';

const destinations: Record<string, { path: string; title: string }> = {
  '/': { path: '/jeux/index.html', title: 'DVYS · 1win Prediction' },
  '/admin': { path: '/admin.html', title: 'DVYS · Administration' },
  '/stats': { path: '/stats.html', title: 'DVYS · Statistiques' },
  '/predictions': { path: '/predictions.html', title: 'DVYS · Prédictions' },
};

export default function LegacyPage() {
  const [location] = useLocation();
  const destination = destinations[location.replace(/\/$/, '') || '/'] || destinations['/'];
  document.title = destination.title;

  return (
    <main style={{ width: '100%', height: '100dvh', background: '#000a14' }}>
      <iframe
        key={destination.path}
        src={`${destination.path}${window.location.search}${window.location.hash}`}
        title={destination.title}
        allow="clipboard-write; fullscreen"
        style={{ display: 'block', width: '100%', height: '100%', border: 0 }}
      />
    </main>
  );
}