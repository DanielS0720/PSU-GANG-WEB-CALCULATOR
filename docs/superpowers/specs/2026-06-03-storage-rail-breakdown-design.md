# Desglose de consumo por riel + almacenamiento — Diseño

**Fecha:** 2026-06-03
**Rama:** `dev` (feature aislada de `main`)
**Estado:** Aprobado por el usuario (layout y modelo de datos validados en companion visual)

## Objetivo

Añadir a la derecha un recuadro de **desglose de consumo** (CPU, GPU, Motherboard,
Disipador, Ventiladores, y nuevo: almacenamiento). Hoy todo el cálculo es riel
**12V**. Se añaden unidades de almacenamiento y se separan los rieles **5V** y
**3.3V**, visibles vía un botón **"Cálculo Avanzado"**.

## Reglas de rieles

| Componente | Riel | Notas |
|---|---|---|
| CPU, GPU, Motherboard, Disipador (w 12V), Ventiladores (w_per_unit) | 12V | Sin cambios |
| HDD | 12V | Cuenta para la fuente recomendada |
| SSD SATA | 5V | Informativo |
| NVMe (PCIe 3.0/4.0/5.0) | 3.3V | Informativo |
| RGB de ventiladores | 5V | Adicional, solo si la entrada es RGB |
| RGB de disipadores | 5V | Adicional, 5/10/15 W según tamaño |

**Decisión clave:** la **fuente recomendada y el tier NO cambian** — siguen
derivándose solo del total 12V (+ extras overclock/future proof). 5V y 3.3V son
**informativos**; aparecen en el desglose avanzado pero no alteran la recomendación.
El tier sigue siendo función de CPU+GPU únicamente.

## Consumos (W por unidad)

| Ítem | W | Riel |
|---|---|---|
| HDD | 20 | 12V |
| SSD SATA | 8 | 5V |
| NVMe PCIe 3.0 | 8 | 3.3V |
| NVMe PCIe 4.0 | 12 | 3.3V |
| NVMe PCIe 5.0 | 15 | 3.3V |
| RGB por ventilador | 5 | 5V |
| RGB disipador — torre simple / AIO 120/140 | 5 | 5V |
| RGB disipador — torre doble / AIO 240/280 | 10 | 5V |
| RGB disipador — AIO 360/420 | 15 | 5V |

## Modelo de datos

### Nuevo `src/data/storage.json`

Dos niveles (unidad → tipo) para mapear directo a los dos dropdowns. Solo NVMe
tiene subtipos.

```json
{
  "units": [
    { "id": "hdd",       "label": "HDD",       "rail": "12v", "w": 20 },
    { "id": "ssd-sata",  "label": "SSD SATA",  "rail": "5v",  "w": 8 },
    { "id": "nvme",      "label": "NVMe",      "rail": "3v3",
      "subtypes": [
        { "id": "pcie3", "label": "PCIe 3.0", "w": 8 },
        { "id": "pcie4", "label": "PCIe 4.0", "w": 12 },
        { "id": "pcie5", "label": "PCIe 5.0", "w": 15 }
      ]
    }
  ]
}
```

### RGB 5V — campo explícito (no se toca el 12V)

En vez de parsear ids, se añade el campo opcional `rgb_5v` **solo a las entradas
RGB existentes** de `fans.json` y `coolers.json`. Las entradas no-RGB lo omiten
(= 0). Los valores `w`/`w_per_unit` actuales (12V) **no se modifican**.

- `fans.json`: las entradas `*-rgb` reciben `"rgb_5v": 5`.
- `coolers.json`: las entradas `*-rgb` reciben `"rgb_5v"` según tamaño:
  - `air-tower-single-rgb` → 5
  - `air-tower-double-rgb` → 10
  - `aio-120-rgb` → 5
  - `aio-240-rgb`, `aio-280-rgb` (y variantes `-screen-rgb`) → 10
  - `aio-360-rgb`, `aio-420-rgb` (y variantes `-screen-rgb`) → 15

### `src/types/components.ts`

