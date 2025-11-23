// =======================
// KẾT NỐI DB THẬT (KHÔNG MOCK)
// =======================
const API_BASE = 'http://localhost:3000/api';

// =======================
// AUTHENTICATION STATE
// =======================
let currentUser = null;

function checkAuth() {
  const stored = localStorage.getItem('currentUser');
  if (stored) {
    currentUser = JSON.parse(stored);
    updateUIForLoggedIn();
  }
}

function updateUIForLoggedIn() {
  document.getElementById('loginBtn').classList.add('d-none');
  document.getElementById('userInfo').classList.remove('d-none');
  document.getElementById('userDisplayName').textContent = currentUser.HoTen || currentUser.TenDangNhap;
}

function updateUIForLoggedOut() {
  document.getElementById('loginBtn').classList.remove('d-none');
  document.getElementById('userInfo').classList.add('d-none');
  currentUser = null;
  localStorage.removeItem('currentUser');
}

async function login(username, password) {
  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Đăng nhập thất bại');
    return data;
  } catch (err) {
    throw err;
  }
}

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
// LOGIN HANDLERS
// =======================
document.getElementById('loginBtn').addEventListener('click', () => {
  new bootstrap.Modal(document.getElementById('loginModal')).show();
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorDiv = document.getElementById('loginError');
  
  errorDiv.classList.add('d-none');
  
  try {
    const user = await login(username, password);
    currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
    updateUIForLoggedIn();
    bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
    showToast('Đăng nhập thành công!');
    document.getElementById('loginForm').reset();
  } catch (err) {
    errorDiv.textContent = err.message;
    errorDiv.classList.remove('d-none');
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  if (confirm('Bạn có chắc muốn đăng xuất?')) {
    updateUIForLoggedOut();
    showToast('Đã đăng xuất');
  }
});

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

// Current workflow state
let currentWorkflowPatient = null;
let currentWorkflowVisit = null;

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
  let currentIndex = -1;
  let currentMatches = [];

  const showSuggestions = async (q) => {
    box.innerHTML = "";
    currentIndex = -1;
    // Giảm từ 2 xuống 1 ký tự để tìm nhanh hơn
    if (q.length < 1) return (box.style.display = "none");

    const data = await dataFetcher(q);
    const matches = data.filter(item => 
      item[opts.key].toLowerCase().includes(q.toLowerCase())
    );

    if (matches.length === 0) {
      box.innerHTML = '<div class="list-group-item text-muted"><em>Không tìm thấy kết quả</em></div>';
      box.style.display = "block";
      currentMatches = [];
      return;
    }

    // Giới hạn hiển thị tối đa 10 kết quả
    const limitedMatches = matches.slice(0, 10);
    currentMatches = limitedMatches;

    limitedMatches.forEach((m, index) => {
      const btn = document.createElement("div");
      btn.className = "list-group-item list-group-item-action";
      btn.setAttribute('data-index', index);
      btn.textContent = opts.format ? opts.format(m) : m[opts.key];
      btn.onclick = () => {
        if (opts.onSelect) opts.onSelect(m);
        input.value = ""; // XÓA INPUT
        box.style.display = "none"; // ẨN GỢI Ý
        currentIndex = -1;
      };
      box.appendChild(btn);
    });
    
    // Hiện số lượng kết quả nếu > 10
    if (matches.length > 10) {
      const moreInfo = document.createElement("div");
      moreInfo.className = "list-group-item text-muted small";
      moreInfo.textContent = `Và ${matches.length - 10} kết quả khác...`;
      box.appendChild(moreInfo);
    }
    
    box.style.display = "block";
  };

  const highlightItem = (index) => {
    const items = box.querySelectorAll('.list-group-item-action');
    items.forEach(item => item.classList.remove('active'));
    if (index >= 0 && index < items.length) {
      items[index].classList.add('active');
      items[index].scrollIntoView({ block: 'nearest' });
    }
  };

  input.addEventListener("input", () => {
    clearTimeout(timeout);
    const q = input.value.trim();
    // Giảm delay từ 300ms xuống 200ms cho phản hồi nhanh hơn
    timeout = setTimeout(() => showSuggestions(q), 200);
  });

  // Keyboard navigation
  input.addEventListener("keydown", (e) => {
    const items = box.querySelectorAll('.list-group-item-action');
    
    // Nếu nhấn Enter mà không có gợi ý
    if (e.key === 'Enter' && (box.style.display === "none" || items.length === 0)) {
      e.preventDefault();
      // Tìm nút submit trong form gần nhất
      const form = input.closest('form');
      if (form) {
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.focus();
        }
      }
      return;
    }

    if (box.style.display === "none" || items.length === 0) return;

    switch(e.key) {
      case 'ArrowDown':
        e.preventDefault();
        currentIndex = Math.min(currentIndex + 1, items.length - 1);
        highlightItem(currentIndex);
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        currentIndex = Math.max(currentIndex - 1, 0);
        highlightItem(currentIndex);
        break;
      
      case 'Enter':
        e.preventDefault();
        if (currentIndex >= 0 && currentIndex < currentMatches.length) {
          const selected = currentMatches[currentIndex];
          if (opts.onSelect) opts.onSelect(selected);
          input.value = "";
          box.style.display = "none";
          currentIndex = -1;
        }
        break;
      
      case 'Escape':
        e.preventDefault();
        box.style.display = "none";
        currentIndex = -1;
        break;
    }
  });

  // Ẩn khi click ngoài
  document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && !box.contains(e.target)) {
      box.style.display = "none";
      currentIndex = -1;
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
  format: p => `${p.name} - ${p.dob ? new Date(p.dob).toLocaleDateString('vi-VN') : ''} - ${p.phone || ''}`,
  onSelect: (p) => {
    selectedPatientForDiagnosis = p;
    
    // Hiển thị thông tin bệnh nhân ở trên
    document.getElementById('diagnosisPatientNameDisplay').textContent = p.name;
    const dob = p.dob ? new Date(p.dob).toLocaleDateString('vi-VN') : 'Chưa rõ';
    const age = p.dob ? calculateAge(p.dob) : '?';
    const info = `${p.gender || ''} - ${age} tuổi - ${dob} - ${p.phone || 'Chưa có SĐT'}`;
    document.getElementById('diagnosisPatientInfoDisplay').textContent = info;
    
    // Ẩn ô tìm kiếm, hiện thông tin
    document.getElementById('diagnosisPatientSearch').classList.add('d-none');
    document.getElementById('diagnosisPatientDisplay').classList.remove('d-none');
    
    // Auto-fill bác sĩ nếu đã đăng nhập
    if (currentUser && currentUser.HoTen) {
      document.getElementById('doctorName').value = currentUser.HoTen;
    }
    
    // Focus vào trường tiếp theo
    setTimeout(() => {
      const nextField = document.getElementById('temperature') || document.getElementById('mainDiagnosis');
      nextField?.focus();
    }, 100);
  }
});

