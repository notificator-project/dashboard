import 'server-only';

import { formatDistanceToNowStrict } from 'date-fns';
import nacl from 'tweetnacl';
import type { User } from '@supabase/supabase-js';
import { gravatarUrl } from '@/lib/gravatar';
import { createClient } from '@/lib/supabase/server';

export type OverviewNotification = {
  id: string;
  title: string;
  body: string;
  source: string;
  time: string;
  timestamp: string;
  severity: 'Critical' | 'Warning' | 'Information';
  unread: boolean;
  locked: boolean;
  encrypted: boolean;
  details: Record<string, unknown>;
  rawPayload: Record<string, unknown> | null;
};

export type OverviewDevice = {
  id: string;
  deviceId: string;
  name: string;
  type: string;
  deviceType: string;
  status: 'Online' | 'Offline' | 'Unknown' | 'Paused';
  isPaused: boolean;
  lastSynced: string;
  firmwareVersion: string;
  firmwareUpdateStatus: string;
};

export type DashboardDevice = OverviewDevice & {
  nickname: string;
  weatherCity: string;
  weatherTimezone: string;
  idleTheme: number;
  firmwareCheckedAt: string;
  firmwareTargetVersion: string;
  firmwareLastError: string;
};

export type DashboardOverview = {
  userId: string;
  displayName: string;
  initials: string;
  avatarUrl: string | null;
  dateLabel: string;
  timeLabel: string;
  greeting: string;
  unreadCount: number;
  totalNotifications: number;
  deviceCount: number;
  onlineDeviceCount: number;
  activeApiKeyCount: number;
  activeDestinations: string[];
  notifications: OverviewNotification[];
  devices: OverviewDevice[];
  degraded: boolean;
};

export type DashboardShellOverview = Pick<
  DashboardOverview,
  | 'userId'
  | 'displayName'
  | 'initials'
  | 'avatarUrl'
  | 'unreadCount'
  | 'notifications'
  | 'degraded'
>;

type NotificationPayload = Record<string, unknown> & {
  title?: string;
  body?: string;
  source?: string;
  severity?: string;
  type?: string;
  data?: Record<string, unknown>;
};

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function decodeBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function decryptNotification(
  encryptedPayload: string,
  sharedKey: string,
): NotificationPayload | null {
  try {
    const payload = JSON.parse(encryptedPayload) as Record<string, unknown>;
    if (
      payload.v !== 2 ||
      typeof payload.encryptedData !== 'string' ||
      typeof payload.dataNonce !== 'string' ||
      typeof payload.encryptedKey !== 'string' ||
      typeof payload.keyNonce !== 'string'
    ) {
      return null;
    }

    const wrappingKey = nacl
      .hash(new TextEncoder().encode(sharedKey))
      .slice(0, nacl.secretbox.keyLength);
    const sessionKey = nacl.secretbox.open(
      decodeBase64(payload.encryptedKey),
      decodeBase64(payload.keyNonce),
      wrappingKey,
    );
    if (!sessionKey) return null;

    const plaintext = nacl.secretbox.open(
      decodeBase64(payload.encryptedData),
      decodeBase64(payload.dataNonce),
      sessionKey,
    );
    if (!plaintext) return null;

    return JSON.parse(
      new TextDecoder().decode(plaintext),
    ) as NotificationPayload;
  } catch {
    return null;
  }
}

function notificationSeverity(
  value: unknown,
): OverviewNotification['severity'] {
  const severity = text(value).toLowerCase();
  if (['critical', 'error', 'high'].includes(severity)) return 'Critical';
  if (['warning', 'warn', 'medium'].includes(severity)) return 'Warning';
  return 'Information';
}

function notificationSource(payload: NotificationPayload) {
  const source = text(payload.source || payload.data?.source).toLowerCase();
  const type = text(payload.type).toLowerCase();
  const integration =
    source.includes('wordpress') || source === 'wp_plugin'
      ? 'WordPress'
      : source.includes('strapi')
        ? 'Strapi'
        : source.includes('astro')
          ? 'Astro'
          : type === 'uptime_alert'
            ? 'Monitoring'
            : 'API';
  const context =
    text(payload.data?.site_name) ||
    text(payload.data?.project_name) ||
    text(payload.data?.environment);
  return context ? `${integration} · ${context}` : integration;
}

function relativeTime(timestamp: unknown) {
  const date = new Date(text(timestamp));
  return Number.isNaN(date.getTime())
    ? 'Recently'
    : formatDistanceToNowStrict(date, { addSuffix: true });
}

