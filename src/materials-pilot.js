const MATERIALS = [
  {
    id: "mat-algodao",
    family_code: "algodao",
    family_name_pt: "Algodão",
    canonical_name_pt: "Algodão",
    canonical_name_en: "Cotton",
    technical_name: "Gossypium spp. — fibra celulósica natural",
    base_origin: "plant",
    origin_label: "Vegetal",
    structure: "fibra",
    verticals: ["apparel"],
    aliases: ["cotton", "algodão convencional", "algodão orgânico"],
    certifications: ["OCS", "GOTS"],
    claims: [
      { code: "organico", label: "Orgânico", status: "evidence_requested", requirement: "Certificado OCS ou GOTS vigente e escopo compatível." },
      { code: "origem_brasileira", label: "Origem brasileira", status: "draft", requirement: "Documento de origem delimitando fibra, fiação e transformação." },
    ],
    evidence_status: "documented",
    description_pt: "Fibra natural vegetal amplamente usada em tecidos planos e malhas. A origem, o sistema de cultivo e a cadeia de custódia precisam ser comprovados separadamente.",
    source_label: "Textile Exchange / GOTS",
    last_reviewed_at: "2026-07-23",
    limitations_pt: "O nome do material não comprova cultivo orgânico, menor impacto ou origem geográfica.",
  },
  {
    id: "mat-linho",
    family_code: "linho",
    family_name_pt: "Linho",
    canonical_name_pt: "Linho",
    canonical_name_en: "Flax linen",
    technical_name: "Linum usitatissimum — fibra liberiana",
    base_origin: "plant",
    origin_label: "Vegetal",
    structure: "fibra",
    verticals: ["apparel", "footwear", "accessory"],
    aliases: ["flax", "linen", "linho europeu", "linho lavado"],
    certifications: ["OEKO-TEX STANDARD 100"],
    claims: [
      { code: "baixo_impacto", label: "Baixo impacto", status: "under_review", requirement: "Indicador, fronteira, método e base comparativa declarados." },
      { code: "origem_brasileira", label: "Origem brasileira", status: "draft", requirement: "Documento de origem da fibra e da transformação." },
    ],
    evidence_status: "declared_by_supplier",
    description_pt: "Fibra vegetal de caule usada em tecidos leves ou estruturados. Propriedades variam por titulagem, construção, beneficiamento e mistura.",
    source_label: "Catálogo técnico PHYLLOS",
    last_reviewed_at: "2026-07-23",
    limitations_pt: "A aparência rústica não comprova composição, origem nem menor impacto.",
  },
  {
    id: "mat-canhamo",
    family_code: "canhamo",
    family_name_pt: "Cânhamo",
    canonical_name_pt: "Cânhamo",
    canonical_name_en: "Hemp",
    technical_name: "Cannabis sativa L. — fibra liberiana",
    base_origin: "plant",
    origin_label: "Vegetal",
    structure: "fibra",
    verticals: ["apparel", "footwear", "accessory"],
    aliases: ["hemp", "hemp textile"],
    certifications: ["OCS", "GOTS"],
    claims: [{ code: "organico", label: "Orgânico", status: "evidence_requested", requirement: "Certificação aplicável e cadeia de custódia." }],
    evidence_status: "declared_by_supplier",
    description_pt: "Fibra vegetal resistente, usada pura ou em misturas. A regularidade, maciez e caimento dependem do processamento.",
    source_label: "Catálogo técnico PHYLLOS",
    last_reviewed_at: "2026-07-23",
    limitations_pt: "Cultivo e processamento devem ser avaliados no artigo comercial específico.",
  },
  {
    id: "mat-juta",
    family_code: "juta",
    family_name_pt: "Juta",
    canonical_name_pt: "Juta",
    canonical_name_en: "Jute",
    technical_name: "Corchorus spp. — fibra liberiana",
    base_origin: "plant",
    origin_label: "Vegetal",
    structure: "fibra",
    verticals: ["apparel", "footwear", "accessory", "packaging"],
    aliases: ["jute"],
    certifications: [],
    claims: [{ code: "origem_brasileira", label: "Origem brasileira", status: "draft", requirement: "Documento de origem e transformação." }],
    evidence_status: "unknown",
    description_pt: "Fibra vegetal de aspecto rústico, comum em acessórios, reforços, decoração e embalagens.",
    source_label: "Catálogo técnico PHYLLOS",
    last_reviewed_at: "2026-07-23",
    limitations_pt: "Uso em contato com a pele exige avaliação do artigo e do acabamento.",
  },
  {
    id: "mat-la",
    family_code: "la",
    family_name_pt: "Lã",
    canonical_name_pt: "Lã",
    canonical_name_en: "Wool",
    technical_name: "Fibra proteica animal",
    base_origin: "animal",
    origin_label: "Animal",
    structure: "fibra",
    verticals: ["apparel", "footwear", "accessory"],
    aliases: ["wool", "lã merino", "merino"],
    certifications: ["RWS"],
    claims: [{ code: "bem_estar_animal", label: "Bem-estar animal", status: "evidence_requested", requirement: "Certificação RWS ou evidência equivalente com escopo aplicável." }],
    evidence_status: "declared_by_supplier",
    description_pt: "Fibra animal com propriedades térmicas e elásticas. Origem, práticas de manejo e tratamentos precisam ser documentados.",
    source_label: "Textile Exchange",
    last_reviewed_at: "2026-07-23",
    limitations_pt: "Lã não é compatível com claim vegano.",
  },
  {
    id: "mat-seda",
    family_code: "seda",
    family_name_pt: "Seda",
    canonical_name_pt: "Seda",
    canonical_name_en: "Silk",
    technical_name: "Filamento proteico animal",
    base_origin: "animal",
    origin_label: "Animal",
    structure: "filamento",
    verticals: ["apparel", "accessory"],
    aliases: ["silk", "seda natural"],
    certifications: [],
    claims: [],
    evidence_status: "unknown",
    description_pt: "Filamento animal de brilho e caimento variáveis conforme construção e acabamento.",
    source_label: "Catálogo técnico PHYLLOS",
    last_reviewed_at: "2026-07-23",
    limitations_pt: "A aparência acetinada não diferencia seda de fibras artificiais ou sintéticas.",
  },
  {
    id: "mat-viscose",
    family_code: "viscose",
    family_name_pt: "Viscose",
    canonical_name_pt: "Viscose",
    canonical_name_en: "Viscose rayon",
    technical_name: "Fibra celulósica regenerada pelo processo viscose",
    base_origin: "regenerated_cellulosic",
    origin_label: "Celulósica regenerada",
    structure: "fibra",
    verticals: ["apparel", "footwear", "accessory"],
    aliases: ["rayon", "viscose rayon"],
    certifications: ["FSC", "PEFC"],
    claims: [{ code: "origem_responsavel", label: "Origem florestal responsável", status: "evidence_requested", requirement: "Cadeia de custódia florestal e escopo do produtor de celulose." }],
    evidence_status: "declared_by_supplier",
    description_pt: "Fibra de celulose regenerada com ampla variação de origem de matéria-prima e desempenho ambiental do processo.",
    source_label: "Catálogo técnico PHYLLOS",
    last_reviewed_at: "2026-07-23",
    limitations_pt: "Celulose de origem vegetal não significa biodegradação garantida nem cadeia responsável.",
  },
  {
    id: "mat-modal",
    family_code: "modal",
    family_name_pt: "Modal",
    canonical_name_pt: "Modal",
    canonical_name_en: "Modal",
    technical_name: "Fibra celulósica regenerada de alto módulo úmido",
    base_origin: "regenerated_cellulosic",
    origin_label: "Celulósica regenerada",
    structure: "fibra",
    verticals: ["apparel"],
    aliases: ["modal fiber"],
    certifications: ["FSC", "PEFC"],
    claims: [],
    evidence_status: "declared_by_supplier",
    description_pt: "Fibra celulósica regenerada, usualmente macia e estável, cuja origem e processo devem ser verificados por fabricante.",
    source_label: "Catálogo técnico PHYLLOS",
    last_reviewed_at: "2026-07-23",
    limitations_pt: "O nome modal não identifica fabricante, processo específico ou desempenho ambiental.",
  },
  {
    id: "mat-lyocell",
    family_code: "lyocell",
    family_name_pt: "Lyocell",
    canonical_name_pt: "Lyocell",
    canonical_name_en: "Lyocell",
    technical_name: "Fibra celulósica regenerada por solvente",
    base_origin: "regenerated_cellulosic",
    origin_label: "Celulósica regenerada",
    structure: "fibra",
    verticals: ["apparel", "footwear", "accessory"],
    aliases: ["liocel", "tencel", "lyocell fiber"],
    certifications: ["FSC", "PEFC", "OEKO-TEX STANDARD 100"],
    claims: [{ code: "baixo_impacto", label: "Baixo impacto", status: "under_review", requirement: "Dados do fabricante, método e comparação aplicável ao artigo." }],
    evidence_status: "documented",
    description_pt: "Fibra celulósica regenerada por processo com solvente. O desempenho depende do fabricante, da origem da celulose e da recuperação do solvente.",
    source_label: "Catálogo técnico PHYLLOS / ficha do fornecedor",
    last_reviewed_at: "2026-07-23",
    limitations_pt: "Marca comercial e nome genérico não são equivalentes; verificar o artigo e o fabricante.",
  },
  {
    id: "mat-acetato",
    family_code: "acetato",
    family_name_pt: "Acetato",
    canonical_name_pt: "Acetato",
    canonical_name_en: "Acetate",
    technical_name: "Fibra de acetato de celulose",
    base_origin: "regenerated_cellulosic",
    origin_label: "Derivada de celulose",
    structure: "filamento",
    verticals: ["apparel", "accessory"],
    aliases: ["acetate", "acetato de celulose"],
    certifications: [],
    claims: [],
    evidence_status: "unknown",
    description_pt: "Material derivado de celulose, frequentemente usado em forros e tecidos de brilho controlado.",
    source_label: "Catálogo técnico PHYLLOS",
    last_reviewed_at: "2026-07-23",
    limitations_pt: "Não tratar como fibra natural; aditivos e solventes dependem do processo.",
  },
  {
    id: "mat-poliester",
    family_code: "poliester",
    family_name_pt: "Poliéster",
    canonical_name_pt: "Poliéster",
    canonical_name_en: "Polyester",
    technical_name: "Polietileno tereftalato (PET) têxtil",
    base_origin: "fossil_synthetic",
    origin_label: "Sintética fóssil",
    structure: "fibra ou filamento",
    verticals: ["apparel", "footwear", "accessory", "packaging"],
    aliases: ["polyester", "pet textile", "rpet", "poliéster reciclado"],
    certifications: ["RCS", "GRS"],
    claims: [{ code: "reciclado", label: "Reciclado", status: "evidence_requested", requirement: "Percentual, origem do resíduo e certificado RCS/GRS ou evidência equivalente." }],
    evidence_status: "documented",
    description_pt: "Fibra sintética versátil. Versões virgens e recicladas precisam ser diferenciadas por feedstock e cadeia de custódia.",
    source_label: "Textile Exchange",
    last_reviewed_at: "2026-07-23",
    limitations_pt: "O termo reciclado não informa percentual, origem do resíduo, método nem possibilidade de nova reciclagem.",
  },
  {
    id: "mat-poliamida",
    family_code: "poliamida",
    family_name_pt: "Poliamida",
    canonical_name_pt: "Poliamida",
    canonical_name_en: "Polyamide / Nylon",
    technical_name: "Poliamida 6, 6.6 ou outras variantes",
    base_origin: "fossil_synthetic",
    origin_label: "Sintética fóssil",
    structure: "fibra ou filamento",
    verticals: ["apparel", "footwear", "accessory"],
    aliases: ["nylon", "polyamide", "pa6", "pa66"],
    certifications: ["RCS", "GRS"],
    claims: [{ code: "reciclado", label: "Reciclado", status: "evidence_requested", requirement: "Percentual e cadeia de custódia documentados." }],
    evidence_status: "declared_by_supplier",
    description_pt: "Família de polímeros sintéticos com alta resistência, usada em vestuário, linhas, cabedais e componentes.",
    source_label: "Catálogo técnico PHYLLOS",
    last_reviewed_at: "2026-07-23",
    limitations_pt: "A variante química e o feedstock devem constar na ficha técnica.",
  },
  {
    id: "mat-elastano",
    family_code: "elastano",
    family_name_pt: "Elastano",
    canonical_name_pt: "Elastano",
    canonical_name_en: "Elastane / Spandex",
    technical_name: "Fibra elastomérica de poliuretano segmentado",
    base_origin: "fossil_synthetic",
    origin_label: "Sintética fóssil",
    structure: "filamento elastomérico",
    verticals: ["apparel", "footwear"],
    aliases: ["spandex", "lycra", "elastane"],
    certifications: [],
    claims: [],
    evidence_status: "unknown",
    description_pt: "Fibra de elevada elasticidade, normalmente usada em baixos percentuais em misturas.",
    source_label: "Catálogo técnico PHYLLOS",
    last_reviewed_at: "2026-07-23",
    limitations_pt: "Marca comercial não substitui a identificação genérica da composição.",
  },
  {
    id: "mat-acrilico",
    family_code: "acrilico",
    family_name_pt: "Acrílico",
    canonical_name_pt: "Acrílico",
    canonical_name_en: "Acrylic",
    technical_name: "Fibra de polímero com predominância de acrilonitrila",
    base_origin: "fossil_synthetic",
    origin_label: "Sintética fóssil",
    structure: "fibra",
    verticals: ["apparel", "accessory"],
    aliases: ["acrylic", "fibra acrílica"],
    certifications: ["RCS", "GRS"],
    claims: [],
    evidence_status: "unknown",
    description_pt: "Fibra sintética usada em malhas, fios e artigos com aparência lanosa.",
    source_label: "Catálogo técnico PHYLLOS",
    last_reviewed_at: "2026-07-23",
    limitations_pt: "Aparência semelhante à lã não comprova composição.",
  },
  {
    id: "mat-couro-bovino",
    family_code: "couro",
    family_name_pt: "Couro",
    canonical_name_pt: "Couro bovino",
    canonical_name_en: "Bovine leather",
    technical_name: "Pele bovina curtida",
    base_origin: "animal",
    origin_label: "Animal",
    structure: "couro",
    verticals: ["footwear", "accessory", "apparel"],
    aliases: ["leather", "couro legítimo", "bovine leather"],
    certifications: ["LWG"],
    claims: [{ code: "rastreavel", label: "Rastreável", status: "evidence_requested", requirement: "Origem, curtume, lote e documentos de cadeia." }],
    evidence_status: "declared_by_supplier",
    description_pt: "Material animal curtido, usado em cabedais, forros, acessórios e vestuário.",
    source_label: "Catálogo técnico PHYLLOS",
    last_reviewed_at: "2026-07-23",
    limitations_pt: "Não é compatível com claim vegano. Tipo de curtimento e substâncias devem ser documentados.",
  },
  {
    id: "mat-couro-vegetal",
    family_code: "couro",
    family_name_pt: "Couro",
    canonical_name_pt: "Couro curtido vegetal",
    canonical_name_en: "Vegetable-tanned leather",
    technical_name: "Pele animal curtida predominantemente com taninos vegetais",
    base_origin: "animal",
    origin_label: "Animal",
    structure: "couro",
    verticals: ["footwear", "accessory"],
    aliases: ["vegetable tanned leather", "couro atanado"],
    certifications: ["LWG"],
    claims: [],
    evidence_status: "declared_by_supplier",
    description_pt: "Couro animal processado com agentes curtentes vegetais. O termo descreve o curtimento, não a origem do substrato.",
    source_label: "Catálogo técnico PHYLLOS",
    last_reviewed_at: "2026-07-23",
    limitations_pt: "Curtido vegetal não significa vegano, biodegradável ou livre de outras substâncias.",
  },
  {
    id: "mat-couro-regenerado",
    family_code: "couro_regenerado",
    family_name_pt: "Couro regenerado",
    canonical_name_pt: "Couro regenerado",
    canonical_name_en: "Bonded leather",
    technical_name: "Material compósito com fibras de couro e ligantes",
    base_origin: "mixed",
    origin_label: "Mista",
    structure: "compósito",
    verticals: ["footwear", "accessory"],
    aliases: ["bonded leather", "reconstituted leather"],
    certifications: [],
    claims: [{ code: "reciclado", label: "Reciclado", status: "under_review", requirement: "Percentual de resíduo de couro, ligantes e origem documentados." }],
    evidence_status: "unknown",
    description_pt: "Compósito produzido com partículas ou fibras de couro e ligantes poliméricos.",
    source_label: "Catálogo técnico PHYLLOS",
    last_reviewed_at: "2026-07-23",
    limitations_pt: "Não declarar como couro integral nem como vegano.",
  },
  {
    id: "mat-pu",
    family_code: "poliuretano",
    family_name_pt: "Poliuretano",
    canonical_name_pt: "Poliuretano (PU)",
    canonical_name_en: "Polyurethane",
    technical_name: "Polímero de poliuretano em filme, espuma, adesivo ou revestimento",
    base_origin: "fossil_synthetic",
    origin_label: "Sintética fóssil",
    structure: "filme, espuma ou revestimento",
    verticals: ["footwear", "apparel", "accessory"],
    aliases: ["pu", "polyurethane", "couro sintético pu"],
    certifications: ["OEKO-TEX STANDARD 100", "ZDHC MRSL"],
    claims: [{ code: "vegano", label: "Vegano", status: "evidence_requested", requirement: "Composição de todos os componentes e auxiliares, inclusive adesivos e acabamentos." }],
    evidence_status: "declared_by_supplier",
    description_pt: "Polímero usado em laminados, espumas, solados, adesivos e revestimentos.",
    source_label: "Catálogo técnico PHYLLOS",
    last_reviewed_at: "2026-07-23",
    limitations_pt: "O termo couro ecológico não é uma categoria técnica suficiente.",
  },
  {
    id: "mat-pvc",
    family_code: "pvc",
    family_name_pt: "PVC",
    canonical_name_pt: "Policloreto de vinila (PVC)",
    canonical_name_en: "Polyvinyl chloride",
    technical_name: "Polímero termoplástico clorado",
    base_origin: "fossil_synthetic",
    origin_label: "Sintética fóssil",
    structure: "filme ou composto",
    verticals: ["footwear", "apparel", "accessory", "packaging"],
    aliases: ["pvc", "vinil", "vinyl"],
    certifications: ["ZDHC MRSL"],
    claims: [],
    evidence_status: "unknown",
    description_pt: "Termoplástico usado em laminados, solados, estampas, acessórios e embalagens.",
    source_label: "Catálogo técnico PHYLLOS",
    last_reviewed_at: "2026-07-23",
    limitations_pt: "Plastificantes e restrições químicas devem ser avaliados no composto específico.",
  },
  {
    id: "mat-borracha-natural",
    family_code: "borracha",
    family_name_pt: "Borracha",
    canonical_name_pt: "Borracha natural",
    canonical_name_en: "Natural rubber",
    technical_name: "Poliisopreno natural derivado de látex",
    base_origin: "plant",
    origin_label: "Vegetal",
    structure: "elastômero",
    verticals: ["footwear", "accessory"],
    aliases: ["natural rubber", "borracha de látex"],
    certifications: ["FSC"],
    claims: [{ code: "origem_responsavel", label: "Origem responsável", status: "evidence_requested", requirement: "Origem do látex e cadeia de custódia." }],
    evidence_status: "declared_by_supplier",
    description_pt: "Elastômero vegetal usado em solas e componentes flexíveis, geralmente formulado com cargas e aditivos.",
    source_label: "Catálogo técnico PHYLLOS",
    last_reviewed_at: "2026-07-23",
    limitations_pt: "A formulação final não é 100% látex; aditivos e cargas devem ser informados.",
  },
  {
    id: "mat-borracha-sintetica",
    family_code: "borracha",
    family_name_pt: "Borracha",
    canonical_name_pt: "Borracha sintética",
    canonical_name_en: "Synthetic rubber",
    technical_name: "Família de elastômeros sintéticos",
    base_origin: "fossil_synthetic",
    origin_label: "Sintética fóssil",
    structure: "elastômero",
    verticals: ["footwear", "accessory"],
    aliases: ["synthetic rubber", "sbr", "nbr"],
    certifications: [],
    claims: [],
    evidence_status: "unknown",
    description_pt: "Família de elastômeros usados em solados e componentes técnicos.",
    source_label: "Catálogo técnico PHYLLOS",
    last_reviewed_at: "2026-07-23",
    limitations_pt: "A família química e a formulação precisam constar na ficha técnica.",
  },
  {
    id: "mat-eva",
    family_code: "eva",
    family_name_pt: "EVA",
    canonical_name_pt: "EVA",
    canonical_name_en: "Ethylene-vinyl acetate",
    technical_name: "Copolímero de etileno-acetato de vinila",
    base_origin: "fossil_synthetic",
    origin_label: "Sintética fóssil",
    structure: "espuma ou composto",
    verticals: ["footwear", "accessory"],
    aliases: ["ethylene vinyl acetate", "espuma eva"],
    certifications: ["RCS", "GRS"],
    claims: [{ code: "reciclado", label: "Reciclado", status: "evidence_requested", requirement: "Percentual, feedstock, cadeia de custódia e desempenho após incorporação." }],
    evidence_status: "documented",
    description_pt: "Copolímero usado em entressolas, palmilhas e espumas, com densidades e formulações variadas.",
    source_label: "Ficha técnica do fornecedor",
    last_reviewed_at: "2026-07-23",
    limitations_pt: "Densidade, dureza, expansão e conteúdo reciclado pertencem ao artigo comercial, não ao material genérico.",
  },
  {
    id: "mat-tpu",
    family_code: "tpu",
    family_name_pt: "TPU",
    canonical_name_pt: "TPU",
    canonical_name_en: "Thermoplastic polyurethane",
    technical_name: "Poliuretano termoplástico",
    base_origin: "fossil_synthetic",
    origin_label: "Sintética fóssil",
    structure: "termoplástico",
    verticals: ["footwear", "accessory"],
    aliases: ["thermoplastic polyurethane"],
    certifications: ["RCS", "GRS"],
    claims: [],
    evidence_status: "declared_by_supplier",
    description_pt: "Termoplástico de alta resistência usado em solas, reforços, filmes e componentes moldados.",
    source_label: "Catálogo técnico PHYLLOS",
    last_reviewed_at: "2026-07-23",
    limitations_pt: "Dureza, aditivos e reciclabilidade dependem do grade e da montagem do produto.",
  },
  {
    id: "mat-tpr",
    family_code: "tpr",
    family_name_pt: "TPR",
    canonical_name_pt: "TPR",
    canonical_name_en: "Thermoplastic rubber",
    technical_name: "Elastômero termoplástico",
    base_origin: "fossil_synthetic",
    origin_label: "Sintética fóssil",
    structure: "termoplástico elastomérico",
    verticals: ["footwear"],
    aliases: ["thermoplastic rubber"],
    certifications: [],
    claims: [],
    evidence_status: "unknown",
    description_pt: "Família de compostos termoplásticos elastoméricos usada em solados.",
    source_label: "Catálogo técnico PHYLLOS",
    last_reviewed_at: "2026-07-23",
    limitations_pt: "TPR é uma denominação ampla; exigir composição e especificação do grade.",
  },
  {
    id: "mat-cortica",
    family_code: "cortica",
    family_name_pt: "Cortiça",
    canonical_name_pt: "Cortiça",
    canonical_name_en: "Cork",
    technical_name: "Tecido suberoso de Quercus suber ou compósitos de cortiça",
    base_origin: "plant",
    origin_label: "Vegetal",
    structure: "natural ou compósito",
    verticals: ["footwear", "accessory", "apparel"],
    aliases: ["cork", "cortiça aglomerada"],
    certifications: ["FSC"],
    claims: [{ code: "origem_responsavel", label: "Origem responsável", status: "evidence_requested", requirement: "Origem florestal e composição dos ligantes quando aglomerada." }],
    evidence_status: "declared_by_supplier",
    description_pt: "Material vegetal usado em palmilhas, saltos, acessórios e laminados, puro ou aglomerado.",
    source_label: "Catálogo técnico PHYLLOS",
    last_reviewed_at: "2026-07-23",
    limitations_pt: "Compósitos de cortiça podem conter ligantes sintéticos; declarar a composição integral.",
  },
  {
    id: "mat-latex",
    family_code: "latex",
    family_name_pt: "Látex",
    canonical_name_pt: "Látex natural",
    canonical_name_en: "Natural latex",
    technical_name: "Dispersão de polímero natural de Hevea brasiliensis",
    base_origin: "plant",
    origin_label: "Vegetal",
    structure: "espuma ou emulsão",
    verticals: ["footwear", "apparel"],
    aliases: ["natural latex", "latex foam"],
    certifications: ["FSC"],
    claims: [],
    evidence_status: "declared_by_supplier",
    description_pt: "Material vegetal usado em espumas, adesivos e componentes flexíveis.",
    source_label: "Catálogo técnico PHYLLOS",
    last_reviewed_at: "2026-07-23",
    limitations_pt: "Alergenicidade, aditivos e percentual de látex natural devem ser avaliados.",
  },
  {
    id: "mat-madeira",
    family_code: "madeira",
    family_name_pt: "Madeira",
    canonical_name_pt: "Madeira",
    canonical_name_en: "Wood",
    technical_name: "Material lignocelulósico sólido",
    base_origin: "plant",
    origin_label: "Vegetal",
    structure: "sólido",
    verticals: ["footwear", "accessory", "packaging"],
    aliases: ["wood", "salto de madeira"],
    certifications: ["FSC", "PEFC"],
    claims: [{ code: "origem_responsavel", label: "Origem responsável", status: "evidence_requested", requirement: "Espécie, origem e cadeia de custódia." }],
    evidence_status: "unknown",
    description_pt: "Material vegetal usado em saltos, plataformas, acessórios e embalagens.",
    source_label: "Catálogo técnico PHYLLOS",
    last_reviewed_at: "2026-07-23",
    limitations_pt: "Espécie, tratamento e origem devem ser documentados.",
  },
];

