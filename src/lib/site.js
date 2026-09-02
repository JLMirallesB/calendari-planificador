// Deriva de `site.config.json` (raíz del proyecto) todo lo que depende de la identidad del
// despliegue: la ruta base con la que se sirve la app, la URL pública, la base `webcal://` de
// los feeds y la URL del repositorio.
//
// JS plano isomórfico, el mismo caso que `icsCore.js`: lo consumen la app (vía `site.d.ts`),
// `vite.config.ts` y `scripts/build-feeds.mjs`. Así el usuario, el repo y la URL pública se
// escriben UNA vez. Antes estaban repetidos en cuatro ficheros y lo único que los mantenía de
// acuerdo era un comentario pidiéndolo.

/** Exige un campo de texto y falla con el camino exacto: un fork lo lee y lo arregla. */
function req(value, path) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`site.config.json: falta «${path}» o no es un texto.`)
  }
  return value.trim()
}

/** Barra final asegurada: estas bases se concatenan con rutas relativas. */
function withSlash(url) {
  return url.endsWith('/') ? url : url + '/'
}

/**
 * @param {unknown} raw contenido de site.config.json
 */
export function deriveSite(raw) {
  const cfg = raw && typeof raw === 'object' ? raw : {}
  const app = cfg.app || {}
  const github = cfg.github || {}
  const maintainer = cfg.maintainer || {}
  const cev = cfg.cev || {}

  const user = req(github.user, 'github.user')
  const repo = req(github.repo, 'github.repo')

  // Por defecto, la URL de un proyecto en GitHub Pages. `publicBaseUrl` permite un dominio
  // propio sin tocar código. Va SIEMPRE escrita, nunca derivada de `window.location`: la hoja
  // impresa lleva un QR con esta URL, y un PDF generado desde el servidor local llevaría
  // entonces un QR a «localhost», inútil en papel y silencioso hasta que alguien lo escanea.
  const publicBaseUrl = withSlash(
    cfg.publicBaseUrl ? req(cfg.publicBaseUrl, 'publicBaseUrl') : `https://${user}.github.io/${repo}/`,
  )

  return {
    app: {
      name: req(app.name, 'app.name'),
      tagline: req(app.tagline, 'app.tagline'),
      emoji: req(app.emoji, 'app.emoji'),
      description: req(app.description, 'app.description'),
    },
    github: { user, repo },
    maintainer: {
      name: req(maintainer.name, 'maintainer.name'),
      site: req(maintainer.site, 'maintainer.site'),
      email: req(maintainer.email, 'maintainer.email'),
    },
    cev: { datasetBase: withSlash(req(cev.datasetBase, 'cev.datasetBase')) },
    // Dos despliegues del mismo usuario en GitHub Pages comparten ORIGEN («usuario.github.io»), y
    // localStorage es por origen, no por ruta: sin este prefijo, la demo y el planificador del
    // centro se pisarían los datos. Se saca de la ruta base, que es justo lo que los distingue.
    storagePrefix: `calendari:${new URL(publicBaseUrl).pathname.replace(/^\/|\/$/g, '') || 'raiz'}:`,
    // Solo el despliegue que ya tenía datos con las claves antiguas (sin prefijo) las adopta. En
    // los demás la bandera no está, y así la demo no se trae los calendarios de nadie.
    legacyStorage: cfg.legacyStorage === true,
    // Se saca de la URL pública, no del nombre del repo: con un dominio propio la app se sirve
    // en la raíz («/») y no bajo «/<repo>/».
    base: new URL(publicBaseUrl).pathname,
    publicBaseUrl,
    webcalBase: publicBaseUrl.replace(/^https?:\/\//, 'webcal://'),
    repoUrl: `https://github.com/${user}/${repo}`,
  }
}
