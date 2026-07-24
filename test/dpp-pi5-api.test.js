import test from "node:test";
import assert from "node:assert/strict";
import { DppPi5Store } from "../src/dpp-pi5-api.js";

const valid = {
  scope:"batch", product:{name:"Camisa",sku:"SKU-1"}, batch:{code:"L1",approvedUnits:100},
  materials:[{name:"Algodão",percentage:100}], evidence:[{id:"E1",type:"document"}],
  impact:{co2eKg:200,waterLiters:1000}, transparency:{traceability:80,ghg:60,decarbonization:30,renewable:50,justTransition:20}
};
test("cria, valida, pré-visualiza e publica DPP",()=>{
  const s=new DppPi5Store(); const d=s.createDraft(valid);
  assert.equal(s.validateDraft(d.id).valid,true);
  assert.equal(s.preview(d.id).pi5.perPiece.co2eKg,2);
  const p=s.publish(d.id);
  assert.equal(s.verify(p.identifier).valid,true);
});
test("bloqueia composição inválida",()=>{
  const s=new DppPi5Store(); const d=s.createDraft({...valid,materials:[{name:"A",percentage:90}]});
  assert.equal(s.validateDraft(d.id).valid,false);
  assert.throws(()=>s.publish(d.id));
});
test("agrega PI5 empresarial realizado e projetado",()=>{
  const s=new DppPi5Store();
  s.upsertBatch({id:"a",approvedUnits:100,status:"completed",impact:{co2eKg:100},transparency:{traceability:80}});
  s.upsertBatch({id:"b",plannedUnits:50,status:"planned",impact:{co2eKg:75},transparency:{traceability:40}});
  const x=s.companySnapshot();
  assert.equal(x.actual.units,100); assert.equal(x.forecast.units,50);
});
