# Filtro + Typeahead para selección de CPU y GPU

**Fecha:** 2026-06-03
**Estado:** Aprobado (diseño) — pendiente plan de implementación

## Objetivo

Reemplazar los `<select>` planos de CPU y GPU por un selector híbrido: filtros
acotadores (marca, y socket para CPU) + un combobox de modelo escribible con
predicción de escritura. El usuario puede seleccionar desde desplegable **o**
escribir, y el sitio predice qué busca.

Requisito clave: escribir `"RTX 50"` muestra **solo** la serie RTX 50xx
(5090, 5080, 5070...). NO debe aparecer RTX 4090 ni RTX 3050.

## Decisiones de diseño

| Decisión | Elegido | Razón |
|---|---|---|
| Patrón UI | Híbrido: filtros (marca/socket) + combobox modelo escribible | Combina guía y velocidad |
| Matching | Subcadena contigua, normalizada (lowercase + sin acentos) | Predecible; cumple el caso "RTX 50" exacto |
| Build | Headless lib: **downshift `useCombobox`** | a11y + teclado resueltos; +1 dep pequeña |
| Filtros ↔ búsqueda | Restricción dura | Filtros fijan el universo; más control/predecible |
| Filtro marca GPU (multi-fila) | Inline compacto (select angosto en la misma fila que el combobox) | Evita crecer vertical con 4 filas GPU |

## Contexto de datos

- **CPU** (`src/data/cpus.json`, 74 unidades): `brand` (Intel/AMD),
  `family` (microarquitectura: Arrow Lake, Zen 5...), `socket`
  (LGA1851, LGA 1700, LGA 1200, AM5, AM4), `model`.
- **GPU** (`src/data/gpus.json`, 87 unidades): `brand` (Nvidia/AMD/Intel),
  `family` (serie: RTX 50, RX 9000, ARC Battlemage...), `model`. Sin socket.
- UI actual: `ComponentSelect` (`<select>` plano controlado). Sin librería de
  combobox instalada.

## Arquitectura de componentes

### Nuevos

**`src/lib/search.ts`** — utilidades de coincidencia puras y testeables.
- `normalize(str: string): string` — `toLowerCase()` + elimina diacríticos
  (`normalize("NFD")` + strip de marcas combinantes) + colapsa espacios.
- `matches(searchText: string, query: string): boolean` — `true` si
  `normalize(searchText)` contiene `normalize(query)` como **subcadena
  contigua**. Query vacía → `true` (muestra todo).

**`src/components/Combobox.tsx`** — combobox genérico de selección única,
basado en `useCombobox` de downshift.
- Props: `label?`, `placeholder`, `options: ComboboxOption[]`,
  `value: string | null`, `onChange: (value: string | null) => void`,
  `disabled?`.
- `ComboboxOption = { value: string; label: string; searchText: string }`.
- Filtra `options` con `matches(opt.searchText, inputValue)`.
- Maneja ↑↓ / Enter / Esc / blur + roles ARIA (lo aporta downshift).
- Estilizado con tokens PSU Gang (mismas clases que `ComponentSelect`:
  `--color-surface`, borde `--color-accent` en foco, etc.).
- Al seleccionar una opción → `onChange(value)`. Al borrar el input → `onChange(null)`.

**`src/components/CpuPicker.tsx`** — selector completo de CPU.
- Internamente: `<select>` marca + `<select>` socket + `<Combobox>` modelo.
- Reutiliza `ComponentSelect` para los dos `<select>`.
- Estado local de filtros (`brand`, `socket`); no entra a `Selection`.
- Emite `onChange(cpuId: string | null)` al componente padre.

**`src/components/GpuPicker.tsx`** — selector de GPU para **una** fila.
- Internamente: `<select>` marca inline compacto + `<Combobox>` modelo, misma fila.
- Estado local de filtro `brand` por fila.
- Emite `onChange(gpuId: string | null)`.

### Sin cambios

- `ComponentSelect` — sigue sirviendo motherboard, cooler, fans, y los
  `<select>` de marca/socket dentro de los pickers.
- `Selection` (en `src/types/components.ts`) — intacto: `cpuId`, `gpuIds`.
- `calculator.ts` — intacto.

## Lógica de filtros (restricción dura)

### CPU

1. **Marca** acota los **sockets** disponibles (Intel → LGA*; AMD → AM*).
2. **Marca + socket** acotan la lista de opciones del combobox de modelo.
3. `searchText` del modelo = `normalize(`${brand} ${family} ${model}`)`.
   - `family` incluido → escribir `"RTX 50"` o `"Arrow Lake"` funciona.
   - `"RTX 50"` excluye RTX 40/30/20 por subcadena contigua (sus familias y
     modelos no contienen `"rtx 50"`).
4. Cambiar marca o socket que **invalide** el modelo elegido → limpia `cpuId`
   (mismo patrón que hoy limpia la motherboard al cambiar de socket en
   `Calculator.handleCpuChange`).
5. El socket del CPU elegido sigue alimentando el filtro de motherboard en
   `Calculator` (sin cambio en esa lógica).

### GPU

1. **Marca** acota la lista del combobox de modelo. Sin socket.
2. `searchText` = `normalize(`${brand} ${family} ${model}`)`.
3. Cada fila multi-GPU es un `GpuPicker` independiente con su propio filtro marca.
4. Cambiar la marca de una fila que invalide su modelo → limpia ese `gpuId`.

## Estado

- Los filtros (marca, socket) son **estado local de UI** dentro de
  `CpuPicker` / `GpuPicker`. No se añaden a `Selection`.
- `Selection` permanece como hoy: `cpuId: string | null`,
  `gpuIds: (string | null)[]`.
- `Calculator` baja de tamaño: deja de construir `cpuOptions` / `gpuOptions`
  planos; delega en los pickers. Conserva las filas multi-GPU
  (`addGpu`/`removeGpuAt`/`setGpuAt`), renderizando un `GpuPicker` por fila.

## Manejo de errores / casos borde

- **Query vacía** → combobox muestra todas las opciones del universo filtrado.
- **Sin filtro** (marca/socket sin elegir) → universo = todo el catálogo.
- **Cero resultados** (p. ej. marca=AMD + escribir "RTX") → lista vacía con
  mensaje "Sin coincidencias" (restricción dura: el usuario debe ajustar el
  filtro). No es un error; es comportamiento esperado.
- **Modelo invalidado por cambio de filtro** → se limpia la selección
  correspondiente (`cpuId` o el `gpuId` de la fila), evitando que un componente
  oculto incompatible se cuele en el cálculo.
- **Acentos / mayúsculas** → resueltos por `normalize`.

## Tests

**`src/lib/search.test.ts`** (lógica pura, prioridad alta):
- `matches`: `"RTX 50"` coincide con `"Nvidia RTX 50 RTX 5090"` y
  `"...RTX 5080"`; **no** coincide con `"Nvidia RTX 40 RTX 4090"` ni
  `"Nvidia RTX 30 RTX 3050"`.
- `"7700"` coincide con `"AMD Zen 4 Ryzen 7 7700"`.
- Insensible a acentos y mayúsculas.
- Query vacía → `true`.

**Componente combobox** (ligero): downshift cubre el grueso del teclado/ARIA;
verificar que seleccionar una opción emite `onChange` con el `value` correcto y
que escribir filtra la lista.

## Fuera de alcance (YAGNI)

- Fuzzy matching / tolerancia a typos.
- Búsqueda global que ignore filtros (se eligió restricción dura).
- Persistir filtros en URL o storage.
- Cambios a motherboard/cooler/fans (siguen `<select>` plano).