const COMMERCIAL_ARTICLES = [
  { id: "art-alg-180", material_id: "mat-algodao", commercial_code: "ALG-180-CRU", commercial_name: "Malha Algodão Cru 180", supplier_name: "Cooperativa Raiz", composition: [{ material_name: "Algodão", percentage: 100, feedstock_type: "virgin" }], weight_gsm: 180, width_cm: 170, color: "Cru", finish: "Sem tingimento declarado", evidence_status: "documented", certifications: ["GOTS"], vertical: "apparel" },
  { id: "art-alg-rec", material_id: "mat-algodao", commercial_code: "ALG-RC-210", commercial_name: "Sarja Algodão Recuperado", supplier_name: "Tecelagem Circular", composition: [{ material_name: "Algodão", percentage: 70, feedstock_type: "recycled_pre_consumer" }, { material_name: "Poliéster", percentage: 30, feedstock_type: "recycled_post_consumer" }], weight_gsm: 210, width_cm: 150, color: "Natural mesclado", finish: "Amaciado", evidence_status: "declared_by_supplier", certifications: ["RCS"], vertical: "apparel" },
  { id: "art-lin-240", material_id: "mat-linho", commercial_code: "LIN-240-NAT", commercial_name: "Linho Natural 240", supplier_name: "Tecelagem Horizonte", composition: [{ material_name: "Linho", percentage: 100, feedstock_type: "virgin" }], weight_gsm: 240, width_cm: 140, color: "Natural", finish: "Lavado", evidence_status: "documented", certifications: ["OEKO-TEX STANDARD 100"], vertical: "apparel" },
  { id: "art-lin-vis-190", material_id: "mat-linho", commercial_code: "LIN-VIS-190", commercial_name: "Linho Viscose Fluido", supplier_name: "Tecidos Vereda", composition: [{ material_name: "Linho", percentage: 55, feedstock_type: "virgin" }, { material_name: "Viscose", percentage: 45, feedstock_type: "virgin" }], weight_gsm: 190, width_cm: 145, color: "Areia", finish: "Enzimático", evidence_status: "declared_by_supplier", certifications: [], vertical: "apparel" },
  { id: "art-lyo-150", material_id: "mat-lyocell", commercial_code: "LYO-150-AZ", commercial_name: "Lyocell Leve", supplier_name: "Biofibras Brasil", composition: [{ material_name: "Lyocell", percentage: 100, feedstock_type: "virgin" }], weight_gsm: 150, width_cm: 148, color: "Azul mineral", finish: "Tingimento reativo", evidence_status: "documented", certifications: ["FSC", "OEKO-TEX STANDARD 100"], vertical: "apparel" },
  { id: "art-rpet-120", material_id: "mat-poliester", commercial_code: "RPET-120-PRETO", commercial_name: "Tafetá rPET", supplier_name: "Circular Fios", composition: [{ material_name: "Poliéster", percentage: 100, feedstock_type: "recycled_post_consumer" }], weight_gsm: 120, width_cm: 150, color: "Preto", finish: "Repelência declarada", evidence_status: "documented", certifications: ["GRS"], vertical: "apparel" },
  { id: "art-pa-rec", material_id: "mat-poliamida", commercial_code: "PA-R-165", commercial_name: "Malha Poliamida Reciclada", supplier_name: "Circular Fios", composition: [{ material_name: "Poliamida", percentage: 88, feedstock_type: "recycled_pre_consumer" }, { material_name: "Elastano", percentage: 12, feedstock_type: "virgin" }], weight_gsm: 165, width_cm: 160, color: "Preto", finish: "Proteção UV declarada", evidence_status: "declared_by_supplier", certifications: ["RCS"], vertical: "apparel" },
  { id: "art-eva-45", material_id: "mat-eva", commercial_code: "EVA-45-REC", commercial_name: "EVA 45 Reciclado", supplier_name: "Solados Nordeste", composition: [{ material_name: "EVA", percentage: 70, feedstock_type: "virgin" }, { material_name: "EVA", percentage: 30, feedstock_type: "recycled_pre_consumer" }], weight_gsm: null, width_cm: null, color: "Preto", finish: "Densidade 0,20 g/cm³", evidence_status: "documented", certifications: ["RCS"], vertical: "footwear" },
  { id: "art-bor-nat", material_id: "mat-borracha-natural", commercial_code: "BN-SOLA-62", commercial_name: "Composto de Borracha Natural", supplier_name: "Solados Nordeste", composition: [{ material_name: "Borracha natural", percentage: 62, feedstock_type: "virgin" }, { material_name: "Cargas e aditivos", percentage: 38, feedstock_type: "unknown" }], weight_gsm: null, width_cm: null, color: "Caramelo", finish: "Vulcanizado", evidence_status: "declared_by_supplier", certifications: [], vertical: "footwear" },
  { id: "art-pu-micro", material_id: "mat-pu", commercial_code: "PU-MICRO-08", commercial_name: "Microfibra PU", supplier_name: "Laminados Sul", composition: [{ material_name: "Poliamida", percentage: 55, feedstock_type: "virgin" }, { material_name: "Poliuretano", percentage: 45, feedstock_type: "virgin" }], weight_gsm: 320, width_cm: 140, color: "Off-white", finish: "Grão fino", evidence_status: "declared_by_supplier", certifications: ["OEKO-TEX STANDARD 100"], vertical: "footwear" },
  { id: "art-cortica", material_id: "mat-cortica", commercial_code: "COR-AGL-04", commercial_name: "Cortiça Aglomerada 4 mm", supplier_name: "BioComponentes", composition: [{ material_name: "Cortiça", percentage: 82, feedstock_type: "recycled_pre_consumer" }, { material_name: "Ligante PU", percentage: 18, feedstock_type: "virgin" }], weight_gsm: null, width_cm: 100, color: "Natural", finish: "Lixado", evidence_status: "documented", certifications: ["FSC"], vertical: "footwear" },
  { id: "art-couro-veg", material_id: "mat-couro-vegetal", commercial_code: "CV-18-NAT", commercial_name: "Couro Atanado 1,8 mm", supplier_name: "Curtume Transparente", composition: [{ material_name: "Couro bovino curtido", percentage: 100, feedstock_type: "virgin" }], weight_gsm: null, width_cm: null, color: "Natural", finish: "Anilina", evidence_status: "documented", certifications: ["LWG"], vertical: "footwear" },
];

