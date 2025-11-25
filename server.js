// backend/server.js
require('dotenv').config();
const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const path = require('path');

const app = express();

// =======================
// MIDDLEWARE
// =======================
app.use(cors());
app.use(express.json());

// =======================
// KẾT NỐI DB
// =======================
const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: { encrypt: false, trustServerCertificate: true }
};

let pool;
async function connectDB() {
    try {
        pool = await sql.connect(config);
        console.log('DB kết nối thành công!');
    } catch (err) {
        console.error('Lỗi kết nối DB:', err.message);
        process.exit(1);
    }
}
connectDB();

// =======================
// API ROUTES (TẤT CẢ TRƯỚC STATIC!)
// =======================

// === Tìm bệnh nhân ===
app.get('/api/patients/search', async (req, res) => {
    const { q = '' } = req.query;
    try {
        const result = await pool.request()
            .input('q', `%${q}%`)
            .input('qStart', `${q}%`)
            .query(`
                SELECT TOP 50
                    MaBenhNhan AS id, 
                    HoTen AS name, 
                    CONVERT(VARCHAR(10), NgaySinh, 23) AS dob, 
                    GioiTinh AS gender, 
                    DiaChi AS address, 
                    SoDienThoai AS phone, 
                    SoCCCD AS cccd, 
                    SoBHYT AS bhyt,
                    CASE 
                        WHEN HoTen LIKE @qStart THEN 1
                        WHEN HoTen LIKE @q THEN 2
                        WHEN SoDienThoai LIKE @qStart THEN 3
                        WHEN SoCCCD LIKE @qStart THEN 4
                        WHEN SoBHYT LIKE @qStart THEN 5
                        ELSE 6
                    END AS Priority
                FROM BenhNhan 
                WHERE HoTen LIKE @q 
                   OR SoDienThoai LIKE @q 
                   OR SoCCCD LIKE @q 
                   OR SoBHYT LIKE @q
                ORDER BY Priority, HoTen
            `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Lỗi tìm bệnh nhân:', err);
        res.status(500).json({ error: err.message });
    }
});

// === Tìm thuốc ===
app.get('/api/thuoc/search', async (req, res) => {
    const { q = '' } = req.query;
    try {
        const result = await pool.request()
            .input('q', `%${q}%`)
            .query(`
                SELECT TOP 30
                    MaThuoc AS id, 
                    HoatChat AS name, 
                    ISNULL(DonGia, 0) AS price 
                FROM DanhMucThuoc 
                WHERE HoatChat LIKE @q
                ORDER BY HoatChat
            `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === Tìm kỹ thuật ===
// app.get('/api/kythuat/search', async (req, res) => {
//     const { q = '' } = req.query;
//     try {
//         const result = await pool.request()
//             .input('q', `%${q}%`)
//             .query(`SELECT MaKyThuat AS id, TenKyThuat AS name, ISNULL(DonGia, 0) AS price 
//                     FROM DanhMucKyThuat WHERE TenKyThuat LIKE @q`);
//         res.json(result.recordset);
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// });
// === Tìm kỹ thuật (TẠM THỜI - KHÔNG CẦN DonGia) ===
app.get('/api/kythuat/search', async (req, res) => {
    const { q = '' } = req.query;
    try {
        const result = await pool.request()
            .input('q', `%${q}%`)
            .query(`
                SELECT TOP 30
                    MaKyThuat AS id, 
                    TenKyThuat AS name,
                    0 AS price  -- GIÁ CỐ ĐỊNH = 0
                FROM DanhMucKyThuat 
                WHERE TenKyThuat LIKE @q
                ORDER BY TenKyThuat
            `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Lỗi tìm kỹ thuật:', err);
        res.status(500).json({ error: err.message });
    }
});

// === Đăng nhập ===
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.request()
            .input('username', username)
            .input('password', password)
            .query(`SELECT MaTaiKhoan, TenDangNhap, HoTen, VaiTro 
                    FROM TaiKhoan 
                    WHERE TenDangNhap = @username AND MatKhau = @password`);
        
        if (result.recordset.length === 0) {
            return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
        }
        
        const user = result.recordset[0];
        res.json({
            MaTaiKhoan: user.MaTaiKhoan,
            TenDangNhap: user.TenDangNhap,
            HoTen: user.HoTen,
            VaiTro: user.VaiTro
        });
    } catch (err) {
        console.error('Lỗi đăng nhập:', err);
        res.status(500).json({ error: err.message });
    }
});

// === Tạo bệnh nhân ===
app.post('/api/patient', async (req, res) => {
    const { name, dob, gender, address, phone, cccd, bhyt } = req.body;
    try {
        const result = await pool.request()
            .input('HoTen', name)
            .input('NgaySinh', dob)
            .input('GioiTinh', gender)
            .input('DiaChi', address)
            .input('SoDienThoai', phone)
            .input('SoCCCD', cccd)
            .input('SoBHYT', bhyt)
            .query(`INSERT INTO BenhNhan (HoTen, NgaySinh, GioiTinh, DiaChi, SoDienThoai, SoCCCD, SoBHYT)
                    OUTPUT INSERTED.MaBenhNhan 
                    VALUES (@HoTen, @NgaySinh, @GioiTinh, @DiaChi, @SoDienThoai, @SoCCCD, @SoBHYT)`);
        res.json({ id: result.recordset[0].MaBenhNhan });
    } catch (err) {
        console.error('Lỗi tạo bệnh nhân:', err);
        res.status(500).json({ error: err.message });
    }
});

// === Cập nhật bệnh nhân ===
app.put('/api/patient/:id', async (req, res) => {
    const { id } = req.params;
    const { name, dob, gender, address, phone, cccd, bhyt } = req.body;
    try {
        await pool.request()
            .input('MaBenhNhan', id)
            .input('HoTen', name)
            .input('NgaySinh', dob)
            .input('GioiTinh', gender)
            .input('DiaChi', address)
            .input('SoDienThoai', phone)
            .input('SoCCCD', cccd)
            .input('SoBHYT', bhyt)
            .query(`UPDATE BenhNhan 
                    SET HoTen=@HoTen, NgaySinh=@NgaySinh, GioiTinh=@GioiTinh, 
                        DiaChi=@DiaChi, SoDienThoai=@SoDienThoai, SoCCCD=@SoCCCD, SoBHYT=@SoBHYT 
                    WHERE MaBenhNhan=@MaBenhNhan`);
        res.json({ success: true });
    } catch (err) {
        console.error('Lỗi cập nhật bệnh nhân:', err);
        res.status(500).json({ error: err.message });
    }
});

// === Xóa bệnh nhân ===
app.delete('/api/patient/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.request()
            .input('MaBenhNhan', id)
            .query(`DELETE FROM BenhNhan WHERE MaBenhNhan=@MaBenhNhan`);
        res.json({ success: true });
    } catch (err) {
        console.error('Lỗi xóa bệnh nhân:', err);
        res.status(500).json({ error: err.message });
    }
});

// === Lấy thông tin bệnh nhân theo ID ===
app.get('/api/patient/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.request()
            .input('id', id)
            .query(`SELECT MaBenhNhan AS id, HoTen AS name, NgaySinh AS dob, GioiTinh AS gender,
                           DiaChi AS address, SoDienThoai AS phone, SoCCCD AS cccd, SoBHYT AS bhyt
                    FROM BenhNhan WHERE MaBenhNhan = @id`);
        if (result.recordset.length === 0) return res.status(404).json({ error: "Không tìm thấy" });
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Lỗi lấy bệnh nhân:', err);
        res.status(500).json({ error: err.message });
    }
});

