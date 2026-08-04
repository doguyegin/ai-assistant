import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { env } from "../config/env.js";
import { uploadBuffer } from "../lib/s3.js";

type QuotePdfInput = {
  quoteId: string;
  tenantName: string;
  customerName: string;
  title: string;
  notes?: string | null;
  publicToken: string;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  totalAmount: number;
};

export async function generateQuotePdf(input: QuotePdfInput) {
  const publicUrl = `${env.PUBLIC_QUOTE_BASE_URL}/${input.publicToken}`;
  const qrDataUrl = await QRCode.toDataURL(publicUrl, { margin: 1, width: 160 });
  const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, "");
  const qrBuffer = Buffer.from(qrBase64, "base64");

  const doc = new PDFDocument({ margin: 50, size: "A4" });
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c as Buffer));

  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  doc.fontSize(20).text(input.tenantName, { align: "left" });
  doc.moveDown(0.5);
  doc.fontSize(14).text("TEKLİF", { align: "left" });
  doc.moveDown();
  doc.fontSize(11).text(`Başlık: ${input.title}`);
  doc.text(`Müşteri: ${input.customerName}`);
  doc.text(`Tarih: ${new Date().toLocaleDateString("tr-TR")}`);
  doc.moveDown();

  doc.fontSize(11).text("Kalemler:");
  doc.moveDown(0.5);
  for (const item of input.items) {
    doc.text(
      `${item.description} — ${item.quantity} x ${item.unitPrice.toFixed(2)} TL = ${item.lineTotal.toFixed(2)} TL`,
    );
  }

  doc.moveDown();
  doc.fontSize(13).text(`Toplam: ${input.totalAmount.toFixed(2)} TL`, {
    underline: true,
  });

  if (input.notes) {
    doc.moveDown();
    doc.fontSize(10).text(`Notlar: ${input.notes}`);
  }

  doc.moveDown();
  doc.fontSize(10).text(`Onay linki: ${publicUrl}`);
  doc.image(qrBuffer, { width: 100 });

  doc.end();
  const pdfBuffer = await done;

  const key = `quotes/${input.quoteId}.pdf`;
  const url = await uploadBuffer(key, pdfBuffer, "application/pdf");
  return { key, url, publicUrl };
}
