// =======================
// FRONTEND JAVASCRIPT FOR MEDICAL WEB
// =======================

const API_BASE = "http://localhost:3000/api";

// Global variables for workflow
let currentWorkflowPatient = null;
let currentWorkflowVisit = null;
let selectedMedicines = [];
let selectedTechs = [];

// =======================
// AUTH FUNCTIONS
// =======================
function checkAuth() {
    const user = localStorage.getItem("currentUser");
    if (!user) {
        // Show login button, hide user info
        const loginBtn = document.getElementById("loginBtn");
        const userInfo = document.getElementById("userInfo");
        if (loginBtn) loginBtn.classList.remove("d-none");
        if (userInfo) userInfo.classList.add("d-none");
        return false;
    }
    
    const userData = JSON.parse(user);
    
    // Hide login button, show user info
    const loginBtn = document.getElementById("loginBtn");
    const userInfo = document.getElementById("userInfo");
    const userDisplayName = document.getElementById("userDisplayName");
    
    if (loginBtn) loginBtn.classList.add("d-none");
    if (userInfo) userInfo.classList.remove("d-none");
    if (userDisplayName) userDisplayName.textContent = userData.HoTen;
    
    return true;
}

function logout() {
    localStorage.removeItem("currentUser");
    window.location.reload();
}

document.getElementById("logoutBtn")?.addEventListener("click", logout);

// Show login modal when clicking login button
document.getElementById("loginBtn")?.addEventListener("click", () => {
    const loginModal = new bootstrap.Modal(document.getElementById("loginModal"));
    loginModal.show();
});

// =======================
// LOGIN FORM
// =======================
document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("loginUsername").value;
    const password = document.getElementById("loginPassword").value;

    try {
        const res = await fetch(`${API_BASE}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });
        
        if (res.ok) {
            const user = await res.json();
            localStorage.setItem("currentUser", JSON.stringify(user));
            bootstrap.Modal.getInstance(document.getElementById("loginModal")).hide();
            window.location.reload();
        } else {
            const error = await res.json();
            showToast(error.error || "Đăng nhập thất bại", 'error');
        }
    } catch (err) {
        console.error(err);
        showToast("Lỗi kết nối", 'error');
    }
});

// =======================
// UTILITY FUNCTIONS
// =======================
function formatCurrency(amount) {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
}

function showToast(message, type = 'success') {
    const toastEl = document.getElementById('appToast');
    const toastBody = document.getElementById('appToastBody');
    if (!toastEl || !toastBody) return;
    
    // Set message
    toastBody.textContent = message;
    
    // Set color based on type
    toastEl.className = `toast align-items-center border-0`;
    if (type === 'success') {
        toastEl.classList.add('text-bg-success');
    } else if (type === 'error') {
        toastEl.classList.add('text-bg-danger');
    } else if (type === 'warning') {
        toastEl.classList.add('text-bg-warning');
    } else {
        toastEl.classList.add('text-bg-info');
    }
    
    // Show toast
    const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
    toast.show();
}

// =======================
// AUTOCOMPLETE FUNCTION
// =======================
function setupAutocomplete(inputId, apiUrl, options = {}) {
    const input = document.getElementById(inputId);
    if (!input) return;

    let resultsDiv = document.getElementById(`${inputId}Results`);
    if (!resultsDiv) {
        resultsDiv = document.createElement("div");
        resultsDiv.id = `${inputId}Results`;
        resultsDiv.className = "autocomplete-results list-group position-absolute";
        resultsDiv.style.zIndex = "1050";
        resultsDiv.style.maxHeight = "300px";
        resultsDiv.style.overflowY = "auto";
        input.parentNode.style.position = "relative";
        input.parentNode.appendChild(resultsDiv);
    }

    let selectedIndex = -1;
    let currentResults = [];

    input.addEventListener("input", async (e) => {
        const query = e.target.value.trim();
        if (query.length < 1) {
            resultsDiv.innerHTML = "";
            resultsDiv.classList.remove("show");
            return;
        }

        try {
            const res = await fetch(`${apiUrl}?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            currentResults = data;
            selectedIndex = -1;

            if (data.length === 0) {
                resultsDiv.innerHTML = "<div class='list-group-item text-muted'>Không tìm thấy</div>";
                resultsDiv.classList.add("show");
                return;
            }

            resultsDiv.innerHTML = data.map((item, idx) => `
                <button type="button" class="list-group-item list-group-item-action autocomplete-item" data-index="${idx}">
                    ${item.name}${item.dob ? ` - ${item.dob}` : ""}${item.gender ? ` - ${item.gender}` : ""}
                    ${item.price !== undefined ? ` - ${formatCurrency(item.price)}` : ""}
                </button>
            `).join("");
            resultsDiv.classList.add("show");

            resultsDiv.querySelectorAll(".autocomplete-item").forEach(btn => {
                btn.addEventListener("click", () => {
                    const idx = parseInt(btn.getAttribute("data-index"));
                    selectItem(currentResults[idx]);
                });
            });
        } catch (err) {
            console.error(err);
        }
    });

    input.addEventListener("keydown", (e) => {
        const items = resultsDiv.querySelectorAll(".autocomplete-item");
        
        if (e.key === "ArrowDown") {
            // Only handle if there are autocomplete items to navigate
            if (items.length === 0) {
                // Let other handlers deal with empty input
                return;
            }
            
            // Navigate through autocomplete items
            e.preventDefault();
            selectedIndex = (selectedIndex + 1) % items.length;
            updateSelection(items);
        } else if (e.key === "ArrowUp") {
            if (items.length === 0) return;
            e.preventDefault();
            selectedIndex = selectedIndex <= 0 ? items.length - 1 : selectedIndex - 1;
            updateSelection(items);
        } else if (e.key === "Enter" && selectedIndex >= 0) {
            e.preventDefault();
            selectItem(currentResults[selectedIndex]);
        } else if (e.key === "Escape") {
            resultsDiv.innerHTML = "";
            resultsDiv.classList.remove("show");
        }
    });

    function updateSelection(items) {
        items.forEach((item, idx) => {
            if (idx === selectedIndex) {
                item.classList.add("active");
                item.scrollIntoView({ block: "nearest" });
            } else {
                item.classList.remove("active");
            }
        });
    }

    function selectItem(item) {
        if (options.onSelect) {
            options.onSelect(item);
        }
        resultsDiv.innerHTML = "";
        resultsDiv.classList.remove("show");
    }

    document.addEventListener("click", (e) => {
        if (!input.contains(e.target) && !resultsDiv.contains(e.target)) {
            resultsDiv.innerHTML = "";
            resultsDiv.classList.remove("show");
        }
    });
}

