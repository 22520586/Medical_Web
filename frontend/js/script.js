// =======================
// KẾT NỐI DB THẬT (KHÔNG MOCK)
// =======================
const API_BASE = 'http://localhost:3000/api';

// Lấy danh sách bệnh nhân
async function getPatients(q = '') {
  try {
    const res = await fetch(`${API_BASE}/patients/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) throw new Error("Lỗi server");
    return await res.json();
  } catch (err) {
    console.error('Lỗi lấy bệnh nhân:', err);
    return [];
  }
}

async function getMedicines(q = '') {
  try {
    const res = await fetch(`${API_BASE}/thuoc/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) throw new Error("Lỗi server");
    return await res.json();
  } catch (err) {
    console.error('Lỗi lấy thuốc:', err);
    return [];
  }
}

async function getTechniques(q = '') {
  console.log('[DEBUG] Gọi API kỹ thuật với q =', q); // DEBUG
  try {
    const res = await fetch(`${API_BASE}/kythuat/search?q=${encodeURIComponent(q)}`);
    console.log('[DEBUG] Status:', res.status); // DEBUG
    if (!res.ok) {
      const text = await res.text();
      console.error('Lỗi API kỹ thuật:', text);
      throw new Error("Lỗi server");
    }
    const data = await res.json();
    console.log('[DEBUG] Dữ liệu kỹ thuật:', data); // DEBUG
    return data;
  } catch (err) {
    console.error('Lỗi lấy kỹ thuật:', err);
    return [];
  }
}

// =======================
// STATE
// =======================
let visits = [];
let selectedMedicines = [];
let selectedTechniques = [];
let editingPatientId = null;
let selectedPatientForDiagnosis = null;
let selectedPatientForRx = null;
let selectedVisitForRx = null;
let selectedPatientForTech = null;
let selectedVisitForTech = null;

// =======================
// UTIL
// =======================
function calculateAge(dob) {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}

function showToast(text = "Đã lưu") {
  const toastEl = document.getElementById("appToast");
  document.getElementById("appToastBody").textContent = text;
  const bsToast = new bootstrap.Toast(toastEl);
  bsToast.show();
}

// =======================
// AUTOCOMPLETE REUSABLE + DEBOUNCE
// =======================
function setupAutocomplete(inputId, suggestionId, dataFetcher, opts = {}) {
  const input = document.getElementById(inputId);
  const box = document.getElementById(suggestionId);
  let timeout;

  const showSuggestions = async (q) => {
    box.innerHTML = "";
    if (q.length < 2) return (box.style.display = "none");

    const data = await dataFetcher(q);
    const matches = data.filter(item => 
      item[opts.key].toLowerCase().includes(q.toLowerCase())
    );

    if (matches.length === 0) return (box.style.display = "none");

    matches.forEach(m => {
      const btn = document.createElement("div");
      btn.className = "list-group-item list-group-item-action";
      btn.textContent = opts.format ? opts.format(m) : m[opts.key];
      btn.onclick = () => {
        if (opts.onSelect) opts.onSelect(m);
        input.value = ""; // XÓA INPUT
        box.style.display = "none"; // ẨN GỢI Ý
      };
      box.appendChild(btn);
    });
    box.style.display = "block";
  };

  input.addEventListener("input", () => {
    clearTimeout(timeout);
    const q = input.value.trim();
    timeout = setTimeout(() => showSuggestions(q), 300);
  });

  // Ẩn khi click ngoài
  document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && !box.contains(e.target)) {
      box.style.display = "none";
    }
  });
}

// =======================
// RENDER PATIENTS
// =======================
const patientTableBody = document.getElementById("patientTableBody");

