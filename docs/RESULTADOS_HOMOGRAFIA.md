# Resultados numéricos de la homografía (generado)

Generado con `node tests/homography-experiment.js --md docs/RESULTADOS_HOMOGRAFIA.md`.
Imagen de 960×720 px. Plano: fondo del contenedor, Z = 0.

## Cámaras
| | azimut | elevación | distancia | fovY | f (px) | centro C |
|---|---|---|---|---|---|---|
| Vista 1 | -62° | 48° | 23 | 45.0° | 869.12 | (9.73, -11.09, 20.59) |
| Vista 2 | -7° | 70° | 18 | 55.0° | 691.55 | (8.61, 1.75, 20.41) |

Línea base ‖C₁ − C₂‖ = 12.888 unidades. Puntos del plano en posición general: sí.

## H₂₁ = H_π2 · H_π1⁻¹ (analítica, H[3][3] = 1)
| | | |
|---|---|---|
| 0.39702 | -0.74095 | 660.41052 |
| 0.65337 | 0.98663 | -310.69193 |
| -0.00042 | 0.00068 | 1.00000 |

## H₂₁ estimada por DLT normalizada con los 5 puntos del fondo
| | | |
|---|---|---|
| 0.39702 | -0.74095 | 660.41052 |
| 0.65337 | 0.98663 | -310.69193 |
| -0.00042 | 0.00068 | 1.00000 |

Diferencia relativa de Frobenius ‖H − H_DLT‖/‖H‖ = 1.28e-14.

## Errores de transferencia  e = ‖H₂₁·x₁ − x₂‖  (píxeles)
| punto del mundo | en el plano | x₁ (vista 1) | x₂ real | H₂₁·x₁ | error (px) |
|---|---|---|---|---|---|
| (0.5, 0.5, 0.0) | sí | (386.15, 462.59) | (409.57, 346.12) | (409.57, 346.12) | 0.00e+0 |
| (4.3, 0.9, 0.0) | sí | (510.24, 505.02) | (434.08, 462.64) | (434.08, 462.64) | 8.04e-14 |
| (3.8, 4.4, 0.0) | sí | (547.37, 411.15) | (547.56, 432.44) | (547.56, 432.44) | 1.27e-13 |
| (1.1, 3.7, 0.0) | sí | (458.14, 394.64) | (512.35, 352.20) | (512.35, 352.20) | 0.00e+0 |
| (2.8, 1.8, 0.0) | sí | (475.45, 461.24) | (456.68, 409.52) | (456.68, 409.52) | 5.68e-14 |
| (0.0, 0.0, 10.0) | no | (311.87, 181.92) | (327.53, 126.40) | (655.29, 73.22) | 332.047 |
| (5.0, 0.0, 10.0) | no | (536.48, 259.65) | (342.39, 384.96) | (718.00, 312.08) | 382.616 |
| (5.0, 5.0, 10.0) | no | (635.80, 124.19) | (652.84, 348.98) | (1007.78, 279.01) | 361.775 |
| (0.0, 5.0, 10.0) | no | (436.03, 68.11) | (597.19, 99.36) | (909.26, 48.07) | 316.253 |
| (2.5, 2.5, 5.0) | no | (480.00, 320.14) | (480.00, 338.61) | (605.61, 314.55) | 127.894 |
| (5.0, 2.5, 2.0) | no | (562.23, 429.89) | (491.35, 465.99) | (536.65, 456.58) | 46.266 |

- En el plano: RMS = 7.19e-14 px, máximo = 1.27e-13 px (error de redondeo de punto flotante).
- Fuera del plano: RMS = 290.415 px, máximo = 382.616 px.

## Control: rotación pura (mismo centro óptico)
La vista 3 es la vista 1 rotada (0.12 rad en y_c, −0.05 rad en x_c) sin mover C.
H = K R₃ R₁ᵀ K⁻¹ transfiere TODOS los puntos, también los que están fuera del plano;
la homografía del plano calculada con la fórmula general coincide con ella.

| punto del mundo | error con K R₃ R₁ᵀ K⁻¹ (px) | error con H del plano (px) |
|---|---|---|
| (0.5, 0.5, 0.0) | 2.41e-13 | 1.27e-13 |
| (4.3, 0.9, 0.0) | 4.10e-13 | 1.14e-13 |
| (3.8, 4.4, 0.0) | 2.34e-13 | 1.14e-13 |
| (1.1, 3.7, 0.0) | 4.10e-13 | 1.14e-13 |
| (2.8, 1.8, 0.0) | 2.05e-13 | 1.27e-13 |
| (0.0, 0.0, 10.0) | 1.73e-13 | 1.02e-13 |
| (5.0, 0.0, 10.0) | 2.54e-13 | 0.00e+0 |
| (5.0, 5.0, 10.0) | 2.43e-13 | 2.84e-14 |
| (0.0, 5.0, 10.0) | 2.84e-14 | 1.27e-13 |
| (2.5, 2.5, 5.0) | 2.54e-13 | 5.68e-14 |
| (5.0, 2.5, 2.0) | 1.27e-13 | 1.27e-13 |
