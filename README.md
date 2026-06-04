# PSU Gang — Watt Calculator

Calculadora web de consumo eléctrico y fuente recomendada para PCs. Desarrollada para [PSU Gang](https://psugang.com).

## Qué hace

- Selección de CPU, GPU (multi-GPU), motherboard, disipador, ventiladores y almacenamiento
- Modos ATX 2.52 (pico transitorio) y ATX 3.x (TDP nominal)
- Tier de fuente por letras (X → F) según carga CPU + GPU
- Fuente recomendada por escalones estándar con tolerancia del 5%
- Aviso de fuentes que requieren instalación 220 V / 230 V
- Desglose de consumo por rail (12 V, 5 V, 3.3 V)

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 15 (App Router) |
| UI | React 19 + Tailwind CSS 4 |
| Lenguaje | TypeScript 5 |
| Tests | Vitest |
| Deploy | Cloudflare Pages (`@cloudflare/next-on-pages`) |

## Setup local

**Requisitos:** Node.js 20+ y npm.

```bash
# 1. Clonar
git clone <url-del-repo>
cd PSU-GANG-WEB-CALCULATOR

# 2. Instalar dependencias
npm install

# 3. Variables de entorno (opcional para dev)
cp .env.example .env.local
# Editar NEXT_PUBLIC_SITE_URL si es necesario

# 4. Correr en desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Variables de entorno

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `NEXT_PUBLIC_SITE_URL` | URL de producción (ej. `https://psugang.com`) | Solo en producción |

Sin esta variable, el build usa `https://psugang.com` como fallback.

## Scripts

```bash
npm run dev          # Servidor de desarrollo (Next.js)
npm run build        # Build de producción (Next.js)
npm run test         # Correr tests con Vitest
npm run pages:build  # Build para Cloudflare Pages
npm run preview      # Preview local del build de CF Pages
npm run deploy       # Deploy a Cloudflare Pages
```

## Estructura del proyecto

```
src/
├── app/             # Rutas y layout (Next.js App Router)
├── components/      # Componentes React (Calculator, ResultCard, etc.)
├── data/            # JSONs con CPUs, GPUs, motherboards, fuentes, tiers, etc.
├── lib/             # Lógica pura: calculator.ts, search.ts (con tests)
└── types/           # Tipos TypeScript compartidos
```

### Archivos clave

- `src/lib/calculator.ts` — toda la lógica de cálculo (watts, tier, PSU)
- `src/data/` — fuente de verdad de los componentes; agregar/editar componentes aquí
- `src/lib/site.ts` — metadatos del sitio (SEO, OG, JSON-LD)

## Tests

```bash
npm run test
```

Los tests están en `src/lib/calculator.test.ts` y `src/lib/search.test.ts`. Cubren la lógica de cálculo y búsqueda; correr antes de hacer PR.

## Deploy

El proyecto despliega en Cloudflare Pages. Cualquier push a `main` dispara el pipeline automáticamente (si está configurado en el dashboard de CF). Para deploy manual:

```bash
npm run deploy
```

Requiere `wrangler` autenticado (`wrangler login`).
