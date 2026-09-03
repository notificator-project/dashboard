# Dashboard MVP

## Release goal

Let an existing Notificator user sign in from a desktop browser, understand what needs attention, inspect and manage alerts, create integration credentials safely, and confirm whether connected devices are online.

Users can also register supported devices and pause or resume delivery without
opening the mobile app.

## Milestones

### 1. Foundation

- Responsive application shell and overview preview.
- Shared visual language with the Notificator website and mobile app.
- Architecture, environment, and security documentation.
- Automated lint and production-build checks.

### 2. Account access

- Supabase SSR session handling.
- Sign in, password recovery, sign out, and MFA challenge.
- Server-side route guards and safe return paths.

### 3. Notification inbox

- Paginated list, severity filters, search, and unread state.
- Decrypted detail view with safe external links.
- Mark read/unread, delete, and mark-all-read actions. Archive requires a dedicated database field before it can be added safely.
- Empty, loading, offline, and error states.

### 4. Integrations and API keys

- Key type, name, and allowed-domain input.
- Server-generated key shown exactly once.
- Copy confirmation, last-used metadata, revoke, and delete flows.
- Migration plan for existing plaintext API keys remains required before hashed-key storage can replace compatibility lookup.

### 5. Devices and account

- Device list with online, offline, unknown, and updating states.
- Basic identity, location, timezone, and idle-display settings. Live brightness and volume remain mobile-only while MQTT credentials stay on the phone.
- HiveMQ Cloud settings, a transient authenticated connection test, and optional encrypted account storage with automatic dashboard restoration.
- Profile details and email notification preference.

## Explicitly deferred

- Project news and blog reading.
- Phone push-permission controls.
- Mobile and plugin retrieval of the shared account MQTT credentials (database contract is ready).
- Device firmware version checks and signed OTA updates for Base and Touch are
  available from each device page. Initial provisioning remains mobile-only.
- Full mobile home-screen customisation.
