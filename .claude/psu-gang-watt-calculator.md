
# PSU Gang — Watt Calculator

Calculadora de consumo eléctrico para builds de PC gamer. Sitio temporal hasta el lanzamiento de la página oficial de PSU Gang.

---

## Objetivo

Permitir al usuario seleccionar los componentes de su PC (CPU, GPU, motherboard, ventiladores) y obtener de forma instantánea la potencia recomendada de fuente de poder, con soporte para dos estándares: **ATX 2.52 e inferiores** (cálculo por pico transitorio) y **ATX 3.x** (cálculo por TDP / power excursion). Sin fricción, sin espera, sin backend en caliente.

---

## Stack Tecnológico

| Capa | Tecnología | Razón |
|---|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript | Mismo stack que Finiix; SSG puro = cero latencia en cálculos |
| Estilos | Tailwind CSS v4 | Utilidades rápidas, coherencia con PSU Gang design tokens |
| Datos | JSON estático embebido en el bundle | Exportado una vez desde Google Sheets; sin DB, sin API calls en runtime |
| Despliegue | Cloudflare Workers (static assets) | `wrangler deploy` sirve `./out` (`next build` con `output: "export"`); dominio propio, sin `*.workers.dev` |
| Dominio | Cloudflare (`psugang.com`, custom domain) | Gestión centralizada DNS + hosting en la misma plataforma |
| Imágenes tier | Archivos estáticos en `/public/tiers/` | Entregados por Daniel; servidos por el CDN edge de Cloudflare |

> **Sin base de datos.** Los datos viven en archivos `.json` dentro del repositorio. No hay superficie de ataque SQL, no hay credenciales que rotar, no hay latencia de red en los cálculos. Los únicos datos que el usuario "envía" son selecciones locales que nunca salen del navegador.

---

## Seguridad

