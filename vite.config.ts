import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { deriveSite } from './src/lib/site.js'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))
const site = deriveSite(JSON.parse(readFileSync(new URL('./site.config.json', import.meta.url), 'utf-8')))

// La identidad del despliegue sale de site.config.json, igual que en src/config.ts y en
// scripts/build-feeds.mjs. `base` incluida: GitHub Pages sirve el proyecto bajo /<repo>/, y con
// un dominio propio bajo /.
export default defineConfig({
  base: site.base,
  plugins: [
    react(),
    {
      // El título, la descripción y el emoji del favicon también son identidad: si se quedaran
      // escritos en index.html, cada fork tendría «Calendari» en la pestaña del navegador.
      name: 'site-identity-html',
      transformIndexHtml(html: string) {
        return html
          .replace('{{APP_TITLE}}', `${site.app.name} — ${site.app.tagline}`)
          .replace('{{APP_DESCRIPTION}}', site.app.description)
          .replace('{{APP_EMOJI}}', site.app.emoji)
      },
    },
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
})
