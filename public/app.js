let state;
const $ = (selector) => document.querySelector(selector);
const all = (selector) => [...document.querySelectorAll(selector)];
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char]);

function toast(message) { const el = $("#toast"); el.textContent = message; el.classList.add("show"); setTimeout(() => el.classList.remove("show"), 2400); }
function productRow(p) { return `<div class="row"><div><strong>${escapeHtml(p.name)}</strong><small>${escapeHtml(p.externalCode)} · ${escapeHtml(p.material)}</small></div><div><strong>${p.completeness}%</strong><div class="bar"><i style="width:${p.completeness}%"></i></div></div></div>`; }
function findingRow(f, actionable=false) { return `<div class="${actionable ? "finding-card" : "row"}">${actionable ? `<span class="severity">${f.severity}</span>` : ""}<div><strong>${escapeHtml(f.semanticKey.replaceAll("_", " "))}</strong><small>${escapeHtml(f.reason)} · ${escapeHtml(state.products.find(p=>p.id===f.productId)?.name || "Produto")}</small></div>${actionable ? `<button class="primary create-task" data-id="${f.id}">Criar tarefa</button>` : `<span class="tag danger">Aberta</span>`}</div>`; }

function render() {
  $("#heroScore").textContent = `${state.metrics.completeness}%`;
  const metrics = [["Completude média",`${state.metrics.completeness}%`],["Lacunas abertas",state.metrics.openFindings],["Evidências válidas",state.metrics.validEvidence],["Fornecedores ativos",state.metrics.suppliers]];
  $("#metrics").innerHTML = metrics.map(([label,value])=>`<div class="metric"><span>${label}</span><strong>${value}</strong></div>`).join("");
  $("#productPreview").innerHTML = state.products.map(productRow).join("");
  $("#findingPreview").innerHTML = state.findings.slice(0,3).map(f=>findingRow(f)).join("");
  $("#productTable").innerHTML = `<div class="table-head"><span>PRODUTO</span><span>MATERIAL</span><span>COMPLETUDE</span><span>ESTADO</span></div>` + state.products.map(p=>`<div class="product-line"><div><strong>${escapeHtml(p.name)}</strong><small>${escapeHtml(p.externalCode)}</small></div><span>${escapeHtml(p.material)}</span><strong>${p.completeness}%</strong><span class="tag">Em análise</span></div>`).join("");
  $("#findingList").innerHTML = state.findings.map(f=>findingRow(f,true)).join("");
  all(".create-task").forEach(btn=>btn.addEventListener("click",()=>createTask(btn)));
}

async function load() {
  $("#loading").classList.remove("hidden"); all(".view").forEach(x=>x.classList.add("hidden"));
  const response = await fetch("/api/v1/dashboard"); state = await response.json(); render();
  $("#loading").classList.add("hidden"); show("overview");
}
function show(view) { all(".view").forEach(x=>x.classList.toggle("hidden",x.id!==view)); all(".nav").forEach(x=>x.classList.toggle("active",x.dataset.view===view)); $("#pageTitle").textContent = ({overview:"Visão geral",products:"Produtos",findings:"Lacunas e pendências",dossier:"Dossiê"})[view]; }
async function createTask(button) { button.disabled=true; button.textContent="Criando…"; const response=await fetch("/api/v1/tasks",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({findingId:button.dataset.id,dueAt:"2099-01-01",expectedEvidence:"Documento ou declaração atualizada"})}); if(response.ok){button.textContent="Tarefa criada ✓";toast("Responsabilidade e prazo registrados");}else{button.disabled=false;button.textContent="Tentar novamente";} }

all(".nav").forEach(btn=>btn.addEventListener("click",()=>show(btn.dataset.view)));
all("[data-go]").forEach(btn=>btn.addEventListener("click",()=>show(btn.dataset.go)));
$("#refresh").addEventListener("click",load);
$("#freezeDossier").addEventListener("click",async()=>{const btn=$("#freezeDossier");btn.disabled=true;btn.textContent="Congelando snapshot…";const response=await fetch("/api/v1/dossiers",{method:"POST"});const result=await response.json();const box=$("#dossierResult");box.style.display="block";box.innerHTML=`<strong>Dossiê gerado</strong><br>${result.productCount} produtos · ${new Date(result.frozenAt).toLocaleString("pt-BR")}<br><br><strong>SHA-256</strong><br>${result.sha256}<br><br><small>${escapeHtml(result.limitation)}</small>`;btn.textContent="Dossiê congelado ✓";toast("Snapshot verificável criado");});
load().catch(()=>{$("#loading").textContent="Não foi possível carregar o ambiente."});
