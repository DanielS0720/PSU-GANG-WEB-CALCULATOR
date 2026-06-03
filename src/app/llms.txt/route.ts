import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, SOCIAL_URLS } from "@/lib/site";

// /llms.txt — machine-readable summary for AI/LLM consumption.
// Spec: https://llmstxt.org/ . Static so it deploys on Cloudflare Pages.
export const dynamic = "force-static";

const body = `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

PSU Gang Watt Calculator es una herramienta web gratuita y 100% client-side
(sin backend, sin base de datos) que estima el consumo de un PC y recomienda la
fuente de poder (PSU) adecuada. Sitio: ${SITE_URL}

## Cómo usar
1. Elegir el estándar de PSU: ATX 2.52 o inferior, o ATX 3.x.
2. Seleccionar CPU, una o varias GPUs (multi-GPU), motherboard (filtrada por socket del CPU), disipador y tipos de ventilador con su cantidad.
3. Marcar opciones extra opcionales: Overclock (+100W) y Future Proof (+100W).
4. Pulsar "Calcular". Se requieren CPU, GPU y motherboard como mínimo.

## Metodología de cálculo
- Valor de carga por componente según el estándar ATX:
  - ATX 2.52 o inferior: usa el pico transitorio (peak_w).
  - ATX 3.x: usa el TDP nominal (tdp_w), porque ATX 3.x cubre el power excursion. Si falta el TDP, se usa el peak como respaldo.
- Consumo total = carga del CPU + suma de la carga de TODAS las GPUs + consumo de la motherboard + consumo del disipador + suma de (watts por ventilador × cantidad). Overclock y Future Proof suman +100W cada uno.

## Tier de la fuente (calidad/categoría)
- Los tiers van por letras de mejor a peor: X, S+, S, A, B+, B, C+, C, D, E, F.
- Cada tier tiene límites max_cpu_w y max_gpu_w (null = sin límite, tiers altos).
- El tier asignado es el más bajo (peor) que soporta la carga del CPU y la carga SUMADA de las GPUs. Multi-GPU suma todas las GPUs antes de evaluar el tier.
- El tier NO se ve afectado por Overclock ni Future Proof; depende solo de CPU + GPUs.

## Fuente recomendada (wattaje estándar)
- Escalones reales: 110V → 450, 550, 650, 750, 850, 1000, 1200, 1300, 1500, 1600; alto voltaje (requieren instalación 220V/230V) → 2000, 2200, 3000, 5200.
- Regla de tolerancia 5%: se recomienda el primer escalón S (ascendente) donde consumoTotal ≤ S × 1.05. Ejemplo: 570W → 550W (porque 570 ≤ 577.5).
- Si el consumo supera 5200W × 1.05 (5460W), no hay escalón y se indica que excede el estándar.
- La fuente recomendada es independiente del tier; son dos salidas distintas.

## Cobertura de datos
- CPUs: Intel 11ª gen → Core Ultra 200; AMD Ryzen 3000 → 9000.
- GPUs: NVIDIA GTX 10 → RTX 50; AMD RX 500 → RX 9000.
- Motherboards por chipset; disipadores de aire (torre simple/doble, con/sin RGB) y AIO 120–420mm (variantes RGB y con pantalla).
- RAM y SSD se excluyen (consumo despreciable en el riel de 12V).

## Enlaces
- Sitio: ${SITE_URL}
- Apoyar el proyecto: ${SITE_URL} (botón "¿Gustas apoyar el proyecto?")
- Redes oficiales:
${SOCIAL_URLS.map((u) => `  - ${u}`).join("\n")}
`;

export function GET() {
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
