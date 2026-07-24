# Modelo de Domínio

## Entidades

### DigitalProductPassport
- id
- tenant_id
- passport_identifier
- identification_level
- current_version_id
- product_id
- batch_id
- item_id
- status
- created_at

### PassportVersion
- id
- passport_id
- version_number
- schema_version
- canonical_manifest_uri
- content_hash
- previous_version_hash
- signature_id
- publication_decision_id
- issued_at
- superseded_at
- status

### PassportIdentifier
- id
- scheme
- value
- canonical_uri
- gtin
- batch_number
- serial_number
- issuer_organization_id

### PassportManifest
- identification
- product
- economicOperator
- materials[]
- supplyChain[]
- production
- environmentalPerformance
- transparency
- certifications[]
- care
- circularity
- compliance
- evidenceSummary
- publication
- proof

### CryptographicProof
- id
- algorithm
- key_id
- signature
- signed_hash
- verification_method
- created_at
- status

### EvidenceBundle
- id
- passport_version_id
- assertion_ids[]
- evidence_ids[]
- public_summary
- restricted_location

### ScanEvent
- id
- passport_id
- occurred_at
- coarse_region
- channel
- user_agent_class
- risk_flags[]
- privacy_retention_class

### RevocationRecord
- id
- passport_id
- version_id
- action
- reason_code
- actor_id
- occurred_at

## Relações

Product 1—N DigitalProductPassport
DigitalProductPassport 1—N PassportVersion
PassportVersion 1—1 PassportManifest
PassportVersion 1—1 CryptographicProof
PassportVersion N—1 PublicationDecision
Assertion N—N Evidence
Assertion N—1 Review
PassportVersion N—N Assertion
MaterialLot N—N ProductionBatch
ProductionBatch 1—N ProductionEvent

## Vocabulários mínimos

### provenance_status
measured | declared | calculated | estimated | inferred | audited | unknown

### evidence_status
captured | pending_review | supported | partially_supported | conflicting | rejected | expired

### visibility
public | business_partner | auditor | authority | internal

### passport_status
draft | blocked | ready_to_publish | published | superseded | suspended | revoked

### verification_status
valid | invalid_signature | superseded | suspended | revoked | not_found | suspicious_clone
