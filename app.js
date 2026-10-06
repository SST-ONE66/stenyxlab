'use strict';

const form = document.querySelector('#analysis-form');
const stagesContainer = document.querySelector('#stages');
const demandInput = document.querySelector('#demand');
const processInput = document.querySelector('#process-name');
const resultsSection = document.querySelector('#results');
const errorsBox = document.querySelector('#errors');
const copyStatus = document.querySelector('#copy-status');
const numberFormat = new Intl.NumberFormat('es', { maximumFractionDigits: 2 });
const conversionFactors = { seconds: 1, minutes: 60, hours: 3600 };
let chart = null;
let currentAnalysis = null;
let stageSequence = 0;

function format(value) { return numberFormat.format(value); }

// Se conservan los valores completos en los cálculos; se redondea solo al mostrar.
function calculateStage(stage, demand) {
  const cycleSeconds = stage.cycle * conversionFactors[stage.unit];
  // Forma equivalente de la fórmula, evitando redondeo prematuro del porcentaje.
  const capacity = (stage.hours * 3600 * stage.resources * stage.efficiency) / (cycleSeconds * 100);
  const utilization = (demand / capacity) * 100;
  const status = utilization < 80 ? 'Capacidad disponible' : utilization <= 100 ? 'Alta utilización' : 'No alcanza';
  return { ...stage, capacity, utilization, status };
}

function invalidateResults() {
  currentAnalysis = null;
  resultsSection.hidden = true;
  document.querySelector('#empty-state').hidden = false;
  copyStatus.hidden = true;
  if (chart) { chart.destroy(); chart = null; }
}

function clearErrors() {
  errorsBox.hidden = true;
  errorsBox.replaceChildren();
  form.querySelectorAll('[aria-invalid]').forEach(input => input.removeAttribute('aria-invalid'));
}

function renumberStages() {
  stagesContainer.querySelectorAll('.stage').forEach((stage, index) => {
    stage.querySelector('legend').textContent = `ETAPA ${String(index + 1).padStart(2, '0')}`;
    stage.querySelector('.remove-stage').setAttribute('aria-label', `Eliminar etapa ${index + 1}`);
  });
}

function addStage(values = {}, focus = false) {
  const stage = document.querySelector('#stage-template').content.firstElementChild.cloneNode(true);
  const defaults = { name: '', cycle: '', unit: 'seconds', resources: 1, hours: 8, efficiency: 100 };
  const id = ++stageSequence;
  stage.querySelectorAll('[data-field]').forEach(input => {
    input.value = values[input.dataset.field] ?? defaults[input.dataset.field];
    input.id = `stage-${id}-${input.dataset.field}`;
    input.parentElement.htmlFor = input.id;
  });
  stage.querySelector('.remove-stage').addEventListener('click', () => {
    const nextFocus = stage.nextElementSibling || stage.previousElementSibling;
    stage.remove();
    renumberStages();
    invalidateResults();
    clearErrors();
    (nextFocus?.querySelector('input') || document.querySelector('#add-stage')).focus();
  });
  stagesContainer.append(stage);
  renumberStages();
  invalidateResults();
  if (focus) stage.querySelector('input').focus();
}

function loadExample() {
  clearErrors();
  stagesContainer.replaceChildren();
  processInput.value = 'Producción de arroz embolsado';
  demandInput.value = 500;
  [
    { name: 'Selección', cycle: 45, resources: 1, hours: 8, efficiency: 85 },
    { name: 'Pesaje y embolsado', cycle: 90, resources: 2, hours: 8, efficiency: 80 },
    { name: 'Sellado', cycle: 60, resources: 1, hours: 8, efficiency: 90 },
    { name: 'Almacenamiento', cycle: 75, resources: 1, hours: 8, efficiency: 95 }
  ].forEach(stage => addStage(stage));
}

