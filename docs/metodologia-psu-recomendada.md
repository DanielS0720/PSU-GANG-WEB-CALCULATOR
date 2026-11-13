# Metodología de cálculo de la fuente recomendada

> Documento descriptivo del comportamiento actual del código, verificado al 2026-11-13. Incluye el tope de picos de 180% (`TRANSIENT_CAP`). Si cambia la lógica de cálculo, actualizar este archivo en el mismo cambio.

## 1. Resumen

La fuente recomendada es un escalón estándar de potencia (de 450 W a 5200 W) elegido a partir del consumo calculado de la build. El consumo depende del estándar ATX seleccionado, porque ATX 2.52 y ATX 3.x toman watts distintos de la CPU y de la GPU.

```
Selección del usuario
  → (1) watts de CPU y GPU según ATX: peak_w (2.52) o tdp_w (3.x)
  → (2) consumo base en 12 V = ceil(suma de componentes)
  → (3) + extras (Overclock y Future Proof, +100 W c/u) = consumo total
  → (3b) consumo de picos = mismo cálculo con peak_w en CPU y GPU, + extras
  → (4) primer escalón S tal que consumo total ≤ S × 1.05 y picos ≤ S × 1.80  →  fuente recomendada
```

El tier de calidad se calcula por separado y no depende del estándar ATX ni de los extras (§7).

## 2. Glosario

- **TDP (`tdp_w`)**: potencia térmica nominal del componente. Es el consumo sostenido de referencia.
- **Pico transitorio (`peak_w`)**: consumo máximo de corta duración del componente.
- **Power excursion**: picos de potencia por encima de la potencia nominal de la fuente que ATX 3.x exige soportar durante ventanas de tiempo definidas (§9.1).
- **Riel**: línea de salida de la fuente (12 V, 5 V, 3.3 V).
- **Escalón**: potencia comercial estándar de fuente (por ejemplo, 650 W).
- **Tope de picos (180%)**: el consumo de picos de la build no puede superar 180% de la potencia de la fuente. Se aplica con la ventana de 1 ms (§5, pasos 3b y 4).

## 3. Entradas

Las entradas viven en el tipo `Selection` (`src/types/components.ts`). El cálculo usa el estado del formulario en el momento en que el usuario pulsa **Calcular**.

| Entrada | Campo | Límite en la UI | Efecto en el cálculo |
|---|---|---|---|
| Estándar ATX | `mode` (`atx-2` / `atx-3`) | 2 opciones; por defecto `atx-2` | Elige el campo de watts de CPU y GPU (paso 1) |
| CPU | `cpuId` | Obligatoria para calcular | `tdp_w` o `peak_w` según el estándar |
| Placa madre | `motherboardId` | Obligatoria para calcular | `avg_w` (igual en ambos estándares) |
| GPU | `gpuIds[]` | Opcional; hasta 4 (`MAX_GPUS`) | Se suman sus watts |
| Disipador | `coolerId` | Opcional | `w` (igual en ambos estándares); sin dato = 0 W |
| Ventiladores | `fans[]` = `{fanId, count}` | Hasta 3 filas (`MAX_FAN_ROWS`); hasta 15 por fila (`MAX_FANS`) | `w_per_unit × count` |
| Almacenamiento | `storage[]` = `{unitId, subtypeId, count}` | Hasta 4 filas (`MAX_STORAGE_ROWS`); hasta 8 por fila (`MAX_STORAGE_PER_ROW`) | Solo el HDD suma al riel de 12 V |
| Overclock | `overclock` | Casilla | +100 W |
| Future Proof | `futureProof` | Casilla | +100 W |

Notas:
- Si falta la CPU o la placa madre, la UI muestra un error y no calcula (`Calculator.tsx`, `handleCalculate`).
- Cualquier cambio en el formulario borra el resultado anterior hasta volver a pulsar **Calcular** (`patch`).
- El modelo de fuente del usuario no entra al cálculo. Solo alimenta la alerta de adecuación (§7).

