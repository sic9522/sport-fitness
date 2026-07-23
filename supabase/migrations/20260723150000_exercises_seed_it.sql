-- Catalogo esercizi: secondo lotto (da 34 a ~100 voci).
--
-- Perche' serve: con 34 esercizi la ricerca per attrezzo introdotta dalla
-- migrazione 20260723140000 non aveva molto da mostrare — "bilanciere ez" non
-- esisteva proprio, e dei manubri c'erano quattro esercizi in croce. Qui si
-- riempiono le lacune: ogni attrezzo del vocabolario ha ora un ventaglio di
-- esercizi sensato, e i movimenti di base ci sono tutti.
--
-- Convenzioni (le stesse del primo lotto):
--   * `source_id` = slug INGLESE del movimento (barbell-bench-press): identifica
--     l'esercizio a prescindere da come lo chiamiamo in italiano.
--   * `name` = nome italiano da palestra, quello che la gente dice davvero.
--   * `equipment` = slug di public.catalog_equipment: e' la chiave con cui la
--     ricerca trova l'esercizio anche quando l'attrezzo non e' nel nome
--     ("Curl a Martello" si trova cercando "manubri").
--   * muscoli in inglese, come le righe gia' presenti (la UI traduce).
--
-- Rieseguibile: on conflict aggiorna nome, attrezzo e muscoli.

insert into public.catalog_exercises
  (source, source_id, name, category, equipment, primary_muscles, secondary_muscles, difficulty)
values
-- ---------------------------------------------------------------- PETTO
('seed','dumbbell-bench-press',     'Spinte con Manubri',                'chest','dumbbell',  '{chest}','{triceps,shoulders}','intermediate'),
('seed','dumbbell-incline-press',   'Spinte Inclinate con Manubri',      'chest','dumbbell',  '{chest}','{shoulders,triceps}','intermediate'),
('seed','dumbbell-fly',             'Croci con Manubri',                 'chest','dumbbell',  '{chest}','{shoulders}','beginner'),
('seed','barbell-incline-press',    'Panca Inclinata con Bilanciere',    'chest','barbell',   '{chest}','{shoulders,triceps}','intermediate'),
('seed','barbell-decline-press',    'Panca Declinata con Bilanciere',    'chest','barbell',   '{chest}','{triceps}','intermediate'),
('seed','smith-bench-press',        'Panca Piana al Multipower',         'chest','smith',     '{chest}','{triceps,shoulders}','beginner'),
('seed','machine-chest-press',      'Chest Press',                       'chest','machine',   '{chest}','{triceps}','beginner'),
('seed','pec-deck',                 'Pectoral Machine',                  'chest','machine',   '{chest}','{}','beginner'),
('seed','cable-crossover-low',      'Croci ai Cavi dal Basso',           'chest','cable',     '{chest}','{shoulders}','beginner'),
('seed','pushup-incline',           'Piegamenti su Rialzo',              'chest','bodyweight','{chest}','{triceps}','beginner'),

-- ---------------------------------------------------------------- SCHIENA
('seed','dumbbell-row',             'Rematore con Manubrio',             'back','dumbbell',   '{lats}','{rhomboids,biceps}','beginner'),
('seed','dumbbell-pullover',        'Pullover con Manubrio',             'back','dumbbell',   '{lats}','{chest}','intermediate'),
('seed','t-bar-row',                'Rematore a T',                      'back','barbell',   '{lats,rhomboids}','{biceps}','intermediate'),
('seed','pendlay-row',              'Rematore Pendlay',                  'back','barbell',   '{lats,rhomboids}','{erector spinae}','advanced'),
('seed','lat-pulldown-behind',      'Lat Machine Dietro',                'back','cable',      '{lats}','{biceps}','intermediate'),
('seed','close-grip-pulldown',      'Lat Machine Presa Stretta',         'back','cable',      '{lats}','{biceps}','beginner'),
('seed','seated-row-machine',       'Rematore alla Macchina',            'back','machine',    '{lats,rhomboids}','{biceps}','beginner'),
('seed','straight-arm-pulldown',    'Pullover ai Cavi',                  'back','cable',      '{lats}','{}','beginner'),
('seed','chinup',                   'Trazioni Presa Supina',             'back','bodyweight', '{lats}','{biceps}','intermediate'),
('seed','inverted-row',             'Rematore Australiano',              'back','bodyweight', '{lats,rhomboids}','{biceps}','beginner'),
('seed','back-extension',           'Iperestensioni',                    'back','bodyweight', '{erector spinae}','{glutes,hamstrings}','beginner'),
('seed','trx-row',                  'Rematore al TRX',                   'back','trx',        '{lats,rhomboids}','{biceps}','beginner'),

