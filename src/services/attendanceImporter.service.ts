import pool from '../config/database';
import fs from 'fs';
import path from 'path';

// ??????????????????????????????????????????????????????????????????????????
// EXCEL ATTENDANCE IMPORTER
// Supports common HR Excel formats from:
// - Greythr, Darwinbox, Keka, BambooHR exports
// - Custom Excel templates
// - Biometric device CSV exports (ZKTeco, eSSL, Cogent, Matrix)
// ??????????????????????????????????????????????????????????????????????????

interface AttendanceRow {
  employee_name: string;
  date: string;
  status: string;
  check_in?: string;
  check_out?: string;
  working_hours?: number;
  overtime_hours?: number;
  department?: string;
}

// ?? Parse attendance status from various formats ???????????????????????????
function parseStatus(raw: string): string {
  const s = raw.toUpperCase().trim();
  if (['P','PRESENT','PR','1','YES','A'].includes(s) && s !== 'A') return 'Present';
  if (['A','ABSENT','AB','0','NO'].includes(s)) return 'Absent';
  if (['L','LATE','LT','LATE ARRIVAL'].includes(s)) return 'Late';
  if (['H','HALF','HD','HALF DAY','HALF-DAY'].includes(s)) return 'Half Day';
  if (['WFH','WORK FROM HOME','W','REMOTE'].includes(s)) return 'WFH';
  if (['OL','ON LEAVE','LEAVE','PL','SL','CL','EL'].includes(s)) return 'On Leave';
  if (['WO','WEEK OFF','WEEKLY OFF','OFF','WE','HOLIDAY'].includes(s)) return 'Present'; // Count as present
  return 'Present';
}

// ?? Parse time from various formats ????????????????????????????????????????
function parseTime(raw: string): string | null {
  if (!raw || raw.trim() === '' || raw === '00:00' || raw === '0:00') return null;
  // Handle HH:MM:SS
  if (raw.includes(':')) {
    const parts = raw.split(':');
    return `${parts[0].padStart(2,'0')}:${parts[1].padStart(2,'0')}`;
  }
  // Handle HHMM format
  if (/^\d{3,4}$/.test(raw)) {
    const padded = raw.padStart(4, '0');
    return `${padded.substring(0,2)}:${padded.substring(2,4)}`;
  }
  return null;
}