// =======================
// 3-WAY PATIENT SYNC: Setup Autocomplete for all 3 tabs
// =======================

// 1. CHẨN ĐOÁN TAB - Autocomplete with sync
setupAutocomplete("searchPatientDiagnosis", `${API_BASE}/patients/search`, {
    onSelect: (patient) => {
        currentWorkflowPatient = patient;
        document.getElementById("patientIdDiagnosis").value = patient.id;
        document.getElementById("patientNameDiagnosis").textContent = patient.name;
        document.getElementById("patientDOBDiagnosis").textContent = patient.dob;
        document.getElementById("patientGenderDiagnosis").textContent = patient.gender;
        document.getElementById("patientAddressDiagnosis").textContent = patient.address || "";
        document.getElementById("patientPhoneDiagnosis").textContent = patient.phone || "";
        document.getElementById("infoSectionDiagnosis").classList.remove("d-none");
        document.getElementById("searchPatientDiagnosis").classList.add("d-none");
        
        // Sync to Technique tab - always sync
        document.getElementById("patientIdTechnique").value = patient.id;
        document.getElementById("patientNameTechnique").textContent = patient.name;
        document.getElementById("patientDOBTechnique").textContent = patient.dob;
        document.getElementById("patientGenderTechnique").textContent = patient.gender;
        document.getElementById("patientAddressTechnique").textContent = patient.address || "";
        document.getElementById("patientPhoneTechnique").textContent = patient.phone || "";
        document.getElementById("infoSectionTechnique").classList.remove("d-none");
        document.getElementById("searchPatientTechnique").classList.add("d-none");
        
        // Sync to Prescription tab - always sync
        document.getElementById("patientIdForRx").value = patient.id;
        document.getElementById("patientNameForRx").textContent = patient.name;
        document.getElementById("patientDOBForRx").textContent = patient.dob;
        document.getElementById("patientGenderForRx").textContent = patient.gender;
        document.getElementById("patientAddressForRx").textContent = patient.address || "";
        document.getElementById("patientPhoneForRx").textContent = patient.phone || "";
        document.getElementById("infoSectionForRx").classList.remove("d-none");
        document.getElementById("searchPatientForRx").classList.add("d-none");
        
        // Sync to Invoice tab - always sync
        document.getElementById("invoicePatientNameDisplay").textContent = patient.name;
        document.getElementById("invoicePatientInfoDisplay").innerHTML = 
            `${patient.dob} - ${patient.gender}<br>${patient.address || ''} - ${patient.phone || ''}`;
        document.getElementById("invoicePatientDisplay").classList.remove("d-none");
        document.getElementById("invoicePatientSearch").classList.add("d-none");
        
        loadVisitsForPatient(patient.id, "visitSelectDiagnosis");
    }
});

// 2. KỸ THUẬT TAB - Autocomplete with sync
setupAutocomplete("searchPatientTechnique", `${API_BASE}/patients/search`, {
    onSelect: (patient) => {
        currentWorkflowPatient = patient;
        document.getElementById("patientIdTechnique").value = patient.id;
        document.getElementById("patientNameTechnique").textContent = patient.name;
        document.getElementById("patientDOBTechnique").textContent = patient.dob;
        document.getElementById("patientGenderTechnique").textContent = patient.gender;
        document.getElementById("patientAddressTechnique").textContent = patient.address || "";
        document.getElementById("patientPhoneTechnique").textContent = patient.phone || "";
        document.getElementById("infoSectionTechnique").classList.remove("d-none");
        document.getElementById("searchPatientTechnique").classList.add("d-none");
        
        // Sync to Diagnosis tab - always sync
        document.getElementById("patientIdDiagnosis").value = patient.id;
        document.getElementById("patientNameDiagnosis").textContent = patient.name;
        document.getElementById("patientDOBDiagnosis").textContent = patient.dob;
        document.getElementById("patientGenderDiagnosis").textContent = patient.gender;
        document.getElementById("patientAddressDiagnosis").textContent = patient.address || "";
        document.getElementById("patientPhoneDiagnosis").textContent = patient.phone || "";
        document.getElementById("infoSectionDiagnosis").classList.remove("d-none");
        document.getElementById("searchPatientDiagnosis").classList.add("d-none");
        
        // Sync to Prescription tab - always sync
        document.getElementById("patientIdForRx").value = patient.id;
        document.getElementById("patientNameForRx").textContent = patient.name;
        document.getElementById("patientDOBForRx").textContent = patient.dob;
        document.getElementById("patientGenderForRx").textContent = patient.gender;
        document.getElementById("patientAddressForRx").textContent = patient.address || "";
        document.getElementById("patientPhoneForRx").textContent = patient.phone || "";
        document.getElementById("infoSectionForRx").classList.remove("d-none");
        document.getElementById("searchPatientForRx").classList.add("d-none");
        
        // Sync to Invoice tab - always sync
        document.getElementById("invoicePatientNameDisplay").textContent = patient.name;
        document.getElementById("invoicePatientInfoDisplay").innerHTML = 
            `${patient.dob} - ${patient.gender}<br>${patient.address || ''} - ${patient.phone || ''}`;
        document.getElementById("invoicePatientDisplay").classList.remove("d-none");
        document.getElementById("invoicePatientSearch").classList.add("d-none");
        
        loadVisitsForPatient(patient.id, "visitSelectTechnique");
    }
});