const COMPONENTS = [
  { code: "tecido_principal", name_pt: "Tecido principal", vertical: "apparel", required: true },
  { code: "forro", name_pt: "Forro", vertical: "apparel", required: false },
  { code: "linha", name_pt: "Linha", vertical: "apparel", required: true },
  { code: "entretela", name_pt: "Entretela", vertical: "apparel", required: false },
  { code: "elastico", name_pt: "Elástico", vertical: "apparel", required: false },
  { code: "enchimento", name_pt: "Enchimento", vertical: "apparel", required: false },
  { code: "ziper", name_pt: "Zíper", vertical: "apparel", required: false },
  { code: "botao", name_pt: "Botão", vertical: "apparel", required: false },
  { code: "etiqueta", name_pt: "Etiqueta", vertical: "apparel", required: true },
  { code: "embalagem", name_pt: "Embalagem associada", vertical: "apparel", required: false },
  { code: "cabedal", name_pt: "Cabedal", vertical: "footwear", required: true },
  { code: "forro_calcado", name_pt: "Forro", vertical: "footwear", required: true },
  { code: "palmilha_montagem", name_pt: "Palmilha de montagem", vertical: "footwear", required: true },
  { code: "palmilha_conforto", name_pt: "Palmilha de conforto", vertical: "footwear", required: false },
  { code: "entressola", name_pt: "Entressola", vertical: "footwear", required: false },
  { code: "sola", name_pt: "Sola", vertical: "footwear", required: true },
  { code: "salto", name_pt: "Salto", vertical: "footwear", required: false },
  { code: "vira", name_pt: "Vira", vertical: "footwear", required: false },
  { code: "contraforte", name_pt: "Contraforte", vertical: "footwear", required: true },
  { code: "biqueira", name_pt: "Biqueira", vertical: "footwear", required: true },
  { code: "espuma", name_pt: "Espuma", vertical: "footwear", required: false },
  { code: "adesivo", name_pt: "Adesivo", vertical: "footwear", required: true },
  { code: "linha_calcado", name_pt: "Linha", vertical: "footwear", required: true },
  { code: "cadarco", name_pt: "Cadarço", vertical: "footwear", required: false },
  { code: "ilhos", name_pt: "Ilhós", vertical: "footwear", required: false },
  { code: "fivela", name_pt: "Fivela", vertical: "footwear", required: false },
];

