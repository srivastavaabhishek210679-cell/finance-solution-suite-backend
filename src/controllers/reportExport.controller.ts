import { Request, Response } from 'express';
import { query } from '../config/database';

// ─── helpers ──────────────────────────────────────────────────────────────────
const pad = (s: any) => String(s ?? '').replace(/"/g, '""');
const today = () => new Date().toISOString().slice(0, 10);

export class ReportExportController {

  // ── GET /api/v1/reports/export?format=csv|excel|pdf&domain=Finance&limit=500
  async exportReports(req: Request, res: Response): Promise<void> {
    const format = ((req.query.format as string) || 'csv').toLowerCase();
    const domain = req.query.domain as string | undefined;
    const limit  = Math.min(parseInt(req.query.limit as string) || 500, 1000);

    try {
      const params: any[] = [];
      let domainFilter = '';
      if (domain && domain !== 'All') {
        params.push(domain);
        domainFilter = `AND d.domain_name = $${params.length}`;
      }

      const result = await query(`
        SELECT
          rm.report_id,
          rm.name,
          rm.description,
          rm.frequency,
          rm.compliance_status,
          rm.report_category,
          rm.visualization_type,
          rm.is_active,
          rm.created_at,
          d.domain_name
        FROM  reports_master rm
        LEFT  JOIN domains d ON d.domain_id = rm.domain_id
        WHERE rm.is_active = true ${domainFilter}
        ORDER BY d.domain_name, rm.name
        LIMIT  ${limit}
      `, params);

      const reports = result.rows;

      if (!reports.length) {
        res.status(404).json({ status: 'error', message: 'No reports found' });
        return;
      }

      switch (format) {
        case 'csv':   await this.sendCSV(res, reports);   break;
        case 'excel': await this.sendExcel(res, reports); break;
        case 'pdf':   await this.sendPDF(res, reports);   break;
        default:
          res.status(400).json({ status: 'error', message: 'Invalid format. Use csv, excel, or pdf' });
      }
    } catch (err: any) {
      console.error('[ReportExport] error:', err.message);
      res.status(500).json({ status: 'error', message: err.message });
    }
  }

  // ── GET /api/v1/reports/export/:id?format=csv|excel|pdf
  async exportSingleReport(req: Request, res: Response): Promise<void> {
    const format = ((req.query.format as string) || 'pdf').toLowerCase();
    try {
      const result = await query(`
        SELECT rm.*, d.domain_name
        FROM  reports_master rm
        LEFT  JOIN domains d ON d.domain_id = rm.domain_id
        WHERE rm.report_id = $1
      `, [req.params.id]);

      if (!result.rows.length) {
        res.status(404).json({ status: 'error', message: 'Report not found' });
        return;
      }

      const reports = result.rows;
      switch (format) {
        case 'csv':   await this.sendCSV(res, reports);   break;
        case 'excel': await this.sendExcel(res, reports); break;
        case 'pdf':   await this.sendPDF(res, reports);   break;
        default:
          res.status(400).json({ status: 'error', message: 'Invalid format' });
      }
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  }

  // ── CSV ───────────────────────────────────────────────────────────────────
  private async sendCSV(res: Response, reports: any[]): Promise<void> {
    const headers = [
      'Report ID', 'Name', 'Domain', 'Category',
      'Frequency', 'Compliance Status', 'Visualization', 'Description', 'Created At',
    ];

    const rows = reports.map(r => [
      r.report_id,
      `"${pad(r.name)}"`,
      `"${pad(r.domain_name)}"`,
      `"${pad(r.report_category)}"`,
      r.frequency || '',
      r.compliance_status || '',
      r.visualization_type || '',
      `"${pad(r.description)}"`,
      r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : '',
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="reports_${today()}.csv"`);
    res.send('\uFEFF' + csv); // BOM for Excel UTF-8 compatibility
  }

  // ── Excel ─────────────────────────────────────────────────────────────────
  private async sendExcel(res: Response, reports: any[]): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const ExcelJS = require('exceljs');
      const wb     = new ExcelJS.Workbook();
      wb.creator    = 'Finance Solution Suite';
      wb.created    = new Date();

      const ws = wb.addWorksheet('Reports', {
        pageSetup: { paperSize: 9, orientation: 'landscape' },
      });

      ws.columns = [
        { header: 'Report ID',         key: 'report_id',         width: 12 },
        { header: 'Name',              key: 'name',              width: 42 },
        { header: 'Domain',            key: 'domain_name',       width: 18 },
        { header: 'Category',          key: 'report_category',   width: 20 },
        { header: 'Frequency',         key: 'frequency',         width: 14 },
        { header: 'Compliance Status', key: 'compliance_status', width: 20 },
        { header: 'Visualization',     key: 'visualization_type',width: 18 },
        { header: 'Description',       key: 'description',       width: 50 },
        { header: 'Created At',        key: 'created_at',        width: 18 },
      ];

      // Style header
      const headerRow = ws.getRow(1);
      headerRow.height = 22;
      headerRow.eachCell((cell: any) => {
        cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
        cell.font  = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          bottom: { style: 'medium', color: { argb: 'FF3B82F6' } },
        };
      });

      // Status colour map
      const statusFill: Record<string, string> = {
        Required:    'FFFEF3C7',
        Recommended: 'FFD1FAE5',
        Optional:    'FFE0E7FF',
      };

      reports.forEach((r, idx) => {
        const row = ws.addRow({
          report_id:         r.report_id,
          name:              r.name,
          domain_name:       r.domain_name,
          report_category:   r.report_category,
          frequency:         r.frequency,
          compliance_status: r.compliance_status,
          visualization_type: r.visualization_type,
          description:       r.description,
          created_at:        r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : '',
        });

        // Alternate row shading
        if (idx % 2 === 1) {
          row.eachCell((cell: any) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          });
        }

        // Colour the compliance status cell
        const statusCell = row.getCell('compliance_status');
        const fill = statusFill[r.compliance_status] || 'FFFFFFFF';
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
      });

      // Auto-filter
      ws.autoFilter = { from: 'A1', to: 'I1' };

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', `attachment; filename="reports_${today()}.xlsx"`);

      await wb.xlsx.write(res);
      res.end();
    } catch (err: any) {
      // exceljs not installed — fall back to CSV
      console.warn('[ReportExport] ExcelJS unavailable, falling back to CSV:', err.message);
      await this.sendCSV(res, reports);
    }
  }

  // ── PDF ───────────────────────────────────────────────────────────────────
  private async sendPDF(res: Response, reports: any[]): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({ margin: 45, size: 'A4' });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="reports_${today()}.pdf"`);
      doc.pipe(res);

      // ── Cover header
      doc
        .rect(0, 0, doc.page.width, 90).fill('#0f172a')
        .fillColor('#3b82f6').fontSize(22).font('Helvetica-Bold')
        .text('Finance Solution Suite', 45, 20)
        .fillColor('#94a3b8').fontSize(11).font('Helvetica')
        .text('Compliance Reports Export', 45, 50)
        .fillColor('#64748b').fontSize(9)
        .text(
          `Generated: ${new Date().toLocaleString()}   |   Total: ${reports.length} reports`,
          45, 70,
        );

      doc.moveDown(4);

      // ── Group by domain
      const byDomain: Record<string, any[]> = {};
      reports.forEach(r => {
        const d = r.domain_name || 'General';
        if (!byDomain[d]) byDomain[d] = [];
        byDomain[d].push(r);
      });

      const domainColors: Record<string, string> = {
        Finance: '#3b82f6', Tax: '#f59e0b', Operations: '#10b981',
        Audit: '#8b5cf6', Risk: '#ef4444', Treasury: '#06b6d4',
        HR: '#ec4899', Legal: '#f97316', IT: '#6366f1',
        'Marketing/Sales': '#d97706', 'Supply Chain': '#059669',
        ESG: '#16a34a', Other: '#64748b',
      };

      Object.entries(byDomain).forEach(([domain, domainReports]) => {
        if (doc.y > doc.page.height - 120) doc.addPage();

        const color = domainColors[domain] || '#3b82f6';

        // Domain header bar
        doc
          .rect(45, doc.y, doc.page.width - 90, 20).fill(color + '22')
          .fillColor(color).fontSize(11).font('Helvetica-Bold')
          .text(`${domain}  (${domainReports.length})`, 50, doc.y - 17)
          .moveDown(0.6);

        domainReports.forEach(r => {
          if (doc.y > doc.page.height - 60) doc.addPage();

          doc
            .fillColor('#1e293b').fontSize(9).font('Helvetica-Bold')
            .text(`• ${r.name}`, 55, doc.y, { continued: false })
            .fillColor('#64748b').fontSize(8).font('Helvetica')
            .text(
              `    ${r.frequency || '—'}  |  ${r.compliance_status || '—'}  |  ${r.report_category || '—'}`,
              65, doc.y,
            )
            .moveDown(0.25);
        });

        doc.moveDown(0.5);
      });

      // ── Footer on last page
      doc
        .fillColor('#94a3b8').fontSize(8)
        .text(
          'Confidential — Finance Solution Suite',
          45, doc.page.height - 40,
          { align: 'center', width: doc.page.width - 90 },
        );

      doc.end();
    } catch (err: any) {
      console.warn('[ReportExport] PDFKit unavailable:', err.message);
      res.status(500).json({
        status: 'error',
        message: 'PDF generation requires pdfkit. Run: npm install pdfkit',
      });
    }
  }
}

