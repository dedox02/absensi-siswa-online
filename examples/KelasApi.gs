/**
 * Kelas.gs — Master Data Kelas V1
 *
 * Security:
 * - Semua operasi backend membutuhkan token.
 * - Hanya ADMIN yang boleh CRUD kelas.
 * - Actor/role TIDAK dipercaya dari client; identitas diambil dari token.
 * - Validasi input dilakukan di server.
 *
 * Sheet: CLASSES
 * Columns:
 * class_id | name | grade | is_active | created_at | updated_at
 */

function getClasses(token) {
  requireRole(token, "ADMIN");

  const sheet = getSheet("CLASSES");
  if (!sheet) throw new Error("Sheet CLASSES tidak ditemukan.");

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  const headers = values[0];

  return values.slice(1)
    .filter(row => row.some(cell => cell !== ""))
    .map(row => rowToObject_(headers, row));
}

function createClass(token, data) {
  const actor = requireRole(token, "ADMIN");
  validateClassInput_(data);

  const sheet = getSheet("CLASSES");
  if (!sheet) throw new Error("Sheet CLASSES tidak ditemukan.");

  const now = new Date();
  const classId = generateClassId_(sheet);
  const name = String(data.name).trim();
  const grade = String(data.grade).trim();

  ensureClassNameUnique_(sheet, name, null);

  sheet.appendRow([
    classId,
    name,
    grade,
    true,
    now,
    now
  ]);

  if (typeof writeAuditLog === "function") {
    writeAuditLog(
      actor.user_id,
      "CREATE",
      "CLASS",
      classId,
      { name: name, grade: grade }
    );
  }

  return {
    success: true,
    message: "Kelas berhasil ditambahkan.",
    class: {
      class_id: classId,
      name: name,
      grade: grade,
      is_active: true,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    }
  };
}

function updateClass(token, data) {
  const actor = requireRole(token, "ADMIN");

  if (!data || !data.class_id) {
    throw new Error("class_id wajib diisi.");
  }

  validateClassInput_(data);

  const sheet = getSheet("CLASSES");
  if (!sheet) throw new Error("Sheet CLASSES tidak ditemukan.");

  const rowIndex = findRowByValue_(sheet, 1, data.class_id);
  if (rowIndex === -1) {
    throw new Error("Kelas tidak ditemukan.");
  }

  const name = String(data.name).trim();
  const grade = String(data.grade).trim();

  ensureClassNameUnique_(sheet, name, data.class_id);

  const now = new Date();

  // is_active hanya diubah bila client mengirim boolean eksplisit.
  // Jika tidak dikirim, pertahankan nilai yang ada — jangan reaktivasi
  // diam-diam saat admin mengedit nama/tingkat kelas nonaktif.
  let isActive;
  if (data.is_active === true || data.is_active === false) {
    isActive = data.is_active;
  } else {
    const cur = sheet.getRange(rowIndex, 4).getValue();
    isActive = cur === true || String(cur).toUpperCase() === "TRUE";
  }

  sheet.getRange(rowIndex, 2, 1, 3).setValues([[
    name,
    grade,
    isActive
  ]]);

  sheet.getRange(rowIndex, 6).setValue(now);

  if (typeof writeAuditLog === "function") {
    writeAuditLog(
      actor.user_id,
      "UPDATE",
      "CLASS",
      String(data.class_id),
      { name: name, grade: grade, is_active: isActive }
    );
  }

  return {
    success: true,
    message: "Kelas berhasil diperbarui."
  };
}

function setClassActive(token, classId, isActive) {
  const actor = requireRole(token, "ADMIN");

  if (!classId) throw new Error("class_id wajib diisi.");

  const sheet = getSheet("CLASSES");
  if (!sheet) throw new Error("Sheet CLASSES tidak ditemukan.");

  const rowIndex = findRowByValue_(sheet, 1, classId);
  if (rowIndex === -1) throw new Error("Kelas tidak ditemukan.");

  const active = Boolean(isActive);

  sheet.getRange(rowIndex, 4).setValue(active);
  sheet.getRange(rowIndex, 6).setValue(new Date());

  if (typeof writeAuditLog === "function") {
    writeAuditLog(
      actor.user_id,
      active ? "ACTIVATE" : "DEACTIVATE",
      "CLASS",
      String(classId),
      { is_active: active }
    );
  }

  return {
    success: true,
    message: active
      ? "Kelas diaktifkan."
      : "Kelas dinonaktifkan."
  };
}

function validateClassInput_(data) {
  if (!data) throw new Error("Data kelas tidak tersedia.");

  const name = String(data.name || "").trim();
  const grade = String(data.grade || "").trim();

  if (!name) throw new Error("Nama kelas wajib diisi.");
  if (!grade) throw new Error("Tingkat/kelas wajib diisi.");

  if (name.length > 100) {
    throw new Error("Nama kelas maksimal 100 karakter.");
  }

  if (grade.length > 30) {
    throw new Error("Tingkat maksimal 30 karakter.");
  }
}

function ensureClassNameUnique_(sheet, name, exceptClassId) {
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const existingId = String(row[0] || "").trim();
    const existingName = String(row[1] || "").trim().toLowerCase();

    if (
      existingName === name.toLowerCase() &&
      existingId !== String(exceptClassId || "").trim()
    ) {
      throw new Error("Nama kelas sudah digunakan.");
    }
  }
}

function generateClassId_(sheet) {
  const values = sheet.getDataRange().getValues();
  let max = 0;

  for (let i = 1; i < values.length; i++) {
    const id = String(values[i][0] || "");
    const match = id.match(/^CLS(\d+)$/);

    if (match) {
      max = Math.max(max, Number(match[1]));
    }
  }

  return "CLS" + String(max + 1).padStart(3, "0");
}

function findRowByValue_(sheet, columnNumber, value) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;

  const values = sheet
    .getRange(2, columnNumber, lastRow - 1, 1)
    .getValues();

  const target = String(value).trim();

  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim() === target) {
      return i + 2;
    }
  }

  return -1;
}

function rowToObject_(headers, row) {
  const obj = {};

  headers.forEach((header, index) => {
    let v = row[index];
    // google.script.run gagal mengirim objek Date ke client;
    // kirim sebagai ISO string agar callback sukses selalu jalan.
    if (Object.prototype.toString.call(v) === "[object Date]") {
      v = v.toISOString();
    }
    obj[String(header)] = v;
  });

  return obj;
}
