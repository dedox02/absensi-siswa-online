/**
 * AttendanceApi.gs — Tahap 12
 * Attendance Recording (QR scan + jalur manual dasar)
 *
 * Review Muse atas batch Luna v1 (2026-09-30):
 * - FIX KRITIS: requireAuth(token) di runtime mengembalikan objek user LANGSUNG,
 *   bukan {user}. Kode batch memakai auth.user -> selalu throw. Diperbaiki.
 * - FIX: nama tab adalah ATTENDANCE (singular), bukan ATTENDANCES.
 * - FIX: writeAuditLog() melakukan JSON.stringify sendiri — kirim objek, bukan string
 *   (double-stringify seperti bug Tahap 8).
 * - Tambahan: listSessionAttendances menyertakan student_name (join server-side
 *   dari STUDENTS); qr_token TIDAK diekspos ke client.
 *
 * Scope:
 * - QR token lookup (token existing dari Tahap 7; tidak dibuat/dirotasi)
 * - CARD_SCAN attendance (status HADIR)
 * - TEACHER_MANUAL attendance (jalur manual dasar, tetap tervalidasi penuh)
 * - server-side validation, duplicate prevention, attendance listing
 *
 * Tidak mengubah Session lifecycle, reschedule, correction, holiday correction,
 * reporting/rekap.
 */

function attendanceGetSheet_() { return getSheet('ATTENDANCE'); }
function attendanceGetStudentSheet_() { return getSheet('STUDENTS'); }
function attendanceGetSessionSheet_() { return getSheet('SESSIONS'); }

function attendanceHeaders_() {
  return ['attendance_id','session_id','student_id','status','method','recorded_at','note','created_at','updated_at'];
}

function attendanceSheetHeaders_() {
  var sh = attendanceGetSheet_();
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
}

function attendanceFindRow_(sheet, col, value) {
  var last = sheet.getLastRow();
  if (last < 2) return -1;
  var values = sheet.getRange(2, col, last - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]) === String(value)) return i + 2;
  }
  return -1;
}

function attendanceRowObject_(headers, row) {
  var out = {};
  headers.forEach(function(h, i) { out[h] = row[i]; });
  return out;
}

function attendanceFindSession_(sessionId) {
  var sh = attendanceGetSessionSheet_();
  var row = attendanceFindRow_(sh, 1, sessionId);
  if (row < 0) throw new Error('Session tidak ditemukan.');
  return attendanceRowObject_(
    sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String),
    sh.getRange(row, 1, 1, sh.getLastColumn()).getValues()[0]
  );
}

function attendanceFindStudentById_(studentId) {
  var sh = attendanceGetStudentSheet_();
  var row = attendanceFindRow_(sh, 1, studentId);
  if (row < 0) throw new Error('Siswa tidak ditemukan.');
  return attendanceRowObject_(
    sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String),
    sh.getRange(row, 1, 1, sh.getLastColumn()).getValues()[0]
  );
}

function attendanceFindStudentByQr_(qrToken) {
  if (!qrToken || !String(qrToken).trim()) throw new Error('QR token kosong.');

  var sh = attendanceGetStudentSheet_();
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  var qrCol = headers.indexOf('qr_token') + 1;
  if (qrCol < 1) throw new Error('Kolom qr_token tidak ditemukan.');

  var last = sh.getLastRow();
  if (last < 2) throw new Error('QR siswa tidak valid.');

  var rows = sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][qrCol - 1]) === String(qrToken).trim()) {
      return attendanceRowObject_(headers, rows[i]);
    }
  }
  throw new Error('QR siswa tidak valid.');
}

/* requireAuth mengembalikan user langsung (bukan {user}). */
function attendanceRequireTeacher_(token) {
  var actor = requireAuth(token);
  if (!actor || actor.role !== 'GURU') {
    throw new Error('Hanya GURU yang dapat mencatat attendance.');
  }
  return actor;
}

function attendanceExists_(sessionId, studentId) {
  var sh = attendanceGetSheet_();
  var last = sh.getLastRow();
  if (last < 2) return false;

  var headers = attendanceSheetHeaders_();
  var sessionCol = headers.indexOf('session_id');
  var studentCol = headers.indexOf('student_id');
  if (sessionCol < 0 || studentCol < 0) throw new Error('Schema ATTENDANCE tidak lengkap.');

  var rows = sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][sessionCol]) === String(sessionId) &&
        String(rows[i][studentCol]) === String(studentId)) return true;
  }
  return false;
}

function attendanceBool_(v) {
  return v === true || String(v).toLowerCase() === 'true' || String(v) === '1';
}

