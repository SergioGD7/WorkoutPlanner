#!/usr/bin/env node
/**
 * Imports the Workout Guide illustration library into this repo.
 *
 * Usage:
 *   node scripts/import-exercise-library.mjs [path-to-package-or-clone]
 *
 * Defaults to `node_modules/@bryllim/workout-guide`, and also accepts a git
 * clone (it looks for `packages/workout-guide` inside).
 *
 * The assets are *vendored* rather than imported from the package at build time.
 * The upstream repo is young — one published version — and a dependency that can
 * be renamed or unpublished has no business sitting between the app and its own
 * exercise artwork. CC BY-SA 4.0 explicitly permits the copy.
 *
 * Everything this writes is generated. Do not hand-edit the outputs; edit the
 * tables below and run it again. It is deterministic: same input, same bytes.
 *
 * What it writes:
 *   public/exercises/<slug>/frame-N.svg   the artwork, byte-for-byte
 *   public/exercises/LICENSE-ASSETS       copied verbatim, as the licence requires
 *   public/exercises/ATTRIBUTION.md       copied verbatim
 *   src/lib/illustrations.ts              slug -> frames + per-frame attribution
 *   src/lib/exercise-catalog.ts           the exercises this app did not have
 *   src/locales/exercises-en.json         their names and descriptions
 *   src/locales/exercises-es.json
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/* -------------------------------------------------------------------------- */
/* Existing catalogue                                                          */
/* -------------------------------------------------------------------------- */

/**
 * The 15 exercises this app shipped with, mapped to their slug upstream.
 *
 * Their ids (`ex1`…`ex15`) are written into every user's logged history, so they
 * are never regenerated — this map only tells the script which slugs are already
 * taken, so it does not import a duplicate.
 */
const EXISTING = {
  ex1: 'bench-press',
  ex2: 'dumbbell-fly',
  ex3: 'push-up',
  ex4: 'pull-up',
  ex5: 'barbell-row',
  ex6: 'deadlift',
  ex7: 'squat',
  ex8: 'leg-press',
  ex9: 'forward-lunge',
  ex10: 'overhead-press',
  ex11: 'lateral-raise',
  ex12: 'bicep-curl',
  ex13: 'bench-dip',
  ex14: 'plank',
  ex15: 'crunch',
};

/* -------------------------------------------------------------------------- */
/* Translation tables                                                          */
/* -------------------------------------------------------------------------- */

/** The app's six groups. Upstream is finer-grained, so several fold into one. */
const BODY_PART = {
  Chest: 'Chest',
  Back: 'Back',
  Lats: 'Back',
  'Upper Back': 'Back',
  'Lower Back': 'Back',
  Legs: 'Legs',
  Quads: 'Legs',
  Hamstrings: 'Legs',
  Glutes: 'Legs',
  Calves: 'Legs',
  Adductors: 'Legs',
  Hips: 'Legs',
  'Posterior Chain': 'Legs',
  Shoulders: 'Shoulders',
  'Rear Delts': 'Shoulders',
  Triceps: 'Arms',
  Biceps: 'Arms',
  Forearms: 'Arms',
  Core: 'Core',
  Mobility: 'Core',
};

/** Which input the set row should show. */
const TRACKING = {
  weight_reps: 'weight',
  bodyweight_reps: 'bodyweight',
  assisted_bodyweight: 'bodyweight',
  duration: 'duration',
  distance_duration: 'duration',
};

/** Matches `bodyPartEmojiMap` in exercise-context, so the fallback is consistent. */
const EMOJI = {
  Chest: '🏋️',
  Back: '🧗',
  Legs: '🏃',
  Shoulders: '🤷',
  Arms: '💪',
  Core: '🧘',
};

/**
 * Unilateral exercises where the logged weight is the *total* across both sides.
 *
 * Deliberately not inferred from the name. `perSide` halves the number shown, so
 * it is only right when you hold an implement in each hand — a lunge with two
 * dumbbells. It is exactly wrong for one-arm work: a 30 kg one-arm row is 30 kg
 * for each side, not 15. Guessing would misreport half the catalogue, so this is
 * a curated list, and anything missing can be switched on per exercise in the
 * app.
 */
const PER_SIDE = new Set([
  'forward-lunge',
  'walking-lunge',
  'reverse-lunge',
  'lateral-lunge',
  'curtsy-lunge',
  'deficit-reverse-lunge',
  'dumbbell-lateral-lunge',
  'dumbbell-curtsy-lunge',
  'split-squat',
  'bulgarian-split-squat',
  'front-foot-elevated-split-squat',
  'smith-machine-split-squat',
  'smith-machine-bulgarian-split-squat',
  'smith-machine-reverse-lunge',
  'step-up',
  'step-down',
]);

