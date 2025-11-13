---------------------------------------------------
-- ✅ Tạo cơ sở dữ liệu mới và sử dụng
---------------------------------------------------
CREATE DATABASE MedicalDB;
GO

---------------------------------------------------
-- MEDICALDB – TIẾNG VIỆT KHÔNG DẤU – KHÔNG CÓ KHÓA NGOẠI
-- Dành cho: FE + Use Case + ER Diagram + Demo
---------------------------------------------------
USE MedicalDB;
GO

---------------------------------------------------
-- 1. BANG: BenhNhan
---------------------------------------------------
DROP TABLE IF EXISTS dbo.BenhNhan;
GO
CREATE TABLE dbo.BenhNhan (
    MaBenhNhan INT IDENTITY(1,1) PRIMARY KEY,
    HoTen NVARCHAR(100) NOT NULL,
    NgaySinh DATE NULL,
    GioiTinh NVARCHAR(10) NULL, -- Nam/Nu/Khac
    DiaChi NVARCHAR(255) NULL,
    SoDienThoai NVARCHAR(15) NULL,
    SoCCCD NVARCHAR(20) NULL,
    SoBHYT NVARCHAR(20) NULL
);
GO

---------------------------------------------------
-- 2. BANG: PhieuKham (ĐÃ BỔ SUNG CỘT)
---------------------------------------------------
DROP TABLE IF EXISTS dbo.PhieuKham;
GO
CREATE TABLE dbo.PhieuKham (
    MaPhieu INT IDENTITY(1,1) PRIMARY KEY,
    MaBenhNhan INT NOT NULL,
    NgayKham DATETIME DEFAULT GETDATE(),
    ChanDoanSoBo NVARCHAR(500) NULL,        -- Triệu chứng
    ChanDoanChinh NVARCHAR(255) NULL,       -- Chẩn đoán chính
    ChanDoanPhu NVARCHAR(255) NULL,         -- Chẩn đoán phụ
    BacSiKham NVARCHAR(100) NULL,           -- Bác sĩ
    GhiChu NVARCHAR(500) NULL
);
GO

---------------------------------------------------
-- 3. BANG: DanhMucKyThuat (Thông tư 23)
---------------------------------------------------
DROP TABLE IF EXISTS dbo.DanhMucKyThuat;
GO
CREATE TABLE dbo.DanhMucKyThuat (
    MaKyThuat INT IDENTITY(1,1) PRIMARY KEY,
    STTChuong NVARCHAR(50) NULL,
    TenChuong NVARCHAR(255) NULL,
    MaLienKet NVARCHAR(500) NULL,
    TenKyThuat NVARCHAR(500) NULL -- Đã sửa từ MAX → 500
);
GO

---------------------------------------------------
-- 4. BANG: DanhMucThuoc
---------------------------------------------------
DROP TABLE IF EXISTS dbo.DanhMucThuoc;
GO
CREATE TABLE dbo.DanhMucThuoc (
    MaThuoc INT IDENTITY(1,1) PRIMARY KEY,
    STT INT NULL,
    HoatChat NVARCHAR(255) NULL,
    MaATC NVARCHAR(50) NULL,
    MaNoiBo NVARCHAR(100) NULL,
    NongDo NVARCHAR(100) NULL,
    DonVi NVARCHAR(50) NULL,
    DuongDung NVARCHAR(50) NULL,
    DonGia INT NULL
);
GO

---------------------------------------------------
-- 5. BANG: DonThuoc
---------------------------------------------------
DROP TABLE IF EXISTS dbo.DonThuoc;
GO
CREATE TABLE dbo.DonThuoc (
    MaDon INT IDENTITY(1,1) PRIMARY KEY,
    MaPhieu INT NOT NULL, -- Không FK
    MaThuoc INT NOT NULL, -- Không FK
    LieuDung NVARCHAR(255) NULL,
    SoLuong INT NOT NULL DEFAULT 1,
    DonGia INT NOT NULL,
    TongTien AS (SoLuong * DonGia) PERSISTED,
    NgayKe DATETIME DEFAULT GETDATE()
);
GO

---------------------------------------------------
-- 6. BANG: ChiDinhKyThuat
---------------------------------------------------
DROP TABLE IF EXISTS dbo.ChiDinhKyThuat;
GO
CREATE TABLE dbo.ChiDinhKyThuat (
    MaChiDinh INT IDENTITY(1,1) PRIMARY KEY,
    MaPhieu INT NOT NULL, -- Không FK
    MaKyThuat INT NOT NULL, -- Không FK
    GhiChu NVARCHAR(255) NULL
);
GO

