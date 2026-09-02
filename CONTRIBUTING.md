# Contributing

Thanks for helping improve the Notificator Dashboard.

## Before opening a change

- Use a public issue for bugs and feature proposals that contain no sensitive
  information.
- Follow [SECURITY.md](SECURITY.md) for vulnerabilities or suspected data
  exposure.
- Do not include account data, API keys, Supabase secrets, MQTT credentials, or
  production environment files in issues, screenshots, fixtures, or commits.

## Local development

Use Node.js 22.13 or newer and the npm version declared in `package.json`.

```bash
npm ci
cp .env.example .env
npm run dev
```

Use a development Supabase project or a test account. Only a Supabase
publishable key may be used by this application.

## Validation

Run the same checks used by continuous integration before opening a pull
request:

```bash
npm audit --omit=dev
npm run lint
npm run build
```

Keep changes focused and document user-visible behavior or configuration
changes in the pull request.
