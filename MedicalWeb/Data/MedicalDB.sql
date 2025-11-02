---------------------------------------------------
-- ✅ Tạo cơ sở dữ liệu mới và sử dụng
---------------------------------------------------
CREATE DATABASE MedicalDB;
GO

USE MedicalDB;
GO

---------------------------------------------------
-- 1️⃣ Bảng medical_techniques
---------------------------------------------------
DROP TABLE IF EXISTS dbo.medical_techniques;
GO

CREATE TABLE dbo.medical_techniques (
    id INT IDENTITY(1,1) PRIMARY KEY,  
    chapter_order INT NULL,
    chapter_name NVARCHAR(255) NULL,
    link_code NVARCHAR(255) NULL,
    technique_name NVARCHAR(MAX) NULL
);
GO

---------------------------------------------------
-- 2️⃣ Bảng patients
---------------------------------------------------
DROP TABLE IF EXISTS dbo.patients;
GO

CREATE TABLE dbo.patients (
  id INT IDENTITY(1,1) PRIMARY KEY,
  full_name NVARCHAR(255),
  date_of_birth DATE,
  gender NVARCHAR(255),
  address NVARCHAR(255),
  phone_number NVARCHAR(255)
);
GO

---------------------------------------------------
-- 3️⃣ Bảng medicines (8 cột cần dùng)
---------------------------------------------------
DROP TABLE IF EXISTS dbo.medicines;
GO

CREATE TABLE dbo.medicines (
  id INT IDENTITY(1,1) PRIMARY KEY,
  active_ingredient NVARCHAR(255),           -- Tên hoạt chất
  atc_code NVARCHAR(255),                    -- Mã ATC
  internal_code NVARCHAR(255),               -- Mã nội bộ
  concentration NVARCHAR(255),               -- Nồng độ / hàm lượng
  unit NVARCHAR(255),                        -- Đơn vị
  route_of_administration NVARCHAR(255),     -- Đường dùng
  unit_price INT                             -- Đơn giá (VNĐ)
);
GO

---------------------------------------------------
-- 4️⃣ Bảng technique_medicine
---------------------------------------------------
DROP TABLE IF EXISTS dbo.technique_medicine;
GO

CREATE TABLE dbo.technique_medicine (
  id INT IDENTITY(1,1) PRIMARY KEY,
  technique_id INT NOT NULL,
  medicine_id INT NOT NULL,
  dosage NVARCHAR(255),
  note TEXT
);
GO

---------------------------------------------------
-- 5️⃣ Bảng patient_techniques
---------------------------------------------------
DROP TABLE IF EXISTS dbo.patient_techniques;
GO

CREATE TABLE dbo.patient_techniques (
  id INT IDENTITY(1,1) PRIMARY KEY,
  patient_id INT NOT NULL,
  technique_id INT NOT NULL,
  performed_date DATETIME,
  performed_by NVARCHAR(255),
  notes TEXT
);
GO

---------------------------------------------------
-- 6️⃣ Mô tả cột
---------------------------------------------------
EXEC sp_addextendedproperty
@name = N'Column_Description',
@value = N'Đơn giá (VNĐ)',
@level0type = N'Schema', @level0name = N'dbo',
@level1type = N'Table',  @level1name = N'medicines',
@level2type = N'Column', @level2name = N'unit_price';
GO

---------------------------------------------------
-- 7️⃣ Import dữ liệu vào bảng medical_techniques
---------------------------------------------------
BULK INSERT dbo.medical_techniques
FROM 'D:\danh_muc_ky_thuat.txt'
WITH (
    FIELDTERMINATOR = '\t',
    ROWTERMINATOR = '\n',
    FIRSTROW = 2,
    CODEPAGE = '65001',
    DATAFILETYPE = 'char',
    MAXERRORS = 0,
    TABLOCK
);
GO

---------------------------------------------------
-- 4️⃣ Bảng tạm để import dữ liệu thuốc
---------------------------------------------------
DROP TABLE IF EXISTS dbo.medicines_stage;
GO

