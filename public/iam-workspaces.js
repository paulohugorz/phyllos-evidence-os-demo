const storageKey = "phyllos-iam-prototype-v1";
const initial = {
  users: [{ id: "user-demo-owner", displayName: "Responsável do piloto", email: "owner@exemplo.phyllos", status: "active", verifiedAt: new Date().toISOString() }],
  workspaces: [{ id: "workspace-demo", name: "Marca Horizonte", type: "team", createdAt: new Date().toISOString() }],
  memberships: [{ id: "membership-demo", userId: "user-demo-owner", workspaceId: "workspace-demo", role: "owner", createdAt: new Date().toISOString() }],
};
let iam = JSON.parse(localStorage.getItem(storageKey) || "null") || initial;
const $ = selector => document.querySelector(selector);
const all = selector => [...document.querySelectorAll(selector)];
const esc = value => String(value).replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char]);
const save = () => localStorage.setItem(storageKey, JSON.stringify(iam));
const id = prefix => `${prefix}-${crypto.randomUUID?.() || Date.now()}`;
const notify = message => { const toast=$("#toast"); toast.textContent=message; toast.classList.add("show"); setTimeout(()=>toast.classList.remove("show"),2600); };
const person = userId => iam.users.find(user => user.id === userId);
const workspace = workspaceId => iam.workspaces.find(item => item.id === workspaceId);

function renderSummary(){
  const active=iam.users.filter(user=>user.status==="active").length;
  const pending=iam.users.filter(user=>user.status==="pending").length;
  $("#iamSummary").innerHTML=[["Usuários verificados",active],["Aguardando validação",pending],["Workspaces",iam.workspaces.length],["Acessos ativos",iam.memberships.length]].map(([label,value])=>`<article><span>${label}</span><strong>${value}</strong></article>`).join("");
}
function renderPeople(){
  $("#iamPeopleList").innerHTML=iam.users.length?iam.users.map(user=>`<div class="iam-person"><div><strong>${esc(user.displayName)}</strong><small>${esc(user.email)}</small></div><span class="iam-status ${user.status}">${user.status==="active"?"E-mail verificado":"Validação pendente"}</span><small>${user.status==="active"?`Validado em ${new Date(user.verifiedAt).toLocaleDateString("pt-BR")}`:"Convite ainda não confirmado"}</small><div class="iam-action-group">${user.status==="pending"?`<button class="link iam-simulate" data-user="${user.id}">Simular validação</button>`:""}<button class="link iam-remove-user" data-user="${user.id}">Remover</button></div></div>`).join(""):`<div class="iam-empty">Nenhum e-mail cadastrado.</div>`;
  all(".iam-simulate").forEach(button=>button.addEventListener("click",()=>{const user=person(button.dataset.user);user.status="active";user.verifiedAt=new Date().toISOString();save();renderAll();notify("Validação simulada apenas neste protótipo local");}));
  all(".iam-remove-user").forEach(button=>button.addEventListener("click",()=>{if(iam.memberships.some(item=>item.userId===button.dataset.user)){notify("Remova os acessos antes de excluir a pessoa");return;}iam.users=iam.users.filter(user=>user.id!==button.dataset.user);save();renderAll();}));
}
function renderWorkspaces(){
  $("#iamWorkspaceList").innerHTML=iam.workspaces.length?iam.workspaces.map(item=>{const members=iam.memberships.filter(access=>access.workspaceId===item.id).length;return`<article class="iam-workspace-card"><span class="iam-status active">${item.type==="team"?"Equipe":"Individual"}</span><h4>${esc(item.name)}</h4><p>ID interno ${esc(item.id)}</p><footer><span>${members} membro(s)</span><button class="link iam-open-access" data-workspace="${item.id}">Gerenciar acesso →</button></footer></article>`;}).join(""):`<div class="iam-empty">Crie o primeiro workspace.</div>`;
  all(".iam-open-access").forEach(button=>button.addEventListener("click",()=>{openTab("access");$("#iamAccessForm").elements.workspaceId.value=button.dataset.workspace;}));
}
function renderAccess(){
  const verified=iam.users.filter(user=>user.status==="active");
  const userSelect=$("#iamAccessForm").elements.userId;
  const workspaceSelect=$("#iamAccessForm").elements.workspaceId;
  userSelect.innerHTML=`<option value="">Selecione</option>`+verified.map(user=>`<option value="${user.id}">${esc(user.displayName)} · ${esc(user.email)}</option>`).join("");
  workspaceSelect.innerHTML=`<option value="">Selecione</option>`+iam.workspaces.map(item=>`<option value="${item.id}">${esc(item.name)}</option>`).join("");
  $("#iamAccessList").innerHTML=iam.memberships.length?iam.memberships.map(access=>`<div class="iam-membership"><div><strong>${esc(person(access.userId)?.displayName||"Usuário removido")}</strong><small>${esc(person(access.userId)?.email||"")}</small></div><div><strong>${esc(workspace(access.workspaceId)?.name||"Workspace removido")}</strong><small>Membership explícita</small></div><span class="iam-status active">${esc(access.role)}</span><button class="link iam-remove-access" data-membership="${access.id}">Remover acesso</button></div>`).join(""):`<div class="iam-empty">Nenhuma pessoa conectada a um workspace.</div>`;
  all(".iam-remove-access").forEach(button=>button.addEventListener("click",()=>{const access=iam.memberships.find(item=>item.id===button.dataset.membership);const owners=iam.memberships.filter(item=>item.workspaceId===access.workspaceId&&item.role==="owner");if(access.role==="owner"&&owners.length===1){notify("O último owner não pode ser removido");return;}iam.memberships=iam.memberships.filter(item=>item.id!==access.id);save();renderAll();}));
}
function renderAll(){renderSummary();renderPeople();renderWorkspaces();renderAccess();}
function openTab(tab){all("[data-iam-tab]").forEach(button=>button.classList.toggle("active",button.dataset.iamTab===tab));for(const name of ["people","workspaces","access"]) $(`#iam${name[0].toUpperCase()+name.slice(1)}Panel`).classList.toggle("hidden",name!==tab);}

