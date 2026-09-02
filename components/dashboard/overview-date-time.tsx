'use client';

import { useEffect, useState } from 'react';

const timeZone = 'Europe/Athens';

function formatTime(date: Date) {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone,
  }).format(date);
}

type OverviewDateTimeProps = {
  dateLabel: string;
  initialTimeLabel: string;
};

/** Keeps the overview clock current without forcing a dashboard refresh. */
export function OverviewDateTime({
  dateLabel,
  initialTimeLabel,
}: OverviewDateTimeProps) {
  const [timeLabel, setTimeLabel] = useState(initialTimeLabel);

  useEffect(() => {
    const updateTime = () => setTimeLabel(formatTime(new Date()));
    updateTime();

    const interval = window.setInterval(updateTime, 1_000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <p className="eyebrow overview-date-time">
      <span>{dateLabel}</span>
      <span className="overview-date-time-separator" aria-hidden="true">
        ·
      </span>
      <time dateTime={timeLabel} title="Current time in Athens">
        {timeLabel}
      </time>
    </p>
  );
}
