import React, { useState } from 'react';

const TimetableExport = ({ timetable }) => {
  const [loading, setLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState('pdf');

  // ✅ Export Functions
  const exportToPDF = async () => {
    setLoading(true);
    try {
      // This would integrate with a PDF generation library like jsPDF or Puppeteer
      console.log('Exporting to PDF...', timetable);
      
      // Simulate export delay
      setTimeout(() => {
        // Create downloadable PDF
        alert('PDF export functionality to be implemented with jsPDF or similar library');
        setLoading(false);
      }, 2000);
      
    } catch (error) {
      console.error('PDF export error:', error);
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    setLoading(true);
    try {
      // This would integrate with a library like SheetJS/xlsx
      console.log('Exporting to Excel...', timetable);
      
      // Simulate export delay
      setTimeout(() => {
        alert('Excel export functionality to be implemented with SheetJS');
        setLoading(false);
      }, 2000);
      
    } catch (error) {
      console.error('Excel export error:', error);
      setLoading(false);
    }
  };

  const printTimetable = () => {
    // Open print dialog with formatted timetable
    const printContent = generatePrintableHTML();
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  // ✅ Generate Printable HTML
  const generatePrintableHTML = () => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const divisions = [...new Set(timetable.slots?.map(slot => `${slot.division.year}-${slot.division.divisionName}`))];
    const maxSlot = Math.max(...(timetable.slots?.map(slot => slot.slotNumber) || [8]));
    const slots = Array.from({ length: maxSlot }, (_, i) => i + 1);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>TimeTabulator - Master Timetable</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .timetable { border-collapse: collapse; width: 100%; margin-bottom: 30px; }
            .timetable th, .timetable td { border: 1px solid #333; padding: 8px; text-align: center; }
            .timetable th { background-color: #f0f0f0; font-weight: bold; }
            .day-header { background-color: #1976d2; color: white; font-size: 16px; padding: 12px; }
            .division-cell { background-color: #f8f9fa; font-weight: bold; text-align: left; }
            .lab-cell { background-color: #e3f2fd; }
            .lecture-cell { background-color: #e8f5e8; }
            .free-cell { background-color: #f8f9fa; color: #666; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>TimeTabulator - Master Timetable</h1>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
          </div>
          
          ${days.map(day => `
            <div class="day-header">${day}</div>
            <table class="timetable">
              <thead>
                <tr>
                  <th>Division</th>
                  ${slots.map(slot => `<th>Slot ${slot}<br><small>Time</small></th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${divisions.map(division => `
                  <tr>
                    <td class="division-cell">${division}</td>
                    ${slots.map(slot => {
                      const assignment = timetable.slots?.find(s => 
                        `${s.division.year}-${s.division.divisionName}` === division &&
                        s.day === day && s.slotNumber === slot
                      );
                      
                      if (assignment) {
                        const isLab = assignment.type === 'lab';
                        return `
                          <td class="${isLab ? 'lab-cell' : 'lecture-cell'}">
                            <strong>${assignment.subject.name}</strong><br>
                            <small>${assignment.teacher.name}</small><br>
                            <small>${assignment.room.name}</small>
                            ${assignment.batch ? `<br><small><strong>${assignment.batch}</strong></small>` : ''}
                          </td>
                        `;
                      } else {
                        return `<td class="free-cell">Free</td>`;
                      }
                    }).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `).join('')}
          
          <div style="margin-top: 30px; font-size: 12px; color: #666;">
            <p><strong>Legend:</strong></p>
            <p>🟢 Theory Lectures | 🔵 Lab Sessions | ⚪ Free Slots</p>
            <p>Generated by TimeTabulator - Advanced Timetable Management System</p>
          </div>
        </body>
      </html>
    `;
  };

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      {/* Export Format Selector */}
      <select
        value={exportFormat}
        onChange={(e) => setExportFormat(e.target.value)}
        style={{
          padding: '6px 12px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          fontSize: '14px'
        }}
      >
        <option value="pdf">PDF</option>
        <option value="excel">Excel</option>
        <option value="print">Print</option>
      </select>

      {/* Export Button */}
      <button
        onClick={() => {
          switch (exportFormat) {
            case 'pdf':
              exportToPDF();
              break;
            case 'excel':
              exportToExcel();
              break;
            case 'print':
              printTimetable();
              break;
            default:
              exportToPDF();
          }
        }}
        disabled={loading}
        style={{
          backgroundColor: loading ? '#6c757d' : '#2e7d32',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        {loading ? (
          <>
            <div style={{
              width: '14px',
              height: '14px',
              border: '2px solid #ffffff40',
              borderTop: '2px solid #ffffff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            Exporting...
          </>
        ) : (
          <>
            📤 Export {exportFormat.toUpperCase()}
          </>
        )}
      </button>

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default TimetableExport;
