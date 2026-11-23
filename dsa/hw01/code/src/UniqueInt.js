

const fs = require('fs'); //allows reading and writing files
const path = require('path'); //handles file paths in a cross-platform way

const MIN_VALUE = -1023;
const MAX_VALUE = 1023;
const VALUE_COUNT = MAX_VALUE - MIN_VALUE + 1;
const RESULT_SUFFIX = '_result.txt';

function parseIntegerLine(line) {
  if (!/^[ \t]*[+-]?\d+[ \t]*$/.test(line)) {
    return null;
  }

  const value = Number(line.trim());
  if (!Number.isInteger(value) || value < MIN_VALUE || value > MAX_VALUE) {
    return null;
  }

  return value;
}

function processFile(inputPath) {
  const startedAt = process.hrtime.bigint();
  const memoryBefore = process.memoryUsage();
  const seen = new Array(VALUE_COUNT);


  for (let i = 0; i < VALUE_COUNT; i += 1) {
    seen[i] = false;
  }
  const contents = fs.readFileSync(inputPath, 'utf8');
  let lineStart = 0;


  for (let i = 0; i <= contents.length; i += 1) {
    if (i === contents.length || contents[i] === '\n') {
      let lineEnd = i;
      if (lineEnd > lineStart && contents[lineEnd - 1] === '\r') {
        lineEnd -= 1;
      }

      const value = parseIntegerLine(contents.slice(lineStart, lineEnd));
      if (value !== null) {
        seen[value - MIN_VALUE] = true;
      }

      lineStart = i + 1;
    }
  }

  // Scanning from the minimum to the maximum writes values in sorted order.
  let outputText = '';
  let uniqueCount = 0;
  for (let i = 0; i < VALUE_COUNT; i += 1) {
    if (seen[i]) {
      outputText += String(i + MIN_VALUE) + '\n';
      uniqueCount += 1;
    }
  }

  const outputPath = inputPath + RESULT_SUFFIX;
  fs.writeFileSync(outputPath, outputText, 'utf8');

  const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
  const memoryAfter = process.memoryUsage();
  const tableBytes = VALUE_COUNT; 

  console.log(`Created: ${outputPath}`);
  console.log(`Unique integers: ${uniqueCount}`);
  console.log(`Runtime: ${elapsedMs.toFixed(3)} ms`);
  console.log(`Presence table: approximately ${tableBytes} bytes`);
  console.log(`Node heap used after run: ${memoryAfter.heapUsed} bytes`);
  console.log(`Node RSS after run: ${memoryAfter.rss} bytes`);
  console.log(`Heap change during run: ${memoryAfter.heapUsed - memoryBefore.heapUsed} bytes`);
}

function main() {
  const inputDirectory = process.argv[2]
    ? path.resolve(process.argv[2])
    : __dirname;

  if (!fs.existsSync(inputDirectory) || !fs.statSync(inputDirectory).isDirectory()) {
    console.error(`Input folder does not exist: ${inputDirectory}`);
    process.exitCode = 1;
    return;
  }

  const directory = fs.opendirSync(inputDirectory);
  let processedCount = 0;

  try {
    let entry;
    while ((entry = directory.readSync()) !== null) {
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.txt')) {
        continue;
      }
      if (entry.name.toLowerCase().endsWith(RESULT_SUFFIX)) {
        continue; 
      }

      processFile(path.join(inputDirectory, entry.name));
      processedCount += 1;
      console.log('');
    }
  } finally {
    directory.closeSync();
  }

  if (processedCount === 0) {
    console.log(`No input .txt files found in ${inputDirectory}`);
  }
}

main();
