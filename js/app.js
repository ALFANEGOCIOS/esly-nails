const cfg = window.ESLY_CONFIG;
const sb = supabase.createClient(
  cfg.SUPABASE_URL,
  cfg.SUPABASE_ANON_KEY
);

const $ = s => document.querySelector(s);

let services = [];
let selectedService = null;

const serviceSelect = $("#serviceSelect");
const dateInput = $("#dateInput");
const timeSelect = $("#timeSelect");

// Información general
$("#year").textContent = new Date().getFullYear();
$("#address").textContent = cfg.BUSINESS.address;
$("#whatsappLink").href = `https://wa.me/${cfg.BUSINESS.whatsapp}`;

// Menú móvil
$("#menuBtn").onclick = () => {
  $("#nav").classList.toggle("open");
};

document.querySelectorAll("#nav a").forEach(a => {
  a.onclick = () => $("#nav").classList.remove("open");
});

// Fecha actual
const iso = () => {
  const d = new Date(
    Date.now() - new Date().getTimezoneOffset() * 60000
  );

  return d.toISOString().slice(0, 10);
};

dateInput.min = iso();

// Escapar HTML
const esc = v =>
  String(v ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[c]));

// Formato de dinero
const money = v =>
  v == null
    ? "Consultar"
    : `${Number(v).toLocaleString("es-ES")} ${cfg.BUSINESS.currency}`;

