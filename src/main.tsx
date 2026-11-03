import './app/bootKey'; // capture the boot history entry before the router changes it
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link } from 'react-router-dom';
import '@lepide/ds-css';
import { ThemeProvider } from './app/theme';
import { AuthProvider } from './app/auth';
import { LepideProvider, ToastProvider, TooltipHost } from './ui';
import type { LinkComponent } from './ui';
import App from './App';

const RouterLink: LinkComponent = (props) => <Link {...props} />;

/* Provider order (integration-checklist A): router → Lepide Design System (router links) → theme → toast channel → session → routes. */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <LepideProvider link={RouterLink}>
        <ThemeProvider>
          <ToastProvider duration={5000}>
            <AuthProvider>
              <App />
              <TooltipHost />
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </LepideProvider>
    </BrowserRouter>
  </StrictMode>,
);