// 3. ĐƠN THUỐC TAB - Autocomplete with sync
setupAutocomplete("searchPatientForRx", `${API_BASE}/patients/search`, {
    onSelect: (patient) => {
        currentWorkflowPatient = patient;
        document.getElementById("patientIdForRx").value = patient.id;
        document.getElementById("patientNameForRx").textContent = patient.name;
        document.getElementById("patientDOBForRx").textContent = patient.dob;
        document.getElementById("patientGenderForRx").textContent = patient.gender;
        document.getElementById("patientAddressForRx").textContent = patient.address || "";
        document.getElementById("patientPhoneForRx").textContent = patient.phone || "";
        document.getElementById("infoSectionForRx").classList.remove("d-none");
        document.getElementById("searchPatientForRx").classList.add("d-none");
        
        // Sync to Diagnosis tab - always sync
        document.getElementById("patientIdDiagnosis").value = patient.id;
        document.getElementById("patientNameDiagnosis").textContent = patient.name;
        document.getElementById("patientDOBDiagnosis").textContent = patient.dob;
        document.getElementById("patientGenderDiagnosis").textContent = patient.gender;
        document.getElementById("patientAddressDiagnosis").textContent = patient.address || "";
        document.getElementById("patientPhoneDiagnosis").textContent = patient.phone || "";
        document.getElementById("infoSectionDiagnosis").classList.remove("d-none");
        document.getElementById("searchPatientDiagnosis").classList.add("d-none");
        
        // Sync to Technique tab - always sync
        document.getElementById("patientIdTechnique").value = patient.id;
        document.getElementById("patientNameTechnique").textContent = patient.name;
        document.getElementById("patientDOBTechnique").textContent = patient.dob;
        document.getElementById("patientGenderTechnique").textContent = patient.gender;
        document.getElementById("patientAddressTechnique").textContent = patient.address || "";
        document.getElementById("patientPhoneTechnique").textContent = patient.phone || "";
        document.getElementById("infoSectionTechnique").classList.remove("d-none");
        document.getElementById("searchPatientTechnique").classList.add("d-none");
        
        // Sync to Invoice tab - always sync
        document.getElementById("invoicePatientNameDisplay").textContent = patient.name;
        document.getElementById("invoicePatientInfoDisplay").innerHTML = 
            `${patient.dob} - ${patient.gender}<br>${patient.address || ''} - ${patient.phone || ''}`;
        document.getElementById("invoicePatientDisplay").classList.remove("d-none");
        document.getElementById("invoicePatientSearch").classList.add("d-none");
        
        loadVisitsForPatient(patient.id, "visitSelectForRx");
    }
});

// 4. TAB BỆNH NHÂN - Autocomplete tìm kiếm và lọc table
setupAutocomplete("searchPatientMain", `${API_BASE}/patients/search`, {
    onSelect: (patient) => {
        // Sau khi chọn, lọc table chỉ hiển thị bệnh nhân đó
        renderPatients(patient.name);
        document.getElementById("searchPatientMain").value = patient.name;
    }
});

// Thêm event listener để tìm kiếm realtime khi gõ
document.getElementById("searchPatientMain")?.addEventListener("input", (e) => {
    const query = e.target.value.trim();
    renderPatients(query);
});

// 5. THUỐC - Autocomplete
setupAutocomplete("searchMedicine", `${API_BASE}/thuoc/search`, {
    submitButtonId: "prescriptionSubmitBtn",
    onSelect: (medicine) => {
        selectedMedicines.push({ id: medicine.id, name: medicine.name, price: medicine.price, quantity: 1 });
        renderSelectedMedicines();
        const searchInput = document.getElementById("searchMedicine");
        searchInput.value = "";
        searchInput.focus();
    }
});

// 6. KỸ THUẬT - Autocomplete
setupAutocomplete("searchTechnique", `${API_BASE}/kythuat/search`, {
    submitButtonId: "techniqueSubmitBtn",
    onSelect: (tech) => {
        selectedTechs.push({ id: tech.id, name: tech.name, price: tech.price || 0 });
        renderSelectedTechs();
        const searchInput = document.getElementById("searchTechnique");
        searchInput.value = "";
        searchInput.focus();
    }
});