const ORIGIN_LABELS = {
  plant: "Vegetal",
  animal: "Animal",
  regenerated_cellulosic: "Celulósica regenerada",
  fossil_synthetic: "Sintética fóssil",
  mineral: "Mineral",
  mixed: "Mista",
  other: "Outra",
};

const VERTICAL_LABELS = { apparel: "Confecção", footwear: "Calçados", accessory: "Acessórios", packaging: "Embalagem" };
const EVIDENCE_LABELS = { unknown: "Sem evidência", declared_by_brand: "Declarado pela marca", declared_by_supplier: "Declarado pelo fornecedor", documented: "Documentado", laboratory_tested: "Testado em laboratório", reviewed: "Revisado", validated: "Validado", conflicting: "Conflitante", expired: "Vencido", superseded: "Substituído" };

function normalize(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), "pt-BR"));
}

function serializeMaterial(material) {
  const articleCount = COMMERCIAL_ARTICLES.filter((article) => article.material_id === material.id).length;
  return {
    ...structuredClone(material),
    article_count: articleCount,
    vertical_labels: material.verticals.map((vertical) => VERTICAL_LABELS[vertical] || vertical),
    evidence_label: EVIDENCE_LABELS[material.evidence_status] || material.evidence_status,
  };
}

export function searchMaterials({ query = "", vertical = null, family = null, origin = null, structure = null, certification = null, claim = null, evidence = null, limit = 100 } = {}) {
  const term = normalize(query);
  const max = Math.max(1, Math.min(Number(limit) || 100, 200));
  return MATERIALS.filter((material) => {
    const haystack = normalize([
      material.canonical_name_pt,
      material.canonical_name_en,
      material.technical_name,
      material.family_name_pt,
      material.aliases.join(" "),
      material.certifications.join(" "),
      material.claims.map((item) => `${item.code} ${item.label}`).join(" "),
    ].join(" "));
    return (!term || haystack.includes(term))
      && (!vertical || material.verticals.includes(vertical))
      && (!family || material.family_code === family)
      && (!origin || material.base_origin === origin)
      && (!structure || material.structure === structure)
      && (!certification || material.certifications.includes(certification))
      && (!claim || material.claims.some((item) => item.code === claim))
      && (!evidence || material.evidence_status === evidence);
  }).slice(0, max).map(serializeMaterial);
}

