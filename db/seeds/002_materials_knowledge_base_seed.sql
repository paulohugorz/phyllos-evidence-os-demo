BEGIN;

SELECT pg_advisory_xact_lock(hashtext('phyllos:materials-kb:seed:v0.2'));
SELECT set_config('app.role', 'migration', true);

-- ------------------------------------------------------------------
-- Fontes. Datas e contagens voláteis não são gravadas como verdade fixa.
-- ------------------------------------------------------------------

INSERT INTO materials.catalog_source
(code, name_pt, source_url, publisher, sync_frequency, last_verified_at, notes_pt)
VALUES
('echa_candidate_list', 'ECHA — Candidate List of SVHC', 'https://echa.europa.eu/candidate-list-table', 'European Chemicals Agency', 'por_atualizacao_oficial', now(), 'Lista viva. Sincronizar da fonte oficial; não inferir completude pela amostra local.'),
('echa_reach_restrictions', 'ECHA — REACH restrictions', 'https://echa.europa.eu/substances-restricted-under-reach', 'European Chemicals Agency', 'por_atualizacao_oficial', now(), 'Restrições do Anexo XVII e materiais de apoio; validar entrada, escopo e método aplicáveis.'),
('zdhc_mrsl', 'ZDHC Manufacturing Restricted Substances List', 'https://mrsl.roadmaptozero.com', 'ZDHC Foundation', 'por_nova_versao', now(), 'Foco em substâncias usadas na manufatura. Não equivale automaticamente a teste de produto final.'),
('textile_exchange', 'Textile Exchange — Standards', 'https://textileexchange.org/standards', 'Textile Exchange', 'por_nova_versao', now(), 'Fonte para GRS, RCS, OCS, RDS e RWS; regras de uso de claims dependem do contexto.'),
('gots', 'Global Organic Textile Standard', 'https://global-standard.org', 'Global Standard gGmbH', 'por_nova_versao', now(), 'A certificação e o uso de sinais GOTS possuem graus de rotulagem e critérios próprios.'),
('oeko_tex', 'OEKO-TEX', 'https://www.oeko-tex.com', 'OEKO-TEX Association', 'por_nova_versao', now(), 'Consultar escopo, classe do produto, certificado e validade.'),
('gs1', 'GS1 — Identificadores e Verified by GS1', 'https://www.gs1.org/services/verified-by-gs1', 'GS1', 'api_ou_consulta', now(), 'Validar GTIN e GLN na aplicação; o banco valida apenas formato básico.'),
('jrc_textiles_dpp_20260513', 'JRC — Study on DPP content for textile apparel products under ESPR', 'https://susproc.jrc.ec.europa.eu/product-bureau/sites/default/files/2026-05/Textiles_DPP_20260513.pdf', 'European Commission Joint Research Centre', 'manual', now(), 'Relatório de recomendações publicado em 13/05/2026; não é o ato delegado final.'),
('iso_textile_names', 'ISO — Nomes genéricos de fibras têxteis', 'https://www.iso.org', 'International Organization for Standardization', 'manual', now(), 'Referência de nomenclatura; confirmar licença e versão do documento aplicável.')
ON CONFLICT (code) DO UPDATE SET
    name_pt = EXCLUDED.name_pt,
    source_url = EXCLUDED.source_url,
    publisher = EXCLUDED.publisher,
    sync_frequency = EXCLUDED.sync_frequency,
    last_verified_at = EXCLUDED.last_verified_at,
    notes_pt = EXCLUDED.notes_pt,
    updated_at = now();

-- ------------------------------------------------------------------
-- Famílias e materiais canônicos iniciais para confecção sustentável.
-- Reciclado é atributo do feedstock aplicado, não origem química da fibra.
-- ------------------------------------------------------------------