/** Equipment, as the description says it. */
const EQUIPMENT_ES = {
  Bodyweight: 'peso corporal',
  Dumbbell: 'mancuernas',
  Machine: 'máquina',
  Barbell: 'barra',
  Cable: 'polea',
  'Resistance Band': 'banda elástica',
  Cardio: 'cardio',
  'Pull-up Bar': 'barra de dominadas',
  Wall: 'pared',
  Towel: 'toalla',
  Plate: 'disco',
  Kettlebell: 'kettlebell',
  Doorway: 'marco de puerta',
  Box: 'cajón',
  Bench: 'banco',
  Chair: 'silla',
  'Stability Ball': 'fitball',
};

const EQUIPMENT_EN = {
  Bodyweight: 'bodyweight',
  Dumbbell: 'dumbbell',
  Machine: 'machine',
  Barbell: 'barbell',
  Cable: 'cable',
  'Resistance Band': 'resistance band',
  Cardio: 'cardio',
  'Pull-up Bar': 'pull-up bar',
  Wall: 'wall',
  Towel: 'towel',
  Plate: 'plate',
  Kettlebell: 'kettlebell',
  Doorway: 'doorway',
  Box: 'box',
  Bench: 'bench',
  Chair: 'chair',
  'Stability Ball': 'stability ball',
};

/** Muscles, as the description names them. */
const MUSCLE_ES = {
  Core: 'el core',
  Glutes: 'los glúteos',
  Quads: 'los cuádriceps',
  Chest: 'el pecho',
  Shoulders: 'los hombros',
  Back: 'la espalda',
  Triceps: 'los tríceps',
  Hamstrings: 'los isquiotibiales',
  Lats: 'el dorsal',
  Legs: 'las piernas',
  Biceps: 'los bíceps',
  'Upper Back': 'la espalda alta',
  Calves: 'los gemelos',
  Forearms: 'los antebrazos',
  'Rear Delts': 'el deltoides posterior',
  'Posterior Chain': 'la cadena posterior',
  Mobility: 'la movilidad',
  'Lower Back': 'la espalda baja',
  Adductors: 'los aductores',
  Hips: 'las caderas',
  Grip: 'el agarre',
  Groin: 'los aductores',
  Cardio: 'el sistema cardiovascular',
};

const MUSCLE_EN = {
  Core: 'the core',
  Glutes: 'the glutes',
  Quads: 'the quads',
  Chest: 'the chest',
  Shoulders: 'the shoulders',
  Back: 'the back',
  Triceps: 'the triceps',
  Hamstrings: 'the hamstrings',
  Lats: 'the lats',
  Legs: 'the legs',
  Biceps: 'the biceps',
  'Upper Back': 'the upper back',
  Calves: 'the calves',
  Forearms: 'the forearms',
  'Rear Delts': 'the rear delts',
  'Posterior Chain': 'the posterior chain',
  Mobility: 'mobility',
  'Lower Back': 'the lower back',
  Adductors: 'the adductors',
  Hips: 'the hips',
  Grip: 'grip',
  Groin: 'the groin',
  Cardio: 'the cardiovascular system',
};

/**
 * Muscles again, bare, for listing the secondary ones: "also works glutes and
 * core" rather than "also works the glutes and the core".
 *
 * Three keep their article, because dropping it reads as a typo — "also works
 * cardiovascular system" is not a sentence anyone writes.
 */
const KEEP_ARTICLE = new Set(['Cardio', 'Mobility', 'Grip']);

const BARE_ES = Object.fromEntries(
  Object.entries(MUSCLE_ES).map(([k, v]) => [
    k,
    KEEP_ARTICLE.has(k) ? v : v.replace(/^(el|la|los|las) /, ''),
  ]),
);
const BARE_EN = Object.fromEntries(
  Object.entries(MUSCLE_EN).map(([k, v]) => [
    k,
    KEEP_ARTICLE.has(k) ? v : v.replace(/^the /, ''),
  ]),
);

/**
 * Spanish names, one per slug.
 *
 * A flat table on purpose. Gym Spanish does not compose from the English —
 * "Bench Press" is "Press de Banca" but "Incline Bench Press" is "Press de Banca
 * Inclinado", not a prefix — so every name is stated and every one is reviewable
 * and fixable in a single place.
 */
