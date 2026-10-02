'use client';

import { useCallback, useEffect, useState, type SyntheticEvent } from 'react';
import { ExternalLink, Globe2, LoaderCircle, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type ApiKey = { id: string; name: string; keyType: string };
type Site = { id: string; displayName?: string; name?: string };
type Scenario = {
  id: string;
  name: string;
  api_key_id: string | null;
  form_name: string | null;
  severity: string;
};
type Integration = {
  id: string;
  webflow_site_id: string | null;
  webflow_site_name: string | null;
  status: string;
  webflow_scenarios: Scenario[];
};

function keyTypeLabel(value: string) {
  if (value === 'strapi_server') return 'Strapi';
  if (value === 'public_client') return 'API / Node.js';
  return 'WordPress';
}

export function WebflowIntegrationManager({
  initialIntegrations,
  apiKeys,
  connectedFromOAuth = false,
}: {
  initialIntegrations: Integration[];
  apiKeys: ApiKey[];
  connectedFromOAuth?: boolean;
}) {
  const [integrations, setIntegrations] = useState(initialIntegrations);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [loadingSites, setLoadingSites] = useState(false);
  const [savingSite, setSavingSite] = useState(false);
  const [changingSite, setChangingSite] = useState(false);
  const [showScenarioForm, setShowScenarioForm] = useState(false);
  const [savingScenario, setSavingScenario] = useState(false);
  const [removingScenario, setRemovingScenario] = useState('');
  const [message, setMessage] = useState(
    connectedFromOAuth ? 'Webflow connected. Choose a site to continue.' : '',
  );
  const [error, setError] = useState('');
  const integration = integrations[0] || null;

  const loadSites = useCallback(async () => {
    setLoadingSites(true);
    setError('');
    const response = await fetch('/api/integrations/webflow/sites', { cache: 'no-store' });
    const payload = (await response.json()) as { sites?: Site[]; integrationId?: string; error?: string };
    setLoadingSites(false);
    if (!response.ok) {
      setError(payload.error || 'Unable to load Webflow sites.');
      return;
    }
    setSites(payload.sites || []);
    if (payload.integrationId && !integrations.some((item) => item.id === payload.integrationId)) {
      const refreshed = await fetch('/api/integrations', { cache: 'no-store' });
      void refreshed;
    }
  }, [integrations]);

  useEffect(() => {
    if (!integration || integration.webflow_site_id) return;
    const timer = window.setTimeout(() => void loadSites(), 0);
    return () => window.clearTimeout(timer);
  }, [integration, loadSites]);

  async function saveSite() {
    if (!integration || !selectedSite) return;
    const site = sites.find((item) => item.id === selectedSite);
    setSavingSite(true);
    setError('');
    const response = await fetch('/api/integrations/webflow', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: integration.id, siteId: selectedSite, siteName: site?.displayName || site?.name || selectedSite }),
    });
    const payload = (await response.json()) as { integration?: { webflow_site_id: string; webflow_site_name: string }; error?: string };
    setSavingSite(false);
    if (!response.ok || !payload.integration) {
      setError(payload.error || 'Unable to save the Webflow site.');
      return;
    }
    setIntegrations((current) => current.map((item) => item.id === integration.id ? { ...item, webflow_site_id: payload.integration!.webflow_site_id, webflow_site_name: payload.integration!.webflow_site_name } : item));
    setChangingSite(false);
    setMessage('Webflow site connected. Add a scenario below.');
  }

  async function disconnect() {
    if (!integration || !window.confirm('Disconnect this Webflow installation and remove its scenarios?')) return;
    const response = await fetch(`/api/integrations/webflow?id=${encodeURIComponent(integration.id)}`, { method: 'DELETE' });
    if (!response.ok) {
      setError('Unable to disconnect Webflow.');
      return;
    }
    window.location.reload();
  }

  async function createScenario(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!integration) return;
    setSavingScenario(true);
    setError('');
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch('/api/integrations/webflow/scenarios', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ integrationId: integration.id, ...values }),
    });
    const payload = (await response.json()) as { scenario?: Scenario; error?: string };
    setSavingScenario(false);
    if (!response.ok || !payload.scenario) {
      setError(payload.error || 'Unable to create the scenario.');
      return;
    }
    setIntegrations((current) => current.map((item) => item.id === integration.id ? { ...item, webflow_scenarios: [payload.scenario!, ...item.webflow_scenarios] } : item));
    event.currentTarget.reset();
    setShowScenarioForm(false);
    setMessage('Scenario created. Publish your Webflow site and submit a form to test it.');
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
    setIntegrations((current) => current.map((item) => item.id === integration?.id ? { ...item, webflow_scenarios: item.webflow_scenarios.filter((scenario) => scenario.id !== id) } : item));
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
            <div className="webflow-manager-header-actions"><Badge variant="outline" className="integration-page-status"><i /> Connected</Badge><Button type="button" variant="outline" onClick={() => void disconnect()}>Disconnect</Button></div>
          </div>
          {integration.webflow_site_id && !changingSite ? (
            <div className="webflow-connected-site">
              <div><span>Connected site</span><strong>{integration.webflow_site_name || integration.webflow_site_id}</strong></div>
              <Button type="button" variant="outline" onClick={() => { setChangingSite(true); setSelectedSite(integration.webflow_site_id || ''); void loadSites(); }}>Change site</Button>
            </div>
          ) : (
            <div className="webflow-site-picker">
              <div><strong>Choose a Webflow site</strong><span>Scenarios are registered against one site at a time.</span></div>
              <div className="webflow-site-picker-controls">
                <select value={selectedSite} onChange={(event) => setSelectedSite(event.target.value)} disabled={loadingSites} aria-label="Webflow site">
                  <option value="">{loadingSites ? 'Loading sites…' : 'Select a site'}</option>
                  {sites.map((site) => <option key={site.id} value={site.id}>{site.displayName || site.name || site.id}</option>)}
                </select>
                <Button type="button" onClick={saveSite} disabled={!selectedSite || savingSite}>{savingSite ? <LoaderCircle className="spin" /> : null} Save site</Button>
              </div>
            </div>
          )}
          {integration.webflow_site_id && !changingSite ? (
            <div className="webflow-scenarios">
              <div className="webflow-section-heading"><div><strong>Notification scenarios</strong><span>Choose which Webflow events should reach Notificator.</span></div><Button type="button" onClick={() => setShowScenarioForm((value) => !value)}><Plus /> Add scenario</Button></div>
              {showScenarioForm ? (
                <form className="webflow-scenario-form" onSubmit={createScenario}>
                  <label>Scenario name<input name="name" required placeholder="Contact form submissions" /></label>
                  <div className="webflow-form-row"><label>API key<select name="apiKeyId" required><option value="">Select an active API key</option>{apiKeys.map((key) => <option key={key.id} value={key.id}>{key.name} · {keyTypeLabel(key.keyType)}</option>)}</select></label><label>Form name (optional)<input name="formName" placeholder="Contact Form" /></label></div>
                  <div className="webflow-form-row"><label>Severity<select name="severity" defaultValue="info"><option value="info">Information</option><option value="warning">Warning</option><option value="critical">Critical</option></select></label><label>Title template<input name="titleTemplate" defaultValue="New Webflow form submission" /></label></div>
                  <label>Body template<textarea name="bodyTemplate" defaultValue="A new form was submitted on your Webflow site." rows={3} /></label>
                  <div className="webflow-form-actions"><Button type="submit" disabled={savingScenario}>{savingScenario ? <LoaderCircle className="spin" /> : null} Create scenario</Button><Button type="button" variant="outline" onClick={() => setShowScenarioForm(false)}>Cancel</Button></div>
                </form>
              ) : null}
              {integration.webflow_scenarios.length ? integration.webflow_scenarios.map((scenario) => <div className="webflow-scenario-row" key={scenario.id}><div><strong>{scenario.name}</strong><span>{scenario.form_name || 'All forms'} · {scenario.severity}</span></div><button type="button" onClick={() => void removeScenario(scenario.id)} disabled={removingScenario === scenario.id} aria-label={`Remove ${scenario.name}`}><Trash2 /></button></div>) : <p className="webflow-no-scenarios">No scenarios yet. Add one to start receiving Webflow events.</p>}
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