INSERT INTO materials.material_family (code, name_pt, name_en, source_id)
SELECT values_row.code, values_row.name_pt, values_row.name_en, src.id
FROM (VALUES
    ('algodao', 'Algodão', 'Cotton'),
    ('linho', 'Linho', 'Flax/Linen'),
    ('canhamo', 'Cânhamo', 'Hemp'),
    ('juta', 'Juta', 'Jute'),
    ('la', 'Lã', 'Wool'),
    ('seda', 'Seda', 'Silk'),
    ('viscose', 'Viscose', 'Viscose'),
    ('modal', 'Modal', 'Modal'),
    ('lyocell', 'Lyocell', 'Lyocell'),
    ('acetato', 'Acetato', 'Acetate'),
    ('poliester', 'Poliéster', 'Polyester'),
    ('poliamida', 'Poliamida', 'Polyamide/Nylon'),
    ('elastano', 'Elastano', 'Elastane'),
    ('acrilico', 'Acrílico', 'Acrylic')
) AS values_row(code, name_pt, name_en)
CROSS JOIN materials.catalog_source src
WHERE src.code = 'iso_textile_names'
ON CONFLICT (code) DO UPDATE SET
    name_pt = EXCLUDED.name_pt,
    name_en = EXCLUDED.name_en,
    source_id = EXCLUDED.source_id,
    is_active = true,
    updated_at = now();

INSERT INTO materials.material
(family_id, canonical_name_pt, canonical_name_en, technical_name, base_origin, structure, source_id)
SELECT mf.id, values_row.name_pt, values_row.name_en, values_row.technical_name,
       values_row.base_origin::materials.material_base_origin,
       values_row.structure, src.id
FROM (VALUES
    ('algodao', 'Algodão', 'Cotton', 'Fibra de algodão', 'plant', 'fibra descontínua'),
    ('linho', 'Linho', 'Flax/Linen', 'Fibra de linho', 'plant', 'fibra liberiana'),
    ('canhamo', 'Cânhamo', 'Hemp', 'Fibra de cânhamo', 'plant', 'fibra liberiana'),
    ('juta', 'Juta', 'Jute', 'Fibra de juta', 'plant', 'fibra liberiana'),
    ('la', 'Lã', 'Wool', 'Fibra de lã', 'animal', 'fibra descontínua'),
    ('seda', 'Seda', 'Silk', 'Fibra de seda', 'animal', 'filamento'),
    ('viscose', 'Viscose', 'Viscose', 'Fibra celulósica regenerada por processo viscose', 'regenerated_cellulosic', 'filamento ou fibra descontínua'),
    ('modal', 'Modal', 'Modal', 'Fibra celulósica regenerada de alto módulo úmido', 'regenerated_cellulosic', 'fibra descontínua'),
    ('lyocell', 'Lyocell', 'Lyocell', 'Fibra celulósica regenerada por processo de solvente', 'regenerated_cellulosic', 'filamento ou fibra descontínua'),
    ('acetato', 'Acetato', 'Acetate', 'Fibra de acetato de celulose', 'regenerated_cellulosic', 'filamento ou fibra descontínua'),
    ('poliester', 'Poliéster', 'Polyester', 'Fibra de poliéster', 'fossil_synthetic', 'filamento ou fibra descontínua'),
    ('poliamida', 'Poliamida', 'Polyamide/Nylon', 'Fibra de poliamida', 'fossil_synthetic', 'filamento ou fibra descontínua'),
    ('elastano', 'Elastano', 'Elastane', 'Fibra elastomérica de poliuretano segmentado', 'fossil_synthetic', 'filamento elastomérico'),
    ('acrilico', 'Acrílico', 'Acrylic', 'Fibra acrílica', 'fossil_synthetic', 'fibra descontínua')
) AS values_row(family_code, name_pt, name_en, technical_name, base_origin, structure)
JOIN materials.material_family mf ON mf.code = values_row.family_code
CROSS JOIN materials.catalog_source src
WHERE src.code = 'iso_textile_names'
ON CONFLICT DO NOTHING;

-- Todos os materiais iniciais podem aparecer em apparel; vários também em
-- acessórios e calçados. A aplicação concreta ainda precisa ser documentada.
INSERT INTO materials.material_vertical (material_id, vertical)
SELECT m.id, v.vertical::materials.product_vertical
FROM materials.material m
CROSS JOIN (VALUES ('apparel'), ('accessory')) AS v(vertical)
ON CONFLICT DO NOTHING;

