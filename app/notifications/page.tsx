import Link from 'next/link';
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  LockKeyhole,
  Search,
  X,
} from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { DeleteUnlockedNotificationsButton } from '@/components/dashboard/delete-unlocked-notifications-button';
import { MarkAllReadButton } from '@/components/dashboard/mark-all-read-button';
import { NotificationRowActions } from '@/components/dashboard/notification-row-actions';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { requireUser } from '@/lib/auth/session';
import {
  loadDashboardNotifications,
  loadDashboardShellOverview,
} from '@/lib/dashboard/overview';

export const dynamic = 'force-dynamic';

function param(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value || '').trim();
}

function notificationKind(source: string) {
  return /^(WordPress|Strapi)(\s|·|$)/i.test(source) ? 'cms' : 'non_cms';
}

const pageSize = 10;
const dashboardTimeZone = 'Europe/Athens';

function calendarDay(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : new Intl.DateTimeFormat('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: dashboardTimeZone,
      }).format(date);
}

function pageHref(
  page: number,
  values: { query: string; status: string; severity: string; kind: string },
) {
  const params = new URLSearchParams();
  if (values.query) params.set('q', values.query);
  if (values.status !== 'all') params.set('status', values.status);
  if (values.severity !== 'all') params.set('severity', values.severity);
  if (values.kind !== 'all') params.set('kind', values.kind);
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `/notifications?${query}` : '/notifications';
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    status?: string | string[];
    severity?: string | string[];
    kind?: string | string[];
    page?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const query = param(params.q);
  const status = param(params.status) || 'all';
  const severity = param(params.severity) || 'all';
  const kind = param(params.kind) || 'all';
  const requestedPage = Number.parseInt(param(params.page), 10);
  const user = await requireUser('/notifications');
  const [overview, notifications] = await Promise.all([
    loadDashboardShellOverview(user),
    loadDashboardNotifications(user),
  ]);
  const normalizedQuery = query.toLowerCase();
  const filteredNotifications = notifications.filter((notification) => {
    const matchesQuery =
      !normalizedQuery ||
      [notification.title, notification.body, notification.source].some(
        (value) => value.toLowerCase().includes(normalizedQuery),
      );
    const matchesStatus =
      status === 'all' ||
      (status === 'unread' && notification.unread) ||
      (status === 'read' && !notification.unread);
    const matchesSeverity =
      severity === 'all' || notification.severity.toLowerCase() === severity;
    const matchesKind =
      kind === 'all' || notificationKind(notification.source) === kind;
    return matchesQuery && matchesStatus && matchesSeverity && matchesKind;
  });
  const filtering = Boolean(
    query || status !== 'all' || severity !== 'all' || kind !== 'all',
  );
  const totalPages = Math.max(
    1,
    Math.ceil(filteredNotifications.length / pageSize),
  );
  const currentPage = Math.min(
    Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1,
    totalPages,
  );
  const pageNotifications = filteredNotifications.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const today = calendarDay(new Date().toISOString());
  const notificationGroups = [
    {
      label: 'Today',
      notifications: pageNotifications.filter(
        (notification) => calendarDay(notification.timestamp) === today,
      ),
    },
    {
      label: 'Earlier',
      notifications: pageNotifications.filter(
        (notification) => calendarDay(notification.timestamp) !== today,
      ),
    },
  ].filter((group) => group.notifications.length > 0);
  const pageValues = { query, status, severity, kind };
  return (
    <DashboardShell
      activePath="/notifications"
      overview={overview}
      eyebrow="INBOX"
      title="Notifications"
      description="Every connected event, decrypted for this account."
    >
      <form className="notification-filters" method="get">
        <div className="notification-search">
          <Search />
          <Input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search title, message, or source"
            aria-label="Search notifications"
          />
        </div>
        <label>
          <span>Status</span>
          <select name="status" defaultValue={status}>
            <option value="all">All</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
        </label>
        <label>
          <span>Severity</span>
          <select name="severity" defaultValue={severity}>
            <option value="all">All</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="information">Information</option>
          </select>
        </label>
        <label>
          <span>Source type</span>
          <select name="kind" defaultValue={kind}>
            <option value="all">All sources</option>
            <option value="cms">CMS</option>
            <option value="non_cms">Non-CMS</option>
          </select>
        </label>
        <Button type="submit">Apply filters</Button>
        {filtering ? (
          <Link
            href="/notifications"
            className={buttonVariants({ variant: 'ghost' })}
          >
            <X /> Clear
          </Link>
        ) : null}
      </form>
      <div className="notification-list-summary">
        <p className="filter-result-count">
          {filteredNotifications.length} matching notifications · page{' '}
          {currentPage} of {totalPages}
        </p>
        <div className="notification-list-actions">
          {notifications.some((notification) => notification.unread) ? (
            <MarkAllReadButton />
          ) : null}
          {notifications.length > 0 ? (
            <DeleteUnlockedNotificationsButton
              disabled={
                !notifications.some((notification) => !notification.locked)
              }
            />
          ) : null}
        </div>
      </div>
      <Card className="activity-card page-card">
        <CardContent className="notification-list full-notification-list">
          {notificationGroups.map((group) => (
            <section
              className="notification-day-group"
              key={group.label}
              aria-labelledby={`notification-group-${group.label.toLowerCase()}`}
            >
              <div className="notification-day-heading">
                <h2 id={`notification-group-${group.label.toLowerCase()}`}>
                  {group.label}
                </h2>
                <span>{group.notifications.length}</span>
              </div>
              {group.notifications.map((notification) => (
                <article
                  key={notification.id}
                  className={
                    [
                      notification.unread ? 'unread' : '',
                      notification.locked ? 'locked' : '',
                    ]
                      .filter(Boolean)
                      .join(' ') || undefined
                  }
                >
                  <span
                    className={`severity severity-${notification.severity.toLowerCase()}`}
                  >
                    <Bell />
                  </span>
                  <div className="notification-copy">
                    <div>
                      <h2>
                        <Link href={`/notifications/${notification.id}`}>
                          {notification.title}
                        </Link>
                      </h2>
                      {notification.unread ? (
                        <>
                          <i aria-hidden="true" />
                          <span className="sr-only">Unread</span>
                        </>
                      ) : null}
                      {notification.locked ? (
                        <span className="locked-notification-pill">
                          <LockKeyhole aria-hidden="true" /> Locked
                        </span>
                      ) : null}
                    </div>
                    <p>{notification.source}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`severity-label ${notification.severity.toLowerCase()}`}
                  >
                    {notification.severity}
                  </Badge>
                  <time>{notification.time}</time>
                  <Link
                    className="row-link"
                    href={`/notifications/${notification.id}`}
                    aria-label={`Read ${notification.title}`}
                  >
                    <ChevronRight />
                  </Link>
                  <NotificationRowActions
                    id={notification.id}
                    title={notification.title}
                    unread={notification.unread}
                    locked={notification.locked}
                  />
                </article>
              ))}
            </section>
          ))}
          {filteredNotifications.length === 0 ? (
            <div className="dashboard-empty-state">
              <Bell />
              <div>
                <strong>
                  {filtering
                    ? 'No matching notifications'
                    : 'No notifications yet'}
                </strong>
                <span>
                  {filtering
                    ? 'Try a broader search or clear the filters.'
                    : 'Connected events will appear here.'}
                </span>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
      {totalPages > 1 ? (
        <nav className="pagination" aria-label="Notification pages">
          {currentPage > 1 ? (
            <Link
              href={pageHref(currentPage - 1, pageValues)}
              className={buttonVariants({ variant: 'outline' })}
            >
              <ChevronLeft /> Previous
            </Link>
          ) : (
            <Button variant="outline" disabled>
              <ChevronLeft /> Previous
            </Button>
          )}
          <span>
            Page {currentPage} of {totalPages}
          </span>
          {currentPage < totalPages ? (
            <Link
              href={pageHref(currentPage + 1, pageValues)}
              className={buttonVariants({ variant: 'outline' })}
            >
              Next <ChevronRight />
            </Link>
          ) : (
            <Button variant="outline" disabled>
              Next <ChevronRight />
            </Button>
          )}
        </nav>
      ) : null}
    </DashboardShell>
  );
}