// Nút đổi bệnh nhân trong tab chẩn đoán
document.getElementById('changeDiagnosisPatient')?.addEventListener('click', () => {
  selectedPatientForDiagnosis = null;
  document.getElementById('diagnosisPatientDisplay').classList.add('d-none');
  document.getElementById('diagnosisPatientSearch').classList.remove('d-none');
  document.getElementById('searchPatientDiagnosis').value = '';
  document.getElementById('searchPatientDiagnosis').focus();
});

// Nút đổi bệnh nhân trong tab đơn thuốc
document.getElementById('changeRxPatient')?.addEventListener('click', () => {
  selectedPatientForRx = null;
  selectedVisitForRx = null;
  document.getElementById('rxPatientDisplay').classList.add('d-none');
  document.getElementById('rxPatientSearch').classList.remove('d-none');
  document.getElementById('searchPatientForRx').value = '';
  document.getElementById('rxVisitSelect').innerHTML = '<option value="">— Chọn hoặc để trống —</option>';
  document.getElementById('searchPatientForRx').focus();
});

// Nút đổi bệnh nhân trong tab kỹ thuật
document.getElementById('changeTechPatient')?.addEventListener('click', () => {
  selectedPatientForTech = null;
  selectedVisitForTech = null;
  document.getElementById('techPatientDisplay').classList.add('d-none');
  document.getElementById('techPatientSearch').classList.remove('d-none');
  document.getElementById('searchPatientTechnique').value = '';
  document.getElementById('techVisitSelect').innerHTML = '<option value="">— Chọn hoặc để trống —</option>';
  document.getElementById('searchPatientTechnique').focus();
});