-- ---------------------------------------------------------------- SPALLE
('seed','dumbbell-shoulder-press',  'Spinte sopra la Testa con Manubri', 'shoulders','dumbbell','{shoulders}','{triceps}','beginner'),
('seed','dumbbell-front-raise',     'Alzate Frontali',                   'shoulders','dumbbell','{front deltoids}','{}','beginner'),
('seed','dumbbell-rear-fly',        'Alzate a 90 Gradi',                 'shoulders','dumbbell','{rear deltoids}','{rhomboids}','beginner'),
('seed','dumbbell-shrug',           'Scrollate con Manubri',             'shoulders','dumbbell','{trapezius}','{}','beginner'),
('seed','barbell-upright-row',      'Tirate al Mento',                   'shoulders','barbell','{side deltoids}','{trapezius}','intermediate'),
('seed','barbell-shrug',            'Scrollate con Bilanciere',          'shoulders','barbell','{trapezius}','{}','beginner'),
('seed','smith-shoulder-press',     'Lento Avanti al Multipower',        'shoulders','smith',  '{shoulders}','{triceps}','beginner'),
('seed','machine-shoulder-press',   'Shoulder Press',                    'shoulders','machine','{shoulders}','{triceps}','beginner'),
('seed','cable-lateral-raise',      'Alzate Laterali ai Cavi',           'shoulders','cable',  '{side deltoids}','{}','beginner'),
('seed','band-lateral-raise',       'Alzate Laterali con Elastico',      'shoulders','band',   '{side deltoids}','{}','beginner'),

-- ---------------------------------------------------------------- BRACCIA: BICIPITI
('seed','dumbbell-biceps-curl',     'Curl con Manubri',                  'arms','dumbbell',   '{biceps}','{forearms}','beginner'),
('seed','incline-dumbbell-curl',    'Curl su Panca Inclinata',           'arms','dumbbell',   '{biceps}','{}','intermediate'),
('seed','concentration-curl',       'Curl di Concentrazione',            'arms','dumbbell',   '{biceps}','{}','beginner'),
('seed','ez-bar-curl',              'Curl con Bilanciere EZ',            'arms','ez-bar',     '{biceps}','{forearms}','beginner'),
('seed','ez-bar-preacher-curl',     'Panca Scott con Bilanciere EZ',     'arms','ez-bar',     '{biceps}','{}','beginner'),
('seed','cable-biceps-curl',        'Curl ai Cavi',                      'arms','cable',      '{biceps}','{}','beginner'),
('seed','band-biceps-curl',         'Curl con Elastico',                 'arms','band',       '{biceps}','{}','beginner'),
('seed','reverse-curl',             'Curl Inverso',                      'arms','ez-bar',     '{forearms}','{biceps}','beginner'),

-- ---------------------------------------------------------------- BRACCIA: TRICIPITI
('seed','ez-bar-skullcrusher',      'French Press con Bilanciere EZ',    'arms','ez-bar',     '{triceps}','{}','intermediate'),
('seed','close-grip-bench-press',   'Panca Presa Stretta',               'arms','barbell',   '{triceps}','{chest}','intermediate'),
('seed','dumbbell-kickback',        'Kickback con Manubri',              'arms','dumbbell',   '{triceps}','{}','beginner'),
('seed','overhead-cable-extension', 'Estensioni sopra la Testa ai Cavi', 'arms','cable',      '{triceps}','{}','beginner'),
('seed','rope-pushdown',            'Pushdown con Corda',                'arms','cable',      '{triceps}','{}','beginner'),
('seed','bench-dips',               'Dips tra Panche',                   'arms','bodyweight', '{triceps}','{chest}','beginner'),