export function getMaterialDetail(materialId) {
  const material = MATERIALS.find((item) => item.id === materialId);
  if (!material) return null;
  return {
    ...serializeMaterial(material),
    commercial_articles: COMMERCIAL_ARTICLES.filter((article) => article.material_id === materialId).map((article) => structuredClone(article)),
  };
}

export function searchCommercialArticles({ query = "", materialId = null, vertical = null, supplier = null, evidence = null } = {}) {
  const term = normalize(query);
  return COMMERCIAL_ARTICLES.filter((article) => {
    const haystack = normalize(`${article.commercial_code} ${article.commercial_name} ${article.supplier_name} ${article.composition.map((item) => item.material_name).join(" ")} ${article.certifications.join(" ")}`);
    return (!term || haystack.includes(term))
      && (!materialId || article.material_id === materialId)
      && (!vertical || article.vertical === vertical)
      && (!supplier || article.supplier_name === supplier)
      && (!evidence || article.evidence_status === evidence);
  }).map((article) => structuredClone(article));
}

export function listMaterialFilters() {
  return {
    verticals: Object.entries(VERTICAL_LABELS).map(([value, label]) => ({ value, label })),
    families: unique(MATERIALS.map((item) => item.family_code)).map((value) => ({ value, label: MATERIALS.find((item) => item.family_code === value)?.family_name_pt || value })),
    origins: unique(MATERIALS.map((item) => item.base_origin)).map((value) => ({ value, label: ORIGIN_LABELS[value] || value })),
    structures: unique(MATERIALS.map((item) => item.structure)).map((value) => ({ value, label: value })),
    certifications: unique(MATERIALS.flatMap((item) => item.certifications)).map((value) => ({ value, label: value })),
    claims: unique(MATERIALS.flatMap((item) => item.claims.map((claim) => claim.code))).map((value) => ({ value, label: MATERIALS.flatMap((item) => item.claims).find((claim) => claim.code === value)?.label || value })),
    evidence: unique(MATERIALS.map((item) => item.evidence_status)).map((value) => ({ value, label: EVIDENCE_LABELS[value] || value })),
    suppliers: unique(COMMERCIAL_ARTICLES.map((item) => item.supplier_name)).map((value) => ({ value, label: value })),
  };
}

