import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface SARReportData {
  transactionId: string
  amount: number
  amountINR: string
  paymentType: string
  date: string
  timestamp: string
  employeeId: string
  employeeName: string
  employeeRiskScore: number
  totalViolations: number
  totalTransactions: number
  ruleViolated: string
  riskLevel: string
  isStructuring: boolean
  isMoneylaundering: boolean
  causalityChain: string[]
  officerName: string
  officerDesignation: string
  bankName: string
  branchName: string
  reportDate: string
}

// ---------- layout constants ----------
const M = 14         // left margin
const R = 196        // right edge  (210 - 14)
const COL2 = 110     // second column start
const FIELD_H = 6    // height of a single text input box
const BORDER = 0.3

export const generateSARReport = (data: SARReportData) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const PW = doc.internal.pageSize.getWidth()   // 210
  const PH = doc.internal.pageSize.getHeight()  // 297

  // ─── shared drawing helpers ──────────────────────────────────

  // Top header that appears on every page
  const drawPageHeader = (page: number) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(0)
    doc.text('FIU-IND', M, 8)
    doc.text('Financial Intelligence Unit- India', R, 8, { align: 'right' })

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.text('SUSPICIOUS TRANSACTION REPORT (STR) FOR A  BANKING COMPANY', PW / 2, 14, { align: 'center' })

    doc.setFont('helvetica', 'italic')
    doc.setFontSize(7)
    doc.text('Kindly fill in CAPITAL. Read the instructions before filling the form.', M, 19)
    doc.setFont('helvetica', 'normal')
    doc.text(`Page ${page}`, R, 19, { align: 'right' })

    // thin rule under header
    doc.setDrawColor(0)
    doc.setLineWidth(0.4)
    doc.line(M, 20, R, 20)
  }

  // Black filled part header  e.g. "PART 1  |  DETAILS OF REPORT"
  const partHeader = (label: string, title: string, y: number): number => {
    doc.setFillColor(0, 0, 0)
    doc.rect(M, y, R - M, 6, 'F')
    doc.setTextColor(255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text(label, M + 1, y + 4.3)
    doc.setFillColor(255)
    doc.rect(M + doc.getTextWidth(label) + 2, y + 0.5, R - M - doc.getTextWidth(label) - 3, 5, 'F')
    doc.setTextColor(0)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text(title, M + doc.getTextWidth(label) + 4, y + 4.3)
    return y + 7
  }

  // Draw a labelled input box
  const inputBox = (label: string, value: string, x: number, y: number, w: number) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(0)
    doc.text(label, x, y + 3)
    const bx = x + doc.getTextWidth(label) + 1.5
    const bw = w - doc.getTextWidth(label) - 1.5
    doc.setDrawColor(0)
    doc.setLineWidth(BORDER)
    doc.rect(bx, y - 0.5, bw, FIELD_H)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.text(value.substring(0, 42), bx + 1, y + 3.5)
    doc.setFont('helvetica', 'normal')
  }

  // Draw a full-width labelled row: label on left, box fills rest
  const fieldRow = (num: string, label: string, value: string, x: number, y: number, w: number): number => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(0)
    const lbl = `${num}  ${label}`
    doc.text(lbl, x, y + 3.5)
    const bx = x + 38
    const bw = w - 38
    doc.setDrawColor(0)
    doc.setLineWidth(BORDER)
    doc.rect(bx, y + 0.5, bw, FIELD_H)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.text(value, bx + 1, y + 4.5)
    doc.setFont('helvetica', 'normal')
    return y + FIELD_H + 1.5
  }

  // Two side-by-side field rows
  const fieldRow2 = (
    n1: string, l1: string, v1: string,
    n2: string, l2: string, v2: string,
    y: number
  ): number => {
    const half = (R - M) / 2 - 1
    fieldRow(n1, l1, v1, M, y, half)
    fieldRow(n2, l2, v2, M + half + 2, y, half)
    return y + FIELD_H + 1.5
  }

  // Checkbox row — multiple options
  const checkboxRow = (items: { code: string; label: string; checked: boolean }[], y: number, perRow = 3): number => {
    const colW = (R - M) / perRow
    items.forEach((item, i) => {
      const cx = M + (i % perRow) * colW
      const cy = y + Math.floor(i / perRow) * 7
      // small square checkbox
      doc.setDrawColor(0)
      doc.setLineWidth(BORDER)
      doc.rect(cx, cy, 4, 4)
      if (item.checked) {
        doc.setFont('zapfdingbats', 'normal')
        doc.setFontSize(6)
        doc.setTextColor(0)
        doc.text('4', cx + 0.8, cy + 3.2)
      }
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(0)
      doc.text(`${item.code}`, cx + 5, cy + 3.2)
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(6.5)
      doc.text(item.label, cx + 9, cy + 3.2)
    })
    const rows = Math.ceil(items.length / perRow)
    return y + rows * 7 + 2
  }

  // Large multi-line text box
  const textBox = (label: string, text: string, x: number, y: number, w: number, h: number): number => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(0)
    doc.text(label, x, y + 3.5)
    const by = y + 5
    doc.setDrawColor(0)
    doc.setLineWidth(BORDER)
    doc.rect(x, by, w, h)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    const lines = doc.splitTextToSize(text, w - 3)
    lines.slice(0, Math.floor(h / 4)).forEach((line: string, li: number) => {
      doc.text(line, x + 1.5, by + 4 + li * 4)
    })
    return y + h + 7
  }

  // FIU-IND footer with SBA page code
  const drawFooter = (sbaCode: string) => {
    const y = PH - 8
    doc.setDrawColor(0)
    doc.setLineWidth(0.5)
    doc.line(M, y, R, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(0)
    doc.text('DO NOT FILL. FOR FIU-IND USE ONLY.', M, y + 4)
    // tick marks
    for (let i = 0; i < 8; i++) {
      doc.line(R - 35 + i * 4, y + 1, R - 35 + i * 4, y + 6)
    }
    // SBA code box
    doc.setFillColor(0)
    doc.rect(R - 10, y - 0.5, 11, 8, 'F')
    doc.setTextColor(255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text(sbaCode, R - 4.5, y + 4.5, { align: 'center' })
    doc.setTextColor(0)
  }

  // ════════════════════════════════════════════════════════════════
  // PAGE 1  —  PARTS 1, 2, 3
  // ════════════════════════════════════════════════════════════════
  drawPageHeader(1)
  let y = 22

  // outer border box wrapping all content
  doc.setDrawColor(0)
  doc.setLineWidth(0.5)

  // ── PART 1: DETAILS OF REPORT ───────────────────────────────
  y = partHeader('PART 1', 'DETAILS OF REPORT', y)

  // 1.1 Date of sending (date boxes) + 1.2 Replacement?
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(0)
  doc.text('1.1  Date of sending report', M, y + 3.5)
  // 4 date digit boxes
  const dateStr = data.reportDate.replace(/[^0-9]/g, '').substring(0, 8).padEnd(8, '0')
  ;['D', 'D', 'M', 'M', 'Y', 'Y', 'Y', 'Y'].forEach((_, i) => {
    const bx = 60 + i * 7
    doc.setDrawColor(0)
    doc.setLineWidth(BORDER)
    doc.rect(bx, y + 0.5, 6, 6)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.text(dateStr[i] || '0', bx + 2, y + 4.5)
  })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)
  doc.text('D  D  M  M  Y  Y  Y  Y', 60, y + 9)

  // 1.2
  doc.setFontSize(7)
  doc.text('1.2  Is this a replacement to an earlier report ?', COL2, y + 3.5)
  doc.setDrawColor(0)
  doc.rect(COL2 + 60, y + 0.5, 5, 5)           // NO box
  doc.text('NO', COL2 + 66, y + 4.5)
  doc.rect(COL2 + 77, y + 0.5, 5, 5)           // YES box
  doc.text('YES', COL2 + 83, y + 4.5)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(6)
  doc.text('(Tick ✔ as applicable)', COL2 + 90, y + 4.5)
  y += 12

  // 1.3
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text('1.3  Date of sending original report if this is a replacement report', M, y + 3.5)
  ;['0', '0', '0', '0', '2', '0', '2', '6'].forEach((_, i) => {
    const bx = 118 + i * 7
    doc.setDrawColor(0)
    doc.setLineWidth(BORDER)
    doc.rect(bx, y + 0.5, 6, 6)
  })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)
  doc.text('D  D  M  M  Y  Y  Y  Y', 118, y + 9)
  y += 14

  const horizLine = (yy: number) => {
    doc.setDrawColor(180)
    doc.setLineWidth(0.2)
    doc.line(M, yy, R, yy)
  }

  horizLine(y)
  y += 3

  // ── PART 2: PRINCIPAL OFFICER ───────────────────────────────
  y = partHeader('PART 2', 'DETAILS OF PRINCIPAL OFFICER', y)

  y = fieldRow('2.1', 'Name of Bank', data.bankName, M, y, R - M)
  y = fieldRow2(
    '2.2', 'BSR code', '',
    '2.3', 'ID allotted by FIU-IND', '',
    y
  )
  y = fieldRow('2.4', 'Category of bank', 'B — Private Sector Bank', M, y, R - M)
  y = fieldRow('2.5', 'Name of principal officer', data.officerName, M, y, R - M)
  y = fieldRow('2.6', 'Designation', data.officerDesignation, M, y, R - M)
  y = fieldRow('2.7', 'Address (No., Building)', 'Nariman Point, BKC', M, y, R - M)
  y = fieldRow('2.8', 'Street/Road', 'Bandra-Kurla Complex', M, y, R - M)
  y = fieldRow('2.9', 'Locality', 'Bandra East', M, y, R - M)
  y = fieldRow2(
    '2.10', 'City/Town, District', 'Mumbai, Maharashtra',
    '2.11', 'State, Country', 'Maharashtra, India',
    y
  )
  y = fieldRow2(
    '2.12', 'Pin code', '400051',
    '2.13', 'Tel (with STD code)', '+91-22-26000000',
    y
  )
  y = fieldRow2(
    '2.14', 'Fax', '',
    '2.15', 'E-mail', 'compliance@' + data.bankName.replace(/ /g,'').toLowerCase() + '.in',
    y
  )

  horizLine(y)
  y += 3

  // ── PART 3: REPORTING BRANCH ─────────────────────────────────
  y = partHeader('PART 3', 'DETAILS OF REPORTING BRANCH / LOCATION', y)

  y = fieldRow('3.1', 'Name of Branch/Location', data.branchName, M, y, R - M)
  y = fieldRow2(
    '3.2', 'BSR code', '',
    '3.3', 'ID allotted by FIU-IND', '',
    y
  )
  y = fieldRow('3.4', 'Address (No., Building)', '1st Floor, Main Branch', M, y, R - M)
  y = fieldRow('3.5', 'Street/Road', 'Fort', M, y, R - M)
  y = fieldRow('3.6', 'Locality', 'Fort Area', M, y, R - M)
  y = fieldRow2(
    '3.7', 'City/Town, District', 'Mumbai, Maharashtra',
    '3.8', 'State, Country', 'Maharashtra, India',
    y
  )
  y = fieldRow2(
    '3.9', 'Pin code', '400001',
    '3.10', 'Tel (with STD code)', '+91-22-26000001',
    y
  )
  y = fieldRow2(
    '3.11', 'Fax', '',
    '3.12', 'E-mail', 'branch@' + data.bankName.replace(/ /g,'').toLowerCase() + '.in',
    y
  )

  drawFooter('SBA01')

  // ════════════════════════════════════════════════════════════════
  // PAGE 2  —  PARTS 4, 5
  // ════════════════════════════════════════════════════════════════
  doc.addPage()
  drawPageHeader(2)
  y = 22

  // ── PART 4: INDIVIDUALS LINKED ───────────────────────────────
  y = partHeader('PART 4', 'LIST OF INDIVIDUALS LINKED TO TRANSACTIONS', y)

  // Table header row
  doc.setDrawColor(0)
  doc.setLineWidth(BORDER)
  doc.rect(M, y, 80, 6)
  doc.rect(M + 80, y, 60, 6)
  doc.rect(M + 140, y, R - M - 140, 6)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.text('Name of individual', M + 2, y + 4)
  doc.text('Customer ID/number (if allotted)', M + 82, y + 4)
  doc.text('Annexure', M + 143, y + 4)
  y += 6

  const individuals = [
    { name: `${data.employeeName} (${data.employeeId})`, id: data.employeeId },
    ...Array(14).fill({ name: '', id: '' })
  ].slice(0, 15)

  individuals.forEach((ind, i) => {
    const rowY = y + i * 7
    doc.setDrawColor(0)
    doc.setLineWidth(BORDER)
    doc.rect(M, rowY, 80, 7)
    doc.rect(M + 80, rowY, 60, 7)
    doc.rect(M + 140, rowY, R - M - 140 - 10, 7)
    // Annexure code cell
    doc.rect(M + 140 + (R - M - 140 - 10), rowY, 10, 7)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(0)
    doc.text(`${i + 1 < 10 ? ' ' : ''}${i + 1}`, M + 1, rowY + 4.5)
    if (ind.name) {
      doc.setFont('helvetica', 'bold')
      doc.text(ind.name.substring(0, 38), M + 6, rowY + 4.5)
    }
    doc.setFont('helvetica', 'normal')
    if (ind.id) doc.text(ind.id, M + 82, rowY + 4.5)
    // A label + sequential number
    doc.setFont('helvetica', 'bold')
    doc.text(`A  ${i + 1}`, M + 142, rowY + 4.5)
    doc.setFont('helvetica', 'normal')
  })
  y += 15 * 7 + 2

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(6.5)
  doc.text('(Details of all individuals should be furnished in prescribed annexure)', M, y + 3)
  doc.text('Tick ✔ to confirm', R - 30, y + 3)
  doc.setDrawColor(0)
  doc.rect(R - 6, y, 6, 6)
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text('Number of additional sheets for PART 4 attached', M, y + 3)
  doc.setDrawColor(0)
  doc.rect(M + 72, y, 8, 6)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(6.5)
  doc.text('(Leave blank if space provided above is sufficient and no extra sheet is attached)', M + 82, y + 3)
  y += 10

  horizLine(y)
  y += 3

  // ── PART 5: LEGAL PERSONS/ENTITIES ──────────────────────────
  y = partHeader('PART 5', 'LIST OF LEGAL PERSONS/ENTITIES LINKED TO TRANSACTIONS', y)

  doc.setDrawColor(0)
  doc.setLineWidth(BORDER)
  doc.rect(M, y, 80, 6)
  doc.rect(M + 80, y, 60, 6)
  doc.rect(M + 140, y, R - M - 140, 6)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.text('Name of legal person/entity', M + 2, y + 4)
  doc.text('Customer ID/number (if allotted)', M + 82, y + 4)
  doc.text('Annexure', M + 143, y + 4)
  y += 6

  for (let i = 0; i < 10; i++) {
    const rowY = y + i * 7
    doc.setDrawColor(0)
    doc.setLineWidth(BORDER)
    doc.rect(M, rowY, 80, 7)
    doc.rect(M + 80, rowY, 60, 7)
    doc.rect(M + 140, rowY, R - M - 140 - 10, 7)
    doc.rect(M + 140 + (R - M - 140 - 10), rowY, 10, 7)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.text(`${i + 1 < 10 ? ' ' : ''}${i + 1}`, M + 1, rowY + 4.5)
    doc.setFont('helvetica', 'bold')
    doc.text(`B  ${i + 1}`, M + 142, rowY + 4.5)
    doc.setFont('helvetica', 'normal')
  }
  y += 10 * 7 + 2

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(6.5)
  doc.text('(Details of all legal persons/entities should be furnished in prescribed annexure)', M, y + 3)
  doc.text('Tick ✔ to confirm', R - 30, y + 3)
  doc.setDrawColor(0)
  doc.rect(R - 6, y, 6, 6)
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text('Number of additional sheets for PART 5 attached', M, y + 3)
  doc.setDrawColor(0)
  doc.rect(M + 72, y, 8, 6)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(6.5)
  doc.text('(Leave blank if space provided above is sufficient and no extra sheet is attached)', M + 82, y + 3)

  drawFooter('SBA02')

  // ════════════════════════════════════════════════════════════════
  // PAGE 3  —  PARTS 6, 7 (header)
  // ════════════════════════════════════════════════════════════════
  doc.addPage()
  drawPageHeader(3)
  y = 22

  // ── PART 6: ACCOUNTS ─────────────────────────────────────────
  y = partHeader('PART 6', 'LIST OF ACCOUNTS  LINKED TO TRANSACTIONS', y)

  doc.setDrawColor(0)
  doc.setLineWidth(BORDER)
  doc.rect(M, y, 55, 6)
  doc.rect(M + 55, y, 80, 6)
  doc.rect(M + 135, y, R - M - 135, 6)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.text('Account Number', M + 2, y + 4)
  doc.text('Name of First Account Holder', M + 57, y + 4)
  doc.text('Annexure', M + 137, y + 4)
  y += 6

  const accounts = [
    { acct: `ACC-${data.employeeId}`, holder: data.employeeName },
    ...Array(9).fill({ acct: '', holder: '' })
  ].slice(0, 10)

  accounts.forEach((acc, i) => {
    const rowY = y + i * 7
    doc.setDrawColor(0)
    doc.setLineWidth(BORDER)
    doc.rect(M, rowY, 55, 7)
    doc.rect(M + 55, rowY, 80, 7)
    doc.rect(M + 135, rowY, R - M - 135 - 10, 7)
    doc.rect(M + 135 + (R - M - 135 - 10), rowY, 10, 7)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.text(`${i + 1 < 10 ? ' ' : ''}${i + 1}`, M + 1, rowY + 4.5)
    if (acc.acct) {
      doc.setFont('helvetica', 'bold')
      doc.text(acc.acct, M + 5, rowY + 4.5)
      doc.text(acc.holder, M + 57, rowY + 4.5)
      doc.setFont('helvetica', 'normal')
    }
    doc.setFont('helvetica', 'bold')
    doc.text(`C  ${i + 1}`, M + 137, rowY + 4.5)
    doc.setFont('helvetica', 'normal')
  })
  y += 10 * 7 + 2

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(6.5)
  doc.text('(Details of all accounts should be furnished in prescribed annexure)', M, y + 3)
  doc.text('Tick ✔ to confirm', R - 30, y + 3)
  doc.setDrawColor(0)
  doc.rect(R - 6, y, 6, 6)
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text('Number of additional sheets for PART 6 attached', M, y + 3)
  doc.setDrawColor(0)
  doc.rect(M + 72, y, 8, 6)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(6.5)
  doc.text('(Leave blank if space provided above is sufficient and no extra sheet is attached)', M + 82, y + 3)
  y += 10

  horizLine(y)
  y += 3

  // ── PART 7: SUSPICIOUS TRANSACTION ──────────────────────────
  y = partHeader('PART 7', 'DETAILS OF SUSPICIOUS TRANSACTION', y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text('7.1   Reasons for suspicion', M, y + 3.5)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(6.5)
  doc.text('(Tick ✔ as applicable. Multiple selection is possible. Refer to instructions)', M + 40, y + 3.5)
  y += 6

  const suspicionReasons = [
    { code: 'A', label: 'Identity of client',    checked: false },
    { code: 'B', label: 'Background of client',  checked: data.employeeRiskScore > 50 },
    { code: 'C', label: 'Multiple accounts',      checked: data.totalTransactions > 10 },
    { code: 'D', label: 'Activity in account',   checked: true },
    { code: 'E', label: 'Nature of transaction', checked: true },
    { code: 'F', label: 'Value of transaction',  checked: data.isStructuring },
  ]

  suspicionReasons.forEach((item, i) => {
    const cx = M + (i % 3) * 62
    const cy = y + Math.floor(i / 3) * 7
    doc.setDrawColor(0)
    doc.setLineWidth(BORDER)
    doc.rect(cx, cy, 4.5, 4.5)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.text(item.code, cx + 1, cy + 3.5)
    if (item.checked) {
      doc.setFont('helvetica', 'bold')
      doc.text('✔', cx + 0.5, cy + 3.8)
    }
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text(item.label, cx + 6, cy + 3.5)
  })
  y += 16

  // Z — Other reason
  doc.setDrawColor(0)
  doc.rect(M, y, 4.5, 4.5)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.text('Z', M + 1, y + 3.5)
  doc.setFont('helvetica', 'normal')
  doc.text('Other reason (specify)', M + 6, y + 3.5)
  doc.setDrawColor(0)
  doc.rect(M + 38, y, R - M - 38, 5)
  if (data.ruleViolated) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.text(data.ruleViolated.substring(0, 80), M + 40, y + 3.5)
    doc.setFont('helvetica', 'normal')
  }
  y += 9

  // 7.2 Grounds of Suspicion
  const groundsText = [
    `Transaction ${data.transactionId} of ${data.amountINR} was flagged by ComplianceIQ AI on ${data.timestamp}.`,
    `Violation: "${data.ruleViolated}".`,
    `Account holder: ${data.employeeName} (${data.employeeId}), Risk Score: ${data.employeeRiskScore}%.`,
    `Total transactions: ${data.totalTransactions}. Flagged violations: ${data.totalViolations}.`,
    data.isStructuring ? 'Pattern analysis indicates possible structuring to evade PMLA Section 12 threshold.' : '',
    data.isMoneylaundering ? 'Transaction has active money laundering indicators (Is Laundering = 1).' : '',
    `Reported by: ${data.officerName}, ${data.officerDesignation}.`,
  ].filter(Boolean).join(' ')

  y = textBox(
    '7.2   Grounds of Suspicion (Mention summary of suspicion and sequence of events)',
    groundsText,
    M, y, R - M, 52
  )

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(6.5)
  doc.text('(continued on next page)', M + 2, y - 2)

  drawFooter('SBA03')

  // ════════════════════════════════════════════════════════════════
  // PAGE 4  —  PART 7 (continued) + PART 8 + Signature
  // ════════════════════════════════════════════════════════════════
  doc.addPage()
  drawPageHeader(4)
  y = 22

  // 7.3 Grounds continued — causality chain
  const chainText = data.causalityChain.join('\n')
  y = textBox(
    '7.3   Grounds of Suspicion (continued from previous page)',
    chainText,
    M, y, R - M, 72
  )

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text('Number of additional sheets for PART 7 attached', M, y + 3)
  doc.setDrawColor(0)
  doc.rect(M + 72, y, 8, 6)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(6.5)
  doc.text('(Leave blank if space provided above is sufficient and no extra sheet is attached)', M + 82, y + 3)
  y += 10

  horizLine(y)
  y += 3

  // ── PART 8: ACTION TAKEN ─────────────────────────────────────
  y = partHeader('PART 8', 'DETAILS OF ACTION TAKEN', y)

  const actionText = [
    `8.1  Whether the matter is/was under any investigation? (Name of agency, person, contact details)`,
  ]
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text(actionText[0], M, y + 3.5)
  y += 6

  const investigationText =
    `ComplianceIQ Intelligence Engine initiated automated investigation on ${data.timestamp}. ` +
    `Flagging officer: ${data.officerName} (${data.officerDesignation}). ` +
    `Risk probability: ${data.employeeRiskScore}%. Rule: ${data.ruleViolated}. ` +
    `Matter escalated internally. Pending dispatch to Director, FIU-IND, ` +
    `6th Floor, Hotel Samrat, Chanakyapuri, New Delhi – 110021. Fax: +91-11-26874459.`

  doc.setDrawColor(0)
  doc.setLineWidth(BORDER)
  doc.rect(M, y, R - M, 28)
  const lines = doc.splitTextToSize(investigationText, R - M - 3)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  lines.slice(0, 6).forEach((line: string, li: number) => {
    doc.text(line, M + 1.5, y + 5 + li * 4.2)
  })
  y += 30

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text('Number of additional sheets for PART 8 attached', M, y + 3)
  doc.setDrawColor(0)
  doc.rect(M + 72, y, 8, 6)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(6.5)
  doc.text('(Leave blank if space provided above is sufficient and no extra sheet is attached)', M + 82, y + 3)
  y += 10

  // ── SIGNATURE BLOCK ──────────────────────────────────────────
  // Left block — FIU-IND use only
  const sigY = y
  doc.setDrawColor(0)
  doc.setLineWidth(BORDER)
  doc.rect(M, sigY, 70, 30)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.text('DO NOT FILL. FOR FIU-IND USE ONLY', M + 2, sigY + 5)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.text('ACK. NO.', M + 2, sigY + 12)
  for (let i = 0; i < 10; i++) doc.line(M + 20 + i * 4, sigY + 11, M + 20 + i * 4, sigY + 14)
  doc.text('DATE', M + 2, sigY + 20)
  // date boxes
  ;['0', '0', '0', '0', '2', '0', '2', '6'].forEach((_, i) => {
    const bx = M + 15 + i * 5
    doc.setDrawColor(0)
    doc.setLineWidth(BORDER)
    doc.rect(bx, sigY + 16, 4.5, 4.5)
  })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(5.5)
  doc.text('D  D  M  M  Y  Y  Y  Y', M + 15, sigY + 24)

  // Right block — Signature + Name
  const sigRX = M + 72
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text('Signature', sigRX, sigY + 5)
  doc.setDrawColor(0)
  doc.setLineWidth(BORDER)
  doc.rect(sigRX + 18, sigY, R - sigRX - 18, 13)

  doc.text('Name', sigRX, sigY + 20)
  doc.rect(sigRX + 18, sigY + 14, R - sigRX - 18, 10)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.text(data.officerName, sigRX + 20, sigY + 21)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(6)
  doc.text('(Should be same as the person mentioned in PART 2)', sigRX, sigY + 28)

  drawFooter('SBA04')

  // ─── SAVE ──────────────────────────────────────────────────
  const filename = `FIU_IND_STR_${data.transactionId}_${data.reportDate.replace(/\//g, '-')}.pdf`
  doc.save(filename)
}