```ts
export type Rail = "12v" | "5v" | "3v3";

export interface StorageSubtype { id: string; label: string; w: number; }
export interface StorageUnit {
  id: string; label: string; rail: Rail;
  w?: number;                 // unidades sin subtipo (HDD, SSD)
  subtypes?: StorageSubtype[]; // solo NVMe
}

export interface StorageSelection {
  unitId: string | null;
  subtypeId: string | null;   // solo aplica a NVMe; null en otros
  count: number;              // 1–8; 0 = fila vacía
}

// Fan / Cooler ganan el opcional:
//   rgb_5v?: number;
```

`Selection` gana:
```ts
storage: StorageSelection[];  // hasta 4 filas
```

## Cálculo (`src/lib/calculator.ts`)

`calculate()` se extiende sin romper la semántica existente:

- **12V** (`baseWatts`): igual que hoy + suma de HDD (`unit.rail === "12v"`).
  De aquí salen `recommendedPsu` y `tier` (tier sigue solo CPU+GPU).
- **5V**: SSD SATA + RGB ventiladores (`fan.rgb_5v * count`) + RGB disipador
  (`cooler.rgb_5v`).
- **3.3V**: NVMe (subtipo seleccionado).
- `totalWatts` mantiene su significado actual (12V + extras). 5V/3.3V **no** se suman.

Nueva forma en `CalculationResult`:

```ts
interface BreakdownLine { label: string; v12: number; v5: number; v3v3: number; }
interface RailBreakdown {
  rail12: number; rail5: number; rail3v3: number;
  lines: BreakdownLine[];
}
// CalculationResult gana: breakdown: RailBreakdown
```

Helpers nuevos puros y testeables: `storageWatts(selection)`, `fanRgb5v(...)`,
`coolerRgb5v(...)`, `buildBreakdown(...)`. Componentes no seleccionados o filas
vacías aportan 0.

## UI

### Formulario (`Calculator.tsx`)
Nueva sección **"Almacenamiento"** debajo de Ventiladores (antes de Opciones extra):
- Filas `[Unidad ▾] [Tipo ▾] [Cantidad] [×]`.
- "Tipo" se habilita solo cuando Unidad = NVMe; deshabilitado/`—` en HDD/SSD.
- Cantidad: input numérico 1–8 (mismo patrón que ventiladores; vacío = 0).
- "+ Agregar unidad" hasta `MAX_STORAGE_ROWS = 4`. Botón `×` para quitar (mín 1 fila).
- Reusa `ComponentSelect` para los dropdowns.

### Desglose (`BreakdownCard.tsx`, nuevo)
En el `<aside>` derecho, debajo de `ResultCard`. Visible solo cuando hay `result`:
- **Vista normal:** lista de líneas 12V (CPU, GPU, Motherboard, Disipador,
  Ventiladores, HDD).
- Botón **"Cálculo Avanzado"** (toggle) → tabla **componente × riel**
  (columnas 12V / 5V / 3.3V) con fila de totales por riel + nota
  "5V/3.3V son informativos, no cambian la fuente".

`ResultCard` queda sin cambios funcionales (fuente + tier).

## Pruebas (`src/lib/*.test.ts`, vitest)

- HDD suma a 12V y **sí** afecta `recommendedPsu`.
- SSD/NVMe/RGB suman a 5V/3.3V y **no** afectan `recommendedPsu` ni `tier`.
- Watts por subtipo NVMe correctos (3.0=8, 4.0=12, 5.0=15).
- `rgb_5v`: ventilador RGB ×N = 5·N en 5V; disipador RGB por tamaño (5/10/15).
- Entrada no-RGB → 0 en 5V.
- Filas vacías / NVMe sin subtipo → 0.
- Clamp de cantidad 1–8; vacío = 0.
- `buildBreakdown` agrupa y totaliza por riel.

## Fuera de alcance (YAGNI)

- No se modela 5V/3.3V hacia la recomendación de fuente.
- No se añaden subtipos a HDD/SSD.
- No se reestructuran los valores 12V existentes de fans/coolers.
- No se persisten selecciones entre sesiones.

## Orden sugerido de implementación

1. Crear rama `dev`.
2. Datos + tipos (`storage.json`, `rgb_5v` en fans/coolers, interfaces).
3. Lógica `calculator.ts` + tests (TDD).
4. UI: sección Almacenamiento en `Calculator.tsx`.
5. `BreakdownCard.tsx` + integración en el `aside`.
6. Verificación manual y `vitest`.