const NAME_ES = {
  'bench-press': 'Press de Banca',
  'incline-bench-press': 'Press de Banca Inclinado',
  'incline-dumbbell-press': 'Press Inclinado con Mancuernas',
  'dumbbell-bench-press': 'Press de Banca con Mancuernas',
  'decline-bench-press': 'Press de Banca Declinado',
  'machine-chest-press': 'Press de Pecho en Máquina',
  'pec-deck': 'Contractor de Pecho',
  'cable-fly': 'Cruce de Poleas',
  'push-up': 'Flexiones',
  'weighted-push-up': 'Flexiones con Lastre',
  'overhead-press': 'Press Militar',
  'seated-dumbbell-press': 'Press de Hombro Sentado con Mancuernas',
  'arnold-press': 'Press Arnold',
  'lateral-raise': 'Elevaciones Laterales',
  'cable-lateral-raise': 'Elevaciones Laterales en Polea',
  'front-raise': 'Elevaciones Frontales',
  'rear-delt-fly': 'Pájaros',
  'reverse-pec-deck': 'Contractor Inverso',
  'face-pull': 'Face Pull',
  'upright-row': 'Remo al Cuello',
  deadlift: 'Peso Muerto',
  'romanian-deadlift': 'Peso Muerto Rumano',
  'barbell-row': 'Remo con Barra',
  't-bar-row': 'Remo en Barra T',
  'dumbbell-bent-over-row': 'Remo Inclinado con Mancuernas',
  'one-arm-dumbbell-row': 'Remo a una Mano con Mancuerna',
  'chest-supported-row': 'Remo con Apoyo de Pecho',
  'seated-row': 'Remo Sentado en Polea',
  'machine-row': 'Remo en Máquina',
  'lat-pulldown': 'Jalón al Pecho',
  'close-grip-lat-pulldown': 'Jalón Agarre Estrecho',
  'straight-arm-pulldown': 'Jalón con Brazos Rectos',
  'pull-up': 'Dominadas',
  'assisted-pull-up': 'Dominadas Asistidas',
  'weighted-pull-up': 'Dominadas con Lastre',
  'chin-up': 'Dominadas Supinas',
  shrug: 'Encogimientos con Barra',
  squat: 'Sentadillas',
  'front-squat': 'Sentadilla Frontal',
  'hack-squat': 'Sentadilla Hack',
  'leg-press': 'Prensa de Piernas',
  'bulgarian-split-squat': 'Sentadilla Búlgara',
  'walking-lunge': 'Zancadas Caminando',
  'step-up': 'Subidas al Cajón',
  'leg-extension': 'Extensión de Cuádriceps',
  'leg-curl': 'Curl Femoral',
  'seated-leg-curl': 'Curl Femoral Sentado',
  'hip-thrust': 'Hip Thrust',
  'glute-bridge': 'Puente de Glúteos',
  'good-morning': 'Buenos Días',
  'standing-calf-raise': 'Elevación de Gemelos de Pie',
  'seated-calf-raise': 'Elevación de Gemelos Sentado',
  'bicep-curl': 'Curl de Bíceps',
  'hammer-curl': 'Curl Martillo',
  'preacher-curl': 'Curl en Banco Scott',
  'cable-curl': 'Curl en Polea',
  'reverse-curl': 'Curl Inverso',
  'wrist-curl': 'Curl de Muñeca',
  'tricep-pushdown': 'Extensión de Tríceps en Polea',
  'overhead-tricep-extension': 'Extensión de Tríceps sobre la Cabeza',
  'skull-crusher': 'Press Francés',
  'close-grip-bench-press': 'Press de Banca Agarre Estrecho',
  dip: 'Fondos en Paralelas',
  'assisted-dip': 'Fondos Asistidos',
  plank: 'Plancha',
  'side-plank': 'Plancha Lateral',
  'hanging-leg-raise': 'Elevación de Piernas Colgado',
  'cable-crunch': 'Crunch en Polea',
  'ab-wheel': 'Rueda Abdominal',
  running: 'Correr',
  walking: 'Caminar',
  cycling: 'Bicicleta',
  rowing: 'Remo Ergómetro',
  'stair-climber': 'Escaladora',
  'dumbbell-fly': 'Aperturas con Mancuernas',
  'incline-cable-fly': 'Cruce de Poleas Inclinado',
  'decline-dumbbell-press': 'Press Declinado con Mancuernas',
  'smith-machine-bench-press': 'Press de Banca en Multipower',
  'landmine-press': 'Press Landmine',
  'chest-dip': 'Fondos con Énfasis en Pecho',
  'weighted-dip': 'Fondos con Lastre',
  'machine-shoulder-press': 'Press de Hombro en Máquina',
  'standing-dumbbell-press': 'Press de Hombro de Pie con Mancuernas',
  'push-press': 'Press con Impulso',
  'machine-lateral-raise': 'Elevaciones Laterales en Máquina',
  'cable-front-raise': 'Elevaciones Frontales en Polea',
  'plate-front-raise': 'Elevaciones Frontales con Disco',
  'bent-over-rear-delt-raise': 'Pájaros Inclinado',
  'cable-rear-delt-fly': 'Pájaros en Polea',
  'pendlay-row': 'Remo Pendlay',
  'inverted-row': 'Remo Invertido',
  'meadows-row': 'Remo Meadows',
  'single-arm-cable-row': 'Remo a una Mano en Polea',
  'wide-grip-lat-pulldown': 'Jalón Agarre Ancho',
  'neutral-grip-pull-up': 'Dominadas Agarre Neutro',
  'assisted-chin-up': 'Dominadas Supinas Asistidas',
  'weighted-chin-up': 'Dominadas Supinas con Lastre',
  'rack-pull': 'Rack Pull',
  'back-extension': 'Extensión Lumbar',
  'dumbbell-shrug': 'Encogimientos con Mancuernas',
  'goblet-squat': 'Sentadilla Goblet',
  'smith-machine-squat': 'Sentadilla en Multipower',
  'belt-squat': 'Sentadilla con Cinturón',
  'sumo-deadlift': 'Peso Muerto Sumo',
  'trap-bar-deadlift': 'Peso Muerto con Barra Hexagonal',
  'lying-leg-curl': 'Curl Femoral Tumbado',
  'nordic-hamstring-curl': 'Curl Nórdico',
  'single-leg-romanian-deadlift': 'Peso Muerto Rumano a una Pierna',
  'reverse-lunge': 'Zancadas Hacia Atrás',
  'split-squat': 'Zancada Estática',
  'cable-kickback': 'Patada de Glúteo en Polea',
  'hip-abduction-machine': 'Abductores en Máquina',
  'single-leg-glute-bridge': 'Puente de Glúteos a una Pierna',
  'barbell-glute-bridge': 'Puente de Glúteos con Barra',
  'dumbbell-glute-bridge': 'Puente de Glúteos con Mancuerna',
  'dumbbell-hip-thrust': 'Hip Thrust con Mancuerna',
  'smith-machine-hip-thrust': 'Hip Thrust en Multipower',
  'smith-machine-romanian-deadlift': 'Peso Muerto Rumano en Multipower',
  'dumbbell-romanian-deadlift': 'Peso Muerto Rumano con Mancuernas',
  'kettlebell-romanian-deadlift': 'Peso Muerto Rumano con Kettlebell',
  'cable-pull-through': 'Pull Through en Polea',
  'machine-glute-kickback': 'Patada de Glúteo en Máquina',
  'cable-standing-hip-abduction': 'Abducción de Cadera de Pie en Polea',
  'cable-standing-hip-adduction': 'Aducción de Cadera de Pie en Polea',
  'hip-adduction-machine': 'Aductores en Máquina',
  'smith-machine-bulgarian-split-squat': 'Sentadilla Búlgara en Multipower',
  'smith-machine-reverse-lunge': 'Zancada Hacia Atrás en Multipower',
  'smith-machine-split-squat': 'Zancada Estática en Multipower',
  'heel-elevated-goblet-squat': 'Sentadilla Goblet con Talones Elevados',
  'dumbbell-sumo-squat': 'Sentadilla Sumo con Mancuerna',
  'dumbbell-sumo-deadlift': 'Peso Muerto Sumo con Mancuerna',
  'front-foot-elevated-split-squat': 'Zancada Estática con Pie Delantero Elevado',
  'deficit-reverse-lunge': 'Zancada Hacia Atrás en Déficit',
  'dumbbell-lateral-lunge': 'Zancada Lateral con Mancuernas',
  'dumbbell-curtsy-lunge': 'Zancada Cruzada con Mancuernas',
  'landmine-squat': 'Sentadilla Landmine',
  'landmine-romanian-deadlift': 'Peso Muerto Rumano Landmine',
  'kettlebell-swing': 'Swing con Kettlebell',
  'glute-focused-back-extension': 'Extensión Lumbar con Énfasis en Glúteo',
  'reverse-hyperextension': 'Hiperextensión Inversa',
  'donkey-calf-raise': 'Elevación de Gemelos Inclinado',
  'leg-press-calf-raise': 'Gemelos en Prensa',
  'wall-sit': 'Sentadilla Isométrica en Pared',
  'jump-squat': 'Sentadilla con Salto',
  'incline-dumbbell-curl': 'Curl Inclinado con Mancuernas',
  'concentration-curl': 'Curl Concentrado',
  'ez-bar-curl': 'Curl con Barra Z',
  'spider-curl': 'Curl Spider',
  'rope-hammer-curl': 'Curl Martillo con Cuerda',
  'drag-curl': 'Curl de Arrastre',
  'rope-tricep-pushdown': 'Extensión de Tríceps con Cuerda',
  'dumbbell-skull-crusher': 'Press Francés con Dos Mancuernas',
  'single-dumbbell-skullcrusher': 'Press Francés con una Mancuerna',
  'dumbbell-overhead-tricep-extension': 'Extensión de Tríceps sobre la Cabeza con Mancuerna',
  'single-arm-dumbbell-tricep-extension': 'Extensión de Tríceps a una Mano',
  'bench-dip': 'Fondos en Banco',
  'tricep-kickback': 'Patada de Tríceps',
  'wrist-extension': 'Extensión de Muñeca',
  'farmer-carry': 'Paseo del Granjero',
  crunch: 'Abdominales',
  'reverse-crunch': 'Crunch Inverso',
  'russian-twist': 'Giro Ruso',
  'bicycle-crunch': 'Bicicleta Abdominal',
  'mountain-climber': 'Escalador',
  'dead-bug': 'Bicho Muerto',
  'bird-dog': 'Perro de Caza',
  'pallof-press': 'Press Pallof',
  'cable-woodchop': 'Leñador en Polea',
  'half-kneeling-pallof-press': 'Press Pallof de Rodillas',
  'cable-pallof-hold': 'Isométrico Pallof en Polea',
  'hanging-knee-raise': 'Elevación de Rodillas Colgado',
  'captains-chair-knee-raise': 'Elevación de Rodillas en Silla Romana',
  'decline-sit-up': 'Abdominales en Banco Declinado',
  'weighted-crunch': 'Abdominales con Peso',
  'weighted-russian-twist': 'Giro Ruso con Peso',
  'dumbbell-side-bend': 'Flexión Lateral con Mancuerna',
  elliptical: 'Elíptica',
  swimming: 'Natación',
  'jump-rope': 'Comba',
  'assault-bike': 'Assault Bike',
  skierg: 'SkiErg',
  hiking: 'Senderismo',
  'treadmill-incline-walk': 'Caminar en Cinta con Inclinación',
  'battle-ropes': 'Cuerdas de Batalla',
  'incline-push-up': 'Flexiones Inclinadas',
  'knee-push-up': 'Flexiones de Rodillas',
  'wide-push-up': 'Flexiones Agarre Ancho',
  'diamond-push-up': 'Flexiones Diamante',
  'decline-push-up': 'Flexiones Declinadas',
  'pike-push-up': 'Flexiones Pike',
  'feet-elevated-pike-push-up': 'Flexiones Pike con Pies Elevados',
  'archer-push-up': 'Flexiones Arquero',
  'typewriter-push-up': 'Flexiones Máquina de Escribir',
  'explosive-push-up': 'Flexiones Explosivas',
  'hindu-push-up': 'Flexiones Hindú',
  'scapular-push-up': 'Flexiones Escapulares',
  'push-up-shoulder-tap': 'Flexiones con Toque de Hombro',
  'wall-push-up': 'Flexiones en Pared',
  'wall-walk': 'Wall Walk',
  'wall-handstand-push-up': 'Flexiones Vertical en Pared',
  'handstand-push-up': 'Flexiones en Vertical',
  'chair-dip': 'Fondos en Silla',
  'doorway-row': 'Remo en Marco de Puerta',
  'towel-row': 'Remo con Toalla',
  'prone-y-raise': 'Elevación en Y Tumbado',
  'prone-t-raise': 'Elevación en T Tumbado',
  superman: 'Superman',
  'superman-hold': 'Superman Isométrico',
  'reverse-snow-angel': 'Ángel Invertido',
  'dead-hang': 'Colgarse de la Barra',
  'active-hang': 'Colgarse Activo',
  'scapular-pull-up': 'Dominadas Escapulares',
  'negative-pull-up': 'Dominadas Negativas',
  'commando-pull-up': 'Dominadas Comando',
  'l-sit-pull-up': 'Dominadas en L',
  'towel-pull-up': 'Dominadas con Toalla',
  'bodyweight-squat': 'Sentadilla sin Peso',
  'pistol-squat': 'Sentadilla Pistol',
  'assisted-pistol-squat': 'Sentadilla Pistol Asistida',
  'shrimp-squat': 'Sentadilla Shrimp',
  'cossack-squat': 'Sentadilla Cosaca',
  'sissy-squat': 'Sentadilla Sissy',
  'forward-lunge': 'Zancadas',
  'lateral-lunge': 'Zancada Lateral',
  'curtsy-lunge': 'Zancada Cruzada',
  'skater-squat': 'Sentadilla Patinador',
  'single-leg-box-squat': 'Sentadilla al Cajón a una Pierna',
  'step-down': 'Bajadas del Cajón',
  'calf-raise': 'Elevación de Gemelos',
  'single-leg-calf-raise': 'Elevación de Gemelos a una Pierna',
  'glute-bridge-march': 'Puente de Glúteos con Marcha',
  'frog-pump': 'Frog Pump',
  'donkey-kick': 'Patada de Glúteo',
  'fire-hydrant': 'Abducción en Cuadrupedia',
  clamshell: 'Concha',
  'hip-airplane': 'Avión de Cadera',
  'side-lying-hip-abduction': 'Abducción de Cadera Tumbado',
  'side-lying-leg-raise': 'Elevación de Pierna Tumbado de Lado',
  'lying-hamstring-walkout': 'Deslizamiento de Isquiotibiales',
  'towel-hamstring-curl': 'Curl Femoral con Toalla',
  'stability-ball-hamstring-curl': 'Curl Femoral en Fitball',
  'banded-glute-bridge': 'Puente de Glúteos con Banda',
  'banded-hip-thrust': 'Hip Thrust con Banda',
  'banded-frog-pump': 'Frog Pump con Banda',
  'banded-clamshell': 'Concha con Banda',
  'banded-lateral-walk': 'Paso Lateral con Banda',
  'banded-monster-walk': 'Monster Walk con Banda',
  'banded-squat': 'Sentadilla con Banda',
  'banded-donkey-kick': 'Patada de Glúteo con Banda',
  'banded-fire-hydrant': 'Abducción en Cuadrupedia con Banda',
  'banded-kickback': 'Patada Atrás con Banda',
  'banded-standing-hip-abduction': 'Abducción de Cadera de Pie con Banda',
  'banded-seated-hip-abduction': 'Abducción de Cadera Sentado con Banda',
  'band-pull-apart': 'Apertura con Banda',
  'banded-face-pull': 'Face Pull con Banda',
  'banded-row': 'Remo con Banda',
  'banded-lat-pulldown': 'Jalón con Banda',
  'banded-pallof-press': 'Press Pallof con Banda',
  'banded-woodchop': 'Leñador con Banda',
  'banded-dead-bug': 'Bicho Muerto con Banda',
  'hollow-body-hold': 'Hollow Body',
  'hollow-rock': 'Balanceo Hollow',
  'v-up': 'Abdominales en V',
  'flutter-kick': 'Tijeras',
  'lying-leg-raise': 'Elevación de Piernas Tumbado',
  'toe-touch': 'Toque de Puntas',
  'heel-tap': 'Toque de Talones',
  'plank-shoulder-tap': 'Plancha con Toque de Hombro',
  'plank-jack': 'Plancha con Salto',
  'bear-plank': 'Plancha del Oso',
  'bear-crawl': 'Marcha del Oso',
  'crab-walk': 'Marcha del Cangrejo',
  inchworm: 'Oruga',
  'l-sit-hold': 'L-Sit',
  'seated-knee-tuck': 'Encogimiento de Rodillas Sentado',
  'side-plank-hip-dip': 'Plancha Lateral con Descenso de Cadera',
  'copenhagen-plank': 'Plancha de Copenhague',
  'dragon-flag': 'Dragon Flag',
  burpee: 'Burpees',
  'half-burpee': 'Medio Burpee',
  'squat-thrust': 'Squat Thrust',
  'high-knees': 'Rodillas Arriba',
  'jumping-jack': 'Salto de Tijera',
  'skater-hop': 'Salto del Patinador',
  'lateral-shuffle': 'Desplazamiento Lateral',
  'fast-feet': 'Pies Rápidos',
  sprawl: 'Sprawl',
  'seal-jack': 'Seal Jack',
  'cat-cow-stretch': 'Gato-Vaca',
  'arm-circles': 'Círculos de Brazos',
  'worlds-greatest-stretch': 'El Mejor Estiramiento del Mundo',
  'leg-swings-stretch': 'Balanceo de Piernas',
  'torso-twist-stretch': 'Giros de Torso',
  'doorway-chest-stretch': 'Estiramiento de Pecho en Puerta',
  'childs-pose': 'Postura del Niño',
  'kneeling-hip-flexor-stretch': 'Estiramiento de Psoas de Rodillas',
  'hamstring-stretch': 'Estiramiento de Isquiotibiales',
  'standing-quad-stretch': 'Estiramiento de Cuádriceps de Pie',
  'seated-forward-fold-stretch': 'Flexión Sentado hacia Delante',
  'cross-body-shoulder-stretch': 'Estiramiento de Hombro Cruzado',
  'wall-calf-stretch': 'Estiramiento de Gemelo en Pared',
  'butterfly-stretch': 'Estiramiento Mariposa',
};

