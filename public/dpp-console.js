const api = async (path, options={}) => {
  const r = await fetch(path,{headers:{"content-type":"application/json"},...options});
  const data = await r.json();
  if(!r.ok) throw new Error(data.error||"Erro");
  return data;
};
const esc = (v="") => String(v).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

let current=null;
const host=document.createElement("section");
host.className="dpp-shell";
host.innerHTML=`
<button class="dpp-launch" aria-label="Abrir Passaportes">Passaportes DPP</button>
<div class="dpp-panel" hidden>
<header><div><strong>PHYLLOS DPP</strong><small>Crie, revise, simule e publique</small></div><button data-close>×</button></header>
<nav><button data-tab="create">Criar DPP</button><button data-tab="company">PI5 Empresa</button></nav>
<main data-view></main>
</div>`;
document.body.append(host);
const panel=host.querySelector(".dpp-panel"), view=host.querySelector("[data-view]");
host.querySelector(".dpp-launch").onclick=()=>{panel.hidden=false;renderCreate()};
host.querySelector("[data-close]").onclick=()=>panel.hidden=true;
host.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>b.dataset.tab==="company"?renderCompany():renderCreate());

function form(d={}){return `
<div class="dpp-grid">
<label>Produto<input name="name" value="${esc(d.product?.name)}"></label>
<label>SKU<input name="sku" value="${esc(d.product?.sku)}"></label>
<label>Lote<input name="code" value="${esc(d.batch?.code)}"></label>
<label>Unidades aprovadas<input name="approvedUnits" type="number" value="${esc(d.batch?.approvedUnits||100)}"></label>
<label>CO₂e total (kg)<input name="co2eKg" type="number" step=".01" value="${esc(d.impact?.co2eKg||0)}"></label>
<label>Água total (L)<input name="waterLiters" type="number" step=".01" value="${esc(d.impact?.waterLiters||0)}"></label>
<label>Energia (kWh)<input name="energyKwh" type="number" step=".01" value="${esc(d.impact?.energyKwh||0)}"></label>
<label>Resíduos (kg)<input name="wasteKg" type="number" step=".01" value="${esc(d.impact?.wasteKg||0)}"></label>
<label>Rastreabilidade<input name="traceability" type="number" min="0" max="100" value="${esc(d.transparency?.traceability||0)}"></label>
<label>GEE<input name="ghg" type="number" min="0" max="100" value="${esc(d.transparency?.ghg||0)}"></label>
<label>Descarbonização<input name="decarbonization" type="number" min="0" max="100" value="${esc(d.transparency?.decarbonization||0)}"></label>
<label>Energia renovável<input name="renewable" type="number" min="0" max="100" value="${esc(d.transparency?.renewable||0)}"></label>
<label>Transição justa<input name="justTransition" type="number" min="0" max="100" value="${esc(d.transparency?.justTransition||0)}"></label>
<label>Composição principal<input name="material" value="${esc(d.materials?.[0]?.name||"Algodão")}"></label>
</div>
<div class="dpp-actions"><button data-save>Salvar rascunho</button><button data-preview>Visualizar como público</button><button data-publish>Publicar</button></div>
<div data-result></div>`}

