# 📅 Calendari — Planificador de curso

App web **100 % estática** (React + Vite + TypeScript) para planificar el **calendario escolar y
académico** de un conservatorio de música o danza. Se despliega en GitHub Pages y toda la
persistencia es del lado del cliente: `localStorage` más import/export JSON. No hay servidor.

> **Provisional.** Este README es un marcador de posición: la guía para usar el proyecto en otro
> centro (forkear, configurar y publicar los feeds) está por escribir. Mientras tanto, lo esencial:
> todo lo que distingue un despliegue de otro vive en **`site.config.json`**, y no hay que tocar
> código para adaptarlo.

## Desarrollo

```bash
npm install
npm run dev        # servidor local
npm run build      # feeds ICS + typecheck + build de producción
npm test           # lógica pura y transiciones del estado
```

## Licencia

MIT (ver [`LICENSE`](LICENSE)). El nombre «Calendari» y el logotipo no se licencian: si publicas
una versión modificada, ponle tu propio nombre y tu contacto en `site.config.json`.