/* -------------------------------------------------------------------------- */
/* Description composition                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Descriptions are composed from the manifest's own fields, never invented.
 *
 * Writing 302 sets of form cues would mean writing 302 pieces of fiction: this
 * data says what equipment a movement needs and what it works, and nothing about
 * how to perform it. So the description says exactly that much and stops.
 */
function describe(entry, lang) {
  const eq = lang === 'es' ? EQUIPMENT_ES : EQUIPMENT_EN;
  const primary = (lang === 'es' ? MUSCLE_ES : MUSCLE_EN)[entry.primaryMuscle] ?? entry.primaryMuscle;
  const bare = lang === 'es' ? BARE_ES : BARE_EN;
  const equipment = eq[entry.equipment] ?? entry.equipment.toLowerCase();

  const secondary = entry.secondaryMuscles
    .map((muscle) => bare[muscle] ?? muscle.toLowerCase())
    .filter(Boolean);

  const list = (items) => {
    if (items.length === 0) return '';
    if (items.length === 1) return items[0];
    const joiner = lang === 'es' ? ' y ' : ' and ';
    return items.slice(0, -1).join(', ') + joiner + items[items.length - 1];
  };

  if (lang === 'es') {
    const head = entry.isStretch
      ? `Estiramiento para ${primary}`
      : entry.equipment === 'Cardio'
        ? `Trabajo de cardio para ${primary}`
        : `Ejercicio de ${equipment} para ${primary}`;
    return secondary.length ? `${head}. También trabaja ${list(secondary)}.` : `${head}.`;
  }

  const head = entry.isStretch
    ? `Stretch for ${primary}`
    : entry.equipment === 'Cardio'
      ? `Cardio work for ${primary}`
      : `${equipment[0].toUpperCase()}${equipment.slice(1)} exercise for ${primary}`;
  return secondary.length ? `${head}. Also works ${list(secondary)}.` : `${head}.`;
}

