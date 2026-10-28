#!/usr/bin/env node
// Ejecuta las verificaciones en Linux sin dependencias:  node tests/run-tests.js
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
[
  'js/math/linalg.js',
  'js/scene/pieces.js',
  'js/scene/scene.js',
  'js/camera/camera.js',
  'js/camera/projection.js',
  'js/camera/homography.js',
  'js/app/victory.js',
  'js/app/demo.js',
  'tests/tests.js',
]
  .map((f) => path.join(root, f))
  .filter((f) => fs.existsSync(f)) // durante el desarrollo algunos módulos aún no existen
  .forEach((f) => require(f));

const res = globalThis.BO.tests.run((msg) => console.log(msg));
process.exit(res.failures.length ? 1 : 0);