async function renderPatients() {
  const list = await getPatients();
  patientTableBody.innerHTML = "";
  list.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.id}</td>
      <td>${p.name}</td>
      <td>${p.dob ? new Date(p.dob).toLocaleDateString('vi-VN') + ` (${calculateAge(p.dob)} tuổi)` : ""}</td>
      <td>${p.gender || ""}</td>
      <td>${p.cccd || ""}</td>
      <td>${p.bhyt || ""}</td>
      <td>${p.address || ""}</td>
      <td>${p.phone || ""}</td>
      <td>
        <button class="btn btn-sm btn-primary me-1" onclick="editPatient(${p.id})">Sửa</button>
        <button class="btn btn-sm btn-secondary me-1" onclick="viewHistory(${p.id})">Lịch sử</button>
        <button class="btn btn-sm btn-danger" onclick="deletePatient(${p.id})">Xóa</button>
      </td>`;
    patientTableBody.appendChild(tr);
  });
}

// =======================
// TÌM KIẾM BỆNH NHÂN
// =======================
document.getElementById("searchPatientMain").addEventListener("input", async () => {
  const q = document.getElementById("searchPatientMain").value.trim();
  const list = q ? await getPatients(q) : await getPatients();
  patientTableBody.innerHTML = "";
  list.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.id}</td>
      <td>${p.name}</td>
      <td>${p.dob ? new Date(p.dob).toLocaleDateString('vi-VN') + ` (${calculateAge(p.dob)} tuổi)` : ""}</td>
      <td>${p.gender || ""}</td>
      <td>${p.cccd || ""}</td>
      <td>${p.bhyt || ""}</td>
      <td>${p.address || ""}</td>
      <td>${p.phone || ""}</td>
      <td>
        <button class="btn btn-sm btn-primary me-1" onclick="editPatient(${p.id})">Sửa</button>
        <button class="btn btn-sm btn-secondary me-1" onclick="viewHistory(${p.id})">Lịch sử</button>
        <button class="btn btn-sm btn-danger" onclick="deletePatient(${p.id})">Xóa</button>
      </td>`;
    patientTableBody.appendChild(tr);
  });
});

// =======================
// CRUD BỆNH NHÂN
// =======================
window.editPatient = async (id) => {
  try {
    const patients = await getPatients();
    const p = patients.find(x => x.id === id);
    if (!p) return alert("Không tìm thấy bệnh nhân!");

    editingPatientId = id;
    document.getElementById("patientModalTitle").textContent = "Sửa bệnh nhân";
    document.getElementById("modalFullName").value = p.name;
    document.getElementById("modalDob").value = p.dob;
    document.getElementById("modalGender").value = p.gender;
    document.getElementById("modalCccd").value = p.cccd || "";
    document.getElementById("modalBhyt").value = p.bhyt || "";
    document.getElementById("modalAddress").value = p.address || "";
    document.getElementById("modalPhone").value = p.phone || "";

    new bootstrap.Modal(document.getElementById("patientModal")).show();
  } catch (err) {
    alert("Lỗi: " + err.message);
  }
};

