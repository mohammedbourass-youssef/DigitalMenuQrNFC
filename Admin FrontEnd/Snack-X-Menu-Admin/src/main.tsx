import { createRoot } from 'react-dom/client';

import i18n from './i18n';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { onCurrencyChange } from '@/lib/preferences';

import './index.css';

const queryClient = new QueryClient();

// The backend translates text and converts prices per request, so every cached
// query must be refetched after a language (or currency) change.
i18n.on('languageChanged', () => {
  void queryClient.invalidateQueries();
});

onCurrencyChange(() => {
  void queryClient.invalidateQueries();
});

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <QueryClientProvider client={queryClient}>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </QueryClientProvider>,
);