/** `one-arm-dumbbell-row` -> `oneArmDumbbellRow`, for a locale key. */
function camel(slug) {
  return slug.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
}

/* -------------------------------------------------------------------------- */
/* Run                                                                        */
/* -------------------------------------------------------------------------- */

function findPackage(argPath) {
  const candidates = [];
  if (argPath) {
    candidates.push(resolve(argPath), resolve(argPath, 'packages/workout-guide'));
  }
  candidates.push(
    join(ROOT, 'node_modules/@bryllim/workout-guide'),
    join(ROOT, '../workout-guide/packages/workout-guide'),
  );

  for (const candidate of candidates) {
    if (existsSync(join(candidate, 'manifest.json'))) return candidate;
  }

  throw new Error(
    `Could not find workout-guide. Pass its path:\n` +
      `  node scripts/import-exercise-library.mjs /path/to/workout-guide\n` +
      `Tried:\n${candidates.map((c) => `  ${c}`).join('\n')}`,
  );
}

const pkg = findPackage(process.argv[2]);
const manifest = JSON.parse(readFileSync(join(pkg, 'manifest.json'), 'utf8'));
console.log(`source: ${pkg}\nexercises: ${manifest.length}`);

const takenSlugs = new Set(Object.values(EXISTING));
for (const slug of takenSlugs) {
  if (!manifest.some((entry) => entry.slug === slug)) {
    throw new Error(`EXISTING maps ex-id to '${slug}', which is not in the manifest`);
  }
}
for (const slug of manifest.map((entry) => entry.slug)) {
  if (!NAME_ES[slug]) throw new Error(`No Spanish name for '${slug}'`);
}