function payload(fd){
 const n=k=>Number(fd.get(k)||0);
 return {product:{name:fd.get("name"),sku:fd.get("sku")},batch:{code:fd.get("code"),approvedUnits:n("approvedUnits"),status:"completed"},
 materials:[{name:fd.get("material"),percentage:100}],evidence:[{id:"evidence:frontend",type:"user_input",status:"supported"}],
 impact:{co2eKg:n("co2eKg"),waterLiters:n("waterLiters"),energyKwh:n("energyKwh"),wasteKg:n("wasteKg")},
 transparency:{traceability:n("traceability"),ghg:n("ghg"),decarbonization:n("decarbonization"),renewable:n("renewable"),justTransition:n("justTransition"),coverage:70,confidence:65}};
}
function wire(){
 const formEl=view.querySelector("form"), out=view.querySelector("[data-result]");
 view.querySelector("[data-save]").onclick=async()=>{try{
  const p=payload(new FormData(formEl));
  current=current?await api(`/api/v1/dpp/drafts/${encodeURIComponent(current.id)}`,{method:"PATCH",body:JSON.stringify(p)}):await api("/api/v1/dpp/drafts",{method:"POST",body:JSON.stringify(p)});
  out.innerHTML=`<p class="ok">Rascunho salvo: ${esc(current.id)}</p>`;
 }catch(e){out.innerHTML=`<p class="err">${esc(e.message)}</p>`}};
 view.querySelector("[data-preview]").onclick=async()=>{view.querySelector("[data-save]").click();setTimeout(async()=>{if(!current)return;const p=await api(`/api/v1/dpp/drafts/${encodeURIComponent(current.id)}/preview`);renderPreview(p)},200)};
 view.querySelector("[data-publish]").onclick=async()=>{try{if(!current){out.innerHTML="<p class=err>Salve o rascunho primeiro.</p>";return}const p=await api(`/api/v1/dpp/drafts/${encodeURIComponent(current.id)}/publish`,{method:"POST"});out.innerHTML=`<p class=ok>Publicado: ${esc(p.identifier)} · assinatura gerada</p>`}catch(e){out.innerHTML=`<p class=err>${esc(e.message)}</p>`}};
}
function renderCreate(){view.innerHTML=`<h2>Criar Digital Product Passport</h2><p>Preencha os dados do lote. O sistema calcula o PI5 por peça e permite consultar antes de publicar.</p><form>${form(current||{})}</form>`;wire()}
function renderPreview(p){const x=p.pi5;view.innerHTML=`<div class=preview-banner>${esc(p.banner)}</div><button data-back>← Voltar</button><h2>${esc(p.draft.product.name)}</h2><p>SKU ${esc(p.draft.product.sku)} · lote ${esc(p.draft.batch.code)}</p><div class=cards><article><b>${x.perPiece.co2eKg}</b><span>kg CO₂e/peça</span></article><article><b>${x.transparencyScore}</b><span>Transparência</span></article><article><b>${x.coverage}%</b><span>Cobertura</span></article><article><b>${x.confidence}%</b><span>Confiança</span></article></div><h3>Comparação ITM Brasil 2025</h3>${Object.entries(x.dimensions).map(([k,v])=>`<div class=bar><span>${k}</span><i style="--v:${v}%"></i><b>${v} / ITM ${x.benchmark.dimensions[k]}</b></div>`).join("")}<h3>Prontidão ${p.validation.readiness}%</h3>${p.validation.items.map(i=>`<p class=${i.ok?"ok":"err"}>${i.ok?"✓":"●"} ${esc(i.message)}</p>`).join("")}`;view.querySelector("[data-back]").onclick=renderCreate}
async function renderCompany(){try{const c=await api("/api/v1/pi5/company");const block=(title,x)=>`<h3>${title}</h3><div class=cards><article><b>${x.units}</b><span>Peças</span></article><article><b>${x.totals.co2eKg.toFixed(1)}</b><span>kg CO₂e</span></article><article><b>${x.perPiece.co2eKg}</b><span>kg/peça</span></article><article><b>${x.transparencyScore}</b><span>Transparência</span></article></div>${Object.entries(x.dimensions).map(([k,v])=>`<div class=bar><span>${k}</span><i style="--v:${v}%"></i><b>${v} / ITM ${x.benchmark.dimensions[k]}</b></div>`).join("")}`;view.innerHTML=`<h2>PI5 empresarial</h2><p>Atualizado à medida que lotes são publicados ou adicionados.</p>${block("Realizado",c.actual)}${block("Projetado",c.forecast)}`}catch(e){view.innerHTML=`<p class=err>${esc(e.message)}</p>`}}