function attendanceValidateContext_(token, sessionId, student) {
  var actor = attendanceRequireTeacher_(token);
  var session = attendanceFindSession_(sessionId);

  if (String(session.status) !== 'ACTIVE') {
    throw new Error('Attendance hanya dapat dicatat saat session ACTIVE.');
  }

  /* Session ACTIVE selalu sudah di-start -> actual_teacher_id terisi.
     Fallback ke scheduled_teacher_id sebagai pengaman (pola SessionLifecycleApi). */
  var owner = String(session.actual_teacher_id || session.scheduled_teacher_id || '');
  if (owner !== String(actor.user_id)) {
    throw new Error('Anda bukan guru pemilik session ini.');
  }

  if (!attendanceBool_(student.is_active)) {
    throw new Error('Siswa tidak aktif.');
  }

  if (String(student.class_id) !== String(session.class_id)) {
    throw new Error('Siswa bukan bagian dari kelas session ini.');
  }

  if (attendanceExists_(sessionId, student.student_id)) {
    throw new Error('Kehadiran siswa sudah tercatat.');
  }

  return { actor: actor, session: session };
}

function attendanceNextId_() {
  var sh = attendanceGetSheet_();
  var last = sh.getLastRow();
  return 'ATT' + String(Math.max(0, last - 1) + 1).padStart(5, '0');
}

function attendanceAudit_(actor, attendanceId, sessionId, studentId, status, method) {
  if (typeof writeAuditLog !== 'function') throw new Error('writeAuditLog() belum tersedia.');
  /* writeAuditLog melakukan JSON.stringify sendiri — kirim objek. */
  writeAuditLog(actor.user_id, 'ATTENDANCE_CREATE', 'ATTENDANCE', attendanceId, {
    session_id: sessionId,
    student_id: studentId,
    status: status,
    method: method
  });
}

function attendanceCreate_(actor, sessionId, studentId, status, method, note) {
  var sh = attendanceGetSheet_();
  var now = new Date();
  var id = attendanceNextId_();

  sh.appendRow([
    id, sessionId, studentId, status, method,
    now, note || '', now, now
  ]);

  attendanceAudit_(actor, id, sessionId, studentId, status, method);

  return {
    success: true,
    attendance_id: id,
    session_id: sessionId,
    student_id: studentId,
    status: status,
    method: method,
    recorded_at: now.toISOString()
  };
}

/* ============ API publik ============ */

function recordAttendanceByQr(token, sessionId, qrToken) {
  var student = attendanceFindStudentByQr_(qrToken);
  var ctx = attendanceValidateContext_(token, sessionId, student);

  var r = attendanceCreate_(
    ctx.actor,
    sessionId,
    student.student_id,
    'HADIR',
    'CARD_SCAN',
    ''
  );
  r.student_name = String(student.name || '');
  return r;
}

function recordAttendanceManual(token, sessionId, studentId, status, note) {
  var student = attendanceFindStudentById_(studentId);
  var allowed = ['HADIR','SAKIT','IZIN','ALPA'];

  if (allowed.indexOf(String(status)) < 0) {
    throw new Error('Status attendance tidak valid.');
  }

  var ctx = attendanceValidateContext_(token, sessionId, student);

  return attendanceCreate_(
    ctx.actor,
    sessionId,
    student.student_id,
    String(status),
    'TEACHER_MANUAL',
    note || ''
  );
}

function attendanceStudentNames_() {
  var sh = attendanceGetStudentSheet_();
  var last = sh.getLastRow();
  var map = {};
  if (last < 2) return map;
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  var idCol = headers.indexOf('student_id');
  var nameCol = headers.indexOf('name');
  if (idCol < 0 || nameCol < 0) return map;
  var rows = sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues();
  for (var i = 0; i < rows.length; i++) {
    map[String(rows[i][idCol])] = String(rows[i][nameCol] || '');
  }
  return map;
}

function listSessionAttendances(token, sessionId) {
  var actor = requireAuth(token);
  var session = attendanceFindSession_(sessionId);

  var owner = String(session.actual_teacher_id || session.scheduled_teacher_id || '');
  var isAdmin = actor.role === 'ADMIN';
  var isOwner = actor.role === 'GURU' && owner === String(actor.user_id);
  if (!isAdmin && !isOwner) {
    throw new Error('Akses ditolak untuk session ini.');
  }

  var sh = attendanceGetSheet_();
  var last = sh.getLastRow();
  if (last < 2) return [];

  var headers = attendanceSheetHeaders_();
  var rows = sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues();
  var names = attendanceStudentNames_();

  return rows
    .map(function(row) { return attendanceRowObject_(headers, row); })
    .filter(function(a) { return String(a.session_id) === String(sessionId); })
    .map(function(a) {
      ['recorded_at','created_at','updated_at'].forEach(function(k) {
        if (a[k] instanceof Date) a[k] = a[k].toISOString();
      });
      /* Nama untuk tampilan; qr_token tidak pernah diekspos. */
      a.student_name = names[String(a.student_id)] || '';
      return a;
    });
}