## 4. Datos de referencia

Todos los datos están en `src/data/` como JSON estáticos.

| Archivo | Campos usados | Notas |
|---|---|---|
| `cpus.json` | `tdp_w`, `peak_w` | 74 CPUs. Ver la anomalía de §9.2. |
| `gpus.json` | `tdp_w`, `peak_w` | 87 GPUs. `tdp_w` ≤ `peak_w` en todas. |
| `motherboards.json` | `avg_w` | Consumo promedio por chipset, no por marca. |
| `coolers.json` | `w`, `rgb_5v` | Aire y AIO. `rgb_5v` (5, 10 o 15 W) solo en modelos RGB. |
| `fans.json` | `w_per_unit`, `rgb_5v` | 120 y 140 mm estándar: 1.88 W. RGB: 3.44 W en 12 V y 5 W en 5 V. |
| `storage.json` | `rail`, `w`, `subtypes` | HDD 20 W (12 V). SSD SATA 8 W (5 V). NVMe 8, 12 o 15 W (3.3 V) según PCIe 3.0, 4.0 o 5.0. |
| `psus.json` | `w`, `requires_220v` | Escalones estándar (paso 4). |
| `tiers.json` | `max_cpu_w`, `max_gpu_w` | Solo para el tier (§7). |

## 5. Procedimiento

### Paso 1: watts de CPU y GPU según el estándar

| Estándar | Campo usado | Razón (comentario en `calculator.ts`) |
|---|---|---|
| ATX 2.52 o inferior | `peak_w` (pico transitorio) | Dimensiona para el pico transitorio completo. |
| ATX 3.x | `tdp_w` (TDP nominal) | ATX 3.x cubre la power excursion, así que basta el TDP. |

```
cpuW = watts(cpu, modo)
gpuW = Σ watts(gpu, modo)     // todas las GPUs seleccionadas
```

- Si un componente no tiene `tdp_w` (`null`), el modo 3.x usa `peak_w` como respaldo (`loadFor`). Con los datos actuales no hay ningún `null`, así que el respaldo no se activa.
- Si no hay CPU o GPU seleccionada, su aporte es 0 W.

### Paso 2: consumo base en 12 V

```
baseWatts = ceil( cpuW + gpuW + mobo.avg_w + cooler.w
                  + Σ fan.w_per_unit × count
                  + Σ HDD 12 V (20 W × count) )
```

- El redondeo hacia arriba (`Math.ceil`) se aplica una sola vez, sobre la suma completa.
- La placa madre, el disipador, los ventiladores y el HDD aportan lo mismo en ambos estándares. Solo cambian la CPU y la GPU.
- Quedan fuera del consumo recomendado:
  - **RAM**: no se modela.
  - **SSD SATA (5 V) y NVMe (3.3 V)**: aparecen en el desglose por riel, pero no en el total de 12 V.
  - **Iluminación RGB (5 V)** de ventiladores y disipadores: aparece en el desglose, no en el total de 12 V.
- Las filas de almacenamiento sin unidad, sin subtipo NVMe o con cantidad 0 se ignoran (`resolveStorage`).

### Paso 3: extras (Overclock y Future Proof)

```
totalWatts = baseWatts + 100 × overclock + 100 × futureProof
```

- Cada extra suma 100 W fijos. No es proporcional a ningún componente.
- En el desglose aparecen como la línea "Extras (OC/FP)" en 12 V.
- Los extras modifican `totalWatts` y, con él, la fuente recomendada. Nunca modifican el tier.

### Paso 3b: consumo de picos y tope de 180%

```
transientWatts = ceil( cpu.peak_w + Σ gpu.peak_w
                       + mobo.avg_w + cooler.w
                       + Σ fan.w_per_unit × count
                       + Σ HDD 12 V (20 W × count) ) + 100 × overclock + 100 × futureProof
```