-- ---------------------------------------------------------------- GAMBE
('seed','dumbbell-goblet-squat',    'Goblet Squat',                      'legs','dumbbell',   '{quadriceps,glutes}','{core}','beginner'),
('seed','dumbbell-bulgarian-split', 'Affondi Bulgari con Manubri',       'legs','dumbbell',   '{quadriceps,glutes}','{hamstrings}','intermediate'),
('seed','dumbbell-step-up',         'Step Up con Manubri',               'legs','dumbbell',   '{quadriceps,glutes}','{}','beginner'),
('seed','barbell-front-squat',      'Front Squat',                       'legs','barbell',   '{quadriceps}','{glutes,core}','advanced'),
('seed','barbell-hip-thrust',       'Hip Thrust con Bilanciere',         'legs','barbell',   '{glutes}','{hamstrings}','intermediate'),
('seed','barbell-lunge',            'Affondi con Bilanciere',            'legs','barbell',   '{quadriceps,glutes}','{}','intermediate'),
('seed','smith-squat',              'Squat al Multipower',               'legs','smith',     '{quadriceps,glutes}','{}','beginner'),
('seed','hack-squat',               'Hack Squat',                        'legs','machine',   '{quadriceps}','{glutes}','intermediate'),
('seed','leg-curl-seated',          'Leg Curl da Seduto',                'legs','machine',   '{hamstrings}','{}','beginner'),
('seed','calf-seated',              'Calf da Seduto',                    'legs','machine',   '{calves}','{}','beginner'),
('seed','abductor-machine',         'Abduttori alla Macchina',           'legs','machine',   '{glutes}','{}','beginner'),
('seed','adductor-machine',         'Adduttori alla Macchina',           'legs','machine',   '{adductors}','{}','beginner'),
('seed','cable-kickback',           'Slanci ai Cavi',                    'legs','cable',     '{glutes}','{hamstrings}','beginner'),
('seed','bodyweight-squat',         'Squat a Corpo Libero',              'legs','bodyweight','{quadriceps,glutes}','{}','beginner'),
('seed','wall-sit',                 'Wall Sit',                          'legs','bodyweight','{quadriceps}','{}','beginner'),
('seed','kettlebell-goblet-squat',  'Goblet Squat con Kettlebell',       'legs','kettlebell','{quadriceps,glutes}','{core}','beginner'),

-- ---------------------------------------------------------------- CORE
('seed','crunch',                   'Crunch',                            'core','bodyweight','{abs}','{}','beginner'),
('seed','bicycle-crunch',           'Crunch Bicicletta',                 'core','bodyweight','{abs,obliques}','{}','beginner'),
('seed','side-plank',               'Plank Laterale',                    'core','bodyweight','{obliques}','{core}','beginner'),
('seed','mountain-climbers',        'Mountain Climbers',                 'core','bodyweight','{core}','{cardiovascular}','beginner'),
('seed','hanging-knee-raise',       'Ginocchia al Petto alla Sbarra',    'core','bodyweight','{abs}','{}','beginner'),
('seed','ab-wheel',                 'Ruota per Addominali',              'core','machine',   '{abs}','{core}','advanced'),
('seed','kettlebell-russian-twist', 'Russian Twist con Kettlebell',      'core','kettlebell','{obliques}','{core}','intermediate'),

-- ---------------------------------------------------------------- CARDIO E FUNZIONALE
('seed','cycling-machine',          'Cyclette',                          'cardio','machine',   '{cardiovascular}','{quadriceps}','beginner'),
('seed','elliptical',               'Ellittica',                         'cardio','machine',   '{cardiovascular}','{}','beginner'),
('seed','stair-climber',            'Scala Infinita',                    'cardio','machine',   '{cardiovascular}','{glutes}','intermediate'),
('seed','burpees',                  'Burpees',                           'cardio','bodyweight','{cardiovascular}','{chest,quadriceps}','intermediate'),
('seed','jump-rope',                'Corda',                             'cardio','bodyweight','{cardiovascular}','{calves}','beginner'),
('seed','kettlebell-clean',         'Clean con Kettlebell',              'cardio','kettlebell','{glutes,shoulders}','{core}','advanced'),
('seed','farmer-walk',              'Farmer Walk',                       'cardio','dumbbell',  '{trapezius,forearms}','{core}','beginner')

on conflict (source, source_id) do update set
  name = excluded.name,
  category = excluded.category,
  equipment = excluded.equipment,
  primary_muscles = excluded.primary_muscles,
  secondary_muscles = excluded.secondary_muscles,
  difficulty = excluded.difficulty,
  updated_at = now();

-- Gli esercizi gia' presenti che ora hanno un attrezzo piu' preciso.
update public.catalog_exercises
   set equipment = 'ez-bar', updated_at = now()
 where source = 'seed' and source_id = 'preacher-curl';
