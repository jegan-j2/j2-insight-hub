import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const LOGO_URL = "https://eaeqkgjhgdykxwjkaxpj.supabase.co/storage/v1/object/public/branding/j2_logo_dark_transparent.png";
const CIRCLE_LOGO_URL = "https://eaeqkgjhgdykxwjkaxpj.supabase.co/storage/v1/object/public/branding/j2_logo_new_darkmode.png";

const loadImage = async (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = url;
  });
};

const addHeaderAndFooter = (
  pdf: jsPDF,
  logoData: string,
  pageNum: number,
  totalPages: number,
  clientName?: string,
  dateRange?: string
) => {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Header logo
  pdf.addImage(logoData, 'PNG', 10, 8, 12, 12);

  // Header title
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(30, 41, 59);
  pdf.text("J2 Insight Hub", 25, 16);

  // Right side: client + date
  if (clientName || dateRange) {
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100, 116, 139);
    const rightText = [clientName, dateRange].filter(Boolean).join(" • ");
    pdf.text(rightText, pageWidth - 10, 16, { align: "right" });
  }

  // Header line
  pdf.setDrawColor(226, 232, 240);
  pdf.line(10, 24, pageWidth - 10, 24);

  // Footer
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(150, 160, 170);
  pdf.text(`Page ${pageNum} of ${totalPages}`, pageWidth / 2, pageHeight - 5, { align: "center" });
};

const addCoverPage = (
  pdf: jsPDF,
  circleLogoData: string,
  title: string,
  reportType?: string,
  clientName?: string,
  dateRange?: string
) => {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const centerX = pageWidth / 2;

  // Centered circular logo
  const logoSize = 30;
  pdf.addImage(circleLogoData, 'PNG', centerX - logoSize / 2, 60, logoSize, logoSize);

  // "J2 Insight Hub"
  pdf.setFontSize(22);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(30, 41, 59);
  pdf.text("J2 Insight Hub", centerX, 105, { align: "center" });

  // Report type
  if (reportType) {
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100, 116, 139);
    pdf.text(reportType, centerX, 118, { align: "center" });
  }

  // Client name
  if (clientName) {
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(30, 41, 59);
    pdf.text(clientName, centerX, 133, { align: "center" });
  }

  // Date range
  if (dateRange) {
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100, 116, 139);
    pdf.text(dateRange, centerX, 146, { align: "center" });
  }

  // Generated timestamp
  const now = new Date().toLocaleDateString('en-AU', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  pdf.setFontSize(10);
  pdf.setTextColor(180, 180, 180);
  pdf.text(`Generated: ${now}`, centerX, 160, { align: "center" });

  // Bottom line + confidential
  pdf.setDrawColor(226, 232, 240);
  pdf.line(40, pageHeight - 20, pageWidth - 40, pageHeight - 20);
  pdf.setFontSize(8);
  pdf.setTextColor(150, 160, 170);
  pdf.text("Confidential — J2 Group", centerX, pageHeight - 14, { align: "center" });
};

export const exportToPDF = async (
  elementId: string,
  filename: string,
  title: string,
  clientName?: string,
  dateRange?: string
): Promise<void> => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Element not found');
  }

  // Load logos in parallel
  const [logoData, circleLogoData] = await Promise.all([
    loadImage(LOGO_URL),
    loadImage(CIRCLE_LOGO_URL),
  ]);

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Determine report type from title
  const reportType = title;

  // Cover page
  addCoverPage(pdf, circleLogoData, title, reportType, clientName, dateRange);

  // Content pages
  const imgWidth = pageWidth - 20; // 10mm margins
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const contentStartY = 28;
  const availableHeight = pageHeight - contentStartY - 12;
  const imgData = canvas.toDataURL('image/png');

  // Calculate total content pages needed
  const totalContentPages = Math.ceil(imgHeight / availableHeight);
  const totalPages = totalContentPages + 1; // +1 for cover

  // Render content across pages
  for (let i = 0; i < totalContentPages; i++) {
    pdf.addPage();
    const yOffset = i * availableHeight;
    // Clip content to available area
    pdf.addImage(imgData, 'PNG', 10, contentStartY - yOffset, imgWidth, imgHeight);

    addHeaderAndFooter(pdf, logoData, i + 2, totalPages, clientName, dateRange);
  }

  // Cover page footer (page 1)
  pdf.setPage(1);
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(150, 160, 170);
  pdf.text(`Page 1 of ${totalPages}`, pageWidth / 2, pageHeight - 5, { align: "center" });

  pdf.save(filename);
};
