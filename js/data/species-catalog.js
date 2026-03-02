/* ==========================================================================
   AraLog – Artenkatalog (species-catalog.js)
   Kuratierte Liste häufiger Araneae für die Region Berlin/Brandenburg
   Sortiert nach Familie, dann alphabetisch nach wissenschaftlichem Namen
   Stand: März 2026 – kuratiert mit Fach-Input
   ========================================================================== */

export const speciesCatalog = [

  // ── Agelenidae (Trichterspinnen) ──
  { id: 'agelena_labyrinthica', scientificName: 'Agelena labyrinthica', germanName: 'Labyrinthspinne', family: 'Agelenidae', distribution: 'häufig' },
  { id: 'eratigena_atrica_komplex', scientificName: 'Eratigena atrica/duellica', germanName: 'Große Winkelspinnen (Komplex)', family: 'Agelenidae', distribution: 'häufig' },
  { id: 'eratigena_ferruginea', scientificName: 'Eratigena ferruginea', germanName: 'Rostrote Winkelspinne', family: 'Agelenidae', distribution: 'häufig' },
  { id: 'tegenaria_domestica', scientificName: 'Tegenaria domestica', germanName: 'Hauswinkelspinne', family: 'Agelenidae', distribution: 'häufig' },

  // ── Amaurobiidae (Finsterspinnen) ──
  { id: 'amaurobius_fenestralis', scientificName: 'Amaurobius fenestralis', germanName: 'Fensterspinne', family: 'Amaurobiidae', distribution: 'häufig' },
  { id: 'amaurobius_similis', scientificName: 'Amaurobius similis', germanName: 'Ähnliche Finsterspinne', family: 'Amaurobiidae', distribution: 'häufig' },

  // ── Anyphaenidae (Zartspinnen) ──
  { id: 'anyphaena_accentuata', scientificName: 'Anyphaena accentuata', germanName: 'Zartspinne', family: 'Anyphaenidae', distribution: 'häufig' },

  // ── Araneidae (Radnetzspinnen) ──
  { id: 'araneus_diadematus', scientificName: 'Araneus diadematus', germanName: 'Gartenkreuzspinne', family: 'Araneidae', distribution: 'häufig' },
  { id: 'araneus_quadratus', scientificName: 'Araneus quadratus', germanName: 'Vierfleckkreuzspinne', family: 'Araneidae', distribution: 'häufig' },
  { id: 'araniella_cucurbitina', scientificName: 'Araniella cucurbitina', germanName: 'Kürbisspinne', family: 'Araneidae', distribution: 'häufig' },
  { id: 'argiope_bruennichi', scientificName: 'Argiope bruennichi', germanName: 'Wespenspinne', family: 'Araneidae', distribution: 'häufig' },
  { id: 'cyclosa_conica', scientificName: 'Cyclosa conica', germanName: 'Konusspinne', family: 'Araneidae', distribution: 'mäßig verbreitet' },
  { id: 'gibbaranea_gibbosa', scientificName: 'Gibbaranea gibbosa', germanName: 'Höckerspinne', family: 'Araneidae', distribution: 'mäßig verbreitet' },
  { id: 'larinioides_sclopetarius', scientificName: 'Larinioides sclopetarius', germanName: 'Brückenkreuzspinne', family: 'Araneidae', distribution: 'häufig' },
  { id: 'mangora_acalypha', scientificName: 'Mangora acalypha', germanName: 'Streifenkreuzspinne', family: 'Araneidae', distribution: 'häufig' },
  { id: 'neoscona_adianta', scientificName: 'Neoscona adianta', germanName: 'Heideradnetzspinne', family: 'Araneidae', distribution: 'mäßig verbreitet' },
  { id: 'nuctenea_umbratica', scientificName: 'Nuctenea umbratica', germanName: 'Spaltenkreuzspinne', family: 'Araneidae', distribution: 'häufig' },
  { id: 'zygiella_x_notata', scientificName: 'Zygiella x-notata', germanName: 'Sektorspinne', family: 'Araneidae', distribution: 'häufig' },

  // ── Argyronetidae (Wasserspinnen) ──
  { id: 'argyroneta_aquatica', scientificName: 'Argyroneta aquatica', germanName: 'Wasserspinne', family: 'Argyronetidae', distribution: 'selten' },

  // ── Atypidae (Tapezierspinnen) ──
  { id: 'atypus_affinis', scientificName: 'Atypus affinis', germanName: 'Gewöhnliche Tapezierspinne', family: 'Atypidae', distribution: 'selten' },
  { id: 'atypus_piceus', scientificName: 'Atypus piceus', germanName: 'Pechschwarze Tapezierspinne', family: 'Atypidae', distribution: 'selten' },

  // ── Cheiracanthiidae (Dornfingerspinnen) ──
  { id: 'cheiracanthium_mildei', scientificName: 'Cheiracanthium mildei', germanName: 'Milder Dornfinger', family: 'Cheiracanthiidae', distribution: 'mäßig verbreitet' },
  { id: 'cheiracanthium_punctorium', scientificName: 'Cheiracanthium punctorium', germanName: 'Ammen-Dornfinger', family: 'Cheiracanthiidae', distribution: 'mäßig verbreitet' },

  // ── Clubionidae (Sackspinnen) ──
  { id: 'clubiona_terrestris', scientificName: 'Clubiona terrestris', germanName: 'Boden-Sackspinne', family: 'Clubionidae', distribution: 'häufig' },

  // ── Dictynidae (Kräuselspinnen) ──
  { id: 'dictyna_uncinata', scientificName: 'Dictyna uncinata', germanName: 'Gewöhnliche Haubennetzspinne', family: 'Dictynidae', distribution: 'häufig' },
  { id: 'nigma_walckenaeri', scientificName: 'Nigma walckenaeri', germanName: 'Grüne Kräuselspinne', family: 'Dictynidae', distribution: 'mäßig verbreitet' },

  // ── Dysderidae (Sechsaugenspinnen) ──
  { id: 'dysdera_crocata', scientificName: 'Dysdera crocata', germanName: 'Großer Asseljäger', family: 'Dysderidae', distribution: 'häufig' },

  // ── Eresidae (Röhrenspinnen) ──
  { id: 'eresus_kollari', scientificName: 'Eresus kollari/sandaliatus', germanName: 'Rote Röhrenspinne', family: 'Eresidae', distribution: 'selten' },

  // ── Gnaphosidae (Plattbauchspinnen) ──
  { id: 'drassodes_lapidosus', scientificName: 'Drassodes lapidosus', germanName: 'Steinplattenspinne', family: 'Gnaphosidae', distribution: 'häufig' },
  { id: 'zelotes_subterraneus', scientificName: 'Zelotes subterraneus', germanName: 'Unterirdische Schwarzspinne', family: 'Gnaphosidae', distribution: 'mäßig verbreitet' },

  // ── Linyphiidae (Baldachin-/Zwergspinnen) ──
  { id: 'linyphia_triangularis', scientificName: 'Linyphia triangularis', germanName: 'Herbstspinne', family: 'Linyphiidae', distribution: 'häufig' },
  { id: 'linyphiidae_div', scientificName: 'Linyphiidae div.', germanName: 'Baldachinspinnen (diverse)', family: 'Linyphiidae', distribution: 'häufig' },
  { id: 'neriene_clathrata', scientificName: 'Neriene clathrata', germanName: 'Gestreifter Baldachinweber', family: 'Linyphiidae', distribution: 'häufig' },
  { id: 'neriene_peltata', scientificName: 'Neriene peltata', germanName: 'Schildförmiger Baldachinweber', family: 'Linyphiidae', distribution: 'häufig' },
  { id: 'tenuiphantes_tenuis', scientificName: 'Tenuiphantes tenuis', germanName: 'Zarte Baldachinspinne', family: 'Linyphiidae', distribution: 'häufig' },

  // ── Lycosidae (Wolfsspinnen) ──
  { id: 'alopecosa_cuneata', scientificName: 'Alopecosa cuneata', germanName: 'Keilfleck-Wolfsspinne', family: 'Lycosidae', distribution: 'häufig' },
  { id: 'arctosa_leopardus', scientificName: 'Arctosa leopardus', germanName: 'Leopardspinne', family: 'Lycosidae', distribution: 'mäßig verbreitet' },
  { id: 'pardosa_amentata', scientificName: 'Pardosa amentata', germanName: 'Gewöhnliche Wolfsspinne', family: 'Lycosidae', distribution: 'häufig' },
  { id: 'pardosa_lugubris', scientificName: 'Pardosa lugubris', germanName: 'Trauerwolfsspinne', family: 'Lycosidae', distribution: 'häufig' },
  { id: 'pardosa_palustris', scientificName: 'Pardosa palustris', germanName: 'Sumpfwolfsspinne', family: 'Lycosidae', distribution: 'häufig' },
  { id: 'pardosa_pullata', scientificName: 'Pardosa pullata', germanName: 'Schwarze Wolfsspinne', family: 'Lycosidae', distribution: 'häufig' },
  { id: 'pirata_hygrophilus', scientificName: 'Pirata hygrophilus', germanName: 'Feuchtigkeitsliebende Piratenspinne', family: 'Lycosidae', distribution: 'mäßig verbreitet' },
  { id: 'pirata_piraticus', scientificName: 'Pirata piraticus', germanName: 'Piratenspinne', family: 'Lycosidae', distribution: 'mäßig verbreitet' },
  { id: 'trochosa_ruricola', scientificName: 'Trochosa ruricola', germanName: 'Feld-Wolfsspinne', family: 'Lycosidae', distribution: 'häufig' },
  { id: 'trochosa_terricola', scientificName: 'Trochosa terricola', germanName: 'Erd-Wolfsspinne', family: 'Lycosidae', distribution: 'häufig' },
  { id: 'xerolycosa_miniata', scientificName: 'Xerolycosa miniata', germanName: 'Sand-Wolfsspinne', family: 'Lycosidae', distribution: 'mäßig verbreitet' },

  // ── Mimetidae (Spinnenfresser) ──
  { id: 'ero_furcata', scientificName: 'Ero furcata', germanName: 'Spinnenfresser', family: 'Mimetidae', distribution: 'mäßig verbreitet' },

  // ── Oxyopidae (Luchsspinnen) ──
  { id: 'oxyopes_ramosus', scientificName: 'Oxyopes ramosus', germanName: 'Luchsspinne', family: 'Oxyopidae', distribution: 'mäßig verbreitet' },

  // ── Philodromidae (Laufspinnen) ──
  { id: 'philodromus_dispar', scientificName: 'Philodromus dispar', germanName: 'Ungleiche Laufspinne', family: 'Philodromidae', distribution: 'häufig' },
  { id: 'tibellus_oblongus', scientificName: 'Tibellus oblongus', germanName: 'Grashalm-Laufspinne', family: 'Philodromidae', distribution: 'häufig' },

  // ── Pholcidae (Zitterspinnen) ──
  { id: 'pholcus_phalangioides', scientificName: 'Pholcus phalangioides', germanName: 'Große Zitterspinne', family: 'Pholcidae', distribution: 'häufig' },
  { id: 'psilochorus_simoni', scientificName: 'Psilochorus simoni', germanName: 'Simons Zitterspinne', family: 'Pholcidae', distribution: 'mäßig verbreitet' },

  // ── Pisauridae (Raubspinnen/Jagdspinnen) ──
  { id: 'dolomedes_fimbriatus', scientificName: 'Dolomedes fimbriatus', germanName: 'Gerandete Jagdspinne', family: 'Pisauridae', distribution: 'selten' },
  { id: 'dolomedes_plantarius', scientificName: 'Dolomedes plantarius', germanName: 'Große Jagdspinne', family: 'Pisauridae', distribution: 'selten' },
  { id: 'pisaura_mirabilis', scientificName: 'Pisaura mirabilis', germanName: 'Listspinne', family: 'Pisauridae', distribution: 'häufig' },

  // ── Salticidae (Springspinnen) ──
  { id: 'ballus_chalybeius', scientificName: 'Ballus chalybeius', germanName: 'Erzfarbene Springspinne', family: 'Salticidae', distribution: 'mäßig verbreitet' },
  { id: 'evarcha_arcuata', scientificName: 'Evarcha arcuata', germanName: 'Gewöhnliche Springspinne', family: 'Salticidae', distribution: 'häufig' },
  { id: 'evarcha_falcata', scientificName: 'Evarcha falcata', germanName: 'Sichelspringspinne', family: 'Salticidae', distribution: 'häufig' },
  { id: 'heliophanus_cupreus', scientificName: 'Heliophanus cupreus', germanName: 'Kupferne Sonnenspringspinne', family: 'Salticidae', distribution: 'häufig' },
  { id: 'heliophanus_flavipes', scientificName: 'Heliophanus flavipes', germanName: 'Gelbfüßige Sonnenspringspinne', family: 'Salticidae', distribution: 'mäßig verbreitet' },
  { id: 'marpissa_muscosa', scientificName: 'Marpissa muscosa', germanName: 'Rindenspringspinne', family: 'Salticidae', distribution: 'häufig' },
  { id: 'pseudeuophrys_lanigera', scientificName: 'Pseudeuophrys lanigera', germanName: 'Mauerspringspinne', family: 'Salticidae', distribution: 'häufig' },
  { id: 'salticus_scenicus', scientificName: 'Salticus scenicus', germanName: 'Zebraspringspinne', family: 'Salticidae', distribution: 'häufig' },
  { id: 'sitticus_pubescens', scientificName: 'Sitticus pubescens', germanName: 'Behaarte Springspinne', family: 'Salticidae', distribution: 'häufig' },

  // ── Scytodidae (Speispinnen) ──
  { id: 'scytodes_thoracica', scientificName: 'Scytodes thoracica', germanName: 'Speispinne', family: 'Scytodidae', distribution: 'mäßig verbreitet' },

  // ── Segestriidae (Fischernetzspinnen) ──
  { id: 'segestria_senoculata', scientificName: 'Segestria senoculata', germanName: 'Sechsaugen-Fischernetzspinne', family: 'Segestriidae', distribution: 'häufig' },

  // ── Tetragnathidae (Streckerspinnen) ──
  { id: 'metellina_segmentata', scientificName: 'Metellina segmentata', germanName: 'Herbst-Metaspinne', family: 'Tetragnathidae', distribution: 'häufig' },
  { id: 'pachygnatha_clercki', scientificName: 'Pachygnatha clercki', germanName: 'Clercks Dickkieferspinne', family: 'Tetragnathidae', distribution: 'häufig' },
  { id: 'tetragnatha_extensa', scientificName: 'Tetragnatha extensa', germanName: 'Gemeine Streckerspinne', family: 'Tetragnathidae', distribution: 'häufig' },

  // ── Theridiidae (Kugelspinnen/Haubennetzspinnen) ──
  { id: 'enoplognatha_ovata', scientificName: 'Enoplognatha ovata', germanName: 'Rotstreifige Kugelspinne', family: 'Theridiidae', distribution: 'häufig' },
  { id: 'parasteatoda_tepidariorum', scientificName: 'Parasteatoda tepidariorum', germanName: 'Amerikanische Hausspinne', family: 'Theridiidae', distribution: 'häufig' },
  { id: 'phylloneta_impressa', scientificName: 'Phylloneta impressa', germanName: 'Kugelspinne', family: 'Theridiidae', distribution: 'häufig' },
  { id: 'steatoda_bipunctata', scientificName: 'Steatoda bipunctata', germanName: 'Zweipunkt-Fettspinne', family: 'Theridiidae', distribution: 'häufig' },
  { id: 'steatoda_grossa', scientificName: 'Steatoda grossa', germanName: 'Große Fettspinne', family: 'Theridiidae', distribution: 'mäßig verbreitet' },
  { id: 'steatoda_nobilis', scientificName: 'Steatoda nobilis', germanName: 'Falsche Witwe', family: 'Theridiidae', distribution: 'selten' },
  { id: 'steatoda_triangulosa', scientificName: 'Steatoda triangulosa', germanName: 'Dreieckige Fettspinne', family: 'Theridiidae', distribution: 'häufig' },
  { id: 'theridion_varians', scientificName: 'Theridion varians', germanName: 'Bunte Kugelspinne', family: 'Theridiidae', distribution: 'häufig' },

  // ── Thomisidae (Krabbenspinnen) ──
  { id: 'diaea_dorsata', scientificName: 'Diaea dorsata', germanName: 'Grüne Krabbenspinne', family: 'Thomisidae', distribution: 'häufig' },
  { id: 'misumena_vatia', scientificName: 'Misumena vatia', germanName: 'Veränderliche Krabbenspinne', family: 'Thomisidae', distribution: 'häufig' },
  { id: 'ozyptila_praticola', scientificName: 'Ozyptila praticola', germanName: 'Wiesen-Krabbenspinne', family: 'Thomisidae', distribution: 'häufig' },
  { id: 'thomisus_onustus', scientificName: 'Thomisus onustus', germanName: 'Rosenkrabbenspinne', family: 'Thomisidae', distribution: 'mäßig verbreitet' },
  { id: 'xysticus_cristatus', scientificName: 'Xysticus cristatus', germanName: 'Busch-Krabbenspinne', family: 'Thomisidae', distribution: 'häufig' },
  { id: 'xysticus_kochi', scientificName: 'Xysticus kochi', germanName: 'Kochs Krabbenspinne', family: 'Thomisidae', distribution: 'häufig' },
  { id: 'xysticus_spp', scientificName: 'Xysticus spp.', germanName: 'Braune Krabbenspinnen (Xysticus)', family: 'Thomisidae', distribution: 'häufig' },

  // ── Titanoecidae ──
  { id: 'titanoeca_quadriguttata', scientificName: 'Titanoeca quadriguttata', germanName: 'Vierpunkt-Finsterspinne', family: 'Titanoecidae', distribution: 'mäßig verbreitet' },

  // ── Uloboridae (Kräuselradnetzspinnen) ──
  { id: 'uloborus_walckenaerius', scientificName: 'Uloborus walckenaerius', germanName: 'Gewöhnliche Kräuselradnetzspinne', family: 'Uloboridae', distribution: 'mäßig verbreitet' },

  // ── Zoridae (Wanderspinnen) ──
  { id: 'zora_spinimana', scientificName: 'Zora spinimana', germanName: 'Stachel-Wanderspinne', family: 'Zoridae', distribution: 'häufig' },

  // ── Zoropsidae (Kräuseljagdspinnen) ──
  { id: 'zoropsis_spinimana', scientificName: 'Zoropsis spinimana', germanName: 'Nosferatu-Spinne', family: 'Zoropsidae', distribution: 'mäßig verbreitet' },
];

// ── Hilfsfunktionen ──

/**
 * Durchsucht den Katalog nach einem Suchbegriff.
 * Matched auf germanName, scientificName und family (case-insensitive, Teilstring).
 */
export function searchSpecies(query, maxResults = 10) {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();

  return speciesCatalog
    .filter(s =>
      s.germanName.toLowerCase().includes(q) ||
      s.scientificName.toLowerCase().includes(q) ||
      s.family.toLowerCase().includes(q)
    )
    .slice(0, maxResults);
}

/**
 * Findet eine Art anhand ihrer ID.
 */
export function getSpeciesById(id) {
  return speciesCatalog.find(s => s.id === id) || null;
}

/**
 * Gibt alle Familien zurück (für gruppierte Anzeige).
 */
export function getFamilies() {
  const families = new Set(speciesCatalog.map(s => s.family));
  return [...families].sort();
}