function mapNotificationRow(
  row: Record<string, unknown>,
  sharedKey: string,
): OverviewNotification {
  const payload = sharedKey
    ? decryptNotification(text(row.encrypted_data), sharedKey)
    : null;
  const timestamp = text(row.timestamp);
  return {
    id: String(row.id),
    title: text(payload?.title) || 'Encrypted notification',
    body:
      text(payload?.body) ||
      (payload
        ? 'No additional message was included with this event.'
        : 'Open the mobile app once to initialize this account’s encryption key.'),
    source: payload
      ? notificationSource(payload)
      : 'Encryption key unavailable',
    time: relativeTime(timestamp),
    timestamp,
    severity: notificationSeverity(
      payload?.severity || payload?.data?.severity,
    ),
    unread: !row.read,
    locked: Boolean(row.locked),
    encrypted: !payload,
    details: payload?.data || {},
    rawPayload: payload,
  };
}

function deviceStatus(value: unknown): OverviewDevice['status'] {
  const status = text(value).toLowerCase();
  if (['up', 'online', 'ready', 'active'].includes(status)) return 'Online';
  if (['down', 'offline'].includes(status)) return 'Offline';
  return 'Unknown';
}

function deviceType(value: unknown) {
  const type = text(value).toLowerCase();
  if (type.includes('touch')) return 'Notificator Touch';
  if (type.includes('matter')) return 'Notificator Matter';
  if (type.includes('base')) return 'Notificator Base';
  return type ? text(value) : 'Notificator device';
}

function accountIdentity(user: User, profile: Record<string, unknown> | null) {
  const firstName = text(profile?.first_name);
  const lastName = text(profile?.last_name);
  const displayName =
    [firstName, lastName].filter(Boolean).join(' ') ||
    text(user.user_metadata?.full_name) ||
    text(user.email).split('@')[0] ||
    'there';
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  return { displayName, initials: initials || 'N' };
}

function dateContext() {
  const now = new Date();
  const timeZone = 'Europe/Athens';
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      hour12: false,
      timeZone,
    }).format(now),
  );
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const dateLabel = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone,
  })
    .format(now)
    .toUpperCase();
  const timeLabel = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone,
  }).format(now);
  return { greeting, dateLabel, timeLabel };
}

export async function loadDashboardOverview(
  user: User,
): Promise<DashboardOverview> {
  const supabase = await createClient();
  const [
    profileResult,
    unreadResult,
    notificationCountResult,
    notificationsResult,
    devicesResult,
    apiKeysResult,
    pushTokensResult,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('first_name, last_name, email_notifications, public_key')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('encrypted_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false),
    supabase
      .from('encrypted_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('encrypted_notifications')
      .select('id, encrypted_data, read, locked, timestamp')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false })
      .limit(4),
    supabase
      .from('devices')
      .select(
        'id, device_id, name, nickname, device_type, last_status, last_check, is_active, is_paused, firmware_version, firmware_update_status',
      )
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('api_keys')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('revoked_at', null),
    supabase
      .from('push_tokens')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('enabled', true),
  ]);

  const results = [
    profileResult,
    unreadResult,
    notificationCountResult,
    notificationsResult,
    devicesResult,
    apiKeysResult,
    pushTokensResult,
  ];
  const degraded = results.some((result) => Boolean(result.error));
  if (degraded) {
    console.warn(
      '[Dashboard] Some overview queries failed:',
      results.flatMap((result) => (result.error ? [result.error.message] : [])),
    );
  }

  const profile = profileResult.data as Record<string, unknown> | null;
  const sharedKey = text(profile?.public_key);
  const notificationRows = Array.isArray(notificationsResult.data)
    ? notificationsResult.data
    : [];
  const notifications = notificationRows.map((row) =>
    mapNotificationRow(row, sharedKey),
  );

  const deviceRows = Array.isArray(devicesResult.data)
    ? devicesResult.data
    : [];
  const devices = deviceRows.slice(0, 3).map((device) => ({
    id: String(device.id),
    deviceId: text(device.device_id),
    name: text(device.nickname) || text(device.name) || 'Unnamed device',
    type: deviceType(device.device_type),
    deviceType: text(device.device_type),
    status: device.is_paused ? 'Paused' : deviceStatus(device.last_status),
    isPaused: device.is_paused === true,
    lastSynced: relativeTime(device.last_check),
    firmwareVersion: text(device.firmware_version),
    firmwareUpdateStatus: text(device.firmware_update_status) || 'idle',
  }));
  const onlineDeviceCount = deviceRows.filter(
    (device) =>
      device.is_paused !== true &&
      deviceStatus(device.last_status) === 'Online',
  ).length;

  const activeDestinations = [
    (pushTokensResult.count || 0) > 0 ? 'Push' : '',
    profile?.email_notifications === true ? 'Email' : '',
    deviceRows.length > 0 ? 'MQTT' : '',
  ].filter(Boolean);

  return {
    userId: user.id,
    ...accountIdentity(user, profile),
    avatarUrl: gravatarUrl(user.email, 96),
    ...dateContext(),
    unreadCount: unreadResult.count || 0,
    totalNotifications: notificationCountResult.count || 0,
    deviceCount: deviceRows.length,
    onlineDeviceCount,
    activeApiKeyCount: apiKeysResult.count || 0,
    activeDestinations,
    notifications,
    devices,
    degraded,
  };
}