function readAndValidate() {
  clearErrors();
  const errors = [];
  let firstInvalid = null;
  function fail(input, message) {
    errors.push(message);
    if (input) { input.setAttribute('aria-invalid', 'true'); firstInvalid ??= input; }
  }
  const demand = demandInput.valueAsNumber;
  if (!Number.isFinite(demand) || demand <= 0) fail(demandInput, 'La demanda diaria debe ser un número mayor que 0.');
  const stages = [...stagesContainer.querySelectorAll('.stage')].map((element, index) => {
    const inputs = Object.fromEntries([...element.querySelectorAll('[data-field]')].map(input => [input.dataset.field, input]));
    const stage = { name: inputs.name.value.trim(), unit: inputs.unit.value };
    if (!stage.name) fail(inputs.name, `Etapa ${index + 1}: escribe un nombre.`);
    const labels = { cycle: 'el tiempo de ciclo', resources: 'los recursos', hours: 'las horas disponibles', efficiency: 'la eficiencia' };
    for (const [key, label] of Object.entries(labels)) {
      stage[key] = inputs[key].valueAsNumber;
      if (!Number.isFinite(stage[key]) || stage[key] <= 0) fail(inputs[key], `Etapa ${index + 1}: ${label} debe ser mayor que 0.`);
      else if (key === 'efficiency' && stage[key] > 100) fail(inputs[key], `Etapa ${index + 1}: la eficiencia no puede superar el 100%.`);
      else if (key === 'resources' && !Number.isInteger(stage[key])) fail(inputs[key], `Etapa ${index + 1}: los recursos deben ser un número entero.`);
    }
    if (!Object.hasOwn(conversionFactors, stage.unit)) fail(inputs.unit, `Etapa ${index + 1}: selecciona una unidad de tiempo válida.`);
    return stage;
  });
  if (!stages.length) fail(null, 'Agrega al menos una etapa para calcular la capacidad.');
  if (!errors.length) {
    stages.forEach((stage, index) => {
      const result = calculateStage(stage, demand);
      if (!Number.isFinite(result.capacity) || result.capacity <= 0 || !Number.isFinite(result.utilization)) {
        fail(stagesContainer.children[index].querySelector('input'), `Etapa ${index + 1}: los valores son demasiado extremos para calcular. Usa valores operativos válidos.`);
      }
    });
  }
  if (errors.length) {
    const list = document.createElement('ul');
    errors.forEach(message => { const li = document.createElement('li'); li.textContent = message; list.append(li); });
    errorsBox.append(list);
    errorsBox.hidden = false;
    firstInvalid?.focus();
    return null;
  }
  return { process: processInput.value.trim() || 'Proceso sin nombre', demand, stages };
}

function diagnosticText(analysis) {
  const { capacity, demand, difference, bottlenecks } = analysis;
  const multiple = bottlenecks.length > 1;
  const stageNames = bottlenecks.map(stage => stage.name);
  const names = multiple ? `${stageNames.slice(0, -1).join(', ')} y ${stageNames.at(-1)}` : stageNames[0];
  const actions = 'reducir el tiempo de ciclo, aumentar recursos, mejorar la eficiencia o aumentar las horas disponibles';
  const figures = `La capacidad máxima del sistema es de ${format(capacity)} unidades/día frente a una demanda objetivo de ${format(demand)} unidades/día`;

  if (difference >= 0) {
    const limitingText = multiple ? `Las etapas con menor capacidad son ${names}` : `La etapa con menor capacidad es ${names}`;
    return `El proceso puede cumplir la demanda objetivo. ${figures}, con un excedente de ${format(difference)} unidades/día. ${limitingText}. Se recomienda ${multiple ? 'monitorear estas etapas porque pueden convertirse' : 'monitorear esta etapa porque puede convertirse'} en ${multiple ? 'restricciones futuras' : 'una restricción futura'} si aumenta la demanda o disminuye su capacidad. Si se necesita mayor capacidad, evalúa ${actions} en ${multiple ? 'esas etapas' : 'esa etapa'}.`;
  }

  const limitingText = multiple ? `Las etapas cuello de botella son ${names}` : `La etapa cuello de botella es ${names}`;
  return `El proceso no puede cumplir la demanda objetivo. ${figures}, con un déficit de ${format(-difference)} unidades/día. ${limitingText}. Para mejorar la capacidad del sistema, evalúa ${actions} en ${multiple ? 'esas etapas limitantes' : 'esa etapa limitante'}. ${multiple ? 'Mejorar solo una de las etapas empatadas puede dejar a las otras como restricción; evalúa todas y recalcula el proceso.' : 'Después de evaluar una mejora, recalcula el proceso para comprobar si otra etapa se convierte en el cuello de botella.'}`;
}

function renderResults(analysis) {
  const summary = document.querySelector('#summary');
  summary.replaceChildren();
  const names = analysis.bottlenecks.map(stage => stage.name).join(', ');
  const metrics = [
    ['Capacidad del sistema', format(analysis.capacity), 'unidades/día', 'highlight'],
    [analysis.bottlenecks.length > 1 ? 'Cuellos de botella' : 'Cuello de botella', names, 'Etapa con menor capacidad', 'bottleneck'],
    ['Demanda diaria', format(analysis.demand), 'unidades/día', ''],
    [analysis.difference < 0 ? 'Déficit' : 'Excedente', format(Math.abs(analysis.difference)), 'unidades/día', analysis.difference < 0 ? 'deficit' : 'highlight']
  ];
  metrics.forEach(([label, value, unit, className]) => {
    const card = document.createElement('div'); card.className = `metric ${className}`;
    const title = document.createElement('span'); title.className = 'metric-label'; title.textContent = label;
    const number = document.createElement('strong'); number.textContent = value;
    const subtitle = document.createElement('small'); subtitle.textContent = unit;
    card.append(title, number, subtitle); summary.append(card);
  });
  document.querySelector('#result-process').textContent = analysis.process;
  const tbody = document.querySelector('#results-body');
  tbody.replaceChildren();
  analysis.stages.forEach(stage => {
    const limiting = stage.capacity === analysis.capacity;
    const row = document.createElement('tr');
    if (limiting) row.className = 'limiting';
    [stage.name, `${format(stage.capacity)} unidades/día`, `${format(stage.utilization)}%`].forEach((value, index) => {
      const cell = document.createElement('td'); cell.textContent = value;
      if (index === 0 && limiting) { const label = document.createElement('span'); label.className = 'limit-label'; label.textContent = 'Cuello de botella'; cell.append(label); }
      row.append(cell);
    });
    const cell = document.createElement('td'); const badge = document.createElement('span');
    badge.className = `badge ${stage.utilization < 80 ? 'available' : stage.utilization <= 100 ? 'high' : 'insufficient'}`;
    badge.textContent = stage.status; cell.append(badge); row.append(cell); tbody.append(row);
  });
  document.querySelector('#diagnosis-title').textContent = analysis.difference >= 0 ? 'Puedes cumplir la demanda.' : 'Tu proceso necesita más capacidad.';
  document.querySelector('#diagnosis-text').textContent = diagnosticText(analysis);
  resultsSection.hidden = false;
  document.querySelector('#empty-state').hidden = true;
  copyStatus.hidden = true;
  renderChart(analysis);
}

