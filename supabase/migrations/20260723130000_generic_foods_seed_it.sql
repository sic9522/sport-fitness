-- Alimenti GENERICI italiani (source = 'generic') — primo lotto.
--
-- A cosa servono: il catalogo importato contiene solo prodotti CONFEZIONATI, quindi
-- "bistecca", "petto di pollo", "pasta", "mela" semplicemente non esistevano e la
-- ricerca restituiva marchi a caso. Queste righe sono la spina dorsale del diario:
-- l'alimento com'e', senza marca.
--
-- CRITERIO DEI VALORI (importante per capirli e per correggerli):
--   * per 100 g di prodotto CRUDO / come si acquista e si pesa (la pasta e il riso
--     sono da secchi, la carne e il pesce da crudi). Le eccezioni sono nel nome:
--     "lessati", "in scatola", "grigliate".
--   * sono MEDIE ARROTONDATE di valori di riferimento (tabelle di composizione
--     degli alimenti). Per una famiglia si tiene UN valore solo: ogni taglio di
--     carne ha i suoi numeri, qui si prende la media della carne di quell'animale.
--     Servono a stimare bene, non a certificare un'etichetta.
--   * `search_terms` = sinonimi e parole con cui l'utente potrebbe cercarlo
--     (regionalismi, nome dell'animale, categoria). La RPC li cerca col nome.
--
-- Rieseguibile: on conflict aggiorna, cosi' correggere un valore = ritoccare la
-- riga e rilanciare il file.

insert into public.food_items
  (source, source_id, name, brand, search_terms,
   calories_kcal, protein_g, carbs_g, fat_g, fiber_g, sugar_g, regions)
values
-- ---------------------------------------------------------------- CARNE
-- "Bistecca" da sola = media delle bistecche di carne (il valore sensato quando
-- l'utente non specifica l'animale); le altre riportano la media di quella carne.
('generic', 'it-bistecca',              'Bistecca',                    null, 'carne fettina secondo piatto',                145, 21.0,  0.0,  6.5, 0.0, 0.0, '{eu}'),
('generic', 'it-bistecca-manzo',        'Bistecca di manzo',           null, 'bovino carne rossa fettina controfiletto',    145, 21.5,  0.0,  6.5, 0.0, 0.0, '{eu}'),
('generic', 'it-bistecca-vitello',      'Bistecca di vitello',         null, 'vitella carne bianca fettina',                115, 21.0,  0.0,  3.0, 0.0, 0.0, '{eu}'),
('generic', 'it-bistecca-maiale',       'Bistecca di maiale',          null, 'suino braciola lombata',                      160, 21.0,  0.0,  8.5, 0.0, 0.0, '{eu}'),
('generic', 'it-bistecca-pollo',        'Bistecca di pollo',           null, 'petto pollame carne bianca fettina',          110, 23.0,  0.0,  1.5, 0.0, 0.0, '{eu}'),
('generic', 'it-bistecca-tacchino',     'Bistecca di tacchino',        null, 'fesa pollame carne bianca fettina',           105, 24.0,  0.0,  1.0, 0.0, 0.0, '{eu}'),
('generic', 'it-bistecca-cavallo',      'Bistecca di cavallo',         null, 'equino carne rossa fettina',                  105, 20.0,  0.0,  2.5, 0.0, 0.0, '{eu}'),
('generic', 'it-fiorentina',            'Fiorentina',                  null, 'bistecca manzo osso costata t-bone',          180, 20.0,  0.0, 11.0, 0.0, 0.0, '{eu}'),
('generic', 'it-tagliata-manzo',        'Tagliata di manzo',           null, 'bistecca bovino carne rossa',                 145, 22.0,  0.0,  6.0, 0.0, 0.0, '{eu}'),
('generic', 'it-macinato-manzo',        'Macinato di manzo',           null, 'trito carne tritata bovino ragu polpette',    200, 19.0,  0.0, 13.0, 0.0, 0.0, '{eu}'),
('generic', 'it-hamburger-manzo',       'Hamburger di manzo',          null, 'svizzera burger carne tritata bovino',        210, 18.0,  0.5, 15.0, 0.0, 0.0, '{eu}'),
('generic', 'it-petto-pollo',           'Petto di pollo',              null, 'pollame carne bianca filetto',                110, 23.0,  0.0,  1.5, 0.0, 0.0, '{eu}'),
('generic', 'it-coscia-pollo',          'Coscia di pollo',             null, 'sovracoscia fuso pollame',                    150, 18.0,  0.0,  9.0, 0.0, 0.0, '{eu}'),
('generic', 'it-pollo',                 'Pollo',                       null, 'pollame carne bianca gallina',                170, 19.0,  0.0, 11.0, 0.0, 0.0, '{eu}'),
('generic', 'it-fesa-tacchino',         'Fesa di tacchino',            null, 'petto tacchino pollame carne bianca',         105, 24.0,  0.0,  1.0, 0.0, 0.0, '{eu}'),
('generic', 'it-arista-maiale',         'Arista di maiale',            null, 'lombo suino arrosto',                         160, 21.0,  0.0,  8.5, 0.0, 0.0, '{eu}'),
('generic', 'it-salsiccia',             'Salsiccia',                   null, 'luganega maiale suino insaccato',             300, 15.0,  1.0, 27.0, 0.0, 0.0, '{eu}'),
('generic', 'it-costine-maiale',        'Costine di maiale',           null, 'puntine spuntature suino',                    290, 17.0,  0.0, 25.0, 0.0, 0.0, '{eu}'),
('generic', 'it-agnello',               'Agnello',                     null, 'abbacchio carne ovino',                       200, 17.0,  0.0, 15.0, 0.0, 0.0, '{eu}'),
('generic', 'it-coniglio',              'Coniglio',                    null, 'carne bianca',                                120, 21.0,  0.0,  4.0, 0.0, 0.0, '{eu}'),
('generic', 'it-manzo-magro',           'Manzo magro',                 null, 'girello fesa bovino carne rossa',             120, 22.0,  0.0,  3.5, 0.0, 0.0, '{eu}'),
('generic', 'it-vitello',               'Vitello',                     null, 'vitella carne bianca fesa',                   110, 21.0,  0.0,  2.5, 0.0, 0.0, '{eu}'),

-- ---------------------------------------------------------------- SALUMI
('generic', 'it-prosciutto-crudo',      'Prosciutto crudo',            null, 'salume affettato maiale',                     270, 26.0,  0.5, 18.0, 0.0, 0.0, '{eu}'),
('generic', 'it-prosciutto-cotto',      'Prosciutto cotto',            null, 'salume affettato maiale',                     200, 19.0,  1.0, 13.0, 0.0, 0.5, '{eu}'),
('generic', 'it-bresaola',              'Bresaola',                    null, 'salume affettato manzo magro',                150, 32.0,  0.5,  2.0, 0.0, 0.0, '{eu}'),
('generic', 'it-speck',                 'Speck',                       null, 'salume affettato maiale affumicato',          300, 28.0,  0.5, 20.0, 0.0, 0.0, '{eu}'),
('generic', 'it-salame',                'Salame',                      null, 'salume insaccato maiale',                     400, 26.0,  1.5, 33.0, 0.0, 0.0, '{eu}'),
('generic', 'it-mortadella',            'Mortadella',                  null, 'salume affettato maiale',                     310, 15.0,  1.0, 28.0, 0.0, 0.0, '{eu}'),
('generic', 'it-pancetta',              'Pancetta',                    null, 'bacon salume maiale',                         340, 14.0,  0.5, 31.0, 0.0, 0.0, '{eu}'),
('generic', 'it-wurstel',               'Wurstel',                     null, 'salsiccia hot dog insaccato',                 270, 12.0,  2.0, 24.0, 0.0, 1.0, '{eu}'),

-- ---------------------------------------------------------------- PESCE
('generic', 'it-pesce',                 'Pesce',                       null, 'pesce fresco generico',                       110, 20.0,  0.0,  3.0, 0.0, 0.0, '{eu}'),
('generic', 'it-salmone',               'Salmone',                     null, 'pesce azzurro filetto',                       185, 20.0,  0.0, 11.0, 0.0, 0.0, '{eu}'),
('generic', 'it-tonno-fresco',          'Tonno fresco',                null, 'pesce filetto',                               145, 23.0,  0.0,  5.0, 0.0, 0.0, '{eu}'),
('generic', 'it-tonno-naturale',        'Tonno in scatola al naturale',null, 'scatoletta conserva pesce',                   105, 24.0,  0.0,  1.0, 0.0, 0.0, '{eu}'),
('generic', 'it-tonno-olio',            'Tonno in scatola sott''olio', null, 'scatoletta conserva pesce',                   190, 25.0,  0.0, 10.0, 0.0, 0.0, '{eu}'),
('generic', 'it-merluzzo',              'Merluzzo',                    null, 'baccala nasello pesce bianco filetto',         75, 17.0,  0.0,  0.7, 0.0, 0.0, '{eu}'),
('generic', 'it-orata',                 'Orata',                       null, 'pesce bianco',                                120, 20.0,  0.0,  4.0, 0.0, 0.0, '{eu}'),
('generic', 'it-branzino',              'Branzino',                    null, 'spigola pesce bianco',                         85, 17.0,  0.0,  1.5, 0.0, 0.0, '{eu}'),
('generic', 'it-platessa',              'Platessa',                    null, 'pesce bianco filetto',                         80, 16.0,  0.0,  1.5, 0.0, 0.0, '{eu}'),
('generic', 'it-gamberi',               'Gamberi',                     null, 'gamberetti crostacei mazzancolle',             70, 14.0,  0.0,  1.0, 0.0, 0.0, '{eu}'),
('generic', 'it-calamari',              'Calamari',                    null, 'totani seppie molluschi',                      70, 13.0,  1.0,  1.5, 0.0, 0.0, '{eu}'),
('generic', 'it-cozze',                 'Cozze',                       null, 'mitili vongole molluschi frutti di mare',      70, 12.0,  3.0,  2.0, 0.0, 0.0, '{eu}'),
('generic', 'it-alici',                 'Alici',                       null, 'acciughe pesce azzurro',                      130, 17.0,  0.0,  6.0, 0.0, 0.0, '{eu}'),
('generic', 'it-sgombro',               'Sgombro',                     null, 'maccarello pesce azzurro',                    170, 17.0,  0.0, 11.0, 0.0, 0.0, '{eu}'),
('generic', 'it-bastoncini-pesce',      'Bastoncini di pesce',         null, 'surgelati impanati merluzzo',                 200, 12.0, 18.0,  9.0, 1.0, 1.0, '{eu}'),

-- ---------------------------------------------------------------- UOVA
('generic', 'it-uovo',                  'Uovo',                        null, 'uova gallina intero',                         145, 13.0,  0.7, 10.0, 0.0, 0.4, '{eu}'),
('generic', 'it-albume',                'Albume',                      null, 'bianco uovo chiara',                           45, 11.0,  0.7,  0.2, 0.0, 0.7, '{eu}'),
('generic', 'it-tuorlo',                'Tuorlo',                      null, 'rosso uovo',                                  320, 16.0,  0.6, 30.0, 0.0, 0.6, '{eu}'),

-- ---------------------------------------------------------------- LATTE E LATTICINI
('generic', 'it-latte-intero',          'Latte intero',                null, 'latte vaccino bevanda',                        64,  3.3,  4.9,  3.6, 0.0, 4.9, '{eu}'),
('generic', 'it-latte-ps',              'Latte parzialmente scremato', null, 'latte vaccino bevanda',                        46,  3.3,  5.0,  1.6, 0.0, 5.0, '{eu}'),
('generic', 'it-latte-scremato',        'Latte scremato',              null, 'latte vaccino bevanda',                        34,  3.4,  5.0,  0.2, 0.0, 5.0, '{eu}'),
('generic', 'it-yogurt-bianco',         'Yogurt bianco',               null, 'yoghurt intero naturale',                      66,  3.8,  4.3,  3.5, 0.0, 4.3, '{eu}'),
('generic', 'it-yogurt-greco',          'Yogurt greco',                null, 'yoghurt colato intero',                       115,  9.0,  4.0,  7.0, 0.0, 4.0, '{eu}'),
('generic', 'it-yogurt-greco-0',        'Yogurt greco 0%',             null, 'yoghurt colato magro proteico',                57, 10.0,  4.0,  0.2, 0.0, 4.0, '{eu}'),
('generic', 'it-mozzarella',            'Mozzarella',                  null, 'formaggio fresco fiordilatte',                250, 18.0,  1.0, 19.0, 0.0, 1.0, '{eu}'),
('generic', 'it-mozzarella-bufala',     'Mozzarella di bufala',        null, 'formaggio fresco',                            290, 17.0,  1.0, 25.0, 0.0, 1.0, '{eu}'),
('generic', 'it-parmigiano',            'Parmigiano',                  null, 'parmigiano reggiano formaggio stagionato grattugiato', 390, 33.0, 0.0, 29.0, 0.0, 0.0, '{eu}'),
('generic', 'it-grana',                 'Grana padano',                null, 'formaggio stagionato grattugiato',            390, 33.0,  0.0, 28.0, 0.0, 0.0, '{eu}'),
('generic', 'it-ricotta',               'Ricotta',                     null, 'formaggio fresco latticino',                  145, 11.0,  3.0, 10.0, 0.0, 3.0, '{eu}'),
('generic', 'it-stracchino',            'Stracchino',                  null, 'crescenza formaggio fresco',                  300, 18.0,  1.0, 25.0, 0.0, 1.0, '{eu}'),
('generic', 'it-formaggio-spalmabile',  'Formaggio spalmabile',        null, 'philadelphia crema formaggio fresco',         250,  6.0,  4.0, 24.0, 0.0, 4.0, '{eu}'),
('generic', 'it-gorgonzola',            'Gorgonzola',                  null, 'formaggio erborinato',                        330, 19.0,  1.0, 27.0, 0.0, 1.0, '{eu}'),
('generic', 'it-pecorino',              'Pecorino',                    null, 'formaggio stagionato pecora',                 390, 26.0,  0.0, 32.0, 0.0, 0.0, '{eu}'),
('generic', 'it-provolone',             'Provolone',                   null, 'formaggio semistagionato',                    350, 25.0,  1.0, 27.0, 0.0, 1.0, '{eu}'),
('generic', 'it-scamorza',              'Scamorza',                    null, 'formaggio affumicato',                        330, 25.0,  1.0, 24.0, 0.0, 1.0, '{eu}'),
('generic', 'it-burro',                 'Burro',                       null, 'grasso condimento',                           750,  0.7,  0.6, 83.0, 0.0, 0.6, '{eu}'),
('generic', 'it-panna-cucina',          'Panna da cucina',             null, 'crema di latte condimento',                   200,  2.5,  3.5, 20.0, 0.0, 3.5, '{eu}'),

-- ---------------------------------------------------------------- CEREALI E DERIVATI
('generic', 'it-pasta',                 'Pasta',                       null, 'spaghetti penne maccheroni semola secca',     355, 12.0, 72.0,  1.5, 3.0, 3.0, '{eu}'),
('generic', 'it-pasta-integrale',       'Pasta integrale',             null, 'spaghetti penne semola integrale',            340, 13.0, 66.0,  2.5, 8.0, 3.0, '{eu}'),
('generic', 'it-pasta-uovo',            'Pasta all''uovo',             null, 'tagliatelle fettuccine sfoglia',              370, 13.0, 70.0,  4.0, 3.0, 3.0, '{eu}'),
('generic', 'it-riso',                  'Riso',                        null, 'riso bianco chicco',                          350,  7.0, 79.0,  0.5, 1.0, 0.2, '{eu}'),
('generic', 'it-riso-integrale',        'Riso integrale',              null, 'riso bruno chicco',                           340,  8.0, 74.0,  2.5, 3.0, 0.7, '{eu}'),
('generic', 'it-pane',                  'Pane',                        null, 'pagnotta filone michetta bianco',             270,  9.0, 55.0,  1.0, 3.0, 2.0, '{eu}'),
('generic', 'it-pane-integrale',        'Pane integrale',              null, 'pagnotta filone',                             240,  9.0, 48.0,  1.5, 7.0, 2.0, '{eu}'),
('generic', 'it-fette-biscottate',      'Fette biscottate',            null, 'colazione tostato',                           400, 11.0, 77.0,  6.0, 4.0, 6.0, '{eu}'),
('generic', 'it-cracker',               'Cracker',                     null, 'salatini snack',                              430, 10.0, 70.0, 12.0, 3.0, 2.0, '{eu}'),
('generic', 'it-grissini',              'Grissini',                    null, 'snack pane',                                  430, 12.0, 70.0, 12.0, 3.0, 2.0, '{eu}'),
('generic', 'it-farina-00',             'Farina 00',                   null, 'farina di grano tenero',                      340, 11.0, 72.0,  1.0, 2.0, 1.0, '{eu}'),
('generic', 'it-farina-integrale',      'Farina integrale',            null, 'farina di grano',                             320, 12.0, 64.0,  2.0, 9.0, 1.5, '{eu}'),
('generic', 'it-avena',                 'Avena',                       null, 'fiocchi porridge colazione',                  375, 13.0, 60.0,  7.0,10.0, 1.0, '{eu}'),
('generic', 'it-cereali-colazione',     'Cereali da colazione',        null, 'corn flakes muesli',                          380,  8.0, 75.0,  5.0, 6.0,15.0, '{eu}'),
('generic', 'it-cous-cous',             'Cous cous',                   null, 'semola',                                      355, 12.0, 72.0,  1.0, 3.0, 1.0, '{eu}'),
('generic', 'it-orzo',                  'Orzo',                        null, 'orzo perlato cereale',                        320, 10.0, 70.0,  1.5, 9.0, 1.0, '{eu}'),
('generic', 'it-farro',                 'Farro',                       null, 'cereale chicco',                              335, 15.0, 67.0,  2.5, 7.0, 1.0, '{eu}'),
('generic', 'it-quinoa',                'Quinoa',                      null, 'pseudocereale chicco',                        370, 14.0, 64.0,  6.0, 7.0, 2.0, '{eu}'),
('generic', 'it-pizza-margherita',      'Pizza margherita',            null, 'pizza pomodoro mozzarella',                   270, 11.0, 33.0, 10.0, 2.0, 3.0, '{eu}'),
('generic', 'it-focaccia',              'Focaccia',                    null, 'schiacciata pane olio',                       300,  8.0, 45.0, 11.0, 2.0, 2.0, '{eu}'),
('generic', 'it-gnocchi-patate',        'Gnocchi di patate',           null, 'gnocchi primo piatto',                        160,  4.0, 33.0,  0.5, 2.0, 1.0, '{eu}'),
('generic', 'it-patate',                'Patate',                      null, 'patata tubero contorno',                       80,  2.0, 17.0,  0.1, 1.6, 0.8, '{eu}'),
('generic', 'it-patatine-fritte',       'Patatine fritte',             null, 'french fries patate fritte contorno',         310,  3.5, 40.0, 15.0, 3.5, 0.5, '{eu}'),

-- ---------------------------------------------------------------- LEGUMI
('generic', 'it-lenticchie-secche',     'Lenticchie secche',           null, 'legumi',                                      320, 25.0, 50.0,  1.0,14.0, 2.0, '{eu}'),
('generic', 'it-lenticchie-lessate',    'Lenticchie lessate',          null, 'legumi cotte in scatola',                     115,  9.0, 17.0,  0.5, 8.0, 1.0, '{eu}'),
('generic', 'it-ceci-secchi',           'Ceci secchi',                 null, 'legumi',                                      340, 20.0, 55.0,  6.0,14.0, 3.0, '{eu}'),
('generic', 'it-ceci-lessati',          'Ceci lessati',                null, 'legumi cotti in scatola',                     120,  7.0, 18.0,  2.5, 6.0, 1.0, '{eu}'),
('generic', 'it-fagioli-secchi',        'Fagioli secchi',              null, 'legumi borlotti cannellini',                  310, 22.0, 50.0,  1.5,17.0, 2.0, '{eu}'),
('generic', 'it-fagioli-lessati',       'Fagioli lessati',             null, 'legumi borlotti cannellini in scatola',       105,  7.0, 17.0,  0.5, 6.0, 1.0, '{eu}'),
('generic', 'it-piselli',               'Piselli',                     null, 'legumi contorno surgelati',                    80,  5.5, 12.0,  0.5, 5.0, 4.0, '{eu}'),
('generic', 'it-soia',                  'Soia',                        null, 'legumi fagioli di soia',                      400, 37.0, 30.0, 18.0,15.0, 7.0, '{eu}'),
('generic', 'it-tofu',                  'Tofu',                        null, 'soia vegetariano proteine vegetali',          145, 16.0,  2.0,  9.0, 1.0, 0.6, '{eu}'),
('generic', 'it-hummus',                'Hummus',                      null, 'crema ceci salsa',                            230,  7.0, 14.0, 16.0, 6.0, 1.0, '{eu}'),

-- ---------------------------------------------------------------- VERDURA
('generic', 'it-insalata',              'Insalata',                    null, 'lattuga verdura foglia contorno',              20,  1.5,  2.0,  0.2, 1.5, 1.5, '{eu}'),
('generic', 'it-pomodoro',              'Pomodoro',                    null, 'pomodori verdura ortaggio',                    20,  1.0,  3.0,  0.2, 1.0, 3.0, '{eu}'),
('generic', 'it-zucchine',              'Zucchine',                    null, 'zucchina verdura ortaggio contorno',            15,  1.3,  2.0,  0.1, 1.0, 2.0, '{eu}'),
('generic', 'it-melanzane',             'Melanzane',                   null, 'melanzana verdura ortaggio',                    20,  1.0,  3.0,  0.2, 2.5, 3.0, '{eu}'),
('generic', 'it-peperoni',              'Peperoni',                    null, 'peperone verdura ortaggio',                     25,  1.0,  5.0,  0.3, 1.5, 4.0, '{eu}'),
('generic', 'it-carote',                'Carote',                      null, 'carota verdura ortaggio',                       35,  1.0,  8.0,  0.2, 3.0, 5.0, '{eu}'),
('generic', 'it-broccoli',              'Broccoli',                    null, 'broccolo cavolo verdura',                       30,  3.0,  4.0,  0.4, 3.0, 1.5, '{eu}'),
('generic', 'it-spinaci',               'Spinaci',                     null, 'verdura foglia',                                25,  3.0,  1.0,  0.4, 2.0, 0.5, '{eu}'),
('generic', 'it-cipolla',               'Cipolla',                     null, 'cipolle verdura ortaggio soffritto',            30,  1.0,  6.0,  0.1, 1.5, 4.0, '{eu}'),
('generic', 'it-funghi',                'Funghi',                      null, 'champignon porcini',                            22,  3.0,  1.0,  0.3, 2.0, 1.0, '{eu}'),
('generic', 'it-cavolfiore',            'Cavolfiore',                  null, 'cavolo verdura',                                25,  2.5,  3.0,  0.3, 2.5, 2.0, '{eu}'),
('generic', 'it-finocchi',              'Finocchi',                    null, 'finocchio verdura ortaggio',                    15,  1.0,  1.0,  0.2, 2.0, 1.0, '{eu}'),
('generic', 'it-zucca',                 'Zucca',                       null, 'verdura ortaggio',                              25,  1.0,  5.0,  0.1, 1.5, 3.0, '{eu}'),
('generic', 'it-verdure-grigliate',     'Verdure grigliate',           null, 'contorno miste zucchine melanzane',             55,  1.5,  4.0,  3.5, 2.0, 3.0, '{eu}'),
('generic', 'it-passata-pomodoro',      'Passata di pomodoro',         null, 'salsa sugo pomodoro',                           35,  1.5,  6.0,  0.2, 1.5, 5.0, '{eu}'),

-- ---------------------------------------------------------------- FRUTTA
('generic', 'it-mela',                  'Mela',                        null, 'mele frutta',                                   52,  0.3, 14.0,  0.2, 2.4,10.0, '{eu}'),
('generic', 'it-banana',                'Banana',                      null, 'banane frutta',                                 90,  1.0, 23.0,  0.3, 2.6,12.0, '{eu}'),
('generic', 'it-arancia',               'Arancia',                     null, 'arance frutta agrumi',                          47,  0.9, 12.0,  0.1, 2.4, 9.0, '{eu}'),
('generic', 'it-pera',                  'Pera',                        null, 'pere frutta',                                   57,  0.4, 15.0,  0.1, 3.0,10.0, '{eu}'),
('generic', 'it-fragole',               'Fragole',                     null, 'fragola frutta frutti di bosco',                32,  0.7,  8.0,  0.3, 2.0, 5.0, '{eu}'),
('generic', 'it-kiwi',                  'Kiwi',                        null, 'frutta',                                        61,  1.1, 15.0,  0.5, 3.0, 9.0, '{eu}'),
('generic', 'it-uva',                   'Uva',                         null, 'acini frutta',                                  69,  0.7, 18.0,  0.2, 0.9,16.0, '{eu}'),
('generic', 'it-pesca',                 'Pesca',                       null, 'pesche frutta',                                 39,  0.9, 10.0,  0.3, 1.5, 8.0, '{eu}'),
('generic', 'it-anguria',               'Anguria',                     null, 'cocomero melone frutta',                        30,  0.6,  8.0,  0.2, 0.4, 6.0, '{eu}'),
('generic', 'it-melone',                'Melone',                      null, 'frutta',                                        34,  0.8,  8.0,  0.2, 0.9, 8.0, '{eu}'),
('generic', 'it-ananas',                'Ananas',                      null, 'frutta tropicale',                              50,  0.5, 13.0,  0.1, 1.4,10.0, '{eu}'),
('generic', 'it-avocado',               'Avocado',                     null, 'frutta grassi buoni',                          160,  2.0,  9.0, 15.0, 7.0, 0.7, '{eu}'),
('generic', 'it-limone',                'Limone',                      null, 'limoni agrumi frutta',                          29,  1.1,  9.0,  0.3, 2.8, 2.5, '{eu}'),

-- ---------------------------------------------------------------- FRUTTA SECCA
('generic', 'it-mandorle',              'Mandorle',                    null, 'frutta secca noci semi',                       580, 21.0, 22.0, 50.0,12.0, 4.0, '{eu}'),
('generic', 'it-noci',                  'Noci',                        null, 'frutta secca gherigli',                        655, 15.0, 14.0, 65.0, 7.0, 2.6, '{eu}'),
('generic', 'it-nocciole',              'Nocciole',                    null, 'frutta secca',                                 630, 15.0, 17.0, 61.0,10.0, 4.3, '{eu}'),
('generic', 'it-pistacchi',             'Pistacchi',                   null, 'frutta secca',                                 560, 20.0, 28.0, 45.0,10.0, 8.0, '{eu}'),
('generic', 'it-arachidi',              'Arachidi',                    null, 'noccioline frutta secca',                      570, 26.0, 16.0, 49.0, 8.0, 4.0, '{eu}'),
('generic', 'it-anacardi',              'Anacardi',                    null, 'frutta secca',                                 550, 18.0, 30.0, 44.0, 3.0, 6.0, '{eu}'),
('generic', 'it-burro-arachidi',        'Burro di arachidi',           null, 'peanut butter crema spalmabile',               590, 25.0, 20.0, 50.0, 6.0, 9.0, '{eu}'),

-- ---------------------------------------------------------------- CONDIMENTI E GRASSI
('generic', 'it-olio-oliva',            'Olio d''oliva',               null, 'extravergine evo condimento grasso',           900,  0.0,  0.0,100.0, 0.0, 0.0, '{eu}'),
('generic', 'it-olio-semi',             'Olio di semi',                null, 'girasole mais condimento grasso frittura',     900,  0.0,  0.0,100.0, 0.0, 0.0, '{eu}'),
('generic', 'it-maionese',              'Maionese',                    null, 'salsa condimento',                             690,  1.0,  2.0, 75.0, 0.0, 2.0, '{eu}'),
('generic', 'it-ketchup',               'Ketchup',                     null, 'salsa pomodoro condimento',                    100,  1.2, 24.0,  0.1, 0.5,21.0, '{eu}'),
('generic', 'it-aceto-balsamico',       'Aceto balsamico',             null, 'condimento',                                    90,  0.5, 17.0,  0.0, 0.0,15.0, '{eu}'),

-- ---------------------------------------------------------------- DOLCI E ZUCCHERI
('generic', 'it-zucchero',              'Zucchero',                    null, 'saccarosio dolcificante',                      400,  0.0,100.0,  0.0, 0.0,100.0, '{eu}'),
('generic', 'it-miele',                 'Miele',                       null, 'dolcificante',                                 300,  0.3, 82.0,  0.0, 0.0,82.0, '{eu}'),
('generic', 'it-marmellata',            'Marmellata',                  null, 'confettura frutta spalmabile',                 250,  0.5, 60.0,  0.1, 1.0,55.0, '{eu}'),
('generic', 'it-crema-nocciole',        'Crema alle nocciole',         null, 'nutella cioccolato spalmabile',                540,  6.0, 57.0, 31.0, 3.0,56.0, '{eu}'),
('generic', 'it-cioccolato-fondente',   'Cioccolato fondente',         null, 'tavoletta cacao',                              545,  8.0, 46.0, 35.0, 7.0,40.0, '{eu}'),
('generic', 'it-cioccolato-latte',      'Cioccolato al latte',         null, 'tavoletta cacao',                              545,  7.0, 57.0, 31.0, 2.0,55.0, '{eu}'),
('generic', 'it-biscotti',              'Biscotti',                    null, 'frollini colazione dolci',                     450,  7.0, 70.0, 16.0, 2.5,25.0, '{eu}'),
('generic', 'it-cornetto',              'Cornetto',                    null, 'brioche croissant colazione',                  400,  7.0, 50.0, 18.0, 2.0,15.0, '{eu}'),
('generic', 'it-gelato',                'Gelato',                      null, 'dolce coppa cono',                             200,  4.0, 25.0, 10.0, 0.5,23.0, '{eu}'),
('generic', 'it-torta',                 'Torta',                       null, 'dolce fetta ciambellone',                      350,  5.0, 50.0, 14.0, 1.5,28.0, '{eu}'),

-- ---------------------------------------------------------------- BEVANDE
('generic', 'it-acqua',                 'Acqua',                       null, 'bevanda',                                        0,  0.0,  0.0,  0.0, 0.0, 0.0, '{eu}'),
('generic', 'it-caffe',                 'Caffè',                       null, 'espresso bevanda',                               2,  0.1,  0.3,  0.0, 0.0, 0.0, '{eu}'),
('generic', 'it-te',                    'Tè',                          null, 'the infuso bevanda',                             1,  0.0,  0.3,  0.0, 0.0, 0.0, '{eu}'),
('generic', 'it-succo-arancia',         'Succo d''arancia',            null, 'spremuta bevanda frutta',                       45,  0.7, 10.0,  0.1, 0.2, 9.0, '{eu}'),
('generic', 'it-bibita-gassata',        'Bibita gassata',              null, 'cola aranciata bevanda zuccherata',             42,  0.0, 10.6,  0.0, 0.0,10.6, '{eu}'),
('generic', 'it-birra',                 'Birra',                       null, 'bevanda alcolica',                              43,  0.5,  3.5,  0.0, 0.0, 0.0, '{eu}'),
('generic', 'it-vino',                  'Vino',                        null, 'bevanda alcolica rosso bianco',                 80,  0.1,  2.5,  0.0, 0.0, 0.6, '{eu}'),

-- ---------------------------------------------------------------- INTEGRATORI
('generic', 'it-proteine-polvere',      'Proteine in polvere',         null, 'whey integratore shake proteico',              380, 78.0,  7.0,  5.0, 0.5, 5.0, '{eu}')

on conflict (source, source_id) do update set
  name = excluded.name,
  search_terms = excluded.search_terms,
  calories_kcal = excluded.calories_kcal,
  protein_g = excluded.protein_g,
  carbs_g = excluded.carbs_g,
  fat_g = excluded.fat_g,
  fiber_g = excluded.fiber_g,
  sugar_g = excluded.sugar_g,
  regions = excluded.regions,
  updated_at = now();