// 7. HÓA ĐƠN TAB - Autocomplete bệnh nhân với sync
setupAutocomplete("searchPatientInvoice", `${API_BASE}/patients/search`, {
    onSelect: (patient) => {
        currentWorkflowPatient = patient;
        
        // Update invoice display
        document.getElementById("invoicePatientNameDisplay").textContent = patient.name;
        document.getElementById("invoicePatientInfoDisplay").innerHTML = 
            `${patient.dob} - ${patient.gender}<br>${patient.address || ''} - ${patient.phone || ''}`;
        document.getElementById("invoicePatientDisplay").classList.remove("d-none");
        document.getElementById("invoicePatientSearch").classList.add("d-none");
        
        // Sync to all other tabs - always sync
        document.getElementById("patientIdDiagnosis").value = patient.id;
        document.getElementById("patientNameDiagnosis").textContent = patient.name;
        document.getElementById("patientDOBDiagnosis").textContent = patient.dob;
        document.getElementById("patientGenderDiagnosis").textContent = patient.gender;
        document.getElementById("patientAddressDiagnosis").textContent = patient.address || "";
        document.getElementById("patientPhoneDiagnosis").textContent = patient.phone || "";
        document.getElementById("infoSectionDiagnosis").classList.remove("d-none");
        document.getElementById("searchPatientDiagnosis").classList.add("d-none");
        
        document.getElementById("patientIdTechnique").value = patient.id;
        document.getElementById("patientNameTechnique").textContent = patient.name;
        document.getElementById("patientDOBTechnique").textContent = patient.dob;
        document.getElementById("patientGenderTechnique").textContent = patient.gender;
        document.getElementById("patientAddressTechnique").textContent = patient.address || "";
        document.getElementById("patientPhoneTechnique").textContent = patient.phone || "";
        document.getElementById("infoSectionTechnique").classList.remove("d-none");
        document.getElementById("searchPatientTechnique").classList.add("d-none");
        
        document.getElementById("patientIdForRx").value = patient.id;
        document.getElementById("patientNameForRx").textContent = patient.name;
        document.getElementById("patientDOBForRx").textContent = patient.dob;
        document.getElementById("patientGenderForRx").textContent = patient.gender;
        document.getElementById("patientAddressForRx").textContent = patient.address || "";
        document.getElementById("patientPhoneForRx").textContent = patient.phone || "";
        document.getElementById("infoSectionForRx").classList.remove("d-none");
        document.getElementById("searchPatientForRx").classList.add("d-none");
        
        // Load visits for invoice
        loadVisitsForPatient(patient.id, "invoiceVisitSelect");
    }
});

// =======================
// CHANGE PATIENT BUTTONS
// =======================
document.getElementById("changeDiagnosisPatient")?.addEventListener("click", () => {
    // Only hide patient info and show search, keep form data
    document.getElementById("infoSectionDiagnosis").classList.add("d-none");
    const searchInput = document.getElementById("searchPatientDiagnosis");
    searchInput.value = "";
    searchInput.classList.remove("d-none");
    searchInput.focus();
    // Note: Keep diagnosis form fields intact
});

document.getElementById("changeRxPatient")?.addEventListener("click", () => {
    // Only hide patient info and show search, keep selected medicines
    document.getElementById("infoSectionForRx").classList.add("d-none");
    const searchInput = document.getElementById("searchPatientForRx");
    searchInput.value = "";
    searchInput.classList.remove("d-none");
    searchInput.focus();
    // Note: Keep selectedMedicines array and display intact
});

document.getElementById("changeTechPatient")?.addEventListener("click", () => {
    // Only hide patient info and show search, keep selected techniques
    document.getElementById("infoSectionTechnique").classList.add("d-none");
    const searchInput = document.getElementById("searchPatientTechnique");
    searchInput.value = "";
    searchInput.classList.remove("d-none");
    searchInput.focus();
    // Note: Keep selectedTechs array and display intact
});

document.getElementById("changeInvoicePatient")?.addEventListener("click", () => {
    // Only hide patient info and show search in invoice tab
    document.getElementById("invoicePatientDisplay").classList.add("d-none");
    const searchInput = document.getElementById("searchPatientInvoice");
    searchInput.value = "";
    document.getElementById("invoicePatientSearch").classList.remove("d-none");
    searchInput.focus();
});

// =======================
// RESET FORM BUTTONS (Bệnh nhân mới)
// =======================
document.getElementById("resetRxFormBtn")?.addEventListener("click", () => {
    currentWorkflowPatient = null;
    currentWorkflowVisit = null;
    selectedMedicines = [];
    document.getElementById("prescriptionForm").reset();
    document.getElementById("infoSectionForRx").classList.add("d-none");
    document.getElementById("selectedMedicinesDiv").innerHTML = "";
    document.getElementById("searchPatientForRx").value = "";
    document.getElementById("searchPatientForRx").focus();
});

document.getElementById("resetTechFormBtn")?.addEventListener("click", () => {
    currentWorkflowPatient = null;
    currentWorkflowVisit = null;
    selectedTechs = [];
    document.getElementById("techniqueForm").reset();
    document.getElementById("infoSectionTechnique").classList.add("d-none");
    document.getElementById("selectedTechsDiv").innerHTML = "";
    document.getElementById("searchPatientTechnique").value = "";
    document.getElementById("searchPatientTechnique").focus();
});

// =======================
// RENDER SELECTED ITEMS
// =======================
function renderSelectedMedicines() {
    const div = document.getElementById("selectedMedicinesDiv");
    if (!div) return;
    if (selectedMedicines.length === 0) {
        div.innerHTML = "<p class='text-muted'>Chưa có thuốc nào</p>";
        return;
    }
    let html = "<ul class='list-group'>";
    selectedMedicines.forEach((m, idx) => {
        html += `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <span>${m.name} - ${formatCurrency(m.price)}</span>
                <div>
                    <input type="number" min="1" value="${m.quantity}" 
                           class="form-control form-control-sm d-inline-block" 
                           style="width:70px" 
                           onchange="selectedMedicines[${idx}].quantity = parseInt(this.value); renderSelectedMedicines()">
                    <button class="btn btn-sm btn-danger ms-2" onclick="selectedMedicines.splice(${idx},1); renderSelectedMedicines()">Xóa</button>
                </div>
            </li>`;
    });
    html += "</ul>";
    div.innerHTML = html;
}

