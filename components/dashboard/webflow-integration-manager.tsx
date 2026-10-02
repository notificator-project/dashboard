'use client';

import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from 'react';
import { CheckCircle2, Edit3, ExternalLink, Globe2, LoaderCircle, PauseCircle, PlayCircle, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type ApiKey = { id: string; name: string; keyType: string };
type Site = { id: string; displayName?: string; name?: string };
type Scenario = {
  id: string;
  name: string;
  trigger_type: string;
  form_name: string | null;
  title_template: string;
  body_template: string;
  severity: string;
  enabled: boolean;
  webhook_id: string | null;
  integration_ids: string[];
  created_at: string | null;
};
type Integration = {
  id: string;
  webflow_site_id: string | null;
  webflow_site_name: string | null;
  api_key_id: string | null;
  status: string;
  webflow_scenarios: Scenario[];
};

function keyTypeLabel(value: string) {
  if (value === 'strapi_server') return 'Strapi';
  if (value === 'public_client') return 'API / Node.js';
  return 'WordPress';
}

function severityLabel(value: string) {
  if (value === 'critical') return 'Critical';
  if (value === 'warning') return 'Warning';
  return 'Information';
}

const triggerOptions = [
  ['form_submission', 'Form submission'],
  ['site_publish', 'Site published'],
  ['page_created', 'Page created'],
  ['page_metadata_updated', 'Page metadata updated'],
  ['page_deleted', 'Page deleted'],
  ['collection_item_created', 'CMS item created'],
  ['collection_item_changed', 'CMS item changed'],
  ['collection_item_deleted', 'CMS item deleted'],
  ['collection_item_published', 'CMS item published'],
  ['collection_item_unpublished', 'CMS item unpublished'],
  ['ecomm_new_order', 'New ecommerce order'],
  ['ecomm_order_changed', 'Ecommerce order changed'],
  ['ecomm_inventory_changed', 'Ecommerce inventory changed'],
  ['comment_created', 'Comment created'],
] as const;

const triggerFields: Record<string, string[]> = {
  form_submission: ['{{name}}', '{{siteId}}', '{{data}}', '{{triggerType}}'],
  site_publish: ['{{site}}', '{{publishTime}}', '{{publishScope}}', '{{publishedBy.displayName}}', '{{domains}}', '{{triggerType}}'],
  page_created: ['{{siteId}}', '{{pageId}}', '{{pageTitle}}', '{{createdOn}}', '{{triggerType}}'],
  page_metadata_updated: ['{{siteId}}', '{{pageId}}', '{{pageTitle}}', '{{lastUpdated}}', '{{triggerType}}'],
  page_deleted: ['{{siteId}}', '{{pageId}}', '{{pageTitle}}', '{{triggerType}}'],
  collection_item_created: ['{{id}}', '{{siteId}}', '{{collectionId}}', '{{fieldData.name}}', '{{fieldData.slug}}', '{{createdOn}}', '{{isDraft}}', '{{triggerType}}'],
  collection_item_changed: ['{{id}}', '{{siteId}}', '{{collectionId}}', '{{fieldData.name}}', '{{fieldData.slug}}', '{{lastUpdated}}', '{{triggerType}}'],
  collection_item_deleted: ['{{id}}', '{{siteId}}', '{{collectionId}}', '{{triggerType}}'],
  collection_item_published: ['{{id}}', '{{siteId}}', '{{collectionId}}', '{{fieldData.name}}', '{{fieldData.slug}}', '{{lastPublished}}', '{{triggerType}}'],
  collection_item_unpublished: ['{{id}}', '{{siteId}}', '{{collectionId}}', '{{fieldData.name}}', '{{fieldData.slug}}', '{{triggerType}}'],
  ecomm_new_order: ['{{orderId}}', '{{status}}', '{{customer}}', '{{shipping}}', '{{items}}', '{{triggerType}}'],
  ecomm_order_changed: ['{{orderId}}', '{{status}}', '{{customer}}', '{{items}}', '{{triggerType}}'],
  ecomm_inventory_changed: ['{{itemId}}', '{{quantity}}', '{{inventoryType}}', '{{triggerType}}'],
  comment_created: ['{{id}}', '{{siteId}}', '{{comment}}', '{{author}}', '{{createdOn}}', '{{triggerType}}'],
};

function triggerLabel(value: string) {
  return triggerOptions.find(([key]) => key === value)?.[1] || value;
}

export function WebflowIntegrationManager({
  initialIntegrations,
  apiKeys,
  connectedFromOAuth = false,
  initialError = '',
}: {
  initialIntegrations: Integration[];
  apiKeys: ApiKey[];
  connectedFromOAuth?: boolean;
  initialError?: string;
}) {
  const initialSiteConnection = connectedFromOAuth
    ? initialIntegrations.find((item) => !item.webflow_site_id) || initialIntegrations.find((item) => item.webflow_site_id) || initialIntegrations[0]
    : initialIntegrations.find((item) => item.webflow_site_id) || initialIntegrations[0];
  const [integrations, setIntegrations] = useState(initialIntegrations);
  const [sites, setSites] = useState<Site[]>([]);
  const [sitesLoaded, setSitesLoaded] = useState(false);
  const [selectedSite, setSelectedSite] = useState(initialSiteConnection?.webflow_site_id || '');
  const [selectedApiKey, setSelectedApiKey] = useState(initialSiteConnection?.api_key_id || '');
  const [loadingSites, setLoadingSites] = useState(false);
  const [savingSite, setSavingSite] = useState(false);
  const [changingSite, setChangingSite] = useState(false);
  const [addingSite, setAddingSite] = useState(false);
  const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState(initialSiteConnection?.id || '');
  const [scenarioSiteFilter, setScenarioSiteFilter] = useState('all');
  const [scenarioSiteIds, setScenarioSiteIds] = useState<string[]>([initialSiteConnection?.id].filter(Boolean) as string[]);
  const [showScenarioForm, setShowScenarioForm] = useState(false);
  const [scenarioTrigger, setScenarioTrigger] = useState('form_submission');
  const [bodyTemplate, setBodyTemplate] = useState('A new form was submitted on your Webflow site.');
  const bodyTemplateRef = useRef<HTMLTextAreaElement>(null);
  const [savingScenario, setSavingScenario] = useState(false);
  const [removingScenario, setRemovingScenario] = useState('');
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);
  const [message, setMessage] = useState(
    connectedFromOAuth ? 'Webflow connected. Choose a site to continue.' : '',
  );
  const [error, setError] = useState(initialError);
  const integration = integrations.find((item) => item.id === selectedIntegrationId) || integrations[0] || null;
  const connectedIntegrations = integrations.filter((item) => item.webflow_site_id);
  const canAddSite = !sitesLoaded || sites.length > connectedIntegrations.length;
  const allScenarios = Array.from(new Map(integrations.flatMap((item) => item.webflow_scenarios).map((scenario) => [scenario.id, scenario])).values());
  const visibleScenarios = scenarioSiteFilter === 'all'
    ? allScenarios
    : allScenarios.filter((scenario) => scenario.integration_ids.includes(scenarioSiteFilter));

  const loadSites = useCallback(async () => {
    setLoadingSites(true);
    setError('');
    let response: Response;
    let payload: { sites?: Site[]; integrationId?: string; error?: string } = {};
    try {
      response = await fetch('/api/integrations/webflow/sites', { cache: 'no-store' });
      const rawBody = await response.text();
      if (rawBody.trim()) payload = JSON.parse(rawBody) as typeof payload;
    } catch (error) {
      setLoadingSites(false);
      setSitesLoaded(true);
      setError(error instanceof Error ? `Unable to load Webflow sites: ${error.message}` : 'Unable to load Webflow sites. The local dashboard server returned an empty response.');
      return;
    }
    setLoadingSites(false);
    setSitesLoaded(true);
    if (!response.ok) {
      setError(payload.error || `Unable to load Webflow sites (HTTP ${response.status}).`);
      return;
    }
    setSites(payload.sites || []);
    if (!payload.sites?.length) setError('No Webflow sites were returned. Reconnect Webflow with the sites:read permission if needed.');
    if (payload.integrationId && !integrations.some((item) => item.id === payload.integrationId)) {
      const refreshed = await fetch('/api/integrations', { cache: 'no-store' });
      void refreshed;
    }
  }, [integrations]);

  useEffect(() => {
    if (!integration || (sitesLoaded && !addingSite)) return;
    const timer = window.setTimeout(() => void loadSites(), 0);
    return () => window.clearTimeout(timer);
  }, [integration, addingSite, sitesLoaded, loadSites]);

  async function saveSite() {
    if (!integration || !selectedSite || !selectedApiKey) return;
    const site = sites.find((item) => item.id === selectedSite);
    setSavingSite(true);
    setError('');
    const response = await fetch('/api/integrations/webflow', {
      method: addingSite || Boolean(integration.webflow_site_id) ? 'POST' : 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: integration.id, sourceIntegrationId: integration.id, siteId: selectedSite, apiKeyId: selectedApiKey, siteName: site?.displayName || site?.name || integration.webflow_site_name || selectedSite }),
    });
    const payload = (await response.json()) as { integration?: Integration; error?: string };
    setSavingSite(false);
    if (!response.ok || !payload.integration) {
      setError(payload.error || 'Unable to save the Webflow site.');
      return;
    }
    setIntegrations((current) => addingSite || integration.webflow_site_id
      ? [...current.filter((item) => item.id !== payload.integration!.id), { ...payload.integration!, webflow_scenarios: [] }]
      : current.map((item) => item.id === integration.id ? { ...item, webflow_site_id: payload.integration!.webflow_site_id, webflow_site_name: payload.integration!.webflow_site_name, api_key_id: payload.integration!.api_key_id } : item));
    setSelectedIntegrationId(payload.integration.id);
    setScenarioSiteIds([payload.integration.id]);
    setChangingSite(false);
    setAddingSite(false);
    setEditingSiteId(null);
    setMessage('Webflow site and delivery key saved. Add a scenario below.');
  }

  async function disconnect() {
    if (!integration || !window.confirm('Disconnect this Webflow site and remove its site assignments?')) return;
    const response = await fetch(`/api/integrations/webflow?id=${encodeURIComponent(integration.id)}`, { method: 'DELETE' });
    if (!response.ok) {
      setError('Unable to disconnect Webflow.');
      return;
    }
    window.location.reload();
  }

  async function updateSiteStatus(site: Integration) {
    const nextStatus = site.status === 'disabled' ? 'connected' : 'disabled';
    const response = await fetch('/api/integrations/webflow', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: site.id, status: nextStatus }) });
    const payload = (await response.json()) as { integration?: Integration; error?: string };
    if (!response.ok || !payload.integration) {
      setError(payload.error || 'Unable to update the Webflow site status.');
      return;
    }
    setIntegrations((current) => current.map((item) => item.id === site.id ? { ...item, status: payload.integration!.status } : item));
    setMessage(nextStatus === 'disabled' ? 'Webflow delivery paused for this site.' : 'Webflow delivery resumed for this site.');
  }

  async function disconnectSite(site: Integration) {
    if (!window.confirm(`Remove ${site.webflow_site_name || site.webflow_site_id || 'this Webflow site'}? Its scenarios will no longer receive events from this site.`)) return;
    const response = await fetch(`/api/integrations/webflow?id=${encodeURIComponent(site.id)}`, { method: 'DELETE' });
    if (!response.ok) {
      setError('Unable to remove the Webflow site.');
      return;
    }
    setIntegrations((current) => current.filter((item) => item.id !== site.id));
    if (selectedIntegrationId === site.id) {
      const next = connectedIntegrations.find((item) => item.id !== site.id);
      setSelectedIntegrationId(next?.id || '');
      setSelectedApiKey(next?.api_key_id || '');
    }
  }

  async function saveScenario(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!integration) return;
    setSavingScenario(true);
    setError('');
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch(editingScenario ? `/api/integrations/webflow/scenarios/${encodeURIComponent(editingScenario.id)}` : '/api/integrations/webflow/scenarios', {
      method: editingScenario ? 'PATCH' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ integrationId: integration.id, integrationIds: scenarioSiteIds, ...values }),
    });
    const payload = (await response.json()) as { scenario?: Scenario; error?: string };
    setSavingScenario(false);
    if (!response.ok || !payload.scenario) {
      setError(payload.error || `Unable to ${editingScenario ? 'update' : 'create'} the scenario.`);
      return;
    }
    setIntegrations((current) => current.map((item) => item.id === integration.id ? { ...item, webflow_scenarios: editingScenario ? item.webflow_scenarios.map((scenario) => scenario.id === payload.scenario!.id ? payload.scenario! : scenario) : [payload.scenario!, ...item.webflow_scenarios] } : item));
    event.currentTarget.reset();
    setScenarioTrigger('form_submission');
    setBodyTemplate('A new form was submitted on your Webflow site.');
    setEditingScenario(null);
    setScenarioSiteIds([integration.id]);
    setShowScenarioForm(false);
    setMessage(editingScenario ? 'Scenario updated.' : 'Scenario created. Publish your Webflow site and submit a form to test it.');
  }

  async function removeScenario(id: string) {
    if (!window.confirm('Remove this Webflow scenario?')) return;
    setRemovingScenario(id);
    setError('');
    const response = await fetch(`/api/integrations/webflow/scenarios/${encodeURIComponent(id)}`, { method: 'DELETE' });
    const payload = (await response.json()) as { error?: string };
    setRemovingScenario('');
    if (!response.ok) {
      setError(payload.error || 'Unable to remove the scenario.');
      return;
    }
    setIntegrations((current) => current.map((item) => ({ ...item, webflow_scenarios: item.webflow_scenarios.filter((scenario) => scenario.id !== id) })));
  }

  function insertBodyField(field: string) {
    const textarea = bodyTemplateRef.current;
    const start = textarea?.selectionStart ?? bodyTemplate.length;
    const end = textarea?.selectionEnd ?? bodyTemplate.length;
    const nextValue = `${bodyTemplate.slice(0, start)}${field}${bodyTemplate.slice(end)}`;
    setBodyTemplate(nextValue);
    window.requestAnimationFrame(() => {
      if (!textarea) return;
      const cursor = start + field.length;
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  function editScenario(scenario: Scenario) {
    setEditingScenario(scenario);
    setScenarioTrigger(scenario.trigger_type);
    setBodyTemplate(scenario.body_template);
    setScenarioSiteIds(scenario.integration_ids.length ? scenario.integration_ids : [integration?.id || '']);
    setShowScenarioForm(true);
    setError('');
  }

  function toggleScenarioSite(id: string) {
    setScenarioSiteIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  return (
    <section className="webflow-manager" aria-label="Webflow integration setup">
      {!integration ? (
        <div className="webflow-empty-state">
          <Globe2 />
          <div>
            <strong>Connect Webflow to get started</strong>
            <p>Authorize Webflow once, then manage sites and scenarios from this account.</p>
          </div>
          <Button type="button" onClick={() => { window.location.href = '/api/integrations/webflow/auth'; }}>Connect Webflow</Button>
        </div>
      ) : (
        <>
          <div className="webflow-manager-header">
            <div className="webflow-manager-title">
              <span className="webflow-manager-icon"><Globe2 /></span>
              <div>
                <strong>Webflow connection</strong>
                <span>Account-managed OAuth connection</span>
              </div>
            </div>
            <div className="webflow-manager-header-actions"><Badge variant="outline" className="integration-page-status"><i /> {integration.status === 'disabled' ? 'Paused' : 'Connected'}</Badge>{canAddSite ? <Button type="button" variant="outline" onClick={() => { setAddingSite(true); setChangingSite(false); setSelectedSite(''); setSelectedApiKey(''); void loadSites(); }}>Add site</Button> : null}{integration.webflow_site_id ? <Button type="button" variant="outline" onClick={() => void disconnect()}>Disconnect</Button> : null}</div>
          </div>
          {connectedIntegrations.length ? <div className="webflow-connected-sites" aria-label="Connected Webflow sites"><div className="webflow-connected-sites-heading"><strong>Connected sites</strong><span>{connectedIntegrations.length} site{connectedIntegrations.length === 1 ? '' : 's'} connected</span></div><div className="webflow-connected-sites-list">{connectedIntegrations.map((item) => <div key={item.id} className={`webflow-connected-site-card${item.id === editingSiteId ? ' is-selected' : ''}`}><Globe2 /><span><strong>{item.webflow_site_name || item.webflow_site_id}</strong><small>{item.webflow_site_id}</small></span><em className={item.status === 'disabled' ? 'is-paused' : ''}>{item.status === 'disabled' ? 'Paused' : item.api_key_id ? 'API key assigned' : 'Needs API key'}</em><div className="webflow-connected-site-actions"><button type="button" onClick={() => { setSelectedIntegrationId(item.id); setSelectedApiKey(item.api_key_id || ''); setEditingSiteId(item.id); }} aria-label={`Edit ${item.webflow_site_name || item.webflow_site_id}`} title="Edit site"><Edit3 /></button><button type="button" onClick={() => void updateSiteStatus(item)} aria-label={item.status === 'disabled' ? `Resume ${item.webflow_site_name || item.webflow_site_id}` : `Pause ${item.webflow_site_name || item.webflow_site_id}`} title={item.status === 'disabled' ? 'Resume delivery' : 'Pause delivery'}>{item.status === 'disabled' ? <PlayCircle /> : <PauseCircle />}</button><button type="button" onClick={() => void disconnectSite(item)} aria-label={`Delete ${item.webflow_site_name || item.webflow_site_id}`} title="Delete site"><Trash2 /></button></div></div>)}</div></div> : null}
          {editingSiteId && integration.id === editingSiteId && integration.webflow_site_id && !changingSite && !addingSite ? (
            <div className="webflow-connected-site">
              <div><span>Connected site</span><strong>{integration.webflow_site_name || integration.webflow_site_id}</strong><small>Scenarios can be assigned to one or more connected sites.</small></div>
              <div className="webflow-connected-site-actions">
                <select value={selectedApiKey} onChange={(event) => setSelectedApiKey(event.target.value)} aria-label="Webflow site API key">
                  <option value="">Select an active API key</option>
                  {apiKeys.map((key) => <option key={key.id} value={key.id}>{key.name} · {keyTypeLabel(key.keyType)}</option>)}
                </select>
                <Button type="button" onClick={() => void saveSite()} disabled={!selectedApiKey || savingSite}>{savingSite ? <LoaderCircle className="spin" /> : null} Save key</Button>
                <Button type="button" variant="outline" onClick={() => setEditingSiteId(null)}>Cancel</Button>
              </div>
            </div>
          ) : addingSite ? (
            <div className="webflow-site-picker">
              <div><strong>{addingSite ? 'Add another Webflow site' : 'Choose a Webflow site'}</strong><span>Each connected site can use its own Notificator API key.</span></div>
              <div className="webflow-site-picker-controls">
                <select value={selectedSite} onChange={(event) => setSelectedSite(event.target.value)} disabled={loadingSites} aria-label="Webflow site">
                  <option value="">{loadingSites ? 'Loading sites…' : 'Select a site'}</option>
                  {sites.map((site) => <option key={site.id} value={site.id}>{site.displayName || site.name || site.id}</option>)}
                </select>
                <select value={selectedApiKey} onChange={(event) => setSelectedApiKey(event.target.value)} aria-label="Webflow site API key">
                  <option value="">Select an active API key</option>
                  {apiKeys.map((key) => <option key={key.id} value={key.id}>{key.name} · {keyTypeLabel(key.keyType)}</option>)}
                </select>
                <Button type="button" onClick={saveSite} disabled={!selectedSite || !selectedApiKey || savingSite}>{savingSite ? <LoaderCircle className="spin" /> : null} {addingSite ? 'Add site' : 'Save site'}</Button>
              </div>
            </div>
          ) : null}
          {connectedIntegrations.length ? (
            <div className="webflow-scenarios">
              <div className="webflow-section-heading"><div><strong>Notification scenarios</strong><span>Choose which Webflow events should reach Notificator.</span></div><div className="webflow-section-heading-actions"><select value={scenarioSiteFilter} onChange={(event) => setScenarioSiteFilter(event.target.value)} aria-label="Filter scenarios by Webflow site"><option value="all">All connected sites</option>{connectedIntegrations.map((item) => <option key={item.id} value={item.id}>{item.webflow_site_name || item.webflow_site_id}</option>)}</select><Button type="button" onClick={() => { setEditingScenario(null); setScenarioSiteIds([integration?.id || connectedIntegrations[0].id]); setShowScenarioForm((value) => !value); }}><Plus /> Add scenario</Button></div></div>
              {showScenarioForm ? (
                <form className="webflow-scenario-form" key={editingScenario?.id || 'new-scenario'} onSubmit={saveScenario}>
                  <label>Scenario name<input name="name" required placeholder="Contact form submissions" defaultValue={editingScenario?.name || ''} /></label>
                  <div className="webflow-form-row"><label>Trigger<select name="triggerType" value={scenarioTrigger} disabled={Boolean(editingScenario)} onChange={(event) => setScenarioTrigger(event.target.value)}>{triggerOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>{scenarioTrigger === 'form_submission' ? <label>Form name (optional)<input name="formName" placeholder="Contact Form" defaultValue={editingScenario?.form_name || ''} disabled={Boolean(editingScenario)} /></label> : <div className="webflow-form-hint">This scenario listens for every matching Webflow event of this type.</div>}</div>
                  {editingScenario ? <p className="webflow-form-hint">Trigger and form filters are fixed after creation because they belong to the registered Webflow webhook. Create a new scenario to change them.</p> : null}
                  <div className="webflow-form-row"><label>Severity<select name="severity" defaultValue={editingScenario?.severity || 'info'}><option value="info">Information</option><option value="warning">Warning</option><option value="critical">Critical</option></select></label><label>Title template<input name="titleTemplate" defaultValue={editingScenario?.title_template || 'New Webflow form submission'} /></label></div>
                  <label>Body template<textarea ref={bodyTemplateRef} name="bodyTemplate" value={bodyTemplate} onChange={(event) => setBodyTemplate(event.target.value)} rows={3} /></label>
                  <fieldset className="webflow-scenario-sites"><legend>Connected sites</legend><span>Deliver this scenario for events from:</span>{connectedIntegrations.map((item) => <label key={item.id}><input type="checkbox" checked={scenarioSiteIds.includes(item.id)} onChange={() => toggleScenarioSite(item.id)} /> {item.webflow_site_name || item.webflow_site_id}</label>)}</fieldset>
                  <div className="webflow-template-fields">
                    <span>Available fields</span>
                    <div>
                      {(triggerFields[scenarioTrigger] || []).map((field) => <button type="button" key={field} onClick={() => insertBodyField(field)}>{field}</button>)}
                    </div>
                  </div>
                  <label className="webflow-scenario-active"><input type="checkbox" name="enabled" defaultChecked={editingScenario?.enabled ?? true} /> Scenario active</label>
                  <div className="webflow-form-actions"><Button type="submit" disabled={savingScenario}>{savingScenario ? <LoaderCircle className="spin" /> : null} {editingScenario ? 'Save changes' : 'Create scenario'}</Button><Button type="button" variant="outline" onClick={() => { setEditingScenario(null); setShowScenarioForm(false); }}>Cancel</Button></div>
                </form>
              ) : null}
              {visibleScenarios.length ? (
                <div className="webflow-scenario-table" aria-label="Webflow notification scenarios">
                  <div className="webflow-scenario-table-head">
                    <span>Scenario</span>
                    <span>Trigger</span>
                    <span>Severity</span>
                    <span>Status</span>
                    <span aria-label="Actions" />
                  </div>
                  {visibleScenarios.map((scenario) => (
                    <div className="webflow-scenario-row" key={scenario.id}>
                      <div className="webflow-scenario-main">
                        <strong>{scenario.name}</strong>
                        <span>{scenario.form_name || 'All forms'} · {triggerLabel(scenario.trigger_type)}</span>
                      </div>
                      <span className="webflow-scenario-trigger">{triggerLabel(scenario.trigger_type)}</span>
                      <span className={`webflow-scenario-severity severity-${scenario.severity}`}>
                        <i /> {severityLabel(scenario.severity)}
                      </span>
                      <span className="webflow-scenario-enabled">
                        <CheckCircle2 /> {scenario.enabled ? 'Active' : 'Paused'}
                      </span>
                      <div className="webflow-scenario-actions">
                        <button type="button" className="webflow-scenario-edit" onClick={() => editScenario(scenario)} aria-label={`Edit ${scenario.name}`}>
                          <Edit3 />
                        </button>
                        <button type="button" onClick={() => void removeScenario(scenario.id)} disabled={removingScenario === scenario.id} aria-label={`Remove ${scenario.name}`}>
                          {removingScenario === scenario.id ? <LoaderCircle className="spin" /> : <Trash2 />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="webflow-no-scenarios">No scenarios yet. Add one to start receiving Webflow events.</p>}
            </div>
          ) : null}
        </>
      )}
      {message ? <p className="webflow-manager-message">{message}</p> : null}
      {error ? <p className="webflow-manager-error" role="alert">{error}</p> : null}
      <a className="webflow-manager-docs" href="https://docs.notificator-project.com/integrations/webflow/" target="_blank" rel="noreferrer">Webflow integration docs <ExternalLink /></a>
    </section>
  );
}
