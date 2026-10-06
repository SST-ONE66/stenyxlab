# StenyxLab v0.2

**Simulador de capacidad y cuellos de botella.** Herramienta web estática para estudiantes, docentes, técnicos y pequeños negocios que necesitan analizar un proceso productivo.

## Objetivo

Calcular la capacidad diaria de las etapas de un proceso en serie, identificar la restricción del sistema y evaluar el cumplimiento de una demanda diaria objetivo.

## Funciones principales

- Agregar, editar y eliminar etapas con distintas unidades de tiempo.
- Validar demanda, tiempos, recursos, horas y eficiencia con errores en la interfaz.
- Mostrar capacidad del sistema, cuellos de botella (incluidos empates), déficit o excedente.
- Consultar utilización y estado por etapa en tabla y gráfico de barras con Chart.js.
- Obtener un diagnóstico y copiar el resumen al portapapeles.
- Cargar el ejemplo de arroz embolsado o limpiar todos los datos.
- Usar la interfaz en computadora, tablet o celular. Los resultados se invalidan al editar para evitar mostrar análisis desactualizados.

## Fórmulas utilizadas

```text
tiempoCicloSegundos = tiempoCiclo × factorConversión
factorConversión: segundos = 1; minutos = 60; horas = 3600
eficienciaDecimal = eficienciaPorcentaje / 100
capacidadEtapa = (horasDisponibles × 3600 × recursos × eficienciaDecimal) / tiempoCicloSegundos
capacidadSistema = mínimo de las capacidades de las etapas
diferencia = capacidadSistema − demandaDiaria
utilización = (demandaDiaria / capacidadEtapa) × 100
```

Una diferencia mayor o igual a cero indica cumplimiento; una diferencia negativa indica déficit. Utilización menor a 80%: **Capacidad disponible**; desde 80% hasta 100%: **Alta utilización**; mayor a 100%: **No alcanza**. El cálculo conserva precisión y la presentación redondea a un máximo de dos decimales usando formato español.

La demanda, el ciclo y las horas deben ser finitos y mayores que cero; los recursos son enteros positivos; la eficiencia debe ser mayor que cero y no superar 100%. Se requiere al menos una etapa con nombre. Los resultados numéricos extremos no representables se rechazan.

El modelo supone etapas en serie que procesan la misma unidad. No contempla mermas, inventarios intermedios ni variabilidad. Los recursos operan en paralelo dentro de su etapa. No se redondea la capacidad a unidades enteras.

### Ejemplo precargado

Proceso: Producción de arroz embolsado. Demanda: 500 unidades/día. Jornada: 8 horas.

| Etapa | Ciclo (s) | Recursos | Eficiencia | Capacidad diaria | Utilización |
|---|---:|---:|---:|---:|---:|
| Selección | 45 | 1 | 85% | 544 | 91,91% |
| Pesaje y embolsado | 90 | 2 | 80% | 512 | 97,66% |
| Sellado | 60 | 1 | 90% | 432 | 115,74% |
| Almacenamiento | 75 | 1 | 95% | 364,8 | 137,06% |

Capacidad del sistema: **364,8 unidades/día**. Cuello de botella: **Almacenamiento**. Déficit: **135,2 unidades/día**.

La especificación original presenta 456 unidades/día para Almacenamiento y señala Sellado como cuello de botella. Ese resultado no corresponde a sus datos: `(8 × 3600 × 1 × 0,95) / 75 = 364,8`. Esta implementación conserva los datos del ejemplo y aplica las fórmulas obligatorias de forma consistente.

## Cómo ejecutar localmente

Abre `index.html` con doble clic. No requiere instalación, compilación, Node.js ni backend.

Opcionalmente, si tienes Python, desde la carpeta del proyecto ejecuta:

```sh
python3 -m http.server 8000
```

Abre `http://localhost:8000`. Chart.js 4.4.9 se carga mediante jsDelivr y requiere conexión a Internet. Si el CDN no está disponible, los cálculos, la tabla y el diagnóstico siguen funcionando y se muestra un aviso. El portapapeles depende de los permisos del navegador; se incluye una alternativa para navegadores sin Clipboard API.

## Estructura de archivos

```text
stenyxlab/
├── index.html
├── styles.css
├── app.js
└── README.md
```

HTML, CSS y JavaScript vanilla, con Chart.js como única librería externa. No se guardan datos ni se envía el análisis a servicios externos.

## Publicación

Publica los cuatro archivos en GitHub Pages, Netlify o Vercel como sitio estático, sin comando de compilación. En GitHub Pages selecciona la rama que contiene los archivos y la carpeta raíz. No se requiere configuración del lado del servidor.

## Mejoras de v0.2

- Propuesta de valor más clara en la presentación inicial.
- Sección "Cómo interpretar los resultados" con los conceptos principales.
- Nota técnica sobre el alcance de la estimación.
- Resaltado visual y etiqueta del cuello de botella, incluidos empates.
- Diagnóstico automático mejorado con acciones posibles y recomendaciones de monitoreo.

## Próximas mejoras posibles

- Comparación de escenarios operativos.
- Explicación interactiva de las fórmulas.
- Parámetros de mermas y variabilidad.

## Nota de versión

**Versión actual: v0.2.** Mejora la explicación, la interpretación visual y la orientación del diagnóstico, manteniendo las fórmulas de v0.1 y el funcionamiento estático, sin backend, autenticación ni almacenamiento persistente.

**v0.1**: primera versión funcional.
