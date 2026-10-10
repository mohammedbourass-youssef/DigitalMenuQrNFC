import { jsPDF } from "jspdf";

export interface PdfLine {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface GenerateOrderReceiptOptions {
  orderNumber: number;
  orderId: string;
  tableNumber: number;
  currencyCode: string;
  language: string;
  total: number;
  paidAmount: number;
  due: number;
  isPaid: boolean;
  lines: PdfLine[];
  /** yyyy-MM-dd HH:mm in the requested language locale. */
  issuedAt?: string;
}

const PDF_MARGIN = 14;

function formatCurrency(amount: number, language: string, currency: string): string {
  try {
    return new Intl.NumberFormat(language, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function formatDate(language: string): string {
  try {
    return new Intl.DateTimeFormat(language, {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date());
  } catch {
    return new Date().toLocaleString();
  }
}

/**
 * Generates a lightweight, front-end only receipt PDF. The columns and labels
 * follow the order information modal exactly: item, quantity, unit price, line
 * total, with totals (total, paid, due) at the bottom. No images, no logos, and
 * no backend call.
 */
export function generateOrderReceiptPdf(options: GenerateOrderReceiptOptions): void {
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

  const issuedAt = options.issuedAt ?? formatDate(options.language);
  let y = PDF_MARGIN;

  // Title
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Order Receipt", PDF_MARGIN, y);
  y += 8;

  // Metadata
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Order #: ${options.orderNumber}`, PDF_MARGIN, y);
  y += 5;
  doc.text(`Order ID: ${options.orderId}`, PDF_MARGIN, y);
  y += 5;
  doc.text(`Table: ${options.tableNumber}`, PDF_MARGIN, y);
  y += 5;
  doc.text(`Date: ${issuedAt}`, PDF_MARGIN, y);
  y += 5;
  doc.text(`Currency: ${options.currencyCode}`, PDF_MARGIN, y);
  y += 5;
  doc.text(`Status: ${options.isPaid ? "Paid" : "Unpaid"}`, PDF_MARGIN, y);
  y += 10;

  // Table headers
  doc.setFont("helvetica", "bold");
  const colX = [PDF_MARGIN, PDF_MARGIN + 70, PDF_MARGIN + 95, PDF_MARGIN + 125];
  doc.text("Item", colX[0], y);
  doc.text("Qty", colX[1], y, { align: "right" });
  doc.text("Unit Price", colX[2], y, { align: "right" });
  doc.text("Line Total", colX[3], y, { align: "right" });
  y += 2;
  doc.line(PDF_MARGIN, y, 200 - PDF_MARGIN, y);
  y += 5;

  // Lines
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  for (const line of options.lines) {
    const nameLines = doc.splitTextToSize(line.name, 65);
    const lineHeight = nameLines.length * 4;
    if (y + lineHeight > 280) {
      doc.addPage();
      y = PDF_MARGIN;
    }
    // Name
    doc.text(nameLines, colX[0], y);
    const baseY = y;
    // Qty
    doc.text(String(line.quantity), colX[1], baseY, { align: "right" });
    // Unit price
    doc.text(formatCurrency(line.unitPrice, options.language, options.currencyCode), colX[2], baseY, { align: "right" });
    // Line total
    doc.text(formatCurrency(line.lineTotal, options.language, options.currencyCode), colX[3], baseY, { align: "right" });
    y += lineHeight + 2;
  }

  y += 2;
  doc.line(PDF_MARGIN, y, 200 - PDF_MARGIN, y);
  y += 6;

  // Totals
  doc.setFont("helvetica", "bold");
  const totalsXLabel = 130;
  const totalsXValue = 200 - PDF_MARGIN;
  doc.text("Total", totalsXLabel, y, { align: "right" });
  doc.text(formatCurrency(options.total, options.language, options.currencyCode), totalsXValue, y, { align: "right" });
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.text("Paid Amount", totalsXLabel, y, { align: "right" });
  doc.text(formatCurrency(options.paidAmount, options.language, options.currencyCode), totalsXValue, y, { align: "right" });
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.text("Amount Due", totalsXLabel, y, { align: "right" });
  doc.text(formatCurrency(options.due, options.language, options.currencyCode), totalsXValue, y, { align: "right" });
  y += 10;

  // Footer note
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Generated locally on this device — no backend invoice was created.", PDF_MARGIN, 290);

  const fileName = `order-${options.orderNumber}-receipt.pdf`;
  doc.save(fileName);
}