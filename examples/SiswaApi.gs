/** SiswaApi.gs — Master Data Siswa V1 */

function getStudents(token) {
  requireRole(token, "ADMIN");
  const sheet = getSheet("STUDENTS");
  if (!sheet) throw new Error("Sheet STUDENTS tidak ditemukan.");
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  const headers = values[0];
  return values.slice(1).filter(r => r.some(c => c !== "")).map((row) => {
    const o = {};
    headers.forEach((h, i) => { o[String(h)] = row[i]; });
    // google.script.run does not safely transport Date objects.
    if (o.created_at instanceof Date) o.created_at = o.created_at.toISOString();
    if (o.updated_at instanceof Date) o.updated_at = o.updated_at.toISOString();
    return o;
  });
}

function createStudent(token, data) {
  const actor = requireRole(token, "ADMIN");
  validateStudentInput_(data);
  const sheet = getSheet("STUDENTS");
  if (!sheet) throw new Error("Sheet STUDENTS tidak ditemukan.");
  const cls = getActiveClass_(data.class_id);
  const nis = String(data.nis).trim();
  const name = String(data.name).trim();
  ensureNisUnique_(sheet, nis, null);
  const id = nextStudentId_(sheet);
  const qr = uniqueQrToken_(sheet);
  const now = new Date();
  sheet.appendRow([id, nis, name, cls.class_id, qr, true, now, now]);
  if (typeof writeAuditLog === "function") writeAuditLog(actor.user_id, "CREATE", "STUDENT", id, {nis, name, class_id: cls.class_id});
  return {success:true, message:"Siswa berhasil ditambahkan.", student:{student_id:id, nis, name, class_id:cls.class_id, qr_token:qr, is_active:true, created_at:now.toISOString(), updated_at:now.toISOString()}};
}

function updateStudent(token, data) {
  const actor = requireRole(token, "ADMIN");
  if (!data || !data.student_id) throw new Error("student_id wajib diisi.");
  validateStudentInput_(data);
  const sheet = getSheet("STUDENTS");
  if (!sheet) throw new Error("Sheet STUDENTS tidak ditemukan.");
  const row = findRowByValue_(sheet, 1, data.student_id);
  if (row === -1) throw new Error("Siswa tidak ditemukan.");
  const cls = getActiveClass_(data.class_id);
  const nis = String(data.nis).trim();
  const name = String(data.name).trim();
  ensureNisUnique_(sheet, nis, data.student_id);
  const now = new Date();
  sheet.getRange(row, 2, 1, 3).setValues([[nis, name, cls.class_id]]);
  sheet.getRange(row, 8).setValue(now);
  if (typeof writeAuditLog === "function") writeAuditLog(actor.user_id, "UPDATE", "STUDENT", String(data.student_id), {nis, name, class_id:cls.class_id});
  return {success:true, message:"Siswa berhasil diperbarui."};
}

function setStudentActive(token, studentId, isActive) {
  const actor = requireRole(token, "ADMIN");
  if (!studentId) throw new Error("student_id wajib diisi.");
  const sheet = getSheet("STUDENTS");
  if (!sheet) throw new Error("Sheet STUDENTS tidak ditemukan.");
  const row = findRowByValue_(sheet, 1, studentId);
  if (row === -1) throw new Error("Siswa tidak ditemukan.");
  const active = Boolean(isActive);
  sheet.getRange(row, 6).setValue(active);
  sheet.getRange(row, 8).setValue(new Date());
  if (typeof writeAuditLog === "function") writeAuditLog(actor.user_id, active ? "ACTIVATE" : "DEACTIVATE", "STUDENT", String(studentId), {is_active:active});
  return {success:true, message:active ? "Siswa diaktifkan." : "Siswa dinonaktifkan."};
}

function validateStudentInput_(data) {
  if (!data) throw new Error("Data siswa tidak tersedia.");
  const nis = String(data.nis || "").trim();
  const name = String(data.name || "").trim();
  const classId = String(data.class_id || "").trim();
  if (!nis) throw new Error("NIS wajib diisi.");
  if (!name) throw new Error("Nama siswa wajib diisi.");
  if (!classId) throw new Error("Kelas wajib dipilih.");
  if (nis.length > 50) throw new Error("NIS maksimal 50 karakter.");
  if (name.length > 150) throw new Error("Nama siswa maksimal 150 karakter.");
}

function ensureNisUnique_(sheet, nis, exceptId) {
  const rows = sheet.getDataRange().getValues();
  for (let i=1;i<rows.length;i++) {
    const id = String(rows[i][0] || "").trim();
    const existing = String(rows[i][1] || "").trim().toLowerCase();
    if (existing === nis.toLowerCase() && id !== String(exceptId || "").trim()) throw new Error("NIS sudah digunakan.");
  }
}

function getActiveClass_(classId) {
  const sheet = getSheet("CLASSES");
  if (!sheet) throw new Error("Sheet CLASSES tidak ditemukan.");
  const row = findRowByValue_(sheet, 1, classId);
  if (row === -1) throw new Error("Kelas tidak ditemukan.");
  const v = sheet.getRange(row,1,1,6).getValues()[0];
  const active = v[3] === true || String(v[3]).toUpperCase() === "TRUE";
  if (!active) throw new Error("Kelas yang dipilih sedang nonaktif.");
  return {class_id:String(v[0]).trim(), name:String(v[1]).trim(), grade:String(v[2]).trim()};
}

function nextStudentId_(sheet) {
  const rows = sheet.getDataRange().getValues(); let max=0;
  for (let i=1;i<rows.length;i++) { const m=String(rows[i][0]||"").match(/^STD(\d+)$/); if(m) max=Math.max(max, Number(m[1])); }
  return "STD" + String(max+1).padStart(3,"0");
}

function uniqueQrToken_(sheet) {
  const used = new Set(sheet.getDataRange().getValues().slice(1).map(r=>String(r[4]||"").trim()).filter(Boolean));
  let token;
  do { token=Utilities.getUuid().replace(/-/g,"")+Utilities.getUuid().replace(/-/g,""); } while(used.has(token));
  return token;
}
