import tailwindcss from '@tailwindcss/vite';
import rsc from '@vitejs/plugin-rsc';
import { nitro } from 'nitro/vite';
import vinext from 'vinext';
import { defineConfig } from 'vite';

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === 'seatbelt';

export default defineConfig({
  server: isCodexSeatbeltSandbox
    ? { watch: { useFsEvents: false, usePolling: true } }
    : undefined,
  // Nitro exposes a fetch-based RSC environment without runner.import. Keep
  // plugin-rsc validation/build support, but disable its default dev request
  // middleware; vinext/Nitro provide the request handler for this adapter.
  plugins: [
    tailwindcss(),
    vinext({ rsc: false }),
    rsc({ serverHandler: false }),
    nitro({ preset: 'netlify' }),
  ],
  resolve: {
    alias: [
      {
        find: /^use-sync-external-store\/shim$/,
        replacement: new URL(
          './lib/use-sync-external-store-shim.ts',
          import.meta.url,
        ).pathname,
      },
      {
        find: /^use-sync-external-store\/shim\/with-selector$/,
        replacement: new URL(
          './lib/use-sync-external-store-with-selector.ts',
          import.meta.url,
        ).pathname,
      },
    ],
  },
});
