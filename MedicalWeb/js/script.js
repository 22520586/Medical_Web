// =======================
// DỮ LIỆU GIẢ LẬP (mock data)
// =======================
const patients = ["Nguyễn Văn An", "Trần Thị Bích", "Lê Hồng Phong", "Phạm Văn Minh"];
const techniques = ["Siêu âm ổ bụng", "Chụp X-quang phổi", "Khí dung thuốc", "Đặt ống nội khí quản"];
const medicines = [
  { id: 1, name: "Paracetamol - 500mg", price: 378 },
  { id: 2, name: "Vitamin C - 500mg", price: 178 },
  { id: 3, name: "Amoxicillin - 250mg", price: 650 },
  { id: 4, name: "Cefalexin - 500mg", price: 980 }
];

// =======================
// HÀM DÙNG CHUNG - AUTOCOMPLETE
// =======================
function setupAutocomplete(inputId, suggestionId, dataList, onSelect) {
  const input = document.getElementById(inputId);
  const box = document.getElementById(suggestionId);

  input.addEventListener("input", function () {
    const query = this.value.trim().toLowerCase();
    box.innerHTML = "";
    if (!query) return (box.style.display = "none");

    const matches = dataList.filter((item) => item.toLowerCase().includes(query));
    if (matches.length === 0) return (box.style.display = "none");

    matches.forEach((name) => {
      const div = document.createElement("button");
      div.type = "button";
      div.className = "list-group-item list-group-item-action";
      div.textContent = name;
      div.onclick = () => {
        onSelect(name);
        box.style.display = "none";
      };
      box.appendChild(div);
    });
    box.style.display = "block";
  });
}

// =======================
// BỆNH NHÂN
// =======================
setupAutocomplete("searchPatient", "patientSuggestions", patients, (name) => {
  document.getElementById("selectedPatientName").textContent = name;
  document.getElementById("selectedPatientInfo").style.display = "block";
  document.getElementById("searchPatient").value = name;
});

// 🔹 Khi xóa nội dung bệnh nhân → ẩn phần “Đã chọn”
document.getElementById("searchPatient").addEventListener("input", function () {
  if (this.value.trim() === "") {
    document.getElementById("selectedPatientInfo").style.display = "none";
    document.getElementById("selectedPatientName").textContent = "";
  }
});

// =======================
// KỸ THUẬT (đa chọn)
// =======================
let selectedTechniques = [];
const selectedTechContainer = document.getElementById("selectedTechniques");

setupAutocomplete("searchTechnique", "techniqueSuggestions", techniques, (name) => {
  if (selectedTechniques.includes(name)) return;
  selectedTechniques.push(name);

  const badge = document.createElement("span");
  badge.className = "badge bg-primary px-3 py-2 d-flex align-items-center";
  badge.textContent = name;

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "btn-close btn-close-white ms-2";
  removeBtn.onclick = () => {
    badge.remove();
    selectedTechniques = selectedTechniques.filter((t) => t !== name);
  };

  badge.appendChild(removeBtn);
  selectedTechContainer.appendChild(badge);
  document.getElementById("searchTechnique").value = "";
});

// =======================
// THUỐC - ĐA CHỌN, GIÁ & SỐ LƯỢNG
// =======================
let selectedMedicines = [];
const medInput = document.getElementById("searchMedicine");
const medBox = document.getElementById("medicineSuggestions");
const medContainer = document.getElementById("selectedMedicines");

medInput.addEventListener("input", function () {
  const query = this.value.trim().toLowerCase();
  medBox.innerHTML = "";
  if (!query) return (medBox.style.display = "none");

  const matches = medicines.filter((m) => m.name.toLowerCase().includes(query));
  if (matches.length === 0) return (medBox.style.display = "none");

  matches.forEach((med) => {
    const div = document.createElement("button");
    div.type = "button";
    div.className = "list-group-item list-group-item-action";
    div.textContent = `${med.name} (${med.price.toLocaleString("vi-VN")}đ)`;
    div.onclick = () => selectMedicine(med);
    medBox.appendChild(div);
  });
  medBox.style.display = "block";
});

function selectMedicine(med) {
  if (selectedMedicines.find((m) => m.id === med.id)) return;
  selectedMedicines.push({ ...med, quantity: 1, total: med.price });
  renderSelectedMedicines();
  medInput.value = "";
  medBox.style.display = "none";
}

function renderSelectedMedicines() {
  medContainer.innerHTML = "";
  let totalAll = 0;

  selectedMedicines.forEach((med) => {
    const row = document.createElement("div");
    row.className = "d-flex align-items-center border rounded p-2 mb-2 bg-light";

    // 🧾 Tên thuốc
    const name = document.createElement("div");
    name.className = "flex-grow-1";
    name.innerHTML = `<strong>${med.name}</strong><br><small>${med.price.toLocaleString("vi-VN")}đ / viên</small>`;

    // 🔢 Số lượng
    const qty = document.createElement("input");
    qty.type = "number";
    qty.min = "1";
    qty.value = med.quantity;
    qty.className = "form-control mx-2";
    qty.style.width = "80px";
    qty.oninput = () => {
      med.quantity = parseInt(qty.value) || 1;
      med.total = med.quantity * med.price;
      renderSelectedMedicines(); // Cập nhật lại toàn bộ hiển thị
    };

    // 💰 Thành tiền
    const total = document.createElement("div");
    total.className = "fw-bold text-success";
    total.textContent = med.total.toLocaleString("vi-VN") + "đ";

    // ❌ Xóa thuốc
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "btn btn-sm btn-danger ms-3";
    remove.textContent = "X";
    remove.onclick = () => {
      selectedMedicines = selectedMedicines.filter((m) => m.id !== med.id);
      renderSelectedMedicines();
    };

    row.append(name, qty, total, remove);
    medContainer.appendChild(row);
    totalAll += med.total;
  });

  // Tổng cộng toàn đơn
  const totalRow = document.createElement("div");
  totalRow.className = "text-end mt-2 fw-bold";
  totalRow.textContent = "💰 Tổng cộng: " + totalAll.toLocaleString("vi-VN") + "đ";
  medContainer.appendChild(totalRow);
}

// =======================
// NỘP FORM (DEMO)
// =======================
document.getElementById("prescriptionForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const patient = document.getElementById("searchPatient").value;

  if (!patient) return alert("Vui lòng chọn bệnh nhân.");
  if (selectedMedicines.length === 0)
    return alert("Vui lòng chọn ít nhất 1 loại thuốc.");

  const payload = {
    patient,
    techniques: selectedTechniques,
    medicines: selectedMedicines.map((m) => ({
      id: m.id,
      name: m.name,
      quantity: m.quantity,
      unit_price: m.price,
      total: m.total,
    })),
  };

  console.log("📦 DỮ LIỆU ĐƠN THUỐC GỬI LÊN:", payload);
  alert("💾 Đơn thuốc đã được lưu tạm (xem console để kiểm tra dữ liệu).");

  // 🧹 Reset form sau khi lưu
  document.getElementById("prescriptionForm").reset();

  // Xóa hiển thị bệnh nhân
  document.getElementById("selectedPatientInfo").style.display = "none";
  document.getElementById("selectedPatientName").textContent = "";

  // Xóa danh sách kỹ thuật và thuốc đã chọn
  selectedTechniques = [];
  selectedMedicines = [];
  document.getElementById("selectedTechniques").innerHTML = "";
  document.getElementById("selectedMedicines").innerHTML = "";
});