window.deletePatient = async (id) => {
  if (!confirm("Xóa bệnh nhân này? Dữ liệu sẽ mất vĩnh viễn!")) return;
  try {
    const res = await fetch(`${API_BASE}/patient/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await renderPatients();
      showToast("Xóa thành công!");
    } else {
      const err = await res.json();
      alert("Lỗi: " + (err.error || "Không thể xóa"));
    }
  } catch (err) {
    alert("Lỗi kết nối: " + err.message);
  }
};

document.getElementById("patientFormModal").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const data = {
    name: form.modalFullName.value.trim(),
    dob: form.modalDob.value,
    gender: form.modalGender.value,
    address: form.modalAddress.value.trim(),
    phone: form.modalPhone.value.trim(),
    cccd: form.modalCccd.value.trim(),
    bhyt: form.modalBhyt.value.trim()
  };

  if (!data.name || !data.dob) return alert("Vui lòng nhập họ tên và ngày sinh!");

  try {
    let res;
    if (editingPatientId) {
      res = await fetch(`${API_BASE}/patient/${editingPatientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } else {
      res = await fetch(`${API_BASE}/patient`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    }

    if (res.ok) {
      bootstrap.Modal.getInstance(document.getElementById("patientModal")).hide();
      form.reset();
      editingPatientId = null;
      document.getElementById("patientModalTitle").textContent = "Thêm bệnh nhân";
      await renderPatients();
      showToast(editingPatientId ? "Cập nhật thành công!" : "Thêm bệnh nhân thành công!");
    } else {
      const err = await res.json();
      alert("Lỗi: " + (err.error || "Không thể lưu"));
    }
  } catch (err) {
    alert("Lỗi kết nối: " + err.message);
  }
});

document.getElementById("patientModal").addEventListener("hidden.bs.modal", () => {
  editingPatientId = null;
  document.getElementById("patientModalTitle").textContent = "Thêm bệnh nhân";
  document.getElementById("patientFormModal").reset();
});

// =======================
// AUTOCOMPLETE: BỆNH NHÂN TRONG TAB CHẨN ĐOÁN
// =======================
setupAutocomplete("searchPatientDiagnosis", "diagnosisPatientSuggestions", getPatients, {
  key: "name",
  format: p => `${p.name} - ${p.cccd || p.phone || p.bhyt || 'ID:' + p.id}`,
  onSelect: (p) => {
    selectedPatientForDiagnosis = p;
    document.getElementById("diagnosisSelectedInfo").style.display = "block";
    document.getElementById("diagnosisPatientName").textContent = p.name;
  }
});

// =======================
// AUTOCOMPLETE: BỆNH NHÂN TRONG TAB KÊ ĐƠN THUỐC
// =======================
setupAutocomplete("searchPatientForRx", "rxPatientSuggestions", getPatients, {
  key: "name",
  format: p => `${p.name} - ${p.cccd || p.phone || p.bhyt || 'ID:' + p.id}`,
  onSelect: (p) => {
    selectedPatientForRx = p;
    document.getElementById("rxSelectedPatient").style.display = "block";
    document.getElementById("rxPatientName").textContent = p.name;
    loadVisitsForPatient(p.id, "rxVisitSelect");
  }
});

// =======================
// AUTOCOMPLETE: BỆNH NHÂN TRONG TAB CHỈ ĐỊNH KỸ THUẬT
// =======================
setupAutocomplete("searchPatientTechnique", "techPatientSuggestions", getPatients, {
  key: "name",
  format: p => `${p.name} - ${p.cccd || p.phone || p.bhyt || 'ID:' + p.id}`,
  onSelect: (p) => {
    selectedPatientForTech = p;
    document.getElementById("techSelectedPatient").style.display = "block";
    document.getElementById("techPatientName").textContent = p.name;
    loadVisitsForPatient(p.id, "techVisitSelect");
  }
});

// =======================
// AUTOCOMPLETE: THUỐC (CHỈ 1 LẦN)
// =======================
setupAutocomplete("searchMedicine", "medicineSuggestions", getMedicines, {
  key: "name",
  format: m => `${m.name} - ${(m.price || 0).toLocaleString('vi-VN')}đ`,
  onSelect: (m) => {
    if (selectedMedicines.some(x => x.id === m.id)) {
      showToast("Thuốc đã có!");
      return;
    }
    selectedMedicines.push({ ...m, quantity: 1, total: m.price || 0 });
    renderSelectedMedicines();
  }
});

// =======================
// AUTOCOMPLETE: KỸ THUẬT (CHỈ 1 LẦN - ĐÃ SỬA)
// =======================
// setupAutocomplete("searchTechnique", "techniqueSuggestions", getTechniques, {
//   key: "name",
//   format: t => `${t.name} - ${(t.price || 0).toLocaleString('vi-VN')}đ`,
//   onSelect: (t) => {
//     if (selectedTechniques.some(x => x.id === t.id)) {
//       showToast("Kỹ thuật đã được chọn!");
//       return;
//     }
//     selectedTechniques.push({ ...t });
//     renderSelectedTechs();
//   }
// });
setupAutocomplete("searchTechnique", "techniqueSuggestions", getTechniques, {
  key: "name",
  format: t => t.name, // CHỈ HIỆN TÊN
  onSelect: (t) => {
    if (selectedTechniques.some(x => x.id === t.id)) {
      showToast("Kỹ thuật đã được chọn!");
      return;
    }
    selectedTechniques.push({ ...t, price: 0 }); // Giá = 0
    renderSelectedTechs();
  }
});

// =======================
// RENDER THUỐC & KỸ THUẬT
// =======================
function renderSelectedMedicines() {
  const div = document.getElementById("selectedMedicines");
  div.innerHTML = "";
  let total = 0;
  selectedMedicines.forEach(m => {
    const row = document.createElement("div");
    row.className = "d-flex align-items-center gap-2 p-2 border rounded bg-light";
    row.innerHTML = `<div class="flex-grow-1"><strong>${m.name}</strong><br><small>${(m.price || 0).toLocaleString('vi-VN')} đ</small></div>`;
    const qty = document.createElement("input");
    qty.type = "number"; qty.min = 1; qty.value = m.quantity; qty.className = "form-control w-25";
    qty.oninput = () => { m.quantity = Math.max(1, parseInt(qty.value) || 1); m.total = m.quantity * (m.price || 0); renderSelectedMedicines(); };
    const totalEl = document.createElement("div");
    totalEl.className = "fw-bold text-success";
    totalEl.textContent = (m.quantity * (m.price || 0)).toLocaleString('vi-VN') + " đ";
    const del = document.createElement("button");
    del.className = "btn btn-sm btn-danger"; del.textContent = "X";
    del.onclick = () => { selectedMedicines = selectedMedicines.filter(x => x.id !== m.id); renderSelectedMedicines(); };
    row.append(qty, totalEl, del);
    div.appendChild(row);
    total += m.quantity * (m.price || 0);
  });
  const totalRow = document.createElement("div");
  totalRow.className = "text-end mt-2 fw-bold";
  totalRow.textContent = `Tổng: ${total.toLocaleString('vi-VN')} đ`;
  div.appendChild(totalRow);
}

function renderSelectedTechs() {
  const div = document.getElementById("selectedTechniques");
  div.innerHTML = "";
  let total = 0;
  selectedTechniques.forEach(t => {
    const row = document.createElement("div");
    row.className = "d-flex justify-content-between align-items-center p-2 border rounded bg-light";
    row.innerHTML = `<div><strong>${t.name}</strong><br><small>${(t.price || 0).toLocaleString('vi-VN')} đ</small></div>`;
    const del = document.createElement("button");
    del.className = "btn btn-sm btn-danger"; del.textContent = "X";
    del.onclick = () => { selectedTechniques = selectedTechniques.filter(x => x.id !== t.id); renderSelectedTechs(); };
    row.appendChild(del);
    div.appendChild(row);
    total += (t.price || 0);
  });
  const totalRow = document.createElement("div");
  totalRow.className = "text-end mt-2 fw-bold";
  totalRow.textContent = `Tổng: ${total.toLocaleString('vi-VN')} đ`;
  div.appendChild(totalRow);
}

// =======================
// HÀM LOAD LẦN KHÁM
// =======================
async function loadVisitsForPatient(patientId, selectId) {
  const select = document.getElementById(selectId);
  select.innerHTML = '<option value="">— Chọn hoặc để trống —</option>';
  
  try {
    const res = await fetch(`${API_BASE}/patient/${patientId}/visits`);
    if (!res.ok) throw new Error("Lỗi tải lần khám");
    const visits = await res.json();
    visits.forEach(v => {
      const opt = new Option(
        `${new Date(v.date).toLocaleDateString('vi-VN')} - ${v.mainDiagnosis || 'Chưa chẩn đoán'}`,
        v.id
      );
      select.add(opt);
    });
  } catch (err) {
    console.error("Lỗi load visit:", err);
    showToast("Không tải được lần khám!");
  }
}

// Bắt sự kiện chọn visit
document.getElementById("rxVisitSelect").addEventListener("change", (e) => {
  selectedVisitForRx = e.target.value || null;
});

document.getElementById("techVisitSelect").addEventListener("change", (e) => {
  selectedVisitForTech = e.target.value || null;
});

// =======================
// LƯU PHIẾU KHÁM
// =======================
document.getElementById("diagnosisForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!selectedPatientForDiagnosis) return showToast("Vui lòng chọn bệnh nhân!");

  const data = {
    patientId: selectedPatientForDiagnosis.id,
    doctor: document.getElementById("doctorName").value.trim(),
    mainDiagnosis: document.getElementById("mainDiagnosis").value.trim(),
    subDiagnosis: document.getElementById("subDiagnosis").value.trim(),
    symptoms: document.getElementById("symptoms").value.trim(),
    notes: document.getElementById("doctorNotes").value.trim()
  };

  if (!data.mainDiagnosis) return showToast("Vui lòng nhập chẩn đoán chính!");

  try {
    const res = await fetch(`${API_BASE}/diagnosis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      const result = await res.json();
      showToast(`Lưu phiếu khám thành công! ID: ${result.visitId}`);
      e.target.reset();
      selectedPatientForDiagnosis = null;
      document.getElementById("diagnosisSelectedInfo").style.display = "none";
      await renderPatients();
    } else {
      const err = await res.json();
      showToast("Lỗi: " + (err.error || "Không thể lưu"));
    }
  } catch (err) {
    showToast("Lỗi kết nối!");
  }
});

// =======================
// LƯU ĐƠN THUỐC
// =======================
document.getElementById("prescriptionForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!selectedPatientForRx) return showToast("Chọn bệnh nhân!");
  if (selectedMedicines.length === 0) return showToast("Chưa chọn thuốc!");

  const data = {
    visitId: selectedVisitForRx,
    medicines: selectedMedicines.map(m => ({
      id: m.id,
      quantity: m.quantity,
      price: m.price || 0
    }))
  };

  try {
    const res = await fetch(`${API_BASE}/prescription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      const result = await res.json();
      showToast(`Lưu đơn thuốc thành công! Tổng: ${result.total.toLocaleString()}đ`);
      selectedMedicines = [];
      renderSelectedMedicines();
      selectedPatientForRx = null;
      selectedVisitForRx = null;
      document.getElementById("rxSelectedPatient").style.display = "none";
      document.getElementById("rxVisitSelect").innerHTML = '<option value="">— Chọn hoặc để trống —</option>';
      e.target.reset();
    } else {
      const err = await res.json();
      showToast("Lỗi: " + (err.error || "Không lưu được"));
    }
  } catch (err) {
    showToast("Lỗi kết nối!");
  }
});