/** Loads only the identity and alert state shared by secondary dashboard pages. */
export async function loadDashboardShellOverview(
  user: User,
): Promise<DashboardShellOverview> {
  const supabase = await createClient();
  const [profileResult, unreadResult, notificationsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('first_name, last_name, public_key')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('encrypted_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false),
    supabase
      .from('encrypted_notifications')
      .select('id, encrypted_data, read, locked, timestamp')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false })
      .limit(4),
  ]);
  const profile = profileResult.data as Record<string, unknown> | null;
  const sharedKey = text(profile?.public_key);
  const notificationRows = Array.isArray(notificationsResult.data)
    ? notificationsResult.data
    : [];

  return {
    userId: user.id,
    ...accountIdentity(user, profile),
    avatarUrl: gravatarUrl(user.email, 96),
    unreadCount: unreadResult.count || 0,
    notifications: notificationRows.map((row) =>
      mapNotificationRow(row, sharedKey),
    ),
    degraded: [profileResult, unreadResult, notificationsResult].some(
      (result) => Boolean(result.error),
    ),
  };
}

export async function loadDashboardNotifications(
  user: User,
  limit = 50,
): Promise<OverviewNotification[]> {
  const supabase = await createClient();
  const [{ data: profile }, { data: rows, error }] = await Promise.all([
    supabase
      .from('profiles')
      .select('public_key')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('encrypted_notifications')
      .select('id, encrypted_data, read, locked, timestamp')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false })
      .limit(limit),
  ]);
  if (error) throw error;
  const sharedKey = text(profile?.public_key);
  return (Array.isArray(rows) ? rows : []).map((row) =>
    mapNotificationRow(row, sharedKey),
  );
}

export async function loadDashboardNotification(user: User, id: string) {
  const supabase = await createClient();
  const [{ data: profile }, { data: row, error }] = await Promise.all([
    supabase
      .from('profiles')
      .select('public_key')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('encrypted_notifications')
      .select('id, encrypted_data, read, locked, timestamp')
      .eq('user_id', user.id)
      .eq('id', id)
      .maybeSingle(),
  ]);
  if (error) throw error;
  return row ? mapNotificationRow(row, text(profile?.public_key)) : null;
}

export async function loadDashboardDevices(
  user: User,
): Promise<OverviewDevice[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('devices')
    .select(
      'id, device_id, name, nickname, device_type, last_status, last_check, is_active, is_paused, firmware_version, firmware_update_status',
    )
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (Array.isArray(data) ? data : []).map((device) => ({
    id: String(device.id),
    deviceId: text(device.device_id),
    name: text(device.nickname) || text(device.name) || 'Unnamed device',
    type: deviceType(device.device_type),
    deviceType: text(device.device_type),
    status: device.is_paused ? 'Paused' : deviceStatus(device.last_status),
    isPaused: device.is_paused === true,
    lastSynced: relativeTime(device.last_check),
    firmwareVersion: text(device.firmware_version),
    firmwareUpdateStatus: text(device.firmware_update_status) || 'idle',
  }));
}

export async function loadDashboardDevice(
  user: User,
  id: string,
): Promise<DashboardDevice | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('devices')
    .select(
      'id, device_id, name, nickname, device_type, last_status, last_check, is_paused, weather_city, weather_timezone, idle_theme, firmware_version, firmware_checked_at, firmware_target_version, firmware_update_status, firmware_last_error',
    )
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: String(data.id),
    deviceId: text(data.device_id),
    name: text(data.nickname) || text(data.name) || 'Unnamed device',
    nickname: text(data.nickname),
    type: deviceType(data.device_type),
    deviceType: text(data.device_type),
    status: data.is_paused ? 'Paused' : deviceStatus(data.last_status),
    isPaused: data.is_paused === true,
    lastSynced: relativeTime(data.last_check),
    firmwareVersion: text(data.firmware_version),
    firmwareCheckedAt: text(data.firmware_checked_at),
    firmwareTargetVersion: text(data.firmware_target_version),
    firmwareUpdateStatus: text(data.firmware_update_status) || 'idle',
    firmwareLastError: text(data.firmware_last_error),
    weatherCity: text(data.weather_city),
    weatherTimezone: text(data.weather_timezone),
    idleTheme: Number.isFinite(Number(data.idle_theme))
      ? Number(data.idle_theme)
      : 0,
  };
}