export function listComponentTypes(vertical = null) {
  return COMPONENTS.filter((item) => !vertical || item.vertical === vertical).map((item) => structuredClone(item));
}

function param(url, name) {
  return url.searchParams.get(name)?.trim() || null;
}

export async function handleMaterialsPilotApi({ req, res, url, json }) {
  if (!url.pathname.startsWith("/api/v1/materials-demo")) return false;

  if (req.method === "GET" && url.pathname === "/api/v1/materials-demo/status") {
    json(res, 200, {
      enabled: true,
      ready: true,
      persistence: "versioned-pilot-catalog",
      production_ready: false,
      version: "0.1",
      canonical_materials: MATERIALS.length,
      commercial_articles: COMMERCIAL_ARTICLES.length,
      limitation: "Catálogo de interface e integração; dados operacionais por tenant continuam dependentes da Materials Knowledge Base PostgreSQL.",
    });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/v1/materials-demo/filters") {
    json(res, 200, listMaterialFilters());
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/v1/materials-demo/families") {
    json(res, 200, { items: listMaterialFilters().families });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/v1/materials-demo/component-types") {
    json(res, 200, { items: listComponentTypes(param(url, "vertical")) });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/v1/materials-demo/catalog") {
    const items = searchMaterials({
      query: param(url, "query") || "",
      vertical: param(url, "vertical"),
      family: param(url, "family"),
      origin: param(url, "origin"),
      structure: param(url, "structure"),
      certification: param(url, "certification"),
      claim: param(url, "claim"),
      evidence: param(url, "evidence"),
      limit: param(url, "limit") || 100,
    });
    json(res, 200, { items, total: items.length, source: "materials-demo-v0.1" });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/v1/materials-demo/commercial-articles") {
    const items = searchCommercialArticles({
      query: param(url, "query") || "",
      materialId: param(url, "material_id"),
      vertical: param(url, "vertical"),
      supplier: param(url, "supplier"),
      evidence: param(url, "evidence"),
    });
    json(res, 200, { items, total: items.length, source: "materials-demo-v0.1" });
    return true;
  }

  const detailMatch = url.pathname.match(/^\/api\/v1\/materials-demo\/catalog\/([^/]+)$/);
  if (req.method === "GET" && detailMatch) {
    const item = getMaterialDetail(decodeURIComponent(detailMatch[1]));
    if (!item) {
      json(res, 404, { error: "Material não encontrado", code: "MATERIAL_NOT_FOUND" });
      return true;
    }
    json(res, 200, item);
    return true;
  }

  json(res, 404, { error: "Endpoint do catálogo piloto não encontrado", code: "NOT_FOUND" });
  return true;
}