/* ---- assets ---------------------------------------------------------------- */

const assetsOut = join(ROOT, 'public/exercises');
rmSync(assetsOut, { recursive: true, force: true });
mkdirSync(assetsOut, { recursive: true });

let copied = 0;
let bytes = 0;
const illustrations = {};

for (const entry of manifest) {
  mkdirSync(join(assetsOut, entry.slug), { recursive: true });

  const frames = [];
  for (const frame of entry.frames) {
    // Copied byte-for-byte. Touching the file — even to trim coordinate
    // precision — would make it an adaptation, and CC BY-SA would then require
    // publishing the result under the same licence. Unmodified sidesteps that
    // entirely, and the CSS handles the recolouring at render time.
    const svg = readFileSync(join(pkg, frame.path));
    writeFileSync(join(assetsOut, entry.slug, `frame-${frame.index}.svg`), svg);
    copied += 1;
    bytes += svg.length;
    frames.push(frame.index);
  }

  const first = entry.frames[0].attribution;
  illustrations[entry.slug] = {
    frames,
    creator: first.creator,
    creatorUrl: first.creatorUrl,
    license: first.license,
    licenseUrl: first.licenseUrl,
    upstream: entry.frames.some((f) => f.attribution.source)
      ? {
          name: entry.frames.find((f) => f.attribution.source).attribution.source.name,
          url: entry.frames.find((f) => f.attribution.source).attribution.source.url,
          license: entry.frames.find((f) => f.attribution.source).attribution.source.license,
          changes: entry.frames.find((f) => f.attribution.source).attribution.source.changes,
        }
      : null,
  };
}