function renderSelectedTechs() {
    const div = document.getElementById("selectedTechsDiv");
    if (!div) return;
    if (selectedTechs.length === 0) {
        div.innerHTML = "<p class='text-muted'>Chưa có kỹ thuật nào</p>";
        return;
    }
    let html = "<ul class='list-group'>";
    selectedTechs.forEach((t, idx) => {
        html += `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <span>${t.name} - ${formatCurrency(t.price)}</span>
                <button class="btn btn-sm btn-danger" onclick="selectedTechs.splice(${idx},1); renderSelectedTechs()">Xóa</button>
            </li>`;
    });
    html += "</ul>";
    div.innerHTML = html;
}

// =======================
// PATIENTS TAB - CRUD
// =======================
async function renderPatients(searchQuery = "") {
    try {
        const res = await fetch(`${API_BASE}/patients/search?q=${encodeURIComponent(searchQuery)}`);
        const patients = await res.json();
        const tbody = document.getElementById("patientsTableBody");
        if (!tbody) return;
        if (patients.length === 0) {
            tbody.innerHTML = "<tr><td colspan='9' class='text-center'>Không có dữ liệu</td></tr>";
            return;
        }
        tbody.innerHTML = patients.map(p => `
            <tr>
                <td>${p.id}</td>
                <td>${p.name}</td>
                <td>${p.dob}</td>
                <td>${p.gender}</td>
                <td>${p.address || ""}</td>
                <td>${p.phone || ""}</td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick='editPatient(${JSON.stringify(p)})'>Sửa</button>
                    <button class="btn btn-sm btn-danger" onclick="deletePatient(${p.id})">Xóa</button>
                </td>
            </tr>
        `).join("");
    } catch (err) {
        console.error(err);
        showToast("Lỗi tải danh sách bệnh nhân", 'error');
    }
}

