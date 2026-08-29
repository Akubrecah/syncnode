# Engineering Decisions Record (ADR) — Syncnode

## ADR-001: Centralized Frontend Protected Route Architecture
- **Context:** Individual views (e.g. `DashboardView`, `WalletView`, `OrdersView`, `SecurityView`) were conditionally rendered solely by string comparison with `activeTab`. When users visited a protected URL without a session, the view mounted and executed API calls with `null` credentials.
- **Decision:** Implement a centralized `PROTECTED_TABS` set and `ADMIN_TABS` set in `App.tsx`. Use an `useEffect` navigation interceptor that redirects unauthenticated users attempting to access protected tabs to `#home` or triggers `onOpenAuth()`, while rendering a dedicated `AuthGuard` fallback.
- **Consequences:** Eliminates UI flash, guarantees that unauthorized API calls are not dispatched, and centralizes all tab permission logic into a single declarative source of truth.

## ADR-002: Dual Token Lifecycle (Access + Refresh Token)
- **Context:** JWT access tokens previously had 24-hour lifespans without token refresh or rotation endpoints.
- **Decision:** Implement short-lived access tokens (15–60 minutes) combined with 7-day cryptographic refresh tokens. Provide `/api/v1/auth/refresh` endpoint in FastAPI that verifies refresh tokens, rotates credentials, and provides newly minted access tokens.
- **Consequences:** Limits the blast radius of any potentially intercepted access token while preserving continuous user experience across sessions.

## ADR-003: Environment-Driven CORS Policy
- **Context:** `allow_origins=["*"]` with `allow_credentials=True` violates the W3C CORS specification and causes browser rejections.
- **Decision:** Parse `ALLOWED_ORIGINS` from environment variables, defaulting in development to `http://localhost:3000,http://127.0.0.1:3000,http://localhost:4000`, and allowing comma-separated production origins in deployment.
- **Consequences:** Meets security standards and avoids CORS protocol rejections across all modern browsers.

## ADR-004: Strict Zero-Default Production Bootstrap Policy
- **Context:** `ADMIN_BOOTSTRAP_EMAIL` and `ADMIN_BOOTSTRAP_PASSWORD` had fallback string defaults in code.
- **Decision:** In non-development mode (`ENVIRONMENT=production`), fail startup or require explicit credentials. In development mode, clearly log bootstrap credentials and encourage rotation.
- **Consequences:** Prevents accidental deployment of default administrative credentials into production environments.
