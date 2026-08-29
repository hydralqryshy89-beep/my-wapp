import PDFDocument from "pdfkit";
import path from "path";
import { shapeArabicLine } from "./arabic-shape";

const FONT_REGULAR = path.join(process.cwd(), "src/lib/pdf/fonts/Cairo-Regular.woff");
const FONT_BOLD = path.join(process.cwd(), "src/lib/pdf/fonts/Cairo-Bold.woff");

export interface CertificateData {
  academyName: string;
  academyLogo?: string | null; // data URL
  studentName: string;
  courseName: string;
  instructorName?: string | null;
  courseDateRange: string;
  certificateNumber: string;
  issueDate: string;
}

// Draws right-to-left, right-aligned Arabic text (with correctly embedded
// left-to-right runs like numbers/dates) inside a fixed-width box.
function rtlText(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  width: number,
  align: "center" | "left" | "right" = "center"
) {
  doc.text(shapeArabicLine(text), x, y, { width, align });
}

export function buildCertificatePdf(data: CertificateData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 0 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.registerFont("Cairo", FONT_REGULAR);
    doc.registerFont("Cairo-Bold", FONT_BOLD);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    // Background + decorative border
    doc.rect(0, 0, pageWidth, pageHeight).fill("#fffdf9");
    doc.lineWidth(3).strokeColor("#7a1f35").rect(24, 24, pageWidth - 48, pageHeight - 48).stroke();
    doc.lineWidth(1).strokeColor("#b8860b").rect(34, 34, pageWidth - 68, pageHeight - 68).stroke();

    const contentWidth = pageWidth - 160;
    const contentX = 80;

    if (data.academyLogo) {
      try {
        doc.image(data.academyLogo, pageWidth / 2 - 30, 55, { width: 60, height: 60, fit: [60, 60] });
      } catch {
        // Corrupt/unsupported logo data — skip it, the certificate still works without one.
      }
    }

    doc.fillColor("#7a1f35").font("Cairo-Bold").fontSize(26);
    rtlText(doc, data.academyName, contentX, 130, contentWidth);

    doc.fillColor("#b8860b").font("Cairo-Bold").fontSize(30);
    rtlText(doc, "شهادة إتمام دورة تدريبية", contentX, 175, contentWidth);

    doc.fillColor("#1c1520").font("Cairo").fontSize(14);
    rtlText(doc, "تشهد إدارة الأكاديمية بأن", contentX, 235, contentWidth);

    doc.fillColor("#7a1f35").font("Cairo-Bold").fontSize(28);
    rtlText(doc, data.studentName, contentX, 265, contentWidth);

    doc.fillColor("#1c1520").font("Cairo").fontSize(14);
    rtlText(doc, "قد أتم/ـت بنجاح دورة", contentX, 315, contentWidth);

    doc.fillColor("#16233f").font("Cairo-Bold").fontSize(22);
    rtlText(doc, data.courseName, contentX, 345, contentWidth);

    doc.fillColor("#1c1520").font("Cairo").fontSize(13);
    const detailsLine = data.instructorName
      ? `بإشراف المدرب ${data.instructorName} — خلال الفترة ${data.courseDateRange}`
      : `خلال الفترة ${data.courseDateRange}`;
    rtlText(doc, detailsLine, contentX, 395, contentWidth);

    // Footer: certificate number (left) + issue date (right), both LTR-safe.
    const footerY = pageHeight - 90;
    doc.fillColor("#6b6470").font("Cairo").fontSize(11);
    rtlText(doc, `رقم الشهادة: ${data.certificateNumber}`, 60, footerY, 260, "left");
    rtlText(doc, `تاريخ الإصدار: ${data.issueDate}`, pageWidth - 320, footerY, 260, "right");

    doc.end();
  });
}