// =======================
// LƯU CHỈ ĐỊNH KỸ THUẬT
// =======================
document.getElementById("techniqueForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!selectedPatientForTech) return showToast("Chọn bệnh nhân!");
  if (selectedTechniques.length === 0) return showToast("Chưa chọn kỹ thuật!");

  const data = {
    visitId: selectedVisitForTech,
    techniques: selectedTechniques.map(t => ({ id: t.id }))
  };

  try {
    const res = await fetch(`${API_BASE}/technique`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      showToast("Lưu chỉ định kỹ thuật thành công!");
      selectedTechniques = [];
      renderSelectedTechs();
      selectedPatientForTech = null;
      selectedVisitForTech = null;
      document.getElementById("techSelectedPatient").style.display = "none";
      document.getElementById("techVisitSelect").innerHTML = '<option value="">— Chọn hoặc để trống —</option>';
      e.target.reset();
    } else {
      const err = await res.json();
      showToast("Lỗi: " + (err.error || "Không lưu được"));
    }
  } catch (err) {
    showToast("Lỗi kết nối!");
  }
});

// =======================
// XEM TRƯỚC ĐƠN THUỐC
// =======================
document.getElementById("previewPrescriptionBtn").addEventListener("click", () => {
  if (selectedMedicines.length === 0) return showToast("Chưa có thuốc!");

  const patientName = selectedPatientForRx?.name || "Chưa chọn";
  const visitDate = selectedVisitForRx 
    ? document.querySelector(`#rxVisitSelect option[value="${selectedVisitForRx}"]`)?.textContent || ""
    : "Không gắn lần khám";

  let html = `
    <div class="text-center mb-4">
      <h4>ĐƠN THUỐC</h4>
      <p><strong>Bệnh nhân:</strong> ${patientName}</p>
      <p><strong>Lần khám:</strong> ${visitDate}</p>
      <hr>
    </div>
    <table class="table table-bordered">
      <thead class="table-light">
        <tr><th>STT</th><th>Tên thuốc</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr>
      </thead>
      <tbody>
  `;

  let total = 0;
  selectedMedicines.forEach((m, i) => {
    const thanhtien = m.quantity * (m.price || 0);
    total += thanhtien;
    html += `
      <tr>
        <td>${i + 1}</td>
        <td>${m.name}</td>
        <td>${m.quantity}</td>
        <td>${(m.price || 0).toLocaleString()}đ</td>
        <td>${thanhtien.toLocaleString()}đ</td>
      </tr>
    `;
  });

  html += `
      </tbody>
      <tfoot>
        <tr><th colspan="4" class="text-end">Tổng cộng:</th><th>${total.toLocaleString()}đ</th></tr>
      </tfoot>
    </table>
    <div class="text-end mt-4">
      <p><em>Ngày in: ${new Date().toLocaleDateString('vi-VN')}</em></p>
    </div>
  `;

  document.getElementById("previewRxBody").innerHTML = html;
  new bootstrap.Modal(document.getElementById("previewRxModal")).show();
});