// =======================
// AUTOCOMPLETE: BỆNH NHÂN TRONG TAB KÊ ĐƠN THUỐC
// =======================
setupAutocomplete("searchPatientForRx", "rxPatientSuggestions", getPatients, {
  key: "name",
  format: p => `${p.name} - ${p.cccd || p.phone || p.bhyt || 'ID:' + p.id}`,
  onSelect: (p) => {
    selectedPatientForRx = p;
    // Hiển thị thông tin bệnh nhân
    document.getElementById('rxPatientNameDisplay').textContent = p.name;
    const info = [];
    if (p.dob) info.push(`NS: ${p.dob}`);
    if (p.gender) info.push(p.gender);
    if (p.cccd) info.push(`CCCD: ${p.cccd}`);
    if (p.bhyt) info.push(`BHYT: ${p.bhyt}`);
    document.getElementById('rxPatientInfoDisplay').textContent = info.join(' • ');
    document.getElementById('rxPatientDisplay').classList.remove('d-none');
    document.getElementById('rxPatientSearch').classList.add('d-none');
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
    // Hiển thị thông tin bệnh nhân
    document.getElementById('techPatientNameDisplay').textContent = p.name;
    const info = [];
    if (p.dob) info.push(`NS: ${p.dob}`);
    if (p.gender) info.push(p.gender);
    if (p.cccd) info.push(`CCCD: ${p.cccd}`);
    if (p.bhyt) info.push(`BHYT: ${p.bhyt}`);
    document.getElementById('techPatientInfoDisplay').textContent = info.join(' • ');
    document.getElementById('techPatientDisplay').classList.remove('d-none');
    document.getElementById('techPatientSearch').classList.add('d-none');
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
    // Focus lại ô tìm kiếm để tiếp tục thêm kỹ thuật
    setTimeout(() => {
      const searchInput = document.getElementById('searchTechnique');
      searchInput.value = '';
      searchInput.focus();
    }, 100);
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
    notes: document.getElementById("doctorNotes").value.trim(),
    // Sinh hiệu
    temperature: document.getElementById("temperature").value,
    bloodPressure: document.getElementById("bloodPressure").value.trim(),
    height: document.getElementById("height").value,
    weight: document.getElementById("weight").value
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
      
      // Lưu thông tin workflow
      currentWorkflowPatient = selectedPatientForDiagnosis;
      currentWorkflowVisit = result.visitId;
      
      showToast(`Lưu phiếu khám thành công! Chuyển sang kỹ thuật...`);
      // KHÔNG reset form để giữ dữ liệu khi quay lại
      await renderPatients();
      
      // Chuyển sang tab kỹ thuật và tự động điền thông tin
      setTimeout(() => {
        const tabBtn = document.querySelector('[data-bs-target="#tabTechniques"]');
        const tab = new bootstrap.Tab(tabBtn);
        tab.show();
        
        // Tự động điền bệnh nhân và visit
        autoFillTechniqueTab();
      }, 500);
    } else {
      const err = await res.json();
      showToast("Lỗi: " + (err.error || "Không thể lưu"));
    }
  } catch (err) {
    showToast("Lỗi kết nối!");
  }
});

// =======================
// AUTO FILL WORKFLOW
// =======================
async function autoFillPrescriptionTab() {
  if (!currentWorkflowPatient || !currentWorkflowVisit) return;
  
  // Điền bệnh nhân
  selectedPatientForRx = currentWorkflowPatient;
  const p = currentWorkflowPatient;
  document.getElementById('rxPatientNameDisplay').textContent = p.name;
  const info = [];
  if (p.dob) info.push(`NS: ${p.dob}`);
  if (p.gender) info.push(p.gender);
  if (p.cccd) info.push(`CCCD: ${p.cccd}`);
  if (p.bhyt) info.push(`BHYT: ${p.bhyt}`);
  document.getElementById('rxPatientInfoDisplay').textContent = info.join(' • ');
  document.getElementById('rxPatientDisplay').classList.remove('d-none');
  document.getElementById('rxPatientSearch').classList.add('d-none');
  
  // Load và chọn visit mới nhất
  await loadVisitsForPatient(currentWorkflowPatient.id, 'rxVisitSelect');
  document.getElementById('rxVisitSelect').value = currentWorkflowVisit;
  selectedVisitForRx = currentWorkflowVisit;
}