INSERT INTO materials.material_vertical (material_id, vertical)
SELECT m.id, 'footwear'::materials.product_vertical
FROM materials.material m
WHERE m.canonical_name_pt IN (
    'Algodão', 'Linho', 'Cânhamo', 'Juta', 'Lã', 'Seda',
    'Viscose', 'Modal', 'Lyocell', 'Poliéster', 'Poliamida', 'Elastano', 'Acrílico'
)
ON CONFLICT DO NOTHING;

INSERT INTO materials.material_alias
(material_id, alias, language_code, alias_kind, source_id)
SELECT m.id, values_row.alias, values_row.language_code, values_row.alias_kind, src.id
FROM (VALUES
    ('Poliamida', 'Nylon', 'en', 'synonym'),
    ('Poliamida', 'Náilon', 'pt-BR', 'synonym'),
    ('Elastano', 'Spandex', 'en', 'synonym'),
    ('Elastano', 'Elastane', 'en', 'synonym')
) AS values_row(material_name, alias, language_code, alias_kind)
JOIN materials.material m ON m.canonical_name_pt = values_row.material_name
CROSS JOIN materials.catalog_source src
WHERE src.code = 'iso_textile_names'
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------------
-- Componentes: taxonomias independentes por vertical.
-- ------------------------------------------------------------------

INSERT INTO materials.component_type
(code, name_pt, name_en, vertical, is_critical)
VALUES
('tecido_principal', 'Tecido principal', 'Main fabric', 'apparel', true),
('forro', 'Forro', 'Lining', 'apparel', true),
('linha', 'Linha', 'Sewing thread', 'apparel', false),
('elastico', 'Elástico', 'Elastic', 'apparel', true),
('entretela', 'Entretela', 'Interlining', 'apparel', false),
('enchimento', 'Enchimento', 'Padding', 'apparel', true),
('ziper', 'Zíper', 'Zipper', 'apparel', false),
('botao', 'Botão', 'Button', 'apparel', false),
('colchete', 'Colchete', 'Hook and eye', 'apparel', false),
('etiqueta', 'Etiqueta', 'Label', 'apparel', false),
('estampa_revestimento', 'Estampa ou revestimento', 'Print or coating', 'apparel', true),
('aviamento_metalico', 'Aviamento metálico', 'Metal trim', 'apparel', false),
('embalagem', 'Embalagem associada', 'Associated packaging', 'packaging', false),
('cabedal', 'Cabedal', 'Upper', 'footwear', true),
('forro', 'Forro', 'Lining', 'footwear', true),
('palmilha_montagem', 'Palmilha de montagem', 'Lasting insole', 'footwear', true),
('palmilha_conforto', 'Palmilha de conforto', 'Comfort insole', 'footwear', true),
('entressola', 'Entressola', 'Midsole', 'footwear', true),
('sola', 'Sola', 'Outsole', 'footwear', true),
('salto', 'Salto', 'Heel', 'footwear', true),
('vira', 'Vira', 'Welt', 'footwear', false),
('contraforte', 'Contraforte', 'Counter', 'footwear', false),
('biqueira', 'Biqueira', 'Toe puff', 'footwear', false),
('espuma', 'Espuma', 'Foam', 'footwear', true),
('adesivo', 'Adesivo', 'Adhesive', 'footwear', true),
('linha', 'Linha', 'Thread', 'footwear', false),
('cadarco', 'Cadarço', 'Laces', 'footwear', false),
('ilhos', 'Ilhós', 'Eyelet', 'footwear', false),
('fivela', 'Fivela', 'Buckle', 'footwear', false),
('ziper', 'Zíper', 'Zipper', 'footwear', false),
('revestimento', 'Revestimento', 'Coating', 'footwear', true)
ON CONFLICT (vertical, code) DO UPDATE SET
    name_pt = EXCLUDED.name_pt,
    name_en = EXCLUDED.name_en,
    is_critical = EXCLUDED.is_critical,
    is_active = true;

