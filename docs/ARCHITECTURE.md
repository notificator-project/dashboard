# Notificator Dashboard architecture

## Purpose

The dashboard is the focused web companion to the Notificator mobile app. It gives account holders access to operational features that benefit from a larger screen: the notification inbox, API-key management, device state, basic account preferences, and signed firmware updates. News and mobile-only preferences remain outside the focused dashboard experience.

The dashboard reads and mutates the authenticated user's Supabase records through Row Level Security and narrow server routes. Preview-only controls have been removed from the operational pages.

## Runtime

- Vinext and React Server Components provide the application.
- Nitro produces the Netlify Functions deployment from the Vinext application.
- shadcn components and Lucide provide accessible interface primitives.
- Supabase remains the identity and user-data source so mobile and web share one account.
- The hosted Notificator API owns privileged integration and delivery operations.

## Trust boundaries

### Browser

The browser may receive only the Supabase project URL, anon key, current user session, and records allowed by Row Level Security. A service-role key, Expo token, or unrestricted API credential must never enter the client bundle. User-entered MQTT details remain browser-local; the password is held in tab-scoped session storage rather than Supabase.

### Dashboard server

Server routes verify the Supabase access token and derive the user ID from that session. They never accept a caller-supplied user ID as authorization. Mutations use narrow authenticated dashboard routes rather than unrestricted browser writes.

The MQTT test route validates HiveMQ Cloud's allowlisted WebSocket format, signs the request with an active compatible API key on the server, forwards credentials transiently, and never logs or stores the broker password.

### Hosted API

The dashboard server generates API keys and returns each new secret once. The existing delivery APIs still require compatibility with the current plaintext-key lookup. Moving to key hashes requires a coordinated schema and API migration before plaintext storage can be removed.

## Authentication and authorization

The dashboard uses the existing public Notificator account, not ChatGPT or workspace authentication. Supabase SSR cookies provide the browser session. Every protected page is checked on the server, and every mutation re-checks the session independently.

Row Level Security must enforce `auth.uid() = user_id` for `profiles`, `encrypted_notifications`, `devices`, and `api_keys`. Before production, automated cross-user isolation tests must cover every select, insert, update, and delete used by the dashboard.

## Notification encryption

Current mobile compatibility uses account encryption material stored by the existing system. The dashboard must reproduce that format before displaying real notification content. This is compatibility work, not the end-state security model.

The long-term design should use a per-account data key wrapped independently for each enrolled client. Adding the dashboard then becomes a deliberate client-enrolment action and no shared decrypting key needs to be stored as an ordinary profile field.

## Data access

| Feature  | Read path                                       | Mutation path                                    |
| -------- | ----------------------------------------------- | ------------------------------------------------ |
| Overview | Authenticated Supabase server loader            | None                                             |
| Inbox    | RLS-protected encrypted notification rows       | RLS or a narrow authenticated route              |
| API keys | Metadata through an authenticated server loader | Narrow authenticated dashboard routes            |
| Devices  | RLS-protected device rows                       | Narrow metadata updates; hosted API for commands |
| Account  | Supabase auth and profile row                   | Supabase auth plus RLS-protected profile update  |

Active API-key secrets are hidden by default and fetched only through an
authenticated, owner-scoped, non-cacheable endpoint when the user explicitly
reveals or copies one. MQTT credentials remain browser-local. While a visible
session has complete HiveMQ settings, the dashboard periodically asks the
hosted API to reconcile every active device from its retained status topic.

## Delivery sequence

1. Add Supabase SSR authentication and guarded routes.
2. Implement the inbox and validate encryption compatibility.
3. Add server-generated API keys and migrate away from plaintext storage.
4. Add device status and basic device metadata.
5. Add account and email preferences.
6. Complete accessibility, security, observability, and recovery testing before enabling production writes.
