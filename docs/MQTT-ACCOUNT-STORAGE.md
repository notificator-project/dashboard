# Account MQTT storage

Users can opt in to **Save to my account** in Settings → Device connection.
Saving is separate from testing. The default remains local metadata and a tab-session
password. Account saving stores the entire configuration encrypted, including the
host and username, and restores it when a dashboard session has no connection.
An existing session connection takes priority. Restoration has an eight-second
timeout and never blocks the dashboard page from rendering.

Unchecking the option and saving removes the account copy before saving locally.
**Remove account copy** works even if decryption is unavailable and leaves the current
session usable. **Clear session** removes the browser connection and suppresses
restoration for that tab session. Sign-out clears MQTT session data. Deleting an
account cascades to its saved credentials. Removing a database copy does not erase
copies already held by other clients or invalidate the broker password; changing
the password at HiveMQ is how a user revokes those copies.

## Deployment

1. Apply `supabase/migrations/202609030001_account_mqtt_credentials.sql` to the
   shared Notificator Supabase project using the SQL editor or your migration pipeline.
   It creates a new table; it does not change existing account, device, or app records.
2. Generate a dedicated key with `openssl rand -hex 32`. Store the result as the
   server-only Netlify environment variable `MQTT_CREDENTIALS_ENCRYPTION_KEY`
   (Functions runtime), and in local `.env` if needed. Do not commit or print it in
   build logs. No Supabase service-role key is required.
3. Keep a secure backup of this key, separate from database backups. Do not replace
   it on each deployment. Rotation requires decrypting and re-encrypting records
   with both old and new keys; no automatic rotation is implemented yet. Losing
   the key requires users to re-enter credentials. Delete remains available.
4. Deploy and verify save, restore in another signed-in browser, remove, session-only
   use, and access denial from a different account. The RLS checks can also run on
   an isolated PostgreSQL database using the test fixture described below.

Without the migration/key, the UI explains that account storage is unavailable;
the existing session save and connection test remain usable. No live database
migration is performed by a website build.

## Shared record and encryption contract

`public.user_mqtt_credentials` has one row per `auth.users.id`:

- `user_id`: UUID primary key and cascading foreign key.
- `encrypted_credentials`: `v1.<nonce-base64>.<tag-base64>.<ciphertext-base64>`.
- `updated_at`: timestamp of the last saved configuration.

The plaintext is UTF-8 JSON with `version: 1`, `provider: "hivemq_cloud"`, `host`,
`username`, `password`, and `topicPrefix`. Use TLS WebSockets, port 8884, path
`/mqtt` when constructing the broker configuration. Passwords retain whitespace;
hostnames, usernames, and topic prefixes are normalized before saving.

Encryption is AES-256-GCM with a fresh 12-byte random nonce per write and a 16-byte
authentication tag. Additional authenticated data is the UTF-8 string
`notificator:mqtt:v1:<user_id>`. This binds ciphertext to its owner and rejects
tampering. The key is 32 bytes represented by 64 hexadecimal characters. This is
server-managed encryption at rest, not end-to-end encryption: a trusted server
holding the key can decrypt a user's configuration after authorizing access.

RLS restricts select/insert/update/delete to the authenticated row owner. Anonymous
access is revoked. Raw database errors and credential payloads are never logged or
returned in error messages. Credential responses are private and non-cacheable.

## Dashboard endpoint and future consumers

`/api/mqtt/credentials` currently uses the dashboard's Supabase session cookie:

- `GET`: returns `{saved, available, credentials}` for the signed-in owner, or null
  credentials when absent. Restoration problems also return an `error` message
  while retaining `saved: true` so deletion remains available.
- `PUT`: accepts `{host, username, password, topicPrefix}`, validates and encrypts
  it, then upserts the owner's row. Returns `{saved: true}` without echoing secrets.
- `DELETE`: removes only the owner's row and returns `{saved: false}`.

Writes require the dashboard's same-origin request. All methods independently
validate the authenticated user and derive the owner ID from that session.

The table and envelope deliberately belong to the **Notificator account**, not a
browser or dashboard installation. For mobile and the WordPress plugin, add a
credential retrieval route to the shared hosted API that reads this same record
and uses the same envelope/key. Do not create separate client-specific copies in
the database, or ship the server encryption key to either client.

- Mobile: validate a Supabase access token, derive its account ID, return credentials
  over HTTPS, and store the result in the phone's secure storage on explicit use.
- Plugin: validate a Notificator integration API key, derive its owner server-side,
  and require an explicit credential-sharing scope/consent before revealing MQTT
  credentials. Existing notification-send keys must not automatically gain broker
  password access. Store retrieved credentials with the plugin's existing controls.

Future clients should use the account copy only when explicitly selected and handle
missing/deleted configurations. The dashboard endpoint does not currently accept
plugin API keys or mobile bearer tokens. The shared API authentication adapter and
client controls are follow-up work; the database format does not need to change.

## Verification

`npm test` checks validation, encryption round trips, fresh nonces, tamper rejection,
wrong-owner/key rejection, and browser restoration behavior with a stubbed endpoint.
`tests/mqtt-rls.sql` is an integration fixture for an **empty disposable database**:
it creates minimal Supabase-like roles/auth functions, applies the real migration,
and verifies owner and cross-account CRUD access. Never run the fixture in production.
The `mqtt-isolation` CI job runs this fixture against a disposable PostgreSQL service.
It can also be run locally with `psql -d <empty-test-database> -f tests/mqtt-rls.sql`.