- Es el mismo cálculo del paso 2, pero con `peak_w` en CPU y GPU. En ATX 2.52 ya se usa `peak_w`, así que `transientWatts` = `totalWatts`.
- Los extras cuentan: son carga adicional de 12 V cuando se activan OC o Future Proof.
- Los picos de CPU y GPU se suman como si ocurrieran a la vez. Es conservador (§8).
- Límite: `transientWatts` ≤ 180% de la potencia de la fuente (`TRANSIENT_CAP = 1.8`). Es el límite de ATX 3.x para el nivel alto a 1 ms (§9.1). Se usa esa ventana porque los picos del dataset se miden a 1 ms.

### Paso 4: escalón de fuente recomendado

```
PSU_TOLERANCE = 1.05
TRANSIENT_CAP = 1.8
fuente recomendada = primer escalón S (de menor a mayor) tal que
                     totalWatts ≤ S.w × 1.05   Y   transientWatts ≤ S.w × 1.8
si ningún escalón cumple → null
```

Escalones (`src/data/psus.json`):

| Voltaje | Escalones (W) | `requires_220v` |
|---|---|---|
| 110 V | 450 · 550 · 650 · 750 · 850 · 1000 · 1200 · 1300 · 1500 · 1600 | `false` |
| 220 / 230 V | 2000 · 2200 · 3000 · 5200 | `true` |

- La tolerancia del 5% significa que la fuente recomendada puede quedar hasta 5% por debajo del consumo calculado. Por ejemplo, 570 W → 550 W, porque 570 ≤ 577.5.
- El tope de 180% también puede subir un escalón. Ejemplo (§6.3): un consumo de 463 W cabe en 450 W con la tolerancia, pero los picos de 896 W superan 810 W (450 × 1.8), así que la fuente sube a 550 W (896 ≤ 990). En ATX 2.52 no se activa, porque `transientWatts` = `totalWatts` ≤ 1.05 × S < 1.8 × S.
- El límite superior de consumo es 5200 × 1.05 = 5460 W. Por encima, `recommendedPsu` es `null`. Si los picos no caben en ningún escalón, también es `null`.

Cómo se muestra (`ResultCard.tsx`):
- Con escalón: la potencia del escalón como dato principal, por ejemplo "650 W".
- Con `requires_220v`: aviso "Requiere instalación 220V / 230V".
- Con `null`: "> 5200 W" y aviso de que el consumo supera el estándar más alto.
- El consumo calculado (`totalWatts`) se muestra aparte, como dato secundario.

### Paso 5: desglose por riel (solo informativo)

- `breakdown.rail12` es igual a `totalWatts` e incluye los extras.
- `rail5` suma el RGB de ventiladores y disipador, más el SSD SATA.
- `rail3v3` suma el NVMe.

Estos dos últimos no afectan la fuente recomendada.

## 6. Ejemplos

### 6.1 Build de referencia

Selección: CPU `core-i5-14600k`, GPU `rtx-4070`, placa `b760`, disipador `aio-240`, 3 × `120mm-standard`, 1 HDD, sin extras.

| Componente | ATX 2.52 (`peak_w`) | ATX 3.x (`tdp_w`) |
|---|---|---|
| CPU | 216 | 181 |
| GPU | 331 | 200 |
| Placa madre | 60 | 60 |
| Disipador | 18.66 | 18.66 |
| Ventiladores (3 × 1.88) | 5.64 | 5.64 |
| HDD (1 × 20) | 20 | 20 |
| **Consumo base (ceil)** | **652** | **486** |
| **Fuente recomendada** | **650 W** | **550 W** |
| Con Overclock (+100) | 752 → **750 W** | 586 → **650 W** |

Cálculo con ATX 2.52: 216 + 331 + 60 + 18.66 + 5.64 + 20 = 651.30 → 652. Como 652 > 577.5 (550 × 1.05) y 652 ≤ 682.5 (650 × 1.05), el escalón es 650 W.