---------------------------------------------------
-- 7. BANG: SinhHieu
---------------------------------------------------
DROP TABLE IF EXISTS dbo.SinhHieu;
GO
CREATE TABLE dbo.SinhHieu (
    MaSinhHieu INT IDENTITY(1,1) PRIMARY KEY,
    MaPhieu INT NOT NULL, -- Không FK
    NhietDo DECIMAL(4,1) NULL,
    HuyetAp NVARCHAR(20) NULL,
    ChieuCao INT NULL,
    CanNang DECIMAL(5,1) NULL,
    NgayDo DATETIME DEFAULT GETDATE()
);
GO

---------------------------------------------------
-- 8. BANG: TaiKhoan
---------------------------------------------------
DROP TABLE IF EXISTS dbo.TaiKhoan;
GO
CREATE TABLE dbo.TaiKhoan (
    MaTaiKhoan INT IDENTITY(1,1) PRIMARY KEY,
    TenDangNhap NVARCHAR(50) UNIQUE NOT NULL,
    MatKhau NVARCHAR(255) NOT NULL,
    HoTen NVARCHAR(100) NULL,
    VaiTro NVARCHAR(20) NULL
);
GO

---------------------------------------------------
-- 9. INDEX TỐI ƯU (KHÔNG DÙNG FK)
---------------------------------------------------
CREATE INDEX IX_PhieuKham_BenhNhan ON dbo.PhieuKham(MaBenhNhan);
CREATE INDEX IX_DonThuoc_Phieu ON dbo.DonThuoc(MaPhieu);
CREATE INDEX IX_Thuoc_HoatChat ON dbo.DanhMucThuoc(HoatChat);
CREATE NONCLUSTERED INDEX IX_KyThuat_Ten 
ON dbo.DanhMucKyThuat(TenKyThuat)
WHERE TenKyThuat IS NOT NULL;
GO


---------------------------------------------------
-- 10. IMPORT DỮ LIỆU
---------------------------------------------------
-- Danh mục kỹ thuật
BULK INSERT dbo.DanhMucKyThuat
FROM 'D:\Hệ thống y tế\Đồ án\MedicalWeb\Data\danh_muc_ky_thuat.txt'
WITH (
    FIELDTERMINATOR = '\t',
    ROWTERMINATOR = '\n',
    FIRSTROW = 2,
    CODEPAGE = '65001'
);
GO

-- Danh mục thuốc
DROP TABLE IF EXISTS dbo.ThuocTam;
GO
CREATE TABLE dbo.ThuocTam (
    STT INT NULL,
    HoatChat NVARCHAR(255),
    MaATC NVARCHAR(255),
    MaNoiBo NVARCHAR(255),
    NongDo NVARCHAR(255),
    DonVi NVARCHAR(255),
    DuongDung NVARCHAR(255),
    DonGia NVARCHAR(255)
);
GO

BULK INSERT dbo.ThuocTam
FROM 'D:\Hệ thống y tế\Đồ án\MedicalWeb\Data\Gia_thuoc_vat_tu_y_te_csv.txt'
WITH (
    FIELDTERMINATOR = '\t',
    ROWTERMINATOR = '\n',
    FIRSTROW = 2,
    CODEPAGE = '65001'
);
GO

INSERT INTO dbo.DanhMucThuoc (STT, HoatChat, MaATC, MaNoiBo, NongDo, DonVi, DuongDung, DonGia)
SELECT 
    STT,
    HoatChat,
    MaATC,
    MaNoiBo,
    NongDo,
    DonVi,
    DuongDung,
    TRY_CAST(REPLACE(REPLACE(REPLACE(REPLACE(DonGia, 'đ', ''), ',', ''), '.', ''), ' ', '') AS INT)
FROM dbo.ThuocTam;
GO

DROP TABLE dbo.ThuocTam;
GO

---------------------------------------------------
-- 11. KIỂM TRA
---------------------------------------------------
SELECT TOP 5 * FROM BenhNhan;
SELECT TOP 5 * FROM PhieuKham;
SELECT * FROM DanhMucThuoc;
SELECT TOP 5 * FROM DonThuoc;
SELECT* FROM DanhMucKyThuat;
SELECT TOP 5 * FROM SinhHieu;
SELECT TOP 5 * FROM TaiKhoan;
GO

TRUNCATE TABLE PhieuKham;
TRUNCATE TABLE DonThuoc;
