'use client';

import { Bell, ChevronRight, LockKeyhole } from 'lucide-react';
import { NotificationRowActions } from '@/components/dashboard/notification-row-actions';
import { Badge } from '@/components/ui/badge';

type NotificationRowProps = {
  id: string;
  title: string;
  source: string;
  severity: string;
  time: string;
  unread: boolean;
  locked: boolean;
  actions?: boolean;
};

export function NotificationRow({
  id,
  title,
  source,
  severity,
  time,
  unread,
  locked,
  actions = true,
}: NotificationRowProps) {
  const href = `/notifications/${id}`;

  return (
    <article
      className={[
        unread ? 'unread' : '',
        locked ? 'locked' : '',
        actions === false ? 'no-actions' : '',
      ]
        .filter(Boolean)
        .join(' ') || undefined}
    >
      <span className={`severity severity-${severity.toLowerCase()}`}>
        <Bell />
      </span>
      <div className="notification-copy">
        <div>
          <h2>{title}</h2>
          {unread ? (
            <>
              <i aria-hidden="true" />
              <span className="sr-only">Unread</span>
            </>
          ) : null}
          {locked ? (
            <span className="locked-notification-pill">
              <LockKeyhole aria-hidden="true" /> Locked
            </span>
          ) : null}
        </div>
        <p>{source}</p>
      </div>
      <Badge
        variant="outline"
        className={`severity-label ${severity.toLowerCase()}`}
      >
        {severity}
      </Badge>
      <time>{time}</time>
      <a className="row-link" href={href} aria-label={`Read ${title}`}>
        <ChevronRight />
      </a>
      {actions ? (
        <NotificationRowActions
          id={id}
          title={title}
          unread={unread}
          locked={locked}
        />
      ) : null}
    </article>
  );
}