// ?? Parse date from various Indian formats ?????????????????????????????????
function parseDate(raw: string): string {
  if (!raw) return new Date().toISOString().split('T')[0];
  const clean = raw.trim().replace(/['"]/g, '');

  // DD/MM/YYYY or DD-MM-YYYY
  if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(clean)) {
    const parts = clean.split(/[\/\-]/);
    return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
  }
  // YYYY-MM-DD (already correct)
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  // DD-Mon-YYYY (01-Jan-2026)
  const months: {[k:string]:string} = {
    jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',
    jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'
  };
  const monMatch = clean.match(/^(\d{1,2})[- ]([A-Za-z]{3})[- ](\d{4})$/);
  if (monMatch) {
    return `${monMatch[3]}-${months[monMatch[2].toLowerCase()]||'01'}-${monMatch[1].padStart(2,'0')}`;
  }
  // Excel serial date number
  if (/^\d{5}$/.test(clean)) {
    const excelEpoch = new Date(1899, 11, 30);
    const d = new Date(excelEpoch.getTime() + parseInt(clean) * 86400000);
    return d.toISOString().split('T')[0];
  }
  return new Date().toISOString().split('T')[0];
}

// ?? Calculate working hours ????????????????????????????????????????????????
function calcHours(checkIn: string | null, checkOut: string | null): number {
  if (!checkIn || !checkOut) return 8;
  const [inH, inM] = checkIn.split(':').map(Number);
  const [outH, outM] = checkOut.split(':').map(Number);
  const hours = (outH * 60 + outM - inH * 60 - inM) / 60;
  return Math.max(0, Math.round(hours * 100) / 100);
}

// ??????????????????????????????????????????????????????????????????????????
// MAIN: Parse CSV attendance file
// ??????????????????????????????????????????????????????????????????????????
export async function parseAttendanceCSV(
  content: string,
  tenantId: number,
  options: { source?: string; defaultDept?: string } = {}
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  let imported = 0, skipped = 0;
  const errors: string[] = [];

  const lines = content.split('\n').map(l => l.trim()).filter(l => l);
  if (lines.length < 2) return { imported: 0, skipped: 0, errors: ['File is empty or has only headers'] };

  // Detect format from header
  const header = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/['"]/g, ''));
  console.log(`[Attendance] Header columns: ${header.join(', ')}`);

  // Map column indices
  const cols = {
    name: findCol(header, ['employee name','emp name','name','employee','emp_name','staff name','worker']),
    date: findCol(header, ['date','attendance date','att date','day']),
    status: findCol(header, ['status','attendance','att status','present/absent','p/a']),
    checkIn: findCol(header, ['in time','check in','check-in','in','punch in','time in']),
    checkOut: findCol(header, ['out time','check out','check-out','out','punch out','time out']),
    dept: findCol(header, ['department','dept','division','section']),
    empCode: findCol(header, ['emp code','employee code','emp id','employee id','id']),
    hours: findCol(header, ['working hours','work hours','hours','duration','total hours']),
    overtime: findCol(header, ['overtime','ot hours','extra hours']),
  };

  console.log(`[Attendance] Detected columns:`, cols);

  for (let i = 1; i < lines.length; i++) {
    try {
      const row = lines[i].split(',').map(c => c.trim().replace(/['"]/g, ''));
      if (row.length < 2 || !row[0]) { skipped++; continue; }

      const name = cols.name >= 0 ? row[cols.name] : row[0];
      const dateRaw = cols.date >= 0 ? row[cols.date] : row[1];
      const statusRaw = cols.status >= 0 ? row[cols.status] : 'P';
      const checkIn = cols.checkIn >= 0 ? parseTime(row[cols.checkIn]) : null;
      const checkOut = cols.checkOut >= 0 ? parseTime(row[cols.checkOut]) : null;
      const dept = cols.dept >= 0 ? row[cols.dept] : (options.defaultDept || 'General');
      const hours = cols.hours >= 0 ? parseFloat(row[cols.hours]) || calcHours(checkIn, checkOut) : calcHours(checkIn, checkOut);
      const overtime = cols.overtime >= 0 ? parseFloat(row[cols.overtime]) || 0 : 0;

      if (!name || !dateRaw) { skipped++; continue; }

      const date = parseDate(dateRaw);
      const status = parseStatus(statusRaw);

      // Upsert attendance record
      await pool.query(
        `INSERT INTO attendance_records (tenant_id, employee_name, department, date, check_in, check_out, working_hours, overtime_hours, status, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT DO NOTHING`,
        [tenantId, name, dept, date, checkIn, checkOut, hours, overtime, status,
         `Imported from ${options.source || 'Excel/CSV'}`]
      );
      imported++;
    } catch (rowErr: any) {
      errors.push(`Row ${i+1}: ${rowErr.message}`);
      skipped++;
    }
  }

  return { imported, skipped, errors };
}

// ?? Find column index by possible names ????????????????????????????????????
function findCol(header: string[], names: string[]): number {
  for (const name of names) {
    const idx = header.findIndex(h => h.includes(name));
    if (idx >= 0) return idx;
  }
  return -1;
}

// ??????????????????????????????????????????????????????????????????????????
// BIOMETRIC FTP WATCHER ENHANCEMENT
// Auto-imports biometric CSV files from FTP directories
// Supports: ZKTeco, eSSL, Cogent, Matrix, Realand
// ??????????????????????????????????????????????????????????????????????????
export async function processBiometricFile(
  content: string,
  tenantId: number,
  deviceType: string = 'auto'
): Promise<{ imported: number; skipped: number; errors: string[] }> {

  // Auto-detect biometric device format
  const firstLine = content.split('\n')[0].toLowerCase();

  if (deviceType === 'auto') {
    if (firstLine.includes('userid') || firstLine.includes('emp_code')) deviceType = 'zkteco';
    else if (firstLine.includes('enrollno') || firstLine.includes('enroll')) deviceType = 'essl';
    else if (firstLine.includes('id,name,time') || firstLine.includes('pin,name')) deviceType = 'realand';
    else deviceType = 'generic';
  }

  let normalised = content;

  // Normalise ZKTeco format
  // Format: UserID, Name, DateTime, Status (0=check-in, 1=check-out), Verify
  if (deviceType === 'zkteco') {
    const lines = content.split('\n').filter(l => l.trim());
    const rows: string[][] = [];
    rows.push(['Employee Name', 'Date', 'Status', 'Check In', 'Check Out', 'Department']);

    const byEmpDate: {[key: string]: {name: string; times: Date[]}} = {};
    for (const line of lines) {
      const parts = line.split(/[,\t]/).map(p => p.trim());
      if (parts.length < 3) continue;
      const name = parts[1] || parts[0];
      const dateTimeRaw = parts[2];
      const dt = new Date(dateTimeRaw);
      if (isNaN(dt.getTime())) continue;
      const key = `${name}_${dt.toISOString().split('T')[0]}`;
      if (!byEmpDate[key]) byEmpDate[key] = { name, times: [] };
      byEmpDate[key].times.push(dt);
    }

    for (const [key, data] of Object.entries(byEmpDate)) {
      data.times.sort((a, b) => a.getTime() - b.getTime());
      const date = data.times[0].toISOString().split('T')[0];
      const checkIn = data.times[0].toTimeString().substring(0, 5);
      const checkOut = data.times.length > 1 ? data.times[data.times.length-1].toTimeString().substring(0, 5) : null;
      rows.push([data.name, date, 'P', checkIn, checkOut || '', '']);
    }
    normalised = rows.map(r => r.join(',')).join('\n');
  }

  // Normalise eSSL format
  // Format: EnrollNo, Name, Date, TimeValue, Status
  else if (deviceType === 'essl') {
    const lines = content.split('\n').filter(l => l.trim());
    const rows: string[][] = [];
    rows.push(['Employee Name', 'Date', 'Status', 'Check In', 'Check Out', 'Department']);

    const byEmpDate: {[key: string]: {name: string; times: string[]}} = {};
    for (const line of lines) {
      const parts = line.split(/[,\t]/).map(p => p.trim());
      if (parts.length < 4) continue;
      const name = parts[1];
      const date = parseDate(parts[2]);
      const time = parseTime(parts[3]);
      if (!name || !date || !time) continue;
      const key = `${name}_${date}`;
      if (!byEmpDate[key]) byEmpDate[key] = { name, times: [] };
      byEmpDate[key].times.push(time);
    }

    for (const [key, data] of Object.entries(byEmpDate)) {
      data.times.sort();
      const datePart = key.split('_')[1];
      rows.push([data.name, datePart, 'P', data.times[0], data.times[data.times.length-1] || '', '']);
    }
    normalised = rows.map(r => r.join(',')).join('\n');
  }

  return parseAttendanceCSV(normalised, tenantId, { source: `Biometric (${deviceType})` });
}

// ??????????????????????????????????????????????????????????????????????????
// EXCEL PARSER using xlsx library
// ??????????????????????????????????????????????????????????????????????????
export async function parseAttendanceExcel(
  filePath: string,
  tenantId: number
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  try {
    const XLSX = require('xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    return parseAttendanceCSV(csv, tenantId, { source: 'Excel' });
  } catch (e: any) {
    return { imported: 0, skipped: 0, errors: [`Excel parse error: ${e.message}`] };
  }
}