CREATE TABLE dbo.medicines_stage (
    stt INT NULL,
    active_ingredient NVARCHAR(255),
    atc_code NVARCHAR(255),
    internal_code NVARCHAR(255),
    concentration NVARCHAR(255),
    unit NVARCHAR(255),
    route_of_administration NVARCHAR(255),
    unit_price NVARCHAR(255)
);
GO

---------------------------------------------------
-- 5️⃣ Import dữ liệu từ file thuốc
---------------------------------------------------
BULK INSERT dbo.medicines_stage
FROM 'D:\Gia_thuoc_vat_tu_y_te_csv.txt'
WITH (
    DATAFILETYPE = 'widechar',
    FIELDTERMINATOR = '\t',
    ROWTERMINATOR = '\n',
    FIRSTROW = 2,
    CODEPAGE = '65001',
    KEEPNULLS,
    TABLOCK
);
GO

---------------------------------------------------
-- 6️⃣ Nạp vào bảng chính (bỏ qua cột STT, ép giá về INT)
---------------------------------------------------
INSERT INTO dbo.medicines (
    active_ingredient,
    atc_code,
    internal_code,
    concentration,
    unit,
    route_of_administration,
    unit_price
)
SELECT
    active_ingredient,
    atc_code,
    internal_code,
    concentration,
    unit,
    route_of_administration,
    TRY_CAST(
        REPLACE(REPLACE(REPLACE(REPLACE(unit_price, 'đ', ''), ',', ''), '.', ''), ' ', '')
    AS INT)
FROM dbo.medicines_stage;
GO

---------------------------------------------------
-- 1️⃣1️⃣ Kiểm tra kết quả
---------------------------------------------------
SELECT  * FROM dbo.medical_techniques;
SELECT  * FROM dbo.medicines;
GO

/*
SELECT COUNT(*) AS Total_Rows,
       COUNT(unit_price) AS NonNull_Prices,
       COUNT(*) - COUNT(unit_price) AS Null_Prices
FROM dbo.medicines;
GO

SELECT DISTINCT unit_price
FROM dbo.medicines_stage
WHERE TRY_CAST(
    LTRIM(RTRIM(
        REPLACE(REPLACE(REPLACE(REPLACE(unit_price, 'đ', ''), ',', ''), '.', ''), ' ', '')
    )) AS INT
) IS NULL
AND unit_price IS NOT NULL;
GO

*/

DROP TABLE IF EXISTS dbo.prescriptions;
GO

CREATE TABLE dbo.prescriptions (
  id INT IDENTITY(1,1) PRIMARY KEY,
  patient_id INT NOT NULL,
  technique_id INT NOT NULL,
  medicine_id INT NOT NULL,
  dosage NVARCHAR(255),
  quantity INT,
  unit_price INT,                  -- Lưu giá thuốc tại thời điểm kê
  total_price AS (quantity * unit_price) PERSISTED,  -- Có thể tính toán được
  prescribed_date DATETIME DEFAULT GETDATE(),
/*  FOREIGN KEY (patient_id) REFERENCES dbo.patients(id),
  FOREIGN KEY (technique_id) REFERENCES dbo.medical_techniques(id),
  FOREIGN KEY (medicine_id) REFERENCES dbo.medicines(id) */
);
GO

---------------------------------------------------
-- Cập nhật bảng prescriptions: bỏ cột technique_id
---------------------------------------------------
ALTER TABLE dbo.prescriptions
DROP COLUMN technique_id;
GO


---------------------------------------------------
-- Bảng trung gian: prescription_techniques
-- Mỗi dòng đại diện cho 1 kỹ thuật thuộc 1 đơn thuốc
---------------------------------------------------
DROP TABLE IF EXISTS dbo.prescription_techniques;
GO

CREATE TABLE dbo.prescription_techniques (
    id INT IDENTITY(1,1) PRIMARY KEY,
    prescription_id INT NOT NULL,
    technique_id INT NOT NULL,
    note NVARCHAR(255) NULL,
     /* FOREIGN KEY (prescription_id) REFERENCES dbo.prescriptions(id),
    FOREIGN KEY (technique_id) REFERENCES dbo.medical_techniques(id) */
);
GO