async function loadVisitsForPatient(patientId, selectElementId) {
    try {
        const res = await fetch(`${API_BASE}/visits/${patientId}`);
        const visits = await res.json();
        const select = document.getElementById(selectElementId);
        if (!select) return;
        select.innerHTML = "<option value=''>-- Chọn lần khám --</option>";
        visits.forEach(v => {
            const opt = document.createElement("option");
            opt.value = v.visitId;
            opt.textContent = `${new Date(v.ngayKham).toLocaleString("vi-VN")} - ${v.chanDoan}`;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error("Lỗi tải lịch sử khám:", err);
    }
}

document.getElementById("visitSelectDiagnosis")?.addEventListener("change", (e) => {
    const visitId = e.target.value;
    if (visitId) {
        currentWorkflowVisit = visitId;
        // Sync to other tabs
        const techSelect = document.getElementById("visitSelectTechnique");
        const rxSelect = document.getElementById("visitSelectForRx");
        const invoiceSelect = document.getElementById("invoiceVisitSelect");
        if (techSelect && techSelect.querySelector(`option[value="${visitId}"]`)) {
            techSelect.value = visitId;
        }
        if (rxSelect && rxSelect.querySelector(`option[value="${visitId}"]`)) {
            rxSelect.value = visitId;
        }
        if (invoiceSelect && invoiceSelect.querySelector(`option[value="${visitId}"]`)) {
            invoiceSelect.value = visitId;
        }
    }
});

document.getElementById("visitSelectTechnique")?.addEventListener("change", (e) => {
    const visitId = e.target.value;
    if (visitId) {
        currentWorkflowVisit = visitId;
        // Sync to other tabs
        const diagSelect = document.getElementById("visitSelectDiagnosis");
        const rxSelect = document.getElementById("visitSelectForRx");
        const invoiceSelect = document.getElementById("invoiceVisitSelect");
        if (diagSelect && diagSelect.querySelector(`option[value="${visitId}"]`)) {
            diagSelect.value = visitId;
        }
        if (rxSelect && rxSelect.querySelector(`option[value="${visitId}"]`)) {
            rxSelect.value = visitId;
        }
        if (invoiceSelect && invoiceSelect.querySelector(`option[value="${visitId}"]`)) {
            invoiceSelect.value = visitId;
        }
    }
});

document.getElementById("visitSelectForRx")?.addEventListener("change", (e) => {
    const visitId = e.target.value;
    if (visitId) {
        currentWorkflowVisit = visitId;
        // Sync to other tabs
        const diagSelect = document.getElementById("visitSelectDiagnosis");
        const techSelect = document.getElementById("visitSelectTechnique");
        const invoiceSelect = document.getElementById("invoiceVisitSelect");
        if (diagSelect && diagSelect.querySelector(`option[value="${visitId}"]`)) {
            diagSelect.value = visitId;
        }
        if (techSelect && techSelect.querySelector(`option[value="${visitId}"]`)) {
            techSelect.value = visitId;
        }
        if (invoiceSelect && invoiceSelect.querySelector(`option[value="${visitId}"]`)) {
            invoiceSelect.value = visitId;
        }
    }
});

document.getElementById("invoiceVisitSelect")?.addEventListener("change", (e) => {
    const visitId = e.target.value;
    if (visitId) {
        currentWorkflowVisit = visitId;
        // Sync to other tabs
        const diagSelect = document.getElementById("visitSelectDiagnosis");
        const techSelect = document.getElementById("visitSelectTechnique");
        const rxSelect = document.getElementById("visitSelectForRx");
        if (diagSelect && diagSelect.querySelector(`option[value="${visitId}"]`)) {
            diagSelect.value = visitId;
        }
        if (techSelect && techSelect.querySelector(`option[value="${visitId}"]`)) {
            techSelect.value = visitId;
        }
        if (rxSelect && rxSelect.querySelector(`option[value="${visitId}"]`)) {
            rxSelect.value = visitId;
        }
        // Auto-load invoice data
        loadInvoice(visitId);
    }
});

function editPatient(patient) {
    document.getElementById("patientModalLabel").textContent = "Sửa thông tin bệnh nhân";
    document.getElementById("patientId").value = patient.id;
    document.getElementById("patientName").value = patient.name;
    document.getElementById("patientDOB").value = patient.dob || "";
    document.getElementById("patientGender").value = patient.gender;
    document.getElementById("patientAddress").value = patient.address || "";
    document.getElementById("patientPhone").value = patient.phone || "";
    document.getElementById("patientCCCD").value = patient.cccd || "";
    document.getElementById("patientBHYT").value = patient.bhyt || "";
    new bootstrap.Modal(document.getElementById("patientFormModal")).show();
}

async function deletePatient(id) {
    if (!confirm("Bạn có chắc muốn xóa bệnh nhân này?")) return;
    try {
        const res = await fetch(`${API_BASE}/patient/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (data.success) {
            showToast("Đã xóa bệnh nhân thành công", 'success');
            renderPatients();
        } else {
            showToast("Lỗi xóa bệnh nhân", 'error');
        }
    } catch (err) {
        console.error(err);
        showToast("Lỗi xóa bệnh nhân", 'error');
    }
}

document.getElementById("patientFormModal")?.addEventListener("show.bs.modal", () => {
    const isEdit = !!document.getElementById("patientId").value;
    document.getElementById("patientModalLabel").textContent = isEdit ? "Sửa thông tin bệnh nhân" : "Thêm bệnh nhân mới";
});

document.getElementById("patientFormModal")?.addEventListener("hidden.bs.modal", () => {
    document.getElementById("patientForm").reset();
    document.getElementById("patientId").value = "";
});

document.getElementById("patientForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("patientId").value;
    const payload = {
        name: document.getElementById("patientName").value,
        dob: document.getElementById("patientDOB").value,
        gender: document.getElementById("patientGender").value,
        address: document.getElementById("patientAddress").value,
        phone: document.getElementById("patientPhone").value,
        cccd: document.getElementById("patientCCCD").value,
        bhyt: document.getElementById("patientBHYT").value
    };

    try {
        let res;
        if (id) {
            res = await fetch(`${API_BASE}/patient/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
        } else {
            res = await fetch(`${API_BASE}/patient`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
        }
        const data = await res.json();
        if (data.success || data.id) {
            showToast(id ? "Đã cập nhật bệnh nhân" : "Đã thêm bệnh nhân mới", 'success');
            bootstrap.Modal.getInstance(document.getElementById("patientFormModal")).hide();
            renderPatients();
        } else {
            showToast("Lỗi lưu thông tin bệnh nhân", 'error');
        }
    } catch (err) {
        console.error(err);
        showToast("Lỗi kết nối", 'error');
    }
});

// =======================
// DIAGNOSIS FORM - with workflow
// =======================
document.getElementById("diagnosisForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const patientId = document.getElementById("patientIdDiagnosis").value;
    if (!patientId) {
        showToast("Vui lòng chọn bệnh nhân", 'warning');
        return;
    }

    const payload = {
        patientId,
        doctor: document.getElementById("doctor").value,
        mainDiagnosis: document.getElementById("mainDiagnosis").value,
        subDiagnosis: document.getElementById("subDiagnosis").value,
        symptoms: document.getElementById("symptoms").value,
        notes: document.getElementById("notes").value,
        temperature: document.getElementById("temperature").value,
        bloodPressure: document.getElementById("bloodPressure").value,
        height: document.getElementById("height").value,
        weight: document.getElementById("weight").value
    };

    try {
        const res = await fetch(`${API_BASE}/diagnosis`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.visitId) {
            currentWorkflowVisit = data.visitId;
            showToast("Lưu phiếu khám thành công", 'success');
            
            // Load visits and auto-select the new one in Technique tab
            await loadVisitsForPatient(patientId, "visitSelectTechnique");
            document.getElementById("visitSelectTechnique").value = data.visitId;
            
            // Auto-switch to Technique tab
            const techTab = new bootstrap.Tab(document.getElementById("techniques-tab"));
            techTab.show();
            
            // Auto-focus on technique search input
            setTimeout(() => {
                document.getElementById("searchTechnique")?.focus();
            }, 100);
        } else {
            showToast("Lỗi lưu phiếu khám", 'error');
        }
    } catch (err) {
        console.error(err);
        showToast("Lỗi kết nối", 'error');
    }
});

// =======================
// TECHNIQUE FORM - with workflow
// =======================
document.getElementById("techniqueForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const patientId = document.getElementById("patientIdTechnique").value;
    if (!patientId) {
        showToast("Vui lòng chọn bệnh nhân", 'warning');
        return;
    }

    // If no techniques selected, skip to Prescription tab
    if (selectedTechs.length === 0) {
        const rxTab = new bootstrap.Tab(document.getElementById("prescription-tab"));
        rxTab.show();
        return;
    }

    let visitId = currentWorkflowVisit || document.getElementById("visitSelectTechnique").value;
    if (!visitId) {
        showToast("Vui lòng chọn lần khám hoặc tạo phiếu khám trước", 'warning');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/technique`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ visitId, techniques: selectedTechs })
        });
        const data = await res.json();
        if (data.success) {
            showToast("Lưu chỉ định kỹ thuật thành công", 'success');
            
            // Load visits and auto-select in Prescription tab
            await loadVisitsForPatient(patientId, "visitSelectForRx");
            document.getElementById("visitSelectForRx").value = visitId;
            
            // Auto-switch to Prescription tab
            const rxTab = new bootstrap.Tab(document.getElementById("prescription-tab"));
            rxTab.show();
            
            // Auto-focus on medicine search input
            setTimeout(() => {
                document.getElementById("searchMedicine")?.focus();
            }, 100);
        } else {
            showToast("Lỗi lưu chỉ định kỹ thuật", 'error');
        }
    } catch (err) {
        console.error(err);
        showToast("Lỗi kết nối", 'error');
    }
});

// =======================
// PRESCRIPTION FORM - with workflow
// =======================
document.getElementById("prescriptionForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const patientId = document.getElementById("patientIdForRx").value;
    if (!patientId) {
        showToast("Vui lòng chọn bệnh nhân", 'warning');
        return;
    }

    // If no medicines selected, just show success message
    if (selectedMedicines.length === 0) {
        showToast("Không có thuốc nào được chọn", 'warning');
        return;
    }

    let visitId = currentWorkflowVisit || document.getElementById("visitSelectForRx").value;
    if (!visitId) {
        showToast("Vui lòng chọn lần khám hoặc tạo phiếu khám trước", 'warning');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/prescription`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ visitId, medicines: selectedMedicines })
        });
        const data = await res.json();
        if (data.total !== undefined) {
            showToast(`Lưu đơn thuốc thành công. Tổng tiền: ${formatCurrency(data.total)}`, 'success');
            
            // Open Invoice tab with this visit
            openInvoiceTab(visitId);
        } else {
            showToast("Lỗi lưu đơn thuốc", 'error');
        }
    } catch (err) {
        console.error(err);
        showToast("Lỗi kết nối", 'error');
    }
});

