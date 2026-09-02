import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink, LockKeyhole } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { NotificationAutoRead } from '@/components/dashboard/notification-auto-read';
import { NotificationDetailActions } from '@/components/dashboard/notification-detail-actions';
import { PluginVersionStatus } from '@/components/dashboard/plugin-version-status';
import { RawPayloadPanel } from '@/components/dashboard/raw-payload-panel';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireUser } from '@/lib/auth/session';
import {
  loadDashboardNotification,
  loadDashboardShellOverview,
} from '@/lib/dashboard/overview';

export const dynamic = 'force-dynamic';

function detailValue(value: unknown) {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  )
    return String(value);
  return value == null ? '' : JSON.stringify(value);
}

function detailHref(value: unknown) {
  if (typeof value !== 'string') return '';
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
}

const detailPriority = new Map(
  [
    'scenario_name',
    'event',
    'event_name',
    'event_type',
    'notification_event',
    'hook_name',
    'scenario_notes',
    'notes',
    'site_name',
    'site_url',
    'project_name',
    'environment',
    'triggered_by',
    'actor',
    'user_display_name',
    'user_login',
    'user_email',
    'author',
    'category',
    'severity',
    'wp_version',
    'plugin_version',
    'timestamp',
  ].map((key, index) => [key, index]),
);

function orderedDetails(details: Record<string, unknown>) {
  return Object.entries(details)
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry: [, value] }) => detailValue(value))
    .sort((left, right) => {
      const leftPriority = detailPriority.get(left.entry[0]) ?? 1_000;
      const rightPriority = detailPriority.get(right.entry[0]) ?? 1_000;
      return leftPriority - rightPriority || left.index - right.index;
    })
    .map(({ entry }) => entry);
}

export default async function NotificationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/notifications/${id}`);
  const notification = await loadDashboardNotification(user, id);
  if (!notification) notFound();
  const overview = await loadDashboardShellOverview(user);
  const details = orderedDetails(notification.details);
  const nestedPayload = notification.rawPayload?.payload;
  const rawPayloadObject =
    nestedPayload && typeof nestedPayload === 'object'
      ? nestedPayload
      : notification.rawPayload;
  const rawPayload = rawPayloadObject
    ? JSON.stringify(rawPayloadObject, null, 2)
    : '';

  return (
    <DashboardShell
      activePath="/notifications"
      overview={overview}
      eyebrow="NOTIFICATION"
      title={notification.title}
      description={`${notification.source} · ${notification.time}`}
      action={
        <NotificationDetailActions
          id={notification.id}
          title={notification.title}
          unread={notification.unread}
          locked={notification.locked}
        />
      }
    >
      <NotificationAutoRead
        key={notification.id}
        id={notification.id}
        unread={notification.unread}
        locked={notification.locked}
      />
      <Link href="/notifications" className="page-back-link">
        <ArrowLeft /> Back to notifications
      </Link>
      <Card className="page-card notification-detail-card">
        <CardHeader>
          <div className="detail-badges">
            <Badge
              variant="outline"
              className={`severity-label ${notification.severity.toLowerCase()}`}
            >
              {notification.severity}
            </Badge>
            <Badge variant="outline">
              {notification.unread ? 'Unread' : 'Read'}
            </Badge>
            {notification.locked ? (
              <Badge variant="outline" className="locked">
                Locked
              </Badge>
            ) : null}
          </div>
          <CardTitle>{notification.title}</CardTitle>
        </CardHeader>
        <CardContent>
          {notification.encrypted ? (
            <div className="locked-notification">
              <LockKeyhole />
              <div>
                <strong>This alert is still encrypted</strong>
                <p>{notification.body}</p>
              </div>
            </div>
          ) : (
            <p className="notification-body">{notification.body}</p>
          )}
        </CardContent>
      </Card>
      {!notification.encrypted ? (
        <div className="notification-data-grid">
          <section
            className="notification-data-panel"
            aria-labelledby="alert-data-title"
          >
            <div className="notification-data-heading">
              <div>
                <span>Parsed fields</span>
                <h2 id="alert-data-title">Alert data</h2>
              </div>
            </div>
            {details.length > 0 ? (
              <dl className="notification-details">
                {details.map(([key, value]) => {
                  const href = detailHref(value);
                  const showPluginVersionStatus =
                    key === 'plugin_version' &&
                    notification.source.startsWith('WordPress') &&
                    typeof value === 'string';
                  return (
                    <div key={key}>
                      <dt>{key.replaceAll('_', ' ')}</dt>
                      <dd>
                        {href ? (
                          <a href={href} target="_blank" rel="noreferrer">
                            {detailValue(value)}
                            <ExternalLink aria-hidden="true" />
                          </a>
                        ) : (
                          detailValue(value)
                        )}
                        {showPluginVersionStatus ? (
                          <PluginVersionStatus installed={value} />
                        ) : null}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            ) : (
              <p className="notification-data-empty">
                No additional event fields were included.
              </p>
            )}
          </section>
          {rawPayload ? <RawPayloadPanel payload={rawPayload} /> : null}
        </div>
      ) : null}
    </DashboardShell>
  );
}