Cálculo con ATX 3.x: 181 + 200 + 60 + 18.66 + 5.64 + 20 = 485.30 → 486. Como 486 > 472.5 (450 × 1.05) y 486 ≤ 577.5 (550 × 1.05), el escalón es 550 W.

### 6.2 Casos límite del escalón

| Consumo total (W) | Fuente recomendada | Motivo |
|---|---|---|
| 570 | 550 | 570 ≤ 577.5 (550 × 1.05) |
| 580 | 650 | 580 > 577.5, y 580 ≤ 682.5 |
| 1290 | 1300 | 1290 > 1260 (1200 × 1.05), y 1290 ≤ 1365 (1300 × 1.05) |
| 1650 | 1600 | 1650 > 1575 (1500 × 1.05), y 1650 ≤ 1680 (1600 × 1.05) |
| 1700 | 2000 (220 V) | 1700 > 1680 (1600 × 1.05), y 1700 ≤ 2100 (2000 × 1.05) |
| 2310 | 2200 (220 V) | 2310 = 2200 × 1.05 (límite exacto) |
| 5460 | 5200 (220 V) | 5460 = 5200 × 1.05 (límite exacto) |
| 5461 | `null` | 5461 > 5460 (máximo) |

Los ejemplos de 6.1 a 6.3 se verificaron contra `calculate()` y `recommendPsu()` del código actual. El de 6.3 también está en `calculator.test.ts`.

### 6.3 Build donde el tope cambia la fuente (ATX 3.x)

Selección: CPU `core-i9-14900k`, GPU `rx-9060xt`, placa `b650`, sin disipador, ventiladores ni almacenamiento, sin extras.

| Concepto | ATX 3.x (`tdp_w`) | ATX 2.52 (`peak_w`) |
|---|---|---|
| Consumo total (`totalWatts`) | 463 | 896 |
| Consumo de picos (`transientWatts`) | 896 | 896 |
| Escalón por tolerancia 5% | 450 W (463 ≤ 472.5) | 1000 W (896 > 892.5 = 850 × 1.05) |
| Escalón por tope 180% | 550 W (896 > 810 = 450 × 1.8; 896 ≤ 990 = 550 × 1.8) | No aplica |
| **Fuente recomendada** | **550 W** | **1000 W** |

La diferencia viene de la regla de cada estándar. ATX 2.52 dimensiona para el pico completo. ATX 3.x acepta picos de hasta 180% de la fuente a 1 ms, así que la misma build necesita 550 W en 3.x y 1000 W en 2.52.

## 7. Cálculos relacionados (no cambian la fuente recomendada)

- **Tier** (`tierForLoads`, `src/lib/calculator.ts`): usa siempre `peak_w` de la CPU y de la GPU (con la suma de todas las GPUs). No depende del estándar ATX ni de los extras. Recorre `tiers.json` de peor a mejor y devuelve el primer tier que cumple los límites de CPU y GPU.
- **Modelos destacados** (`featuredPsus`, `src/lib/psuModels.ts`): solo modelos ATX 3.x, con tier igual o mejor que el requerido y con `w` exactamente igual a la fuente recomendada (`wattBaseline`). Muestra hasta 4 y pone primero a los patrocinados (`sponsorRank`).
- **Alerta de adecuación** (`checkPsuAdequacy`, `src/lib/psuModels.ts`): compara el modelo de fuente del usuario contra el tier requerido (`tierOk`) y contra `wattBaseline` (`wattsOk`). `wattBaseline` es la fuente recomendada (que ya incluye el tope de picos), o `totalWatts` si no hay escalón.

## 8. Supuestos de diseño