// IN ĐƠN
document.getElementById("printRxBtn").addEventListener("click", () => {
  const printWindow = window.open('', '', 'height=600,width=800');
  printWindow.document.write(document.getElementById("previewRxBody").innerHTML);
  printWindow.document.close();
  printWindow.print();
});

// =======================
// XEM TRƯỚC KỸ THUẬT
// =======================
document.getElementById("previewTechniqueBtn").addEventListener("click", () => {
  if (selectedTechniques.length === 0) return showToast("Chưa có kỹ thuật!");

  const patientName = selectedPatientForTech?.name || "Chưa chọn";
  const visitDate = selectedVisitForTech 
    ? document.querySelector(`#techVisitSelect option[value="${selectedVisitForTech}"]`)?.textContent || ""
    : "Không gắn lần khám";

  let html = `
    <div class="text-center mb-4">
      <h4>CHỈ ĐỊNH KỸ THUẬT</h4>
      <p><strong>Bệnh nhân:</strong> ${patientName}</p>
      <p><strong>Lần khám:</strong> ${visitDate}</p>
      <hr>
    </div>
    <ul class="list-group">
  `;

  selectedTechniques.forEach((t, i) => {
    html += `<li class="list-group-item"><strong>${i + 1}.</strong> ${t.name}</li>`;
  });

  html += `
    </ul>
    <div class="text-end mt-4">
      <p><em>Ngày in: ${new Date().toLocaleDateString('vi-VN')}</em></p>
    </div>
  `;

  document.getElementById("previewTechBody").innerHTML = html;
  new bootstrap.Modal(document.getElementById("previewTechModal")).show();
});