// =======================
// AUTO-FILL FUNCTIONS (with check to avoid overwrite)
// =======================
async function autoFillPrescriptionTab(patientId) {
    // Only fill if Prescription tab is empty
    const currentPatientId = document.getElementById("patientIdForRx").value;
    if (!currentPatientId || currentPatientId !== patientId.toString()) {
        // Get patient info from diagnosis tab if available
        const patientName = document.getElementById("patientNameDiagnosis")?.textContent || "";
        const patientDOB = document.getElementById("patientDOBDiagnosis")?.textContent || "";
        const patientGender = document.getElementById("patientGenderDiagnosis")?.textContent || "";
        const patientAddress = document.getElementById("patientAddressDiagnosis")?.textContent || "";
        const patientPhone = document.getElementById("patientPhoneDiagnosis")?.textContent || "";
        
        document.getElementById("patientIdForRx").value = patientId;
        document.getElementById("patientNameForRx").textContent = patientName;
        document.getElementById("patientDOBForRx").textContent = patientDOB;
        document.getElementById("patientGenderForRx").textContent = patientGender;
        document.getElementById("patientAddressForRx").textContent = patientAddress;
        document.getElementById("patientPhoneForRx").textContent = patientPhone;
        document.getElementById("infoSectionForRx").classList.remove("d-none");
        document.getElementById("searchPatientForRx")?.classList.add("d-none");
        
        // Load visits and auto-select current workflow visit
        if (currentWorkflowVisit) {
            await loadVisitsForPatient(patientId, "visitSelectForRx");
            document.getElementById("visitSelectForRx").value = currentWorkflowVisit;
        }
    }
}

async function autoFillTechniqueTab(patientId) {
    // Only fill if Technique tab is empty
    const currentPatientId = document.getElementById("patientIdTechnique").value;
    if (!currentPatientId || currentPatientId !== patientId.toString()) {
        // Get patient info from diagnosis tab if available
        const patientName = document.getElementById("patientNameDiagnosis")?.textContent || "";
        const patientDOB = document.getElementById("patientDOBDiagnosis")?.textContent || "";
        const patientGender = document.getElementById("patientGenderDiagnosis")?.textContent || "";
        const patientAddress = document.getElementById("patientAddressDiagnosis")?.textContent || "";
        const patientPhone = document.getElementById("patientPhoneDiagnosis")?.textContent || "";
        
        document.getElementById("patientIdTechnique").value = patientId;
        document.getElementById("patientNameTechnique").textContent = patientName;
        document.getElementById("patientDOBTechnique").textContent = patientDOB;
        document.getElementById("patientGenderTechnique").textContent = patientGender;
        document.getElementById("patientAddressTechnique").textContent = patientAddress;
        document.getElementById("patientPhoneTechnique").textContent = patientPhone;
        document.getElementById("infoSectionTechnique").classList.remove("d-none");
        document.getElementById("searchPatientTechnique")?.classList.add("d-none");
        
        // Load visits and auto-select current workflow visit
        if (currentWorkflowVisit) {
            await loadVisitsForPatient(patientId, "visitSelectTechnique");
            document.getElementById("visitSelectTechnique").value = currentWorkflowVisit;
        }
    }
}

// =======================
// KEYBOARD SHORTCUTS
// =======================
function setupGlobalKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
        if (e.altKey && e.key >= "1" && e.key <= "5") {
            e.preventDefault();
            const tabMap = {
                "1": "patients-tab",
                "2": "diagnosis-tab",
                "3": "techniques-tab",
                "4": "prescription-tab",
                "5": "invoice-tab"
            };
            const tabId = tabMap[e.key];
            if (tabId) {
                const tab = new bootstrap.Tab(document.getElementById(tabId));
                tab.show();
            }
        }
    });
}

