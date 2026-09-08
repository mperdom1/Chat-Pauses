# Chat-Pauses

Herramienta local para generar filas de auxs a partir del reporte detallado de pausas de Gen Mobile.

## Uso

1. Abre `index.html` en el navegador.
2. Carga un CSV/TSV o pega el reporte detallado con `ScheduleStart`, `BUser`, `BreakType`, `PnchIn`, `PnchOut` y `TotalAux`.
4. Pulsa **Generar reporte** y descarga el CSV.

Cada fila del reporte detallado crea una fila independiente para los agentes mapeados:

- `BreakType = Lunch` → `Activity = Lunch`, `Code = 10`.
- El primer `Break` del agente en el día → `Activity = Break 1`, `Code = 15`.
- El segundo `Break` del agente en el día → `Activity = Break 2`, `Code = 16`.
- El tercer `Break` y los siguientes → `Activity = Bath Break`, `Code = bb`.
- Otros valores como `Coaching(Performance)`, `Team Meeting` y `Training` se conservan en `Activity`.

Solo se incluyen los 13 `Getty Username` configurados en `app.js`. `PnchIn` y `PnchOut` llenan `Start hour` y `End hour`; `TotalAux` llena `Duration`. Si una pausa no tiene punch, sus horas quedan vacías.