// === Lấy danh sách lần khám của bệnh nhân ===
app.get('/api/patient/:id/visits', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.request()
            .input('id', id)
            .query(`SELECT 
                      MaPhieu AS id, 
                      NgayKham AS date, 
                      BacSiKham AS doctor,
                      ChanDoanChinh AS mainDiagnosis,
                      ChanDoanPhu AS subDiagnosis,
                      ChanDoanSoBo AS symptoms
                    FROM PhieuKham 
                    WHERE MaBenhNhan = @id
                    ORDER BY NgayKham DESC`);
        res.json(result.recordset);
    } catch (err) {
        console.error('Lỗi lấy lịch sử khám:', err);
        res.status(500).json({ error: err.message });
    }
});

// === Lưu phiếu khám (tạo visit) ===
app.post('/api/diagnosis', async (req, res) => {
    const { patientId, doctor, mainDiagnosis, subDiagnosis, symptoms, notes, 
            temperature, bloodPressure, height, weight } = req.body;
    try {
        const transaction = pool.transaction();
        await transaction.begin();

        // Lưu phiếu khám
        const visitResult = await transaction.request()
            .input('MaBenhNhan', patientId)
            .input('BacSiKham', doctor)
            .input('ChanDoanChinh', mainDiagnosis)
            .input('ChanDoanPhu', subDiagnosis)
            .input('ChanDoanSoBo', symptoms)
            .input('GhiChu', notes)
            .query(`
                INSERT INTO PhieuKham 
                (MaBenhNhan, BacSiKham, ChanDoanChinh, ChanDoanPhu, ChanDoanSoBo, GhiChu)
                OUTPUT INSERTED.MaPhieu AS id
                VALUES (@MaBenhNhan, @BacSiKham, @ChanDoanChinh, @ChanDoanPhu, @ChanDoanSoBo, @GhiChu)
            `);
        
        const visitId = visitResult.recordset[0].id;

        // Lưu sinh hiệu nếu có
        if (temperature || bloodPressure || height || weight) {
            await transaction.request()
                .input('MaPhieu', visitId)
                .input('NhietDo', temperature || null)
                .input('HuyetAp', bloodPressure || null)
                .input('ChieuCao', height || null)
                .input('CanNang', weight || null)
                .query(`
                    INSERT INTO SinhHieu (MaPhieu, NhietDo, HuyetAp, ChieuCao, CanNang)
                    VALUES (@MaPhieu, @NhietDo, @HuyetAp, @ChieuCao, @CanNang)
                `);
        }

        await transaction.commit();
        res.json({ success: true, visitId });
    } catch (err) {
        console.error('Lỗi lưu phiếu khám:', err);
        res.status(500).json({ error: err.message });
    }
});

