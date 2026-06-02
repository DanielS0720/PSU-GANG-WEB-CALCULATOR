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
| Despliegue | Vercel (Hobby tier) | Gratis, CI/CD con `git push`, dominio personalizado de Cloudflare |
| Dominio | Cloudflare (DNS → Vercel) | Gestión centralizada, sin coste adicional por el proxy |
| Imágenes tier | Archivos estáticos en `/public/tiers/` | Entregados por Daniel; servidos por Vercel CDN |

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
    "id": "tier-x",
    "label": "Tier X",
    "image": "/tiers/tier-x.webp",
    "max_cpu_w": null,
    "max_gpu_w": null
  },
  {
    "id": "tier-s-plus",
    "label": "Tier S+",
    "image": "/tiers/tier-s-plus.webp",
    "max_cpu_w": null,
    "max_gpu_w": null
  },
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

cpuLoad = cpu[field]
gpuLoad = Σ gpu[field]   // multi-GPU: suma de TODAS las GPUs seleccionadas
```

> El estándar ATX seleccionado determina **qué valor del dataset** alimenta la asignación de tier:
> - **ATX 2.52 o inferior**: `peak_w` (la fuente debe soportar el pico transitorio completo).
> - **ATX 3.x**: `tdp_w` (la especificación ATX 3.x ya cubre el power excursion sobre el TDP nominal).
> - **Multi-GPU**: `gpuLoad` es la **suma** de la carga de todas las GPUs (no la mayor individual). Con 2+ GPUs casi siempre cae en Tier A/X.

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
  (tier.max_cpu_w === null  O  tier.max_cpu_w >= cpuLoad)
  Y
  (tier.max_gpu_w === null  O  tier.max_gpu_w >= gpuLoad)   // gpuLoad = suma multi-GPU
```

El algoritmo recorre `tiers.json` **de peor a mejor** (Tier F → Tier X) y devuelve el primer tier que no viola ningún límite. Esto garantiza el tier mínimo recomendado.

**Referencia de límites por tier:**

| Tier | CPU máx (peak_w) | GPU máx (peak_w) |
|------|-----------------|-----------------|
| X    | ∞               | ∞               |
| S+   | ∞               | ∞               |
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
   - **Tier mínimo recomendado** (basado en `peak_w` para ATX 2.52 o `tdp_w` para ATX 3.x del CPU y GPU; **no** afectado por overclock / future proof)
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

### Pasos
1. `git push` a la rama `main` del repositorio GitHub.
2. Vercel detecta el push y despliega automáticamente (CI/CD sin configuración manual).
3. En Cloudflare: agregar un registro `CNAME` apuntando al dominio `.vercel.app` asignado.
4. En Vercel: añadir el dominio personalizado en el dashboard del proyecto.

### Variables de entorno
Ninguna. El proyecto es completamente estático; no hay secrets, keys ni conexiones a servicios externos.

### Build
```bash
npm run build   # Genera sitio estático
npm run start   # Preview local
```

Vercel ejecuta `next build` automáticamente. El output es un bundle estático optimizado servido desde el CDN edge de Vercel (~100ms globalmente).

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

## Entregables Pendientes de Daniel

- [ ] Logo de PSU Gang en formato `.svg` o `.png`/`.webp` con fondo transparente
- [ ] Imágenes de tier en formato `.webp` (una por tier: `tier-x.webp`, `tier-s-plus.webp`, `tier-s.webp`, `tier-a.webp`, `tier-b-plus.webp`, `tier-b.webp`, `tier-c-plus.webp`, `tier-c.webp`, `tier-d.webp`, `tier-e.webp`, `tier-f.webp`)
- [ ] Google Sheets con columnas: `model`, `tdp_w`, `peak_w` para CPUs y GPUs
- [ ] Nombre de dominio elegido en Cloudflare
- [ ] Confirmar si el selector de motherboard va por chipset genérico o incluye marcas/modelos

---

## Lo que NO está definido aún (decisiones abiertas)

- Overclock/future proof: **resuelto** → cada uno suma +100W a los watts recomendados de la fuente, pero **no** alteran el tier mínimo asignado.
- ¿El toggle ATX 2.52/3.x tiene texto explicativo (tooltip) para usuarios que no saben cuál tienen?
- ¿La imagen de tier ocupa toda la pantalla de resultado o es una card compacta?
- ¿Se muestra algún mensaje cuando el CPU o GPU seleccionado cae en Tier F (GPU con 0W máx)?