async function autoFillTechniqueTab() {
  if (!currentWorkflowPatient || !currentWorkflowVisit) return;
  
  // Điền bệnh nhân
  selectedPatientForTech = currentWorkflowPatient;
  const p = currentWorkflowPatient;
  document.getElementById('techPatientNameDisplay').textContent = p.name;
  const info = [];
  if (p.dob) info.push(`NS: ${p.dob}`);
  if (p.gender) info.push(p.gender);
  if (p.cccd) info.push(`CCCD: ${p.cccd}`);
  if (p.bhyt) info.push(`BHYT: ${p.bhyt}`);
  document.getElementById('techPatientInfoDisplay').textContent = info.join(' • ');
  document.getElementById('techPatientDisplay').classList.remove('d-none');
  document.getElementById('techPatientSearch').classList.add('d-none');
  
  // Load và chọn visit mới nhất
  await loadVisitsForPatient(currentWorkflowPatient.id, 'techVisitSelect');
  document.getElementById('techVisitSelect').value = currentWorkflowVisit;
  selectedVisitForTech = currentWorkflowVisit;
}

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
      
      // Hoàn tất workflow
      if (currentWorkflowPatient && currentWorkflowVisit) {
        setTimeout(() => {
          showToast("Hoàn tất quy trình khám bệnh!");
          // Reset toàn bộ workflow
          currentWorkflowPatient = null;
          currentWorkflowVisit = null;
          
          // Reset tất cả forms
          document.getElementById("diagnosisForm").reset();
          document.getElementById("techniqueForm").reset();
          document.getElementById("prescriptionForm").reset();
          
          // Reset patient selections
          selectedPatientForDiagnosis = null;
          selectedPatientForTech = null;
          selectedPatientForRx = null;
          selectedVisitForRx = null;
          selectedVisitForTech = null;
          
          // Ẩn patient displays
          document.getElementById("diagnosisPatientDisplay").classList.add("d-none");
          document.getElementById("diagnosisPatientSearch").classList.remove("d-none");
          document.getElementById("techPatientDisplay").classList.add("d-none");
          document.getElementById("techPatientSearch").classList.remove("d-none");
          document.getElementById("rxPatientDisplay").classList.add("d-none");
          document.getElementById("rxPatientSearch").classList.remove("d-none");
          
          // Reset visit selects
          document.getElementById("rxVisitSelect").innerHTML = '<option value="">— Chọn hoặc để trống —</option>';
          document.getElementById("techVisitSelect").innerHTML = '<option value="">— Chọn hoặc để trống —</option>';
          
          // Quay về tab bệnh nhân
          const tabBtn = document.querySelector('[data-bs-target="#tabPatients"]');
          const tab = new bootstrap.Tab(tabBtn);
          tab.show();
        }, 1000);
      } else {
        // Không trong workflow, chỉ reset form đơn thuốc
        selectedPatientForRx = null;
        selectedVisitForRx = null;
        document.getElementById("rxPatientDisplay").classList.add("d-none");
        document.getElementById("rxPatientSearch").classList.remove("d-none");
        document.getElementById("rxVisitSelect").innerHTML = '<option value="">— Chọn hoặc để trống —</option>';
        e.target.reset();
      }
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
  
  console.log('[DEBUG] Technique form submit - currentWorkflowPatient:', currentWorkflowPatient);
  console.log('[DEBUG] Technique form submit - currentWorkflowVisit:', currentWorkflowVisit);
  console.log('[DEBUG] selectedTechniques.length:', selectedTechniques.length);
  
  // Nếu không có kỹ thuật
  if (selectedTechniques.length === 0) {
    // Trong workflow: cho phép bỏ qua và chuyển sang đơn thuốc
    if (currentWorkflowPatient && currentWorkflowVisit) {
      showToast("Bỏ qua kỹ thuật, chuyển sang đơn thuốc...");
      setTimeout(() => {
        const tabBtn = document.querySelector('[data-bs-target="#tabPrescription"]');
        const tab = new bootstrap.Tab(tabBtn);
        tab.show();
        autoFillPrescriptionTab();
      }, 500);
      return;
    } else {
      // Không trong workflow: bắt buộc phải chọn kỹ thuật
      return showToast("Chưa chọn kỹ thuật!");
    }
  }

  // Có kỹ thuật -> lưu vào database
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
      // Xóa danh sách kỹ thuật đã chọn
      selectedTechniques = [];
      renderSelectedTechs();
      
      // Luôn chuyển sang đơn thuốc sau khi lưu thành công
      console.log('[DEBUG] Chuyển sang tab đơn thuốc...');
      setTimeout(() => {
        const tabBtn = document.querySelector('[data-bs-target="#tabPrescription"]');
        const tab = new bootstrap.Tab(tabBtn);
        tab.show();
        
        // Nếu đang trong workflow, tự động điền thông tin
        if (currentWorkflowPatient && currentWorkflowVisit) {
          autoFillPrescriptionTab();
        }
      }, 500);
    } else {
      const err = await res.json();
      showToast("Lỗi: " + (err.error || "Không lưu được"));
    }
  } catch (err) {
    console.error('[ERROR] Lỗi kết nối:', err);
    showToast("Lỗi kết nối!");
  }
});

