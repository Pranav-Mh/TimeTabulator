import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const exportTimetablePDF = async (timetableName) => {
  const element = document.getElementById('timetable-pdf');

  if (!element) {
    alert('Timetable not found for PDF export');
    return;
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff'
  });

  const imgData = canvas.toDataURL('image/png');

  const pdf = new jsPDF('landscape', 'mm', 'a4');

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
  pdf.save(`${timetableName}.pdf`);
};