// Formato de hora
const fmtTime = t => {
  if (!t) return "";

  let [h, m] = t.slice(0, 5).split(":").map(Number);

  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${
    h >= 12 ? "PM" : "AM"
  }`;
};


// ======================================================
// CARGAR SERVICIOS
// ======================================================

async function loadServices() {

  const { data, error } = await sb
    .from("services")
    .select("*")
    .eq("active", true)
    .order("sort_order");

  if (error) {

    console.error("ERROR CARGANDO SERVICIOS:", error);

    $("#servicesGrid").innerHTML = `
      <div class="loading">
        No se pudieron cargar los servicios.
      </div>
    `;

    return;
  }

  services = data || [];

  serviceSelect.innerHTML =
    `<option value="">Selecciona un servicio</option>` +
    services
      .map(
        s =>
          `<option value="${s.id}">
            ${esc(s.name)} · ${s.duration_minutes} min
          </option>`
      )
      .join("");


  $("#servicesGrid").innerHTML = services
    .map(
      (s, i) => `
        <article class="service-card">

          <small>0${i + 1}</small>

          <h3>${esc(s.name)}</h3>

          <p>
            ${esc(
              s.description ||
              "Servicio personalizado de Esly Nails."
            )}
          </p>

          <div>
            <b>${money(s.price)}</b>
            <span>${s.duration_minutes} min</span>
          </div>

          <a href="#reserva" data-service="${s.id}">
            Reservar ↗
          </a>

        </article>
      `
    )
    .join("");


  document.querySelectorAll("[data-service]").forEach(b => {

    b.onclick = () => {

      serviceSelect.value = b.dataset.service;

      serviceSelect.dispatchEvent(
        new Event("change")
      );

    };

  });

}


// ======================================================
// CAMBIO DE SERVICIO
// ======================================================

serviceSelect.onchange = () => {

  selectedService = services.find(
    s => String(s.id) === serviceSelect.value
  );

  $("#serviceSummary").textContent =
    selectedService
      ? `${selectedService.name} · ${selectedService.duration_minutes} min · ${money(selectedService.price)}`
      : "Selecciona un servicio para continuar.";

  loadAvailability();
};


// ======================================================
// CAMBIO DE FECHA
// ======================================================

dateInput.onchange = loadAvailability;


// ======================================================
// CONSULTAR DISPONIBILIDAD
// ======================================================

async function loadAvailability() {

  timeSelect.disabled = true;

  timeSelect.innerHTML =
    "<option>Consultando...</option>";

  if (!dateInput.value || !selectedService) {

    timeSelect.innerHTML =
      "<option>Selecciona servicio y fecha</option>";

    return;
  }


  console.log("Consultando disponibilidad:", {
    fecha: dateInput.value,
    servicio: selectedService.id
  });


  const { data, error } = await sb.rpc(
    "get_available_slots",
    {
      p_date: dateInput.value,
      p_service_id: selectedService.id
    }
  );


  if (error) {

    console.error(
      "ERROR CONSULTANDO DISPONIBILIDAD:",
      error
    );

    timeSelect.innerHTML =
      "<option>Error al consultar</option>";

    $("#availabilityBox").innerHTML = `
      <i class="bad"></i>
      <span>
        No se pudo consultar disponibilidad.
      </span>
    `;

    return;
  }


  console.log(
    "Horarios disponibles:",
    data
  );


  const slots = data || [];


  if (!slots.length) {

    timeSelect.innerHTML =
      "<option>Sin horarios disponibles</option>";

    $("#availabilityBox").innerHTML = `
      <i class="bad"></i>
      <span>
        No quedan horarios para esta fecha.
      </span>
    `;

    return;
  }


  timeSelect.innerHTML =
    `<option value="">
      Selecciona un horario
    </option>` +
    slots
      .map(
        s =>
          `<option value="${s.start_time}">
            ${s.display_time}
          </option>`
      )
      .join("");


  timeSelect.disabled = false;


  $("#availabilityBox").innerHTML = `
    <i></i>
    <span>
      ${slots.length} horario(s) disponible(s).
    </span>
  `;
}


// ======================================================
// CREAR RESERVA
// ======================================================

$("#bookingForm").onsubmit = async e => {

  e.preventDefault();


  // ----------------------------------------------
  // Validaciones
  // ----------------------------------------------

  const customerName =
    $("#customerName").value.trim();

  const phone =
    $("#phone").value.trim();

  const notes =
    $("#notes").value.trim();

  const selectedDate =
    dateInput.value;

  const selectedTime =
    timeSelect.value;


  if (!selectedService) {

    $("#formMessage").textContent =
      "Selecciona un servicio.";

    $("#formMessage").className =
      "message error";

    return;
  }


  if (!selectedDate) {

    $("#formMessage").textContent =
      "Selecciona una fecha.";

    $("#formMessage").className =
      "message error";

    return;
  }


  if (!selectedTime) {

    $("#formMessage").textContent =
      "Selecciona un horario.";

    $("#formMessage").className =
      "message error";

    return;
  }


  if (!customerName) {

    $("#formMessage").textContent =
      "Introduce tu nombre.";

    $("#formMessage").className =
      "message error";

    return;
  }


  if (!phone) {

    $("#formMessage").textContent =
      "Introduce tu número de teléfono.";

    $("#formMessage").className =
      "message error";

    return;
  }


  // ----------------------------------------------
  // Desactivar botón
  // ----------------------------------------------

  $("#submitBtn").disabled = true;

  $("#formMessage").textContent =
    "Registrando tu reserva...";

  $("#formMessage").className =
    "message";


  console.log(
    "ENVIANDO RESERVA:",
    {
      p_customer_name: customerName,
      p_phone: phone,
      p_service_id: selectedService.id,
      p_date: selectedDate,
      p_start_time: selectedTime,
      p_notes: notes
    }
  );


  // ----------------------------------------------
  // LLAMADA A SUPABASE
  // ----------------------------------------------

  const { data, error } = await sb.rpc(
    "create_appointment",
    {
      p_customer_name: customerName,
      p_phone: phone,
      p_service_id: selectedService.id,
      p_date: selectedDate,
      p_start_time: selectedTime,
      p_notes: notes
    }
  );


  // ----------------------------------------------
  // ERROR
  // ----------------------------------------------

  if (error) {

    console.error(
      "================================="
    );

    console.error(
      "ERROR CREANDO RESERVA"
    );

    console.error(
      "Mensaje:",
      error.message
    );

    console.error(
      "Código:",
      error.code
    );

    console.error(
      "Detalles:",
      error.details
    );

    console.error(
      "Hint:",
      error.hint
    );

    console.error(
      "Error completo:",
      error
    );

    console.error(
      "================================="
    );


    $("#submitBtn").disabled = false;


    // Si el horario fue ocupado
    if (
      error.message &&
      error.message.includes("SLOT_UNAVAILABLE")
    ) {

      $("#formMessage").textContent =
        "Ese horario acaba de ser ocupado. Elige otro.";

    } else {

      // MOSTRAR ERROR REAL
      $("#formMessage").textContent =
        `Error de Supabase: ${error.message || "Error desconocido"}`;

    }


    $("#formMessage").className =
      "message error";


    // Actualizar horarios
    loadAvailability();


    return;
  }


  // ----------------------------------------------
  // RESERVA CREADA
  // ----------------------------------------------

  console.log(
    "RESERVA CREADA CORRECTAMENTE:",
    data
  );


  $("#submitBtn").disabled = false;


  // Fecha para mostrar al cliente
  const date =
    new Date(`${selectedDate}T12:00:00`);


  const dt =
    date.toLocaleDateString(
      "es-ES",
      {
        weekday: "long",
        day: "numeric",
        month: "long"
      }
    );


  const time =
    fmtTime(selectedTime);


  // ----------------------------------------------
  // CONFIRMACIÓN
  // ----------------------------------------------

  $("#confirmation").innerHTML = `

    <div>
      <span>Servicio</span>
      <b>${esc(selectedService.name)}</b>
    </div>

    <div>
      <span>Fecha</span>
      <b>${dt}</b>
    </div>

    <div>
      <span>Hora</span>
      <b>${time}</b>
    </div>

    <div>
      <span>Cliente</span>
      <b>${esc(customerName)}</b>
    </div>

  `;


  // ----------------------------------------------
  // WHATSAPP
  // ----------------------------------------------

  $("#confirmWhatsapp").href =
    `https://wa.me/${cfg.BUSINESS.whatsapp}?text=${
      encodeURIComponent(
        `Hola, soy ${customerName}. Acabo de solicitar una cita en Esly Nails.\n` +
        `Servicio: ${selectedService.name}\n` +
        `Fecha: ${dt}\n` +
        `Hora: ${time}`
      )
    }`;


  // ----------------------------------------------
  // MOSTRAR MODAL
  // ----------------------------------------------

  $("#modal").classList.add("show");


  // ----------------------------------------------
  // LIMPIAR FORMULARIO
  // ----------------------------------------------

  e.target.reset();

  timeSelect.disabled = true;

  timeSelect.innerHTML =
    "<option>Selecciona un horario</option>";

  $("#serviceSummary").textContent =
    "Selecciona un servicio para continuar.";

  selectedService = null;

  $("#formMessage").textContent = "";

};


// ======================================================
// CERRAR MODAL
// ======================================================

function close() {

  $("#modal").classList.remove("show");

}

$("#closeModal").onclick = close;

document
  .querySelector(".backdrop")
  .onclick = close;


// ======================================================
// INICIAR
// ======================================================

loadServices();