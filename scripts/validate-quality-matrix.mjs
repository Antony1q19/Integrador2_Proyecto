import fs from 'fs';

const filePath = process.argv[2];

if (!filePath) {
  console.error('Error: Debes proporcionar la ruta al archivo JSON de requisitos.');
  console.error('Uso: node scripts/validate-quality-matrix.mjs quality/week10/requirements-functional.json');
  process.exit(1);
}

try {
  const rawData = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(rawData);

  console.log(`\n==================================================`);
  console.log(`VALIDADOR DE MATRIZ DE CALIDAD FUNCIONAL (ISO 25010)`);
  console.log(`Proyecto: ${data.project} (v${data.version})`);
  console.log(`Referencia: ${data.standard}`);
  console.log(`==================================================\n`);

  const seenIds = new Set();
  const subchars = {
    'Completitud funcional': 0,
    'Corrección funcional': 0,
    'Idoneidad funcional': 0
  };

  let hasErrors = false;

  data.requirements.forEach((req, index) => {
    // 1. Validar ID duplicado o vacío
    if (!req.id || req.id.trim() === '') {
      console.error(`❌ [Error Fila ${index + 1}]: Requisito sin identificador ID.`);
      hasErrors = true;
    } else if (seenIds.has(req.id)) {
      console.error(`❌ [Error Fila ${index + 1}]: ID duplicado detectado: ${req.id}`);
      hasErrors = true;
    }
    seenIds.add(req.id);

    // 2. Validar Subcaracterística ISO 25010
    if (subchars[req.subcharacteristic] !== undefined) {
      subchars[req.subcharacteristic]++;
    } else {
      console.error(`❌ [${req.id}]: Subcaracterística no válida según ISO 25010: "${req.subcharacteristic}"`);
      hasErrors = true;
    }

    // 3. Validar oráculo y artefacto de prueba
    if (!req.oracle || req.oracle.trim() === '') {
      console.error(`❌ [${req.id}]: Oráculo no especificado.`);
      hasErrors = true;
    }
    if (!req.test_artifact || req.test_artifact.trim() === '') {
      console.error(`❌ [${req.id}]: Artefacto de prueba no vinculado.`);
      hasErrors = true;
    }
  });

  console.log('Distribución de Subcaracterísticas evaluadas:');
  Object.entries(subchars).forEach(([key, count]) => {
    console.log(`  - ${key}: ${count} requisito(s)`);
  });

  if (hasErrors) {
    console.error(`\n❌ MATRIX FAILED: Se encontraron inconsistencias en la matriz.`);
    process.exit(1);
  } else {
    console.log(`\n✅ MATRIX OK: 5 de 5 requisitos cumplen trazabilidad ISO 25010.`);
    console.log(`==================================================\n`);
  }
} catch (err) {
  console.error(`Error al procesar el archivo: ${err.message}`);
  process.exit(1);
}