-- ------------------------------------------------------------------
-- Processos iniciais.
-- ------------------------------------------------------------------

INSERT INTO materials.manufacturing_process
(code, name_pt, name_en, stage)
VALUES
('cultivo', 'Cultivo', 'Cultivation', 'raw_material'),
('extracao_fibra', 'Extração da fibra', 'Fibre extraction', 'raw_material'),
('fiacao', 'Fiação', 'Spinning', 'material_processing'),
('tecelagem', 'Tecelagem', 'Weaving', 'material_processing'),
('malharia', 'Malharia', 'Knitting', 'material_processing'),
('nao_tecido', 'Formação de não tecido', 'Nonwoven formation', 'material_processing'),
('tingimento', 'Tingimento', 'Dyeing', 'wet_processing'),
('estamparia', 'Estamparia', 'Printing', 'wet_processing'),
('acabamento', 'Acabamento', 'Finishing', 'wet_processing'),
('reciclagem_mecanica', 'Reciclagem mecânica', 'Mechanical recycling', 'recycling'),
('reciclagem_quimica', 'Reciclagem química', 'Chemical recycling', 'recycling'),
('curtimento', 'Curtimento', 'Tanning', 'footwear_material_processing'),
('laminacao', 'Laminação', 'Lamination', 'material_processing'),
('vulcanizacao', 'Vulcanização', 'Vulcanisation', 'footwear_material_processing'),
('colagem', 'Colagem', 'Bonding', 'assembly')
ON CONFLICT (code) DO UPDATE SET
    name_pt = EXCLUDED.name_pt,
    name_en = EXCLUDED.name_en,
    stage = EXCLUDED.stage,
    is_active = true;

-- ------------------------------------------------------------------
-- Certificações e regras contextuais de claim.
-- ------------------------------------------------------------------

INSERT INTO materials.certification_standard
(code, version_code, name_full, owner_org, scope_pt,
 covers_chain_of_custody, covers_chemical_restriction,
 covers_social_environmental, effective_from, source_id, source_url)
SELECT values_row.code, values_row.version_code, values_row.name_full,
       values_row.owner_org, values_row.scope_pt,
       values_row.chain, values_row.chemical, values_row.social,
       values_row.effective_from::date, src.id, values_row.source_url
FROM (VALUES
    ('GRS', '5.0', 'Global Recycled Standard', 'Textile Exchange', 'Rastreabilidade de conteúdo reciclado, requisitos de processamento e regras de claim.', true, true, true, '2026-07-01', 'https://textileexchange.org/recycled-claim-global-recycled-standard/'),
    ('RCS', '3.0', 'Recycled Claim Standard', 'Textile Exchange', 'Verificação e rastreabilidade de material reciclado na cadeia de custódia.', true, false, false, '2026-07-01', 'https://textileexchange.org/recycled-claim-global-recycled-standard/'),
    ('OCS', 'unspecified', 'Organic Content Standard', 'Textile Exchange', 'Verificação de conteúdo orgânico e cadeia de custódia.', true, false, false, NULL, 'https://textileexchange.org/standards/'),
    ('GOTS', '8.0', 'Global Organic Textile Standard', 'Global Standard gGmbH', 'Processamento de têxteis com fibras orgânicas, incluindo critérios ambientais, humanos e sociais.', true, true, true, NULL, 'https://global-standard.org'),
    ('RDS', 'unspecified', 'Responsible Down Standard', 'Textile Exchange', 'Bem-estar animal e cadeia de custódia para plumas e penas.', true, false, true, NULL, 'https://textileexchange.org/standards/'),
    ('RWS', 'unspecified', 'Responsible Wool Standard', 'Textile Exchange', 'Bem-estar animal e manejo da terra na produção de lã.', true, false, true, NULL, 'https://textileexchange.org/standards/'),
    ('OEKO-TEX_STANDARD100', 'unspecified', 'OEKO-TEX STANDARD 100', 'OEKO-TEX Association', 'Ensaios de substâncias nocivas em artigos têxteis, conforme escopo e classe do certificado.', false, true, false, NULL, 'https://www.oeko-tex.com'),
    ('ZDHC_MRSL_CONFORMANCE', 'unspecified', 'ZDHC MRSL Conformance', 'ZDHC Foundation', 'Conformidade de formulações químicas com a MRSL, conforme nível e versão aplicáveis.', true, true, false, NULL, 'https://mrsl.roadmaptozero.com')
) AS values_row(code, version_code, name_full, owner_org, scope_pt, chain, chemical, social, effective_from, source_url)
JOIN materials.catalog_source src
  ON src.code = CASE
      WHEN values_row.code IN ('GRS','RCS','OCS','RDS','RWS') THEN 'textile_exchange'
      WHEN values_row.code = 'GOTS' THEN 'gots'
      WHEN values_row.code = 'OEKO-TEX_STANDARD100' THEN 'oeko_tex'
      ELSE 'zdhc_mrsl'
  END