for (const file of ['LICENSE-ASSETS', 'ATTRIBUTION.md', 'LICENSE']) {
  const from = join(pkg, file);
  if (existsSync(from)) writeFileSync(join(assetsOut, basename(file)), readFileSync(from));
}

const banner = (source) => `/**
 * GENERATED by scripts/import-exercise-library.mjs — do not edit by hand.
 *
 * ${source}
 */
`;

/* ---- illustrations.ts ------------------------------------------------------ */

writeFileSync(
  join(ROOT, 'src/lib/illustrations.ts'),
  `${banner('Which frames exist for each exercise, and who to credit for them.')}
import { withBasePath } from './base-path';

export interface IllustrationUpstream {
  name: string;
  url: string;
  license: string;
  changes: string;
}

export interface IllustrationMeta {
  frames: number[];
  creator: string;
  creatorUrl: string;
  license: string;
  licenseUrl: string;
  /** Set when the artwork derives from an earlier source that also needs credit. */
  upstream: IllustrationUpstream | null;
}

export const ILLUSTRATIONS: Record<string, IllustrationMeta> = ${JSON.stringify(illustrations, null, 2)};

/** How many frames an exercise ships with. Three is the norm. */
export const FRAME_COUNT = 3;

/**
 * URL for one frame. Goes through \`withBasePath\` because the native shells
 * serve the export from a prefixed path, and a bare absolute URL 404s there.
 */
export function illustrationUrl(slug: string, frame = 1): string {
  return withBasePath(\`/exercises/\${slug}/frame-\${frame}.svg\`);
}

export function hasIllustration(slug: string | undefined): slug is string {
  return typeof slug === 'string' && slug in ILLUSTRATIONS;
}
`,
);

