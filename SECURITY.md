# Security policy

## Reporting a vulnerability

Please do not disclose security vulnerabilities in a public issue. Report them
through GitHub's **Security** tab using a private vulnerability report. If that
option is not available, use the [Notificator contact form](https://notificator-project.com/contact/).

Include the affected route or feature, reproduction steps, and the potential
impact. Please avoid accessing or modifying data that does not belong to your
own test account.

## Supported version

The dashboard is currently a beta. Security fixes are applied to the latest
version on the `main` branch.

## Deployment secrets

This repository must only receive a Supabase publishable key. Never put a
Supabase secret or service-role key, an Expo access token, MQTT credentials, or
user API keys in the source tree or client-facing deployment variables.