- **Sin SQL**: no hay base de datos → inyección SQL imposible por diseño.
- **Sin formularios que persistan datos**: toda la lógica de cálculo es client-side.
- **Sin inputs de texto libre**: todos los campos son `<select>` / `<checkbox>` / `<number>` con validación de rango. Nada se interpola en HTML ni en queries.
- **Headers de seguridad**: configurados en `next.config.ts` (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy`).
- **Vercel HTTPS automático**: TLS/SSL sin configuración extra.
- **Sin dependencias innecesarias**: proyecto lean; menos superficie de ataque en supply chain.

---

## Estructura del Repositorio

```
psu-gang-calculator/
├── public/
│   └── tiers/              # Imágenes de tier entregadas por Daniel
│       ├── tier-1.webp     # Ejemplo: 400–500W
│       ├── tier-2.webp
│       └── ...
├── src/
│   ├── app/
│   │   ├── layout.tsx      # Fuentes, metadatos, fondo global
│   │   └── page.tsx        # Única página — la calculadora
│   ├── components/
│   │   ├── Calculator.tsx  # Componente principal (lógica + UI)
│   │   ├── ComponentSelect.tsx   # Selector reutilizable (CPU, GPU, etc.)
│   │   ├── AtxToggle.tsx   # Switch ATX 2.52 / ATX 3.x
│   │   ├── ResultCard.tsx  # Muestra watts + imagen de tier
│   │   └── TierImage.tsx   # Imagen recomendada por tier
│   ├── data/
│   │   ├── cpus.json       # Modelos + TDP + pico transitorio
│   │   ├── gpus.json       # Modelos + TDP + pico transitorio
│   │   ├── motherboards.json
│   │   ├── fans.json       # Consumo por unidad; selector de cantidad
│   │   └── tiers.json      # Rangos de watts → imagen de tier
│   ├── lib/
│   │   └── calculator.ts   # Lógica de cálculo pura (sin side effects)
│   └── types/
│       └── components.ts   # Interfaces TypeScript para los datos
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

---

## Esquema de Datos (JSON)

### `cpus.json`
```json
[
  {
    "id": "ryzen-5-5600x",
    "brand": "AMD",
    "family": "Ryzen 5 5000",
    "model": "Ryzen 5 5600X",
    "socket": "AM4",
    "tdp_w": 65,
    "peak_w": 88
  }
]
```

### `gpus.json`
```json
[
  {
    "id": "rtx-4070",
    "brand": "NVIDIA",
    "family": "RTX 40",
    "model": "RTX 4070",
    "tdp_w": 200,
    "peak_w": 400
  }
]
```
> `peak_w` = consumo de pico transitorio (usado en ATX 2.52). `tdp_w` = TDP nominal (usado en ATX 3.x con power excursion cubierta).

### `motherboards.json`
```json
[
  {
    "id": "b550-atx",
    "label": "B550 ATX",
    "avg_w": 30
  }
]
```

### `fans.json`
```json
[
  {
    "id": "120mm-standard",
    "label": "120mm estándar",
    "w_per_unit": 2.5
  },
  {
    "id": "140mm-standard",
    "label": "140mm estándar",
    "w_per_unit": 3
  },
  {
    "id": "120mm-high-static",
    "label": "120mm alto flujo",
    "w_per_unit": 4.5
  }
]
```

### `tiers.json`
```json
[
  {
    "id": "tier-s",
    "label": "Tier S",
    "image": "/tiers/tier-s.webp",
    "max_cpu_w": null,
    "max_gpu_w": null
  },
  {
    "id": "tier-a",
    "label": "Tier A",
    "image": "/tiers/tier-a.webp",
    "max_cpu_w": null,
    "max_gpu_w": null
  },
  {
    "id": "tier-b-plus",
    "label": "Tier B+",
    "image": "/tiers/tier-b-plus.webp",
    "max_cpu_w": 370,
    "max_gpu_w": 530
  },
  {
    "id": "tier-b",
    "label": "Tier B",
    "image": "/tiers/tier-b.webp",
    "max_cpu_w": 250,
    "max_gpu_w": 460
  },
  {
    "id": "tier-c-plus",
    "label": "Tier C+",
    "image": "/tiers/tier-c-plus.webp",
    "max_cpu_w": 155,
    "max_gpu_w": 370
  },
  {
    "id": "tier-c",
    "label": "Tier C",
    "image": "/tiers/tier-c.webp",
    "max_cpu_w": 155,
    "max_gpu_w": 260
  },
  {
    "id": "tier-d",
    "label": "Tier D",
    "image": "/tiers/tier-d.webp",
    "max_cpu_w": 140,
    "max_gpu_w": 240
  },
  {
    "id": "tier-e",
    "label": "Tier E",
    "image": "/tiers/tier-e.webp",
    "max_cpu_w": 140,
    "max_gpu_w": 75
  },
  {
    "id": "tier-f",
    "label": "Tier F",
    "image": "/tiers/tier-f.webp",
    "max_cpu_w": 60,
    "max_gpu_w": 0
  }
]
```
> `null` en `max_cpu_w` / `max_gpu_w` = sin restricción (infinite). El tier recomendado es el **más bajo** (peor tier) cuyo `max_cpu_w ≥ cpuLoad` y `max_gpu_w ≥ gpuLoad` (carga sumada multi-GPU). Los tiers están ordenados de mejor a peor; el algoritmo recorre la lista al revés y devuelve el primero que no viola ningún límite.

### `psus.json`
```json
[
  { "w": 450,  "requires_220v": false },
  { "w": 1600, "requires_220v": false },
  { "w": 2000, "requires_220v": true }
]
```
> Escalones de fuente estándar en orden ascendente. `requires_220v: true` = la unidad exige instalación 220V/230V. Usado por `recommendPsu` (Paso 4): primer escalón donde `consumoTotal ≤ w × 1.05`.

---

## Lógica de Cálculo (`calculator.ts`)

### Paso 1 — Determinar los valores de consumo según estándar ATX

```
field = (atx === "2.52") ? "peak_w" : "tdp_w"   // 2.52 → pico transitorio; 3.x → TDP

cpuLoad = cpu[field]              // alimenta SOLO el consumo/fuente recomendada
gpuLoad = Σ gpu[field]            // multi-GPU: suma de TODAS las GPUs seleccionadas

cpuPeak = cpu.peak_w             // alimenta el TIER (siempre, ignora el toggle ATX)
gpuPeak = Σ gpu.peak_w
```

> El estándar ATX seleccionado determina **qué valor del dataset** alimenta el **consumo / fuente recomendada** (Pasos 2 y 4):
> - **ATX 2.52 o inferior**: `peak_w` (la fuente debe soportar el pico transitorio completo).
> - **ATX 3.x**: `tdp_w` (la especificación ATX 3.x ya cubre el power excursion sobre el TDP nominal).
> - **Multi-GPU**: la carga es la **suma** de todas las GPUs (no la mayor individual). Con 2+ GPUs casi siempre cae en Tier A/X.
>
> **El TIER NO depende del toggle ATX.** El tier es una clase de calidad de fuente y refleja el **pico transitorio del hardware** (`peak_w`), que es una propiedad fija del silicio. Por eso el tier siempre usa `cpuPeak` / `gpuPeak` (`peak_w`), aunque el consumo use `tdp_w` en ATX 3.x. Ver Paso 3.

### Paso 2 — Consumo total calculado (sí lo afectan las opciones extra)

```
consumoBase  = cpuLoad + gpuLoad + motherboard.avg_w + cooler.w + Σ (fan.w_per_unit × count)

consumoTotal = consumoBase
if overclock:    consumoTotal += 100
if future_proof: consumoTotal += 100
```

> `consumoTotal` es la **suma cruda** que se muestra como "Consumo calculado". La **fuente recomendada** (un escalón estándar) se deriva de él en el Paso 4.
> - **Disipador (`cooler.w`)**: suma al consumo; `null` (valor aún no provisto) cuenta como 0W. **NO** afecta el tier.
> - **Ventiladores**: una fila por tipo, cada fila aporta `w_per_unit × cantidad`.
> Overclock y future proof **solo modifican `consumoTotal`**, **NO** el tier asignado.
> El número de watts y el tier son dos salidas independientes:
> - **Tier** → calidad/categoría de la fuente (Paso 3, sin OC/FP).
> - **Consumo / fuente recomendada** → potencia sugerida (Pasos 2 y 4, con OC/FP si están marcados).

### Paso 3 — Encontrar el tier mínimo que soporte ambas cargas

```
tierRecomendado = el tier con el ID más bajo (peor calidad) tal que:
  (tier.max_cpu_w === null  O  tier.max_cpu_w >= cpuPeak)
  Y
  (tier.max_gpu_w === null  O  tier.max_gpu_w >= gpuPeak)   // peak_w SIEMPRE, suma multi-GPU
```
> Usa `cpuPeak` / `gpuPeak` (`peak_w`), **no** la carga del Paso 1 — el tier es **independiente del toggle ATX**.

El algoritmo recorre `tiers.json` **de peor a mejor** (Tier F → Tier S) y devuelve el primer tier que no viola ningún límite. Esto garantiza el tier mínimo recomendado.

**Referencia de límites por tier:**

| Tier | CPU máx (peak_w) | GPU máx (peak_w) |
|------|-----------------|-----------------|
| S    | ∞               | ∞               |
| A    | ∞               | ∞               |
| B+   | 370W            | 530W            |
| B    | 250W            | 460W            |
| C+   | 155W            | 370W            |
| C    | 155W            | 260W            |
| D    | 140W            | 240W            |
| E    | 140W            | 75W             |
| F    | 60W             | 0W              |

> Sin margen de seguridad adicional (ya contemplado en los valores del dataset).

### Paso 4 — Fuente recomendada (escalones estándar + tolerancia 5%)

El `consumoTotal` (Paso 2) se redondea al escalón de fuente real más sensato. Las fuentes existen solo en wattajes estándar:

- **110V (estándar):** 450, 550, 650, 750, 850, 1000, 1200, 1300, 1500, 1600
- **220V/230V (alto voltaje):** 2000, 2200, 3000, 5200 → marcadas `requires_220v: true`

```
PSU_TOLERANCE = 1.05

fuenteRecomendada = primer escalón S (ascendente) tal que:
  consumoTotal <= S.w × 1.05
```

> La tolerancia del 5% permite **bajar al escalón anterior** cuando el consumo no supera el 105% de ese escalón.
> Aplica en **toda** la escalera, incluido el cruce 110V → 220V.
>
> **Ejemplos:** 570W → 550W (570 ≤ 577.5) · 580W → 650W · 1290W → 1300W · 1650W → 1600W · 1700W → 2000W (220V) · 2310W → 2200W (220V).
>
> **Borde:** si `consumoTotal` supera 5200 × 1.05 = 5460W, no hay escalón → `recommendPsu` devuelve `null` y la tarjeta muestra "> 5200 W" + aviso de exceso.
>
> **Display:** la fuente recomendada es el número **protagonista** (grande); `consumoTotal` se muestra pequeño como "Consumo calculado". Si el escalón elegido es `requires_220v`, se muestra el aviso ⚡ "Requiere instalación 220V/230V". La fuente recomendada es **independiente del tier**.

---

## Cobertura de Componentes

### CPUs
- **Intel**: 11th Gen (Rocket Lake) → Intel Core Ultra 200 (Arrow Lake/Lunar Lake)
- **AMD**: Ryzen 3rd Gen (Matisse) → Ryzen 9000 (Granite Ridge)

### GPUs
- **NVIDIA**: GTX 10 series → RTX 50 series
- **AMD**: RX 500 series → RX 9000 series

### Motherboards
- Selección por chipset/formato representativo (no marca específica): consumo promedio por categoría (B450, B550, X570, Z690, X670E, B650, Z790, etc.)

### Ventiladores
- Selector de tipo (120mm std, 140mm std, 120mm high-static, 140mm high-static, etc.)
- Selector de cantidad (1–12)

> **RAM y SSD excluidos**: consumen principalmente del riel de 5V/3.3V; impacto en el riel de 12V es despreciable para esta calculadora.

---

## Formulario — Flujo UX

1. **Toggle ATX**: el usuario elige `ATX 2.52 o inferior` / `ATX 3.x` — esto determina el modo de cálculo. Visible desde el inicio.
2. **CPU**: `<select>` filtrable por marca → familia → modelo específico.
3. **GPU**: igual que CPU.
4. **Motherboard**: `<select>` por categoría de chipset.
5. **Ventiladores**: tipo + cantidad (spinner numérico 0–12).
6. **Opciones extra**:
   - `[ ] Overclock (+100W)`
   - `[ ] Future Proof (+100W)`
7. **Resultado**: aparece en tiempo real (sin botón de submit; reactivo con `useEffect`/computed). Muestra:
   - **Watts recomendados** de la fuente (suma de componentes + `+100W` por cada opción extra marcada)
   - **Tier mínimo recomendado** (siempre basado en `peak_w` del CPU y GPU, **independiente del toggle ATX**; **no** afectado por overclock / future proof)
   - Imagen del tier
   - Label del tier
   - Indicación si el CPU o GPU excede los límites del tier actual (opcional)

> **Cero fricción**: no hay botón "Calcular". El resultado se actualiza al instante conforme el usuario elige. Esto es posible porque toda la lógica es local.

---

## Diseño Visual

### Paleta
| Token | Valor | Uso |
|---|---|---|
| `--color-bg` | `#000000` | Fondo base |
| `--color-surface` | `#303030` | Cards, selectores |
| `--color-accent` | `#03D6B3` | CTA, highlights, bordes activos |
| `--color-text` | `#FFFFFF` | Texto principal |
| `--color-muted` | `#888888` | Labels secundarios |

### Tipografía
- **Display / Headings**: IBM Plex Mono (coherente con el estilo terminal de PSU Gang)
- **Body / Labels**: IBM Plex Sans

### Logo
- El logo de PSU Gang se colocará en el **header** de la página, alineado a la izquierda o centrado según composición final.
- Formato esperado: `.svg` (preferido por escalabilidad y peso) o `.webp`/`.png` con fondo transparente.
- Se servirá como archivo estático desde `/public/logo/psu-gang-logo.svg`.
- No habrá texto alternativo de marca en el header; el logo es el único identificador visual del sitio.

### Estética
- Dark, industrial, terminal-inspired (PSU Gang design system)
- Sin gradientes de colores genéricos AI; sin purples, sin whites dominantes
- Bordes con `border-color: #03D6B3` en elementos activos
- La imagen de tier es el elemento visual protagonista del resultado

### Skill de Diseño (Claude Code)
Se incluirá en el repo un archivo `.claude/psu-gang-design-skill.md` que documenta:
- Paleta, tipografía y tokens exactos
- Reglas anti-AI-slop (qué NO usar)
- Patrones de componente aceptados
- Referencia al `design.md` del sistema PSU Gang

Esto le permite a Claude Code mantener consistencia visual sin derivar hacia estilos genéricos en futuras iteraciones.

---

## Despliegue

### Plataforma
**Cloudflare Workers** (static assets), no Vercel. Config en `wrangler.toml`:
- `name = "psugangcalculator"`, `workers_dev = false`, `preview_urls = false`
- `routes = [{ pattern = "psugang.com", custom_domain = true }]`
- `[assets] directory = "./out"` — sirve el export estático de Next.

Headers de seguridad en `public/_headers` (X-Frame-Options, CSP, etc.).

### Pasos
1. `git push` a la rama `main` del repositorio GitHub.
2. `npm run deploy` → genera el build y publica con `wrangler` en Cloudflare.
3. Dominio `psugang.com` ya enlazado como custom domain en `wrangler.toml`.

> **Nota técnica**: los scripts `package.json` usan `@cloudflare/next-on-pages` + `wrangler pages deploy`, mientras `wrangler.toml` define un deploy de Workers static assets (`./out`). Unificar a un solo mecanismo (Workers assets **o** Pages) es tarea pendiente de la fase de mejoras.

### Variables de entorno
Ninguna. El proyecto es completamente estático; no hay secrets, keys ni conexiones a servicios externos.

### Build
```bash
npm run build    # next build (output: export → ./out)
npm run deploy   # build + wrangler deploy a Cloudflare
```

El output es un bundle estático optimizado servido desde el CDN edge global de Cloudflare.

---

## Flujo de Actualización de Datos

Si los datos de TDP/picos cambian antes del cierre del sitio:

1. Actualizar la hoja de Google Sheets.
2. Exportar como CSV o copiar los valores.
3. Actualizar los archivos `.json` en `/src/data/`.
4. `git push` → Vercel redespliega en ~30 segundos.

---

## Exclusiones Explícitas

| Item | Razón de exclusión |
|---|---|
| Base de datos (PostgreSQL, SQLite, etc.) | Datos estáticos; innecesaria, agrega latencia y superficie de ataque |
| Backend / API Routes de Next.js | Sin lógica server-side; cálculos 100% client-side |
| Auth / login | Calculadora pública, sin cuentas |
| URLs compartibles por build | No requerido en este alcance |
| RAM / SSD en el cálculo | Consumen del riel 5V/3.3V; impacto en 12V irrelevante |
| Margen de seguridad automático | Ya contemplado: peak_w para ATX 2.52, power excursion para ATX 3.x |

---

## Entregables de Daniel — ENTREGADOS ✅

- [x] Logo de PSU Gang — entregado como `.png` con fondo transparente. Servido desde `/public/logo/empresarial-logo.png` (también `capacitor-logo.png` disponible). _Nota: el spec original pedía `.svg`; se usó `.png`._
- [x] Imágenes de tier — 9 entregadas en `/public/tiers/` como `.png` (`tier-s`, `tier-a`, `tier-b-plus`, `tier-b`, `tier-c-plus`, `tier-c`, `tier-d`, `tier-e`, `tier-f`). _Nota: spec decía `.webp`; se usó `.png`._
- [x] Datos de CPUs/GPUs (`model`, `tdp_w`, `peak_w`) — cargados en `/src/data/cpus.json` y `gpus.json`.
- [x] Nombre de dominio — **psugang.com** (gestionado en Cloudflare).
- [x] Selector de motherboard — resuelto: **por chipset genérico** (`motherboards.json` con `avg_w` por categoría, sin marca específica).

---

## Decisiones — RESUELTAS ✅

- **Overclock / future proof**: cada uno suma +100W a los watts recomendados de la fuente, pero **no** alteran el tier mínimo asignado.
- **Imagen de tier**: **card compacta** (`ResultCard` sticky con la imagen dentro de la card, junto a watts y label). No ocupa pantalla completa.
- **Mensaje Tier F / sin tier**: **sin mensaje especial**. Se muestra solo el label del tier; `"Sin tier asignado"` cuando `tier` es `null`.
- **Toggle ATX 2.52/3.x — tooltip explicativo**: resuelto en concepto, **pendiente de implementación**. No será un tooltip estático: la idea es una **consulta/lookup** (DB local cargada en el navegador) donde el usuario busca su modelo de fuente y el sitio le indica qué estándar ATX tiene. Pasa a la fase de mejoras (ver abajo).

---

## Fase actual: Corrección de bugs y mejoras

Discrepancias spec ↔ implementación detectadas (para abordar en esta fase):

- **Deploy mixto Workers/Pages**: `wrangler.toml` define Workers static assets (`./out`), pero los scripts `package.json` usan `@cloudflare/next-on-pages` + `wrangler pages deploy`. Unificar a un solo mecanismo.
- **Flujo UX "cero fricción"**: el spec dice sin botón submit (reactivo con `useEffect`), pero la implementación tiene botón **Calcular** explícito. Decidir cuál es el comportamiento final.

Mejoras planificadas:

- **Lookup de estándar ATX por modelo de fuente**: DB local en navegador, el usuario busca su PSU y obtiene su estándar ATX (reemplaza la idea de tooltip).