1. **Tolerancia del 5% hacia abajo**: el escalón puede quedar hasta 5% por debajo del consumo calculado. No hay margen de seguridad adicional.
2. **Picos sumados**: CPU y GPU se suman en su pico, y el resto de la build se suma igual. Se asume que ocurren a la vez. Es conservador, porque en la práctica no ocurren a la vez.
3. **Multi-GPU**: se suma la carga de todas las GPUs, no solo la mayor.
4. **RAM fuera del cálculo**; SSD y NVMe fuera del riel de 12 V.
5. **Placa madre**: consumo promedio por chipset, no por modelo.
6. **Dato faltante = 0 W**: aplica al disipador (`w: null`) y a los componentes no seleccionados. Hoy ningún disipador tiene `w` nulo.
7. **Extras fijos**: 100 W cada uno, independientemente del componente.
8. **Picos a 1 ms**: el tope de 180% usa la ventana de 1 ms porque así se miden los picos del dataset (dato del equipo de mediciones). No hay datos de 100 µs (§9.1).
9. **Extras en el tope**: OC y Future Proof también suman al consumo de picos, como carga adicional de 12 V.

## 9. Limitaciones conocidas

### 9.1 Power excursion de ATX 3.x: solo el tope de 180% a 1 ms

El código aplica un solo límite: 180% a 1 ms, nivel alto (§5, paso 3b). No modela las demás ventanas ni el nivel bajo. Lo que queda fuera de la tabla no se comprueba.

Requisitos de excursión según fuentes secundarias (no se consultó el documento oficial de Intel):

| Ventana | Más de 450 W con conector 12VHPWR / 12V-2×6 | 450 W o menos, o sin conector |
|---|---|---|
| 100 µs | 200% | 150% |
| 1 ms | 180% | 145% |
| 10 ms | 160% | 135% |
| 100 ms | 120% | 110% |

- El nivel bajo proviene solo de TechPowerUp en las fuentes consultadas.
- El conector es opcional. Una fuente de más de 450 W sin conector cae al nivel bajo.
- Las fuentes no coinciden en el duty cycle de la ventana de 100 µs (5% en TechPowerUp, 10% en CCL Online).

Brechas que quedan:

- **Nivel bajo**: una fuente de 450 W o menos, o sin conector, tiene 145% a 1 ms. Con el tope de 180%, 138,713 combinaciones de la prueba de estrés (6.1%) siguen por encima de 145% (§9.4). Esas fuentes no quedan cubiertas por este tope.
- **Ventana de 100 µs**: los picos se miden a 1 ms. Un pico más corto puede ser mayor, y no hay datos para él. El tope de 180% no lo cubre (en el nivel alto, 100 µs admite 200%; en el bajo, 150%).
- **Ventanas de 10 ms y 100 ms**: si el pico real dura más de 1 ms, el límite baja (160% a 10 ms y 120% a 100 ms en el nivel alto).

### 9.2 Anomalía en los datos de CPU

- 34 de 74 CPUs tienen `tdp_w` mayor que `peak_w`. El método supone TDP ≤ pico, así que en esos casos ATX 3.x puede recomendar una fuente más grande que ATX 2.52.
- Ejemplo: Ryzen 5 5600X tiene `tdp_w` 88 y `peak_w` 67.2. El ejemplo de esquema del spec antiguo indica 65 y 88, lo que sugiere columnas mal cargadas.
- Comprobación:

  ```bash
  node -e "const c=require('./src/data/cpus.json');console.log(c.filter(x=>x.tdp_w>x.peak_w).length,'de',c.length)"
  ```

- Pendiente: revisar los valores de CPU contra fuentes oficiales.

### 9.3 `peak_w` medido a 1 ms

Según el equipo de mediciones, los valores `peak_w` son picos a 1 ms. El tope de 180% se compara con esa ventana. Como no hay datos a otras duraciones, las ventanas de 100 µs, 10 ms y 100 ms no se pueden verificar (§9.1).

### 9.4 Prueba de estrés (motivo del tope)

Método: 74 CPU × 87 GPU × resto de 0 a 350 W en pasos de 1 W, con una GPU y sin extras (2,259,738 combinaciones). Para cada una se comparó la fuente con la regla de tolerancia sola (antes) y con la regla nueva (después). Picos = `peak_w` de CPU + `peak_w` de GPU + resto, redondeados hacia arriba como en `calculate()`. R = picos / fuente.

