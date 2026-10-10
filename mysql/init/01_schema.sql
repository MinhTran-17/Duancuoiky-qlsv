-- Khởi tạo CSDL Quản lý Sinh viên (chỉ chạy lần đầu khi volume MySQL còn trống)
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS lop (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  ma_lop   VARCHAR(20)  NOT NULL UNIQUE,
  ten_lop  VARCHAR(100) NOT NULL,
  khoa     VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sinh_vien (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  mssv       VARCHAR(20)  NOT NULL UNIQUE,
  ho_ten     VARCHAR(100) NOT NULL,
  ngay_sinh  DATE NULL,
  gioi_tinh  ENUM('Nam','Nữ','Khác') NULL,
  email      VARCHAR(100) NULL,
  lop_id     INT NOT NULL,
  CONSTRAINT fk_sv_lop FOREIGN KEY (lop_id) REFERENCES lop(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mon_hoc (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  ma_mon      VARCHAR(20)  NOT NULL UNIQUE,
  ten_mon     VARCHAR(150) NOT NULL,
  so_tin_chi  TINYINT NOT NULL CHECK (so_tin_chi BETWEEN 1 AND 10)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS diem (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  sinh_vien_id  INT NOT NULL,
  mon_hoc_id    INT NOT NULL,
  diem_qt       DECIMAL(4,2) NOT NULL CHECK (diem_qt BETWEEN 0 AND 10),
  diem_thi      DECIMAL(4,2) NOT NULL CHECK (diem_thi BETWEEN 0 AND 10),
  UNIQUE KEY uq_sv_mon (sinh_vien_id, mon_hoc_id),
  CONSTRAINT fk_diem_sv  FOREIGN KEY (sinh_vien_id) REFERENCES sinh_vien(id) ON DELETE CASCADE,
  CONSTRAINT fk_diem_mon FOREIGN KEY (mon_hoc_id)   REFERENCES mon_hoc(id)   ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dữ liệu mẫu
INSERT INTO lop (ma_lop, ten_lop, khoa) VALUES
  ('CNTT-K23A', 'Công nghệ thông tin K23A', 'Công nghệ thông tin'),
  ('KTPM-K23A', 'Kỹ thuật phần mềm K23A', 'Công nghệ thông tin'),
  ('HTTT-K23A', 'Hệ thống thông tin K23A', 'Hệ thống thông tin');

INSERT INTO sinh_vien (mssv, ho_ten, ngay_sinh, gioi_tinh, email, lop_id) VALUES
  ('DTC2301001', 'Nguyễn Văn An',   '2005-03-12', 'Nam', 'an.nv@example.com',   1),
  ('DTC2301002', 'Trần Thị Bình',   '2005-07-25', 'Nữ',  'binh.tt@example.com', 1),
  ('DTC2301003', 'Lê Hoàng Cường',  '2005-01-08', 'Nam', 'cuong.lh@example.com', 2),
  ('DTC2301004', 'Phạm Thu Dung',   '2005-11-30', 'Nữ',  'dung.pt@example.com', 2),
  ('DTC2301005', 'Hoàng Minh Đức',  '2005-05-19', 'Nam', 'duc.hm@example.com',  3);

INSERT INTO mon_hoc (ma_mon, ten_mon, so_tin_chi) VALUES
  ('TKQT', 'Triển khai và quản trị hệ thống phần mềm', 3),
  ('CSDL', 'Cơ sở dữ liệu', 3),
  ('LTW',  'Lập trình Web', 3);

INSERT INTO diem (sinh_vien_id, mon_hoc_id, diem_qt, diem_thi) VALUES
  (1, 1, 8.5, 7.0), (1, 2, 9.0, 8.5),
  (2, 1, 7.0, 6.5), (3, 3, 8.0, 9.0),
  (4, 2, 6.5, 7.5), (5, 1, 9.5, 9.0);
