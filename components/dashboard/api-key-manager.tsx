'use client';

import {
  useMemo,
  useState,
  useSyncExternalStore,
  type SyntheticEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  Clipboard,
  Edit3,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Plus,
  Search,
  ShieldCheck,
  ShieldX,
  Trash2,
  X,
} from 'lucide-react';
import { FormMessage } from '@/components/auth/form-message';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { readFormText } from '@/lib/form-data';

type ApiKeySummary = {
  id: string;
  name: string;
  keyType: string;
  domains: string[];
  createdAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

function keyTypeLabel(value: string) {
  if (value === 'strapi_server') return 'Strapi';
  if (value === 'public_client') return 'Public API / Node.js';
  return 'WordPress';
}

function dateLabel(value: string | null, timeZone?: string) {
  if (!value) return 'Never';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Never'
    : new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone,
      }).format(date);
}

const subscribeToHydration = () => () => {};

function LocalDate({ value }: { value: string | null }) {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const label = dateLabel(value, hydrated ? undefined : 'UTC');

  return value ? <time dateTime={value}>{label}</time> : <>Never</>;
}

export function ApiKeyManager({ keys }: { keys: ApiKeySummary[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState('');
  const [deleting, setDeleting] = useState('');
  const [editing, setEditing] = useState('');
  const [saving, setSaving] = useState('');
  const [createdKey, setCreatedKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [revealing, setRevealing] = useState('');
  const [visibleKeys, setVisibleKeys] = useState<Record<string, string>>({});
  const [copiedKeyId, setCopiedKeyId] = useState('');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'revoked'
  >('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const activeCount = keys.filter((key) => !key.revokedAt).length;
  const revokedCount = keys.length - activeCount;
  const integrationCount = new Set(keys.map((key) => key.keyType)).size;
  const filteredKeys = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return keys.filter((key) => {
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && !key.revokedAt) ||
        (statusFilter === 'revoked' && Boolean(key.revokedAt));
      const matchesType = typeFilter === 'all' || key.keyType === typeFilter;
      const matchesQuery =
        !normalizedQuery ||
        [key.name, keyTypeLabel(key.keyType), ...key.domains]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesStatus && matchesType && matchesQuery;
    });
  }, [keys, query, statusFilter, typeFilter]);

  const filtersActive =
    query.trim().length > 0 || statusFilter !== 'all' || typeFilter !== 'all';

  async function createKey(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError('');
    setCreatedKey('');
    const form = new FormData(event.currentTarget);
    const domains = readFormText(form, 'domains')
      .split(/[\n,]/)
      .map((value) => value.trim())
      .filter(Boolean);
    const response = await fetch('/api/api-keys', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: readFormText(form, 'name').trim(),
        keyType: readFormText(form, 'keyType'),
        domains,
      }),
    });
    const payload = (await response.json()) as { key?: string; error?: string };
    if (!response.ok || !payload.key) {
      setError(payload.error || 'The API key could not be created.');
      setCreating(false);
      return;
    }
    setCreatedKey(payload.key);
    event.currentTarget.reset();
    setCreating(false);
    router.refresh();
  }

  async function copyKey() {
    await navigator.clipboard.writeText(createdKey);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function loadKey(id: string) {
    const existing = visibleKeys[id];
    if (existing) return existing;
    setRevealing(id);
    setError('');
    const response = await fetch(`/api/api-keys/${encodeURIComponent(id)}`, {
      cache: 'no-store',
    });
    const payload = (await response.json()) as { key?: string; error?: string };
    setRevealing('');
    if (!response.ok || !payload.key) {
      setError(payload.error || 'The API key could not be revealed.');
      return '';
    }
    setVisibleKeys((current) => ({ ...current, [id]: payload.key! }));
    return payload.key;
  }

  async function toggleKey(id: string) {
    if (visibleKeys[id]) {
      setVisibleKeys((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      return;
    }
    await loadKey(id);
  }

  async function copyExistingKey(id: string) {
    const value = await loadKey(id);
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopiedKeyId(id);
    window.setTimeout(() => setCopiedKeyId(''), 1800);
  }

  async function revokeKey(id: string, name: string) {
    if (
      !window.confirm(
        `Revoke “${name}”? Integrations using it will stop working.`,
      )
    )
      return;
    setRevoking(id);
    setError('');
    const response = await fetch(
      `/api/api-keys/${encodeURIComponent(id)}/revoke`,
      {
        method: 'POST',
      },
    );
    if (!response.ok) setError('The API key could not be revoked.');
    setRevoking('');
    router.refresh();
  }

  async function deleteKey(id: string, name: string) {
    if (
      !window.confirm(
        `Permanently delete “${name}”? Its history will no longer appear here.`,
      )
    )
      return;
    setDeleting(id);
    setError('');
    const response = await fetch(`/api/api-keys/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!response.ok) setError('The API key could not be deleted.');
    setDeleting('');
    router.refresh();
  }

  async function updateKey(event: SyntheticEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    setSaving(id);
    setError('');
    const form = new FormData(event.currentTarget);
    const domains = readFormText(form, 'domains')
      .split(/[\n,]/)
      .map((value) => value.trim())
      .filter(Boolean);
    const response = await fetch(`/api/api-keys/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: readFormText(form, 'name'),
        domains,
      }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error || 'The API key could not be updated.');
      setSaving('');
      return;
    }
    setEditing('');
    setSaving('');
    router.refresh();
  }

  return (
    <div className="api-key-page-stack">
      <section className="api-key-summary" aria-label="API key summary">
        <div>
          <span>Active keys</span>
          <strong>{activeCount}</strong>
          <small>Ready to authenticate integrations</small>
        </div>
        <div>
          <span>Revoked keys</span>
          <strong>{revokedCount}</strong>
          <small>Kept for account history</small>
        </div>
        <div>
          <span>Integration types</span>
          <strong>{integrationCount}</strong>
          <small>WordPress, Strapi, and Node.js</small>
        </div>
      </section>

      {error ? <FormMessage tone="error">{error}</FormMessage> : null}

      <div className="api-key-management-grid">
        <section className="managed-key-list">
          <div className="managed-key-heading">
            <div>
              <span className="api-key-icon">
                <ShieldCheck />
              </span>
              <div>
                <h2>Your API keys</h2>
                <p>Find, review, and manage integration credentials.</p>
              </div>
            </div>
            <span className="managed-key-count">{keys.length} total</span>
          </div>

          <div className="api-key-filter-panel">
            <fieldset className="api-key-status-filters">
              <legend>Status</legend>
              {(
                [
                  ['all', 'All', keys.length],
                  ['active', 'Active', activeCount],
                  ['revoked', 'Revoked', revokedCount],
                ] as const
              ).map(([value, label, count]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={statusFilter === value}
                  onClick={() => setStatusFilter(value)}
                >
                  {label} <span>{count}</span>
                </button>
              ))}
            </fieldset>
            <div className="api-key-filter-fields">
              <label className="api-key-search" htmlFor="api-key-search">
                <span>Search keys</span>
                <div>
                  <Search aria-hidden="true" />
                  <Input
                    id="api-key-search"
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Name, domain, or integration"
                  />
                </div>
              </label>
              <label htmlFor="api-key-integration-filter">
                <span>Integration</span>
                <select
                  id="api-key-integration-filter"
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                >
                  <option value="all">All integrations</option>
                  <option value="wordpress_server">WordPress</option>
                  <option value="strapi_server">Strapi</option>
                  <option value="public_client">Public API / Node.js</option>
                </select>
              </label>
            </div>
            <div className="api-key-filter-summary" aria-live="polite">
              <span>
                Showing {filteredKeys.length} of {keys.length}{' '}
                {keys.length === 1 ? 'key' : 'keys'}
              </span>
              {filtersActive ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setQuery('');
                    setStatusFilter('all');
                    setTypeFilter('all');
                  }}
                >
                  <X /> Clear filters
                </Button>
              ) : null}
            </div>
          </div>

          {filteredKeys.map((key) => (
            <article
              key={key.id}
              className={`${editing === key.id ? 'editing ' : ''}${
                key.revokedAt ? 'is-revoked' : ''
              }`}
            >
              <span className="api-key-icon">
                <KeyRound />
              </span>
              {editing === key.id ? (
                <form
                  className="api-key-edit-form"
                  onSubmit={(event) => updateKey(event, key.id)}
                >
                  <label htmlFor={`api-key-edit-name-${key.id}`}>
                    Name
                    <Input
                      id={`api-key-edit-name-${key.id}`}
                      name="name"
                      defaultValue={key.name}
                      maxLength={80}
                      required
                    />
                  </label>
                  <label htmlFor={`api-key-edit-domains-${key.id}`}>
                    Allowed domains
                    <textarea
                      id={`api-key-edit-domains-${key.id}`}
                      name="domains"
                      rows={3}
                      defaultValue={key.domains.join('\n')}
                      placeholder="Leave empty to allow any origin"
                    />
                  </label>
                  <div>
                    <Button type="submit" disabled={saving === key.id}>
                      {saving === key.id ? (
                        <LoaderCircle className="auth-spinner" />
                      ) : (
                        <Check />
                      )}
                      {saving === key.id ? 'Saving…' : 'Save changes'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setEditing('')}
                      disabled={saving === key.id}
                    >
                      <X /> Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="managed-key-copy">
                    <strong>{key.name}</strong>
                    <span>
                      {keyTypeLabel(key.keyType)} ·{' '}
                      {key.domains.length
                        ? key.domains.join(', ')
                        : 'Any origin'}
                    </span>
                    <dl className="api-key-dates">
                      <div>
                        <dt>Last used</dt>
                        <dd>
                          <LocalDate value={key.lastUsedAt} />
                        </dd>
                      </div>
                      <div>
                        <dt>Created</dt>
                        <dd>
                          <LocalDate value={key.createdAt} />
                        </dd>
                      </div>
                    </dl>
                    {!key.revokedAt ? (
                      <div className="existing-key-secret">
                        <code>
                          {visibleKeys[key.id]
                            ? visibleKeys[key.id]
                            : 'wpnotif_••••••••••••••••••••••••'}
                        </code>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleKey(key.id)}
                          disabled={revealing === key.id}
                        >
                          {revealing === key.id ? (
                            <LoaderCircle className="auth-spinner" />
                          ) : visibleKeys[key.id] ? (
                            <EyeOff />
                          ) : (
                            <Eye />
                          )}
                          {visibleKeys[key.id] ? 'Hide' : 'Reveal'}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => copyExistingKey(key.id)}
                          disabled={revealing === key.id}
                        >
                          {copiedKeyId === key.id ? <Check /> : <Clipboard />}
                          {copiedKeyId === key.id ? 'Copied' : 'Copy'}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                  <Badge
                    variant="outline"
                    className={key.revokedAt ? 'revoked' : 'active'}
                  >
                    {key.revokedAt ? 'Revoked' : 'Active'}
                  </Badge>
                  <div className="managed-key-actions">
                    {!key.revokedAt ? (
                      <>
                        <Button
                          variant="ghost"
                          onClick={() => setEditing(key.id)}
                        >
                          <Edit3 /> Edit
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => revokeKey(key.id, key.name)}
                          disabled={revoking === key.id}
                          className="revoke-key-button"
                        >
                          {revoking === key.id ? (
                            <LoaderCircle className="auth-spinner" />
                          ) : (
                            <ShieldX />
                          )}
                          Revoke
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        onClick={() => deleteKey(key.id, key.name)}
                        disabled={deleting === key.id}
                        className="delete-key-button"
                      >
                        {deleting === key.id ? (
                          <LoaderCircle className="auth-spinner" />
                        ) : (
                          <Trash2 />
                        )}
                        Delete
                      </Button>
                    )}
                  </div>
                </>
              )}
            </article>
          ))}
          {filteredKeys.length === 0 ? (
            <div className="dashboard-empty-state api-key-empty-state">
              <Search />
              <div>
                <strong>
                  {keys.length === 0 ? 'No API keys yet' : 'No matching keys'}
                </strong>
                <span>
                  {keys.length === 0
                    ? 'Create your first integration credential.'
                    : 'Try changing or clearing the filters.'}
                </span>
              </div>
            </div>
          ) : null}
        </section>

        <section className="api-key-create-card" id="create-key">
          <div>
            <span className="api-key-icon">
              <Plus />
            </span>
            <div>
              <h2>Create an API key</h2>
              <p>
                New secrets appear immediately and active keys can be revealed
                again from the protected list below.
              </p>
            </div>
          </div>
          {createdKey ? (
            <div className="created-key-panel">
              <FormMessage tone="success">
                API key created. Copy it before leaving this page.
              </FormMessage>
              <div>
                <Input value={createdKey} readOnly aria-label="New API key" />
                <Button type="button" onClick={copyKey} variant="outline">
                  {copied ? <Check /> : <Clipboard />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>
          ) : null}
          <form className="api-key-create-form" onSubmit={createKey}>
            <label htmlFor="api-key-name">
              Name
              <Input
                id="api-key-name"
                name="name"
                placeholder="Production website"
                maxLength={80}
                required
              />
            </label>
            <label htmlFor="api-key-type">
              Integration type
              <select
                id="api-key-type"
                name="keyType"
                defaultValue="wordpress_server"
              >
                <option value="wordpress_server">WordPress</option>
                <option value="strapi_server">Strapi</option>
                <option value="public_client">Public API / Node.js SDK</option>
              </select>
            </label>
            <label className="api-key-domains" htmlFor="api-key-domains">
              Allowed domains{' '}
              <span>
                Optional · one hostname per line. Leave empty to allow any
                origin.
              </span>
              <textarea
                id="api-key-domains"
                name="domains"
                rows={3}
                placeholder={'example.com\napp.example.com'}
              />
            </label>
            <Button type="submit" disabled={creating}>
              {creating ? (
                <LoaderCircle className="auth-spinner" />
              ) : (
                <KeyRound />
              )}
              {creating ? 'Creating…' : 'Create API key'}
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