ON CONFLICT (code, version_code) DO UPDATE SET
    name_full = EXCLUDED.name_full,
    owner_org = EXCLUDED.owner_org,
    scope_pt = EXCLUDED.scope_pt,
    covers_chain_of_custody = EXCLUDED.covers_chain_of_custody,
    covers_chemical_restriction = EXCLUDED.covers_chemical_restriction,
    covers_social_environmental = EXCLUDED.covers_social_environmental,
    effective_from = EXCLUDED.effective_from,
    source_id = EXCLUDED.source_id,
    source_url = EXCLUDED.source_url,
    is_active = true;

INSERT INTO materials.certification_claim_rule
(certification_id, claim_context, claim_label, minimum_content_pct, maximum_content_pct, notes_pt, source_id)
SELECT cs.id, values_row.claim_context, values_row.claim_label,
       values_row.min_pct, values_row.max_pct, values_row.notes_pt, cs.source_id
FROM (VALUES
    ('GRS', 'business_to_business', 'GRS B2B', 20.0, NULL, 'O padrão pode ser usado como ferramenta B2B a partir de 20% de conteúdo reciclado; regras de claim ao consumidor são diferentes.'),
    ('GRS', 'consumer_facing', 'GRS product claim', 50.0, NULL, 'Elegibilidade para claim/rotulagem voltada ao consumidor requer o limiar aplicável definido pela política de claims.'),
    ('RCS', 'certification_scope', 'RCS', 5.0, NULL, 'O RCS é destinado a produtos com pelo menos 5% de material reciclado.'),
    ('OCS', 'certification_scope', 'OCS', 5.0, NULL, 'Registrar a versão e a documentação de transação aplicáveis ao produto.'),
    ('GOTS', 'label_grade', 'Made with organic', 70.0, 94.9999, 'Grau de rotulagem para produto com pelo menos 70% de fibras orgânicas certificadas.'),
    ('GOTS', 'label_grade', 'Organic', 95.0, NULL, 'Grau de rotulagem Organic requer pelo menos 95% de fibras orgânicas certificadas.')
) AS values_row(code, claim_context, claim_label, min_pct, max_pct, notes_pt)
JOIN materials.certification_standard cs ON cs.code = values_row.code AND cs.is_active
ON CONFLICT (certification_id, claim_context, claim_label) DO UPDATE SET
    minimum_content_pct = EXCLUDED.minimum_content_pct,
    maximum_content_pct = EXCLUDED.maximum_content_pct,
    notes_pt = EXCLUDED.notes_pt,
    source_id = EXCLUDED.source_id;

-- ------------------------------------------------------------------
-- Claim ledger e requisitos mínimos de evidência.
-- ------------------------------------------------------------------