| Caso | Antes (solo tolerancia) | Después (con tope 180%) |
|---|---|---|
| R > 145% | 138,713 (6.1%) | 138,713 (6.1%) |
| R > 150% | 90,483 (4.0%) | 90,035 (4.0%) |
| R > 180% | 2,968 (0.13%) | 0 |
| R > 200% | 111 (0.005%) | 0 |
| Combinaciones con fuente distinta | — | 2,968 (las que superaban 180%) |

- Peor caso antes del tope: core-i9-13900KS + RX 6900 XT con resto sintético de 24 W (la placa más liviana del dataset es de 27 W). TDP 577 → fuente 550 W; picos 1147 W, R ≈ 2.09.
- Builds reales (CPU × GPU × placa, ATX 3.x, sin disipador, ventiladores ni almacenamiento): 595 de 180,264 combinaciones (0.3%) cambian de fuente por el tope. Ejemplo en §6.3.
- La prueba fue un script temporal y no está en el repo. El barrido se puede repetir con las reglas de §5.

## 10. Diferencias con el spec antiguo

El archivo `.claude/psu-gang-watt-calculator.md` está desactualizado en estos puntos. Para el cálculo, manda este documento y el código.

- **Paso 2**: la fórmula del consumo base no incluye el HDD en 12 V. El código sí lo suma.
- **Ventiladores**: el spec indica de 1 a 12 unidades. La UI permite hasta 15 por fila (`MAX_FANS`).
- **Flujo UX**: el spec describe un cálculo reactivo sin botón. La implementación usa el botón **Calcular**.
- **Tope de picos**: el spec no lo incluye. Este documento y el código sí.

## 11. Verificación y mantenimiento

- Tests: `npm test` (vitest). Cubren `calculator.ts` (`calculator.test.ts`), `psuModels.ts` (`psuModels.test.ts`) y la búsqueda (`search.test.ts`). El bloque "transient cap" de `calculator.test.ts` verifica el ejemplo de §6.3, que ATX 2.52 nunca cambia por el tope, y que ninguna combinación CPU × GPU supera 180% de la fuente recomendada en ATX 3.x.
- El test "tier uses peak_w and is identical across ATX modes" usa `cpus[0]` (Core Ultra 9 285K, con `tdp_w` menor que `peak_w`). Ese caso no es representativo y no detecta la anomalía de §9.2.
- Constantes: `OPTION_WATTS = 100`, `PSU_TOLERANCE = 1.05` y `TRANSIENT_CAP = 1.8` en `src/lib/calculator.ts`.
- Al cambiar datos en `src/data/`: revisar §4, §6 y §9.2.
- Al cambiar la lógica: actualizar `calculator.ts`, los tests, este documento y la descripción de metodología en `src/app/llms.txt/route.ts`.

## 12. Referencias (ATX 3.x)

- [TechPowerUp, reseña MSI MEG Ai1000P (niveles de excursión)](https://techpowerup.com/review/msi-meg-ai1000p-1000w/9.html)
- [Geekchamp, guía de Intel 2023 (180% a 1 ms)](https://geekchamp.com/?p=1058067)
- [Igorslab, ATX 3.0 at a glance](https://www.igorslab.de/en/atx-3-0-at-a-glance-soap-bubble-or-revolution-what-really-is-changing/)
- [Seasonic, GPU power spikes explained](https://seasonic.com/insights/gpu-power-spikes-explained/)
- [HotHardware, conector opcional](https://hothardware.com/news/psu-manufs-can-skirt-atx-30-tolerance-testing)
- [CCL Online, ATX 3.0 PSUs explained](https://www.cclonline.com/article/2123/News/Power-Supplies/ATX-3-0-PSUs-Explained-Will-You-Need-One-/)
