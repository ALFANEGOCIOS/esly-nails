const cfg=window.ESLY_CONFIG,sb=supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY),$=s=>document.querySelector(s);
let services=[],selectedService=null;
const serviceSelect=$("#serviceSelect"),dateInput=$("#dateInput"),timeSelect=$("#timeSelect");
$("#year").textContent=new Date().getFullYear();$("#address").textContent=cfg.BUSINESS.address;$("#whatsappLink").href=`https://wa.me/${cfg.BUSINESS.whatsapp}`;
$("#menuBtn").onclick=()=>$("#nav").classList.toggle("open");document.querySelectorAll("#nav a").forEach(a=>a.onclick=()=>$("#nav").classList.remove("open"));
const iso=()=>{const d=new Date(Date.now()-new Date().getTimezoneOffset()*60000);return d.toISOString().slice(0,10)};dateInput.min=iso();
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const money=v=>v==null?"Consultar":`${Number(v).toLocaleString("es-ES")} ${cfg.BUSINESS.currency}`;
const fmtTime=t=>{let [h,m]=t.slice(0,5).split(":").map(Number);return `${h%12||12}:${String(m).padStart(2,"0")} ${h>=12?"PM":"AM"}`};
async function loadServices(){const {data,error}=await sb.from("services").select("*").eq("active",true).order("sort_order");if(error){$("#servicesGrid").innerHTML="<div class='loading'>Revisa la configuración de Supabase.</div>";return}services=data||[];serviceSelect.innerHTML="<option value=''>Selecciona un servicio</option>"+services.map(s=>`<option value="${s.id}">${esc(s.name)} · ${s.duration_minutes} min</option>`).join("");
$("#servicesGrid").innerHTML=services.map((s,i)=>`<article class="service-card"><small>0${i+1}</small><h3>${esc(s.name)}</h3><p>${esc(s.description||"Servicio personalizado de Esly Nails.")}</p><div><b>${money(s.price)}</b><span>${s.duration_minutes} min</span></div><a href="#reserva" data-service="${s.id}">Reservar ↗</a></article>`).join("");
document.querySelectorAll("[data-service]").forEach(b=>b.onclick=()=>{serviceSelect.value=b.dataset.service;serviceSelect.dispatchEvent(new Event("change"))})}
serviceSelect.onchange=()=>{selectedService=services.find(s=>String(s.id)===serviceSelect.value);$("#serviceSummary").textContent=selectedService?`${selectedService.name} · ${selectedService.duration_minutes} min · ${money(selectedService.price)}`:"Selecciona un servicio para continuar.";loadAvailability()};
dateInput.onchange=loadAvailability;
async function loadAvailability(){timeSelect.disabled=true;timeSelect.innerHTML="<option>Consultando...</option>";if(!dateInput.value||!selectedService)return;
const {data,error}=await sb.rpc("get_available_slots",{p_date:dateInput.value,p_service_id:selectedService.id});if(error){timeSelect.innerHTML="<option>Error</option>";$("#availabilityBox").innerHTML="<i class='bad'></i><span>No se pudo consultar disponibilidad.</span>";return}
const slots=data||[];if(!slots.length){timeSelect.innerHTML="<option>Sin horarios disponibles</option>";$("#availabilityBox").innerHTML="<i class='bad'></i><span>No quedan horarios para esta fecha.</span>";return}
timeSelect.innerHTML="<option value=''>Selecciona un horario</option>"+slots.map(s=>`<option value="${s.start_time}">${s.display_time}</option>`).join("");timeSelect.disabled=false;$("#availabilityBox").innerHTML=`<i></i><span>${slots.length} horario(s) disponible(s).</span>`}
$("#bookingForm").onsubmit=async e=>{e.preventDefault();$("#submitBtn").disabled=true;$("#formMessage").textContent="Registrando tu reserva...";
const {data,error}=await sb.rpc("create_appointment",{p_customer_name:$("#customerName").value.trim(),p_phone:$("#phone").value.trim(),p_service_id:selectedService?.id,p_date:dateInput.value,p_start_time:timeSelect.value,p_notes:$("#notes").value.trim()});$("#submitBtn").disabled=false;
if(error){$("#formMessage").textContent=error.message.includes("SLOT_UNAVAILABLE")?"Ese horario acaba de ser ocupado. Elige otro.":"No pudimos completar la reserva.";$("#formMessage").className="message error";loadAvailability();return}
const date=new Date(`${dateInput.value}T12:00:00`),dt=date.toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"}),name=$("#customerName").value.trim(),time=fmtTime(timeSelect.value);
$("#confirmation").innerHTML=`<div><span>Servicio</span><b>${esc(selectedService.name)}</b></div><div><span>Fecha</span><b>${dt}</b></div><div><span>Hora</span><b>${time}</b></div><div><span>Cliente</span><b>${esc(name)}</b></div>`;
$("#confirmWhatsapp").href=`https://wa.me/${cfg.BUSINESS.whatsapp}?text=${encodeURIComponent(`Hola, soy ${name}. Acabo de solicitar una cita en Esly Nails.\nServicio: ${selectedService.name}\nFecha: ${dt}\nHora: ${time}`)}`;
$("#modal").classList.add("show");e.target.reset();timeSelect.disabled=true;$("#serviceSummary").textContent="Selecciona un servicio para continuar.";selectedService=null};
function close(){ $("#modal").classList.remove("show") }$("#closeModal").onclick=close;document.querySelector(".backdrop").onclick=close;loadServices();