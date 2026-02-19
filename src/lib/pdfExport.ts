import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const exportToPDF = async (
  elementId: string,
  filename: string,
  title: string
): Promise<void> => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Element not found');
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  const imgWidth = 210; // A4 width in mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  const pdf = new jsPDF('p', 'mm', 'a4');

  // Header
  pdf.setFontSize(20);
  pdf.setTextColor(30, 41, 59);
  pdf.text(title, 20, 20);

  pdf.setFontSize(10);
  pdf.setTextColor(100, 116, 139);
  pdf.text(`Generated: ${new Date().toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 20, 28);
  pdf.text('J2 Group • Melbourne, Australia', 20, 34);

  // Separator line
  pdf.setDrawColor(226, 232, 240);
  pdf.line(20, 37, 190, 37);

  // Add captured content
  const imgData = canvas.toDataURL('image/png');
  const contentStartY = 42;
  const availableHeight = 297 - contentStartY - 10;
  const scaledHeight = Math.min(imgHeight - 20, availableHeight);

  pdf.addImage(imgData, 'PNG', 10, contentStartY, imgWidth - 20, scaledHeight);

  // If content is taller than one page, add extra pages
  if (imgHeight - 20 > availableHeight) {
    let remainingHeight = imgHeight - 20 - availableHeight;
    let yOffset = availableHeight;

    while (remainingHeight > 0) {
      pdf.addPage();
      const pageHeight = Math.min(remainingHeight, 287);
      // Re-add the full image shifted up
      pdf.addImage(imgData, 'PNG', 10, 10 - yOffset, imgWidth - 20, imgHeight - 20);
      remainingHeight -= pageHeight;
      yOffset += pageHeight;
    }
  }

  pdf.save(filename);
};