// === Lấy danh sách lần khám của bệnh nhân ===
app.get('/api/visits/:patientId', async (req, res) => {
    const { patientId } = req.params;
    try {
        const result = await pool.request()
            .input('patientId', patientId)
            .query(`
                SELECT 
                    MaPhieu AS visitId,
                    NgayKham AS ngayKham,
                    ChanDoanChinh AS chanDoan
                FROM PhieuKham
                WHERE MaBenhNhan = @patientId
                ORDER BY NgayKham DESC
            `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Lỗi lấy lịch sử khám:', err);
        res.status(500).json({ error: err.message });
    }
});

// === Lấy đơn thuốc theo lần khám ===
app.get('/api/visit/:visitId/prescription', async (req, res) => {
    const { visitId } = req.params;
    try {
        const result = await pool.request()
            .input('visitId', visitId)
            .query(`SELECT 
                      t.HoatChat AS name, 
                      dt.SoLuong AS quantity,
                      dt.DonGia AS price
                    FROM DonThuoc dt
                    JOIN DanhMucThuoc t ON dt.MaThuoc = t.MaThuoc
                    WHERE dt.MaPhieu = @visitId`);
        res.json(result.recordset);
    } catch (err) {
        console.error('Lỗi lấy đơn thuốc:', err);
        res.status(500).json({ error: err.message });
    }
});

// === Lấy kỹ thuật theo lần khám ===
app.get('/api/visit/:visitId/techniques', async (req, res) => {
    const { visitId } = req.params;
    try {
        const result = await pool.request()
            .input('visitId', visitId)
            .query(`SELECT 
                      k.TenKyThuat AS name,
                      k.DonGia AS price
                    FROM ChiDinhKyThuat ct
                    JOIN DanhMucKyThuat k ON ct.MaKyThuat = k.MaKyThuat
                    WHERE ct.MaPhieu = @visitId`);
        res.json(result.recordset);
    } catch (err) {
        console.error('Lỗi lấy kỹ thuật:', err);
        res.status(500).json({ error: err.message });
    }
});

// =======================
// API: LƯU ĐƠN THUỐC
// =======================
app.post('/api/prescription', async (req, res) => {
  const { visitId, medicines } = req.body; // medicines = [{ id, quantity, price }]

  if (!Array.isArray(medicines) || medicines.length === 0) {
    return res.status(400).json({ error: "Chưa chọn thuốc" });
  }

  try {
    const transaction = pool.transaction();
    await transaction.begin();

    for (const m of medicines) {
      await transaction.request()
        .input('MaPhieu', visitId || null)
        .input('MaThuoc', m.id)
        .input('SoLuong', m.quantity)
        .input('DonGia', m.price)
        .query(`
          INSERT INTO DonThuoc (MaPhieu, MaThuoc, SoLuong, DonGia)
          VALUES (@MaPhieu, @MaThuoc, @SoLuong, @DonGia)
        `);
    }

    await transaction.commit();
    const total = medicines.reduce((sum, m) => sum + m.quantity * m.price, 0);
    res.json({ success: true, total });
  } catch (err) {
    console.error('Lỗi lưu đơn thuốc:', err);
    res.status(500).json({ error: err.message });
  }
});

// =======================
// API: LƯU CHỈ ĐỊNH KỸ THUẬT
// =======================
app.post('/api/technique', async (req, res) => {
  const { visitId, techniques } = req.body; // techniques = [{ id }]

  if (!Array.isArray(techniques) || techniques.length === 0) {
    return res.status(400).json({ error: "Chưa chọn kỹ thuật" });
  }

  try {
    const transaction = pool.transaction();
    await transaction.begin();

    for (const t of techniques) {
      await transaction.request()
        .input('MaPhieu', visitId || null)
        .input('MaKyThuat', t.id)
        .query(`
          INSERT INTO ChiDinhKyThuat (MaPhieu, MaKyThuat)
          VALUES (@MaPhieu, @MaKyThuat)
        `);
    }

    await transaction.commit();
    res.json({ success: true });
  } catch (err) {
    console.error('Lỗi lưu kỹ thuật:', err);
    res.status(500).json({ error: err.message });
  }
});

// =======================
// PHỤC VỤ FILE TĨNH (SAU API!)
// =======================
app.use(express.static(path.join(__dirname, 'frontend')));

// Catch-all: Chỉ trả HTML cho route không phải /api
app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API không tồn tại' });
    }
    res.sendFile(path.join(__dirname, 'frontend/MedicalWeb.html'));
});

// =======================
// KHỞI ĐỘNG
// =======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server chạy tại: http://localhost:${PORT}`);
    console.log(`Test API: http://localhost:${PORT}/api/patients/search?q=a`);
    console.log(`Demo HIS: http://localhost:${PORT}/MedicalWeb.html`);
});