all("[data-iam-tab]").forEach(button=>button.addEventListener("click",()=>openTab(button.dataset.iamTab)));
$("#openIamUser").addEventListener("click",()=>$("#iamUserForm").classList.remove("hidden"));
$("#openIamWorkspace").addEventListener("click",()=>$("#iamWorkspaceForm").classList.remove("hidden"));
all("[data-iam-cancel]").forEach(button=>button.addEventListener("click",()=>button.closest("form").classList.add("hidden")));
$("#iamUserForm").addEventListener("submit",event=>{event.preventDefault();const data=Object.fromEntries(new FormData(event.currentTarget));const email=data.email.trim().toLowerCase();if(iam.users.some(user=>user.email===email)){notify("Este e-mail já está cadastrado");return;}iam.users.push({id:id("user"),displayName:data.displayName.trim(),email,status:"pending",createdAt:new Date().toISOString()});save();event.currentTarget.reset();event.currentTarget.classList.add("hidden");renderAll();notify("E-mail registrado como pendente; envio real depende do Neon Auth");});
$("#iamWorkspaceForm").addEventListener("submit",event=>{event.preventDefault();const data=Object.fromEntries(new FormData(event.currentTarget));iam.workspaces.push({id:id("workspace"),name:data.name.trim(),type:data.type,createdAt:new Date().toISOString()});save();event.currentTarget.reset();event.currentTarget.classList.add("hidden");renderAll();notify("Workspace criado no protótipo local");});
$("#iamAccessForm").addEventListener("submit",event=>{event.preventDefault();const data=Object.fromEntries(new FormData(event.currentTarget));const user=person(data.userId);if(!user||user.status!=="active"){notify("Somente usuários verificados podem receber acesso");return;}const existing=iam.memberships.find(item=>item.userId===data.userId&&item.workspaceId===data.workspaceId);if(existing){existing.role=data.role;notify("Papel atualizado");}else{iam.memberships.push({id:id("membership"),...data,createdAt:new Date().toISOString()});notify("Pessoa conectada ao workspace");}save();renderAll();});
renderAll();