// =======================
// NÚT TIẾP TỤC WORKFLOW (Đã tích hợp vào submit handler)
// =======================

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
  checkAuth();
  await renderPatients();
  renderSelectedMedicines();
  renderSelectedTechs();
  setupGlobalKeyboardShortcuts();
  setupEnterToNextField();
});

// =======================
// KEYBOARD SHORTCUTS
// =======================
function setupGlobalKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Bỏ qua nếu đang gõ vào input/textarea
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }

    // Alt + 1: Tab Bệnh nhân
    if (e.altKey && e.key === '1') {
      e.preventDefault();
      const tab = new bootstrap.Tab(document.querySelector('[data-bs-target="#tabPatients"]'));
      tab.show();
      showToast('Chuyển sang tab Bệnh nhân');
    }

    // Alt + 2: Tab Chẩn đoán
    if (e.altKey && e.key === '2') {
      e.preventDefault();
      const tab = new bootstrap.Tab(document.querySelector('[data-bs-target="#tabDiagnosis"]'));
      tab.show();
      showToast('Chuyển sang tab Chẩn đoán');
      setTimeout(() => document.getElementById('searchPatientDiagnosis')?.focus(), 100);
    }

    // Alt + 3: Tab Kỹ thuật
    if (e.altKey && e.key === '3') {
      e.preventDefault();
      const tab = new bootstrap.Tab(document.querySelector('[data-bs-target="#tabTechniques"]'));
      tab.show();
      showToast('Chuyển sang tab Kỹ thuật');
    }

    // Alt + 4: Tab Đơn thuốc
    if (e.altKey && e.key === '4') {
      e.preventDefault();
      const tab = new bootstrap.Tab(document.querySelector('[data-bs-target="#tabPrescription"]'));
      tab.show();
      showToast('Chuyển sang tab Đơn thuốc');
    }

    // Alt + N: Thêm bệnh nhân mới
    if (e.altKey && e.key === 'n') {
      e.preventDefault();
      const modal = new bootstrap.Modal(document.getElementById('patientModal'));
      modal.show();
      setTimeout(() => document.getElementById('modalFullName')?.focus(), 300);
    }

    // Alt + L: Đăng nhập/Đăng xuất
    if (e.altKey && e.key === 'l') {
      e.preventDefault();
      if (currentUser) {
        document.getElementById('logoutBtn')?.click();
      } else {
        document.getElementById('loginBtn')?.click();
      }
    }
  });

  // Tooltip hiển thị phím tắt (có thể thêm vào UI sau)
  console.log(`
    ⌨️ PHÍM TẮT:
    Alt + 1: Tab Bệnh nhân
    Alt + 2: Tab Chẩn đoán
    Alt + 3: Tab Kỹ thuật
    Alt + 4: Tab Đơn thuốc
    Alt + N: Thêm bệnh nhân mới
    Alt + L: Đăng nhập/Đăng xuất
    
    🔍 TRONG Ô TÌM KIẾM:
    ↓ ↑: Di chuyển trong gợi ý
    Enter: Chọn
    Esc: Đóng gợi ý
  `);
}

// =======================
// AUTO FOCUS ON ENTER
// =======================
function setupEnterToNextField() {
  // Định nghĩa thứ tự các field trong form chẩn đoán
  const diagnosisFieldOrder = [
    'temperature',
    'bloodPressure', 
    'height',
    'weight',
    'mainDiagnosis',
    'subDiagnosis',
    'symptoms',
    'doctorNotes'
  ];

  diagnosisFieldOrder.forEach((fieldId, index) => {
    const field = document.getElementById(fieldId);
    if (!field) return;

    field.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        
        // Tìm field tiếp theo
        const nextIndex = index + 1;
        if (nextIndex < diagnosisFieldOrder.length) {
          const nextField = document.getElementById(diagnosisFieldOrder[nextIndex]);
          if (nextField) {
            nextField.focus();
            // Nếu là textarea, đặt cursor ở cuối
            if (nextField.tagName === 'TEXTAREA') {
              nextField.setSelectionRange(nextField.value.length, nextField.value.length);
            }
          }
        } else {
          // Đã đến field cuối cùng, focus vào nút submit
          const submitBtn = document.querySelector('#diagnosisForm button[type="submit"]');
          submitBtn?.focus();
        }
      }
    });
  });
}