// =======================
// ENTER KEY NAVIGATION IN DIAGNOSIS FORM
// =======================
function setupEnterToNextField() {
    const diagnosisFields = [
        "doctor",
        "temperature",
        "bloodPressure",
        "height",
        "weight",
        "mainDiagnosis",
        "subDiagnosis",
        "symptoms",
        "notes"
    ];

    diagnosisFields.forEach((fieldId, index) => {
        const field = document.getElementById(fieldId);
        if (!field) return;
        
        field.addEventListener("keydown", (e) => {
            // For textarea, only move on Enter without Shift (Shift+Enter for new line)
            if (field.tagName === "TEXTAREA" && e.shiftKey) {
                return; // Allow new line in textarea with Shift+Enter
            }
            
            if (e.key === "Enter") {
                e.preventDefault();
                
                if (index < diagnosisFields.length - 1) {
                    const nextField = document.getElementById(diagnosisFields[index + 1]);
                    if (nextField) {
                        nextField.focus();
                    }
                } else {
                    // At last field, focus on submit button
                    document.querySelector("#diagnosisForm button[type='submit']")?.focus();
                }
            }
        });
    });
}

// ===============================
// NẠP THÔNG TIN HÓA ĐƠN VÀO HTML HIỆN CÓ
// ===============================
async function loadInvoice(visitId) {
  try {
    // 1. Lấy danh sách thuốc của lần khám
    const resThuoc = await fetch(`${API_BASE}/visit/${visitId}/prescription`);
    const medicines = await resThuoc.json();

    // 2. Lấy danh sách kỹ thuật của lần khám
    const resTech = await fetch(`${API_BASE}/visit/${visitId}/techniques`);
    const techniques = await resTech.json();

    // 3. Render danh sách thuốc
    const tbodyThuoc = document.getElementById("invoiceMedicinesTableBody");
    if (medicines.length === 0) {
      tbodyThuoc.innerHTML = "<tr><td colspan='4' class='text-center text-muted'>Không có thuốc nào</td></tr>";
    } else {
      let totalMedicines = 0;
      tbodyThuoc.innerHTML = medicines.map(m => {
        const subtotal = m.quantity * m.price;
        totalMedicines += subtotal;
        return `
          <tr>
            <td>${m.name}</td>
            <td>${m.quantity}</td>
            <td>${formatCurrency(m.price)}</td>
            <td>${formatCurrency(subtotal)}</td>
          </tr>
        `;
      }).join("");
      document.getElementById("totalMedicines").textContent = formatCurrency(totalMedicines);
    }

    // 4. Render danh sách kỹ thuật
    const tbodyTech = document.getElementById("invoiceTechniquesTableBody");
    if (techniques.length === 0) {
      tbodyTech.innerHTML = "<tr><td colspan='2' class='text-center text-muted'>Không có kỹ thuật nào</td></tr>";
    } else {
      let totalTech = 0;
      tbodyTech.innerHTML = techniques.map(t => {
        totalTech += t.price || 0;
        return `
          <tr>
            <td>${t.name}</td>
            <td>${formatCurrency(t.price || 0)}</td>
          </tr>
        `;
      }).join("");
      document.getElementById("totalTechniques").textContent = formatCurrency(totalTech);
    }

    // 5. Tính tổng tiền
    const totalMedicines = medicines.reduce((sum, m) => sum + m.quantity * m.price, 0);
    const totalTech = techniques.reduce((sum, t) => sum + (t.price || 0), 0);
    const grandTotal = totalMedicines + totalTech;
    document.getElementById("grandTotal").textContent = formatCurrency(grandTotal);

  } catch (err) {
    console.error("Lỗi tải hóa đơn:", err);
    showToast("Lỗi tải hóa đơn", 'error');
  }
}

// Hàm mở tab Hóa đơn và load dữ liệu
function openInvoiceTab(visitId) {
  // Chuyển sang tab Hóa đơn
  const invoiceTab = new bootstrap.Tab(document.getElementById("invoice-tab"));
  invoiceTab.show();

  // Load dữ liệu hóa đơn
  loadInvoice(visitId);
}

// =======================
// INITIALIZE ON LOAD
// =======================
window.addEventListener("load", () => {
    checkAuth();
    setupGlobalKeyboardShortcuts();
    setupEnterToNextField();
    renderPatients();
    renderSelectedMedicines();
    renderSelectedTechs();
    
    // Auto-fill doctor name from logged in user
    const user = localStorage.getItem("currentUser");
    if (user) {
        const userData = JSON.parse(user);
        const doctorField = document.getElementById("doctor");
        if (doctorField) {
            doctorField.value = userData.HoTen;
        }
    }
    
    // Hide all autocomplete results on load
    document.querySelectorAll('.autocomplete-results').forEach(div => {
        div.innerHTML = "";
        div.classList.remove("show");
    });
    
    // Add Enter handlers for technique and medicine search - focus submit button if empty
    const searchTechnique = document.getElementById("searchTechnique");
    const searchMedicine = document.getElementById("searchMedicine");
    
    if (searchTechnique) {
        searchTechnique.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && e.target.value.trim() === "") {
                e.preventDefault();
                const btn = document.getElementById("techniqueSubmitBtn");
                if (btn) {
                    btn.focus();
                }
            }
        });
    }
    
    if (searchMedicine) {
        searchMedicine.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && e.target.value.trim() === "") {
                e.preventDefault();
                const btn = document.getElementById("prescriptionSubmitBtn");
                if (btn) {
                    btn.focus();
                }
            }
        });
    }
});