document.getElementById("printTechBtn").addEventListener("click", () => {
  const printWindow = window.open('', '', 'height=600,width=800');
  printWindow.document.write(document.getElementById("previewTechBody").innerHTML);
  printWindow.document.close();
  printWindow.print();
});
// =======================
// XEM LỊCH SỬ KHÁM BỆNH
// =======================
window.viewHistory = async (patientId) => {
  try {
    const patientRes = await fetch(`${API_BASE}/patient/${patientId}`);
    if (!patientRes.ok) throw new Error("Không tìm thấy bệnh nhân");
    const patient = await patientRes.json();

    const visitsRes = await fetch(`${API_BASE}/patient/${patientId}/visits`);
    if (!visitsRes.ok) throw new Error("Không thể lấy lịch sử");
    const visits = await visitsRes.json();

    const historyBody = document.getElementById("historyBody");

    if (visits.length === 0) {
      historyBody.innerHTML = `<p class="text-muted text-center py-4">Chưa có lần khám nào.</p>`;
    } else {
      let html = `<h6 class="mb-3">Lịch sử khám - <strong>${patient.name}</strong> <small class="text-muted">(ID: ${patient.id})</small></h6>`;
      html += `<div class="table-responsive"><table class="table table-sm table-bordered">`;
      html += `<thead class="table-light"><tr><th>Ngày</th><th>Bác sĩ</th><th>Chẩn đoán</th><th>Thuốc</th><th>Kỹ thuật</th></tr></thead><tbody>`;

      for (const visit of visits) {
        const rxRes = await fetch(`${API_BASE}/visit/${visit.id}/prescription`);
        const rx = rxRes.ok ? await rxRes.json() : [];
        const techRes = await fetch(`${API_BASE}/visit/${visit.id}/techniques`);
        const tech = techRes.ok ? await techRes.json() : [];

        const rxText = rx.length > 0 ? rx.map(m => `${m.name} (${m.quantity})`).join("; ") : "—";
        const techText = tech.length > 0 ? tech.map(t => t.name).join("; ") : "—";
        const diag = visit.mainDiagnosis || "—";
        const sub = visit.subDiagnosis ? ` <small class="text-muted">(${visit.subDiagnosis})</small>` : "";

        html += `<tr>
          <td><small>${new Date(visit.date).toLocaleString('vi-VN')}</small></td>
          <td><small>${visit.doctor || "—"}</small></td>
          <td><small>${diag}${sub}</small></td>
          <td><small class="text-wrap">${rxText}</small></td>
          <td><small class="text-wrap">${techText}</small></td>
        </tr>`;
      }
      html += `</tbody></table></div>`;
      historyBody.innerHTML = html;
    }

    new bootstrap.Modal(document.getElementById("historyModal")).show();

  } catch (err) {
    console.error("Lỗi xem lịch sử:", err);
    showToast("Lỗi: " + err.message);
  }
};

// =======================
// INIT
// =======================
window.addEventListener("load", async () => {
  await renderPatients();
  renderSelectedMedicines();
  renderSelectedTechs();
});