/* ---- catalogue and locales ------------------------------------------------- */

const newEntries = manifest.filter((entry) => !takenSlugs.has(entry.slug));
const localeEn = {};
const localeEs = {};

const exercises = newEntries.map((entry) => {
  const key = camel(entry.slug);
  localeEn[key] = entry.name;
  localeEs[key] = NAME_ES[entry.slug];
  localeEn[`${key}Description`] = describe(entry, 'en');
  localeEs[`${key}Description`] = describe(entry, 'es');

  const bodyPart = BODY_PART[entry.primaryMuscle];
  if (!bodyPart) throw new Error(`No body part for '${entry.primaryMuscle}'`);

  return {
    // Derived from the slug, so it is stable across runs and cannot collide with
    // the `ex1`…`ex15` ids already written into people's history.
    id: `lib-${entry.slug}`,
    name: key,
    bodyPart,
    description: `${key}Description`,
    emoji: EMOJI[bodyPart],
    tracking: TRACKING[entry.exerciseType],
    illustration: entry.slug,
    ...(PER_SIDE.has(entry.slug) ? { perSide: true } : {}),
  };
});

// The 15 originals also need their slug, but they live in data.ts by hand and
// keep their ids. Report the mapping so it can be checked against that file.
const existingLines = Object.entries(EXISTING)
  .map(([id, slug]) => `  ${id} -> ${slug}`)
  .join('\n');

writeFileSync(
  join(ROOT, 'src/lib/exercise-catalog.ts'),
  `${banner(
    `The ${exercises.length} exercises the app did not already have, from the Workout Guide\n * catalogue. The original 15 stay in data.ts with their own ids:\n *\n${existingLines
      .split('\n')
      .map((l) => ` *${l}`)
      .join('\n')}`,
  )}
import type { Exercise } from './types';

export const LIBRARY_EXERCISES: Exercise[] = ${JSON.stringify(exercises, null, 2)};

/**
 * Ids that come from the catalogue rather than from the user.
 *
 * These are app content, like the built-in routines: they are not stored per
 * account, so there is nothing to delete. Editing one still works — the edit is
 * saved as an override and wins over the shipped copy.
 */
export const LIBRARY_EXERCISE_IDS: ReadonlySet<string> = new Set(
  LIBRARY_EXERCISES.map((exercise) => exercise.id),
);
`,
);

const stable = (obj) =>
  JSON.stringify(Object.fromEntries(Object.keys(obj).sort().map((k) => [k, obj[k]])), null, 2) + '\n';

writeFileSync(join(ROOT, 'src/locales/exercises-en.json'), stable(localeEn));
writeFileSync(join(ROOT, 'src/locales/exercises-es.json'), stable(localeEs));

/* ---- report ---------------------------------------------------------------- */

const digest = createHash('sha256');
for (const slug of Object.keys(illustrations).sort()) {
  digest.update(slug);
  for (const frame of illustrations[slug].frames) {
    digest.update(readFileSync(join(assetsOut, slug, `frame-${frame}.svg`)));
  }
}

console.log(`
assets       ${copied} SVG, ${(bytes / 1024 / 1024).toFixed(1)} MB
catalogue    ${exercises.length} new exercises (${takenSlugs.size} already in data.ts)
locales      ${Object.keys(localeEn).length} keys per language
per side     ${exercises.filter((e) => e.perSide).length} marked
checksum     ${digest.digest('hex').slice(0, 16)}
`);