INSERT INTO materials.claim_type
(code, name_pt, name_en, category, description_pt)
VALUES
('organico', 'Orgânico', 'Organic', 'environmental', 'Exige escopo, percentual e cadeia documental ou certificação aplicável.'),
('reciclado', 'Reciclado', 'Recycled', 'environmental', 'Exige percentual, origem do resíduo, método e documentação da cadeia.'),
('biodegradavel', 'Biodegradável', 'Biodegradable', 'environmental', 'Exige método de ensaio, condições ambientais e escopo.'),
('compostavel', 'Compostável', 'Compostable', 'environmental', 'Exige norma, ambiente de compostagem e prazo.'),
('vegano', 'Vegano', 'Vegan', 'environmental', 'Exige verificação de todos os componentes e processos relevantes, não apenas do tecido principal.'),
('tingimento_natural', 'Tingimento natural', 'Natural dyeing', 'technical', 'Exige matéria-prima tintória, processo, responsável e lote.'),
('baixo_impacto', 'Baixo impacto', 'Lower impact', 'environmental', 'Exige indicador, método, fronteira e comparação válida.'),
('feito_a_mao', 'Feito à mão', 'Handmade', 'social', 'Exige identificação da etapa manual, ator e processo.'),
('origem_brasileira', 'Origem brasileira', 'Brazilian origin', 'origin', 'Exige delimitação entre origem da matéria-prima, transformação e fabricação.'),
('livre_de_substancia', 'Livre de substância', 'Free from substance', 'technical', 'Exige substância ou lista-alvo, método de ensaio, limite e laudo aplicável.')
ON CONFLICT (code) DO UPDATE SET
    name_pt = EXCLUDED.name_pt,
    name_en = EXCLUDED.name_en,
    category = EXCLUDED.category,
    description_pt = EXCLUDED.description_pt,
    is_active = true;

-- Certificações aceitas são alternativas; cada linha representa uma rota.
INSERT INTO materials.evidence_requirement
(claim_type_id, required_document_type, accepted_certification_id,
 proof_method_code, access_tier, description_pt, source_id)
SELECT ct.id, 'certificate'::materials.document_type, cs.id,
       'third_party_certificate', 'buyer_restricted'::materials.access_tier,
       'Claim orgânico pode ser sustentado por certificado vigente e documentos de cadeia/escopo aplicáveis.', cs.source_id
FROM materials.claim_type ct
JOIN materials.certification_standard cs ON cs.code IN ('OCS', 'GOTS') AND cs.is_active
WHERE ct.code = 'organico'
  AND NOT EXISTS (
      SELECT 1 FROM materials.evidence_requirement er
      WHERE er.claim_type_id = ct.id
        AND er.accepted_certification_id = cs.id
        AND er.proof_method_code = 'third_party_certificate'
  );

INSERT INTO materials.evidence_requirement
(claim_type_id, required_document_type, accepted_certification_id,
 proof_method_code, access_tier, description_pt, source_id)
SELECT ct.id, 'certificate'::materials.document_type, cs.id,
       'third_party_certificate', 'buyer_restricted'::materials.access_tier,
       'Claim reciclado pode ser sustentado por certificado vigente e documentos de cadeia, respeitando o contexto do claim.', cs.source_id
FROM materials.claim_type ct
JOIN materials.certification_standard cs ON cs.code IN ('RCS', 'GRS') AND cs.is_active
WHERE ct.code = 'reciclado'
  AND NOT EXISTS (
      SELECT 1 FROM materials.evidence_requirement er
      WHERE er.claim_type_id = ct.id
        AND er.accepted_certification_id = cs.id
        AND er.proof_method_code = 'third_party_certificate'
  );

INSERT INTO materials.evidence_requirement
(claim_type_id, required_document_type, accepted_certification_id,
 proof_method_code, access_tier, description_pt, source_id)
SELECT ct.id, values_row.doc_type::materials.document_type, NULL,
       values_row.method_code, values_row.access_tier::materials.access_tier,
       values_row.description_pt, src.id