function renderChart(analysis) {
  if (chart) { chart.destroy(); chart = null; }
  const error = document.querySelector('#chart-error');
  const canvas = document.querySelector('#capacity-chart');
  error.hidden = true;
  canvas.hidden = false;
  try {
    if (typeof Chart === 'undefined') throw new Error('Chart.js no disponible');
    chart = new Chart(canvas, {
      type: 'bar',
      data: { labels: analysis.stages.map(stage => stage.name), datasets: [{ label: 'Capacidad (unidades/día)', data: analysis.stages.map(stage => stage.capacity), backgroundColor: analysis.stages.map(stage => stage.capacity === analysis.capacity ? '#cc783e' : '#287e75'), borderRadius: 5, maxBarThickness: 65 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: context => `${format(context.parsed.y)} unidades/día` } } }, scales: { y: { beginAtZero: true, title: { display: true, text: 'unidades/día' } }, x: { grid: { display: false } } } }
    });
  } catch {
    canvas.hidden = true;
    error.textContent = 'No se pudo cargar el gráfico. Comprueba tu conexión a Internet y vuelve a calcular. Los resultados completos siguen disponibles en la tabla.';
    error.hidden = false;
  }
}

function resultsText(analysis) {
  return `Análisis de capacidad - StenyxLab v0.2\n\nProceso: ${analysis.process}\nDemanda diaria: ${format(analysis.demand)} unidades/día\nCapacidad del sistema: ${format(analysis.capacity)} unidades/día\nCuello de botella: ${analysis.bottlenecks.map(stage => stage.name).join(', ')}\nResultado: ${analysis.difference >= 0 ? 'El proceso puede cumplir la demanda.' : 'El proceso no alcanza la demanda.'}\n${analysis.difference < 0 ? 'Déficit' : 'Excedente'}: ${format(Math.abs(analysis.difference))} unidades/día\n\nResultados por etapa:\n${analysis.stages.map(stage => `- ${stage.name}: ${format(stage.capacity)} unidades/día, utilización ${format(stage.utilization)}%, estado ${stage.status}`).join('\n')}`;
}

async function copyResults() {
  if (!currentAnalysis) return;
  const text = resultsText(currentAnalysis);
  try {
    if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
    else {
      // Compatibilidad con apertura por file:// y navegadores sin Clipboard API.
      const textarea = document.createElement('textarea'); textarea.value = text;
      textarea.setAttribute('aria-label', 'Resumen para copiar'); textarea.style.position = 'fixed'; textarea.style.opacity = '0';
      document.body.append(textarea); textarea.select();
      let copied;
      try { copied = document.execCommand('copy'); } finally { textarea.remove(); document.querySelector('#copy-results').focus(); }
      if (!copied) throw new Error('Portapapeles no disponible');
    }
    copyStatus.textContent = 'Resultados copiados al portapapeles.';
    copyStatus.className = 'message';
  } catch {
    copyStatus.textContent = 'No se pudo acceder al portapapeles. Permite el acceso en tu navegador o prueba desde un servidor local.';
    copyStatus.className = 'message error';
  }
  copyStatus.hidden = false;
}

form.addEventListener('submit', event => {
  event.preventDefault();
  invalidateResults();
  const input = readAndValidate();
  if (!input) return;
  const stages = input.stages.map(stage => calculateStage(stage, input.demand));
  const capacity = stages.reduce((minimum, stage) => Math.min(minimum, stage.capacity), Infinity);
  currentAnalysis = { ...input, stages, capacity, difference: capacity - input.demand, bottlenecks: stages.filter(stage => stage.capacity === capacity) };
  renderResults(currentAnalysis);
});
form.addEventListener('input', () => { invalidateResults(); clearErrors(); });
form.addEventListener('change', () => { invalidateResults(); clearErrors(); });
document.querySelector('#add-stage').addEventListener('click', () => { clearErrors(); addStage({}, true); });
document.querySelector('#load-example').addEventListener('click', loadExample);
document.querySelector('#clear-data').addEventListener('click', () => {
  processInput.value = ''; demandInput.value = ''; stagesContainer.replaceChildren(); clearErrors(); invalidateResults(); processInput.focus();
});
document.querySelector('#copy-results').addEventListener('click', copyResults);
loadExample();