FROM (VALUES
    ('biodegradavel', 'lab_report', 'specified_test_method', 'authorities_only', 'Laudo deve declarar método, meio, temperatura, duração, critérios de aceitação e escopo do material/produto.'),
    ('compostavel', 'lab_report', 'specified_compostability_standard', 'authorities_only', 'Laudo deve identificar norma, ambiente de compostagem, prazo e critérios.'),
    ('vegano', 'self_declaration', 'component_level_chain_review', 'buyer_restricted', 'Exige revisão da composição de todos os componentes e declaração documentada dos fornecedores/processos relevantes.'),
    ('tingimento_natural', 'origin_document', 'process_and_batch_provenance', 'buyer_restricted', 'Exige identificação da matéria-prima tintória, processo, ator e lote.'),
    ('baixo_impacto', 'self_declaration', 'comparative_method_with_boundary', 'authorities_only', 'Exige indicador, método, fronteira, base comparativa e parâmetros reproduzíveis.'),
    ('feito_a_mao', 'self_declaration', 'manual_stage_and_actor_provenance', 'buyer_restricted', 'Exige etapa manual, ator ou grupo produtivo, período e produto/lote abrangido.'),
    ('origem_brasileira', 'origin_document', 'origin_scope_definition', 'buyer_restricted', 'Exige declaração clara do que é brasileiro: matéria-prima, transformação, fabricação ou combinação.'),
    ('livre_de_substancia', 'lab_report', 'named_substance_list_and_test_method', 'authorities_only', 'Exige substância/lista-alvo, versão, método, limite de quantificação e resultado do ensaio.')
) AS values_row(claim_code, doc_type, method_code, access_tier, description_pt)
JOIN materials.claim_type ct ON ct.code = values_row.claim_code
CROSS JOIN materials.catalog_source src
WHERE src.code = 'jrc_textiles_dpp_20260513'
  AND NOT EXISTS (
      SELECT 1 FROM materials.evidence_requirement er
      WHERE er.claim_type_id = ct.id
        AND er.accepted_certification_id IS NULL
        AND er.proof_method_code = values_row.method_code
  );

-- ------------------------------------------------------------------
-- Amostra de substâncias: não representa lista completa.
-- ------------------------------------------------------------------

INSERT INTO materials.substance_of_concern
(cas_number, name_en, list_source_code, concentration_limit_pct,
 reason_pt, source_id, source_url, last_verified_at)
SELECT values_row.cas_number, values_row.name_en, values_row.list_source_code,
       values_row.limit_pct, values_row.reason_pt, src.id, src.source_url, now()
FROM (VALUES
    ('117-81-7', 'Bis(2-ethylhexyl) phthalate (DEHP)', 'reach_svhc', 0.1, 'Ftalato relevante para plastificantes, revestimentos e componentes poliméricos.'),
    ('84-74-2', 'Dibutyl phthalate (DBP)', 'reach_svhc', 0.1, 'Ftalato relevante para materiais e formulações poliméricas.'),
    ('85-68-7', 'Benzyl butyl phthalate (BBP)', 'reach_svhc', 0.1, 'Ftalato relevante para materiais e formulações poliméricas.'),
    ('50-00-0', 'Formaldehyde', 'zdhc_mrsl', NULL, 'Substância relevante para determinados acabamentos e processos; limites dependem da lista, categoria e método aplicáveis.'),
    (NULL, 'Chromium(VI) compounds', 'reach_restriction_annex_xvii', NULL, 'Relevante para couro e componentes tratados; verificar a entrada, o limite e o método aplicáveis ao produto.')
) AS values_row(cas_number, name_en, list_source_code, limit_pct, reason_pt)
JOIN materials.catalog_source src
  ON src.code = CASE
      WHEN values_row.list_source_code = 'zdhc_mrsl' THEN 'zdhc_mrsl'
      WHEN values_row.list_source_code = 'reach_restriction_annex_xvii' THEN 'echa_reach_restrictions'
      ELSE 'echa_candidate_list'
  END
ON CONFLICT (list_source_code, name_en) DO UPDATE SET
    cas_number = EXCLUDED.cas_number,
    concentration_limit_pct = EXCLUDED.concentration_limit_pct,
    reason_pt = EXCLUDED.reason_pt,
    source_id = EXCLUDED.source_id,
    source_url = EXCLUDED.source_url,
    last_verified_at = EXCLUDED.last_verified_at,
    is_active = true;

COMMIT;
