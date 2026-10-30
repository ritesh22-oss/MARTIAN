import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generates a professional NASA-style PDF mission dossier.
 */
/**
 * Generates a professional NASA-style PDF mission dossier from active mission record.
 */
export async function generateMissionDossierPDF(activeMission: any) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;

  const addHeader = (text: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(text, margin, margin + 5);
    doc.line(margin, margin + 7, pageWidth - margin, margin + 7);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin - 50, margin + 5);
  };

  // 1. Cover Page
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('MARSNAV MISSION DOSSIER', pageWidth / 2, pageHeight / 3, { align: 'center' });
  doc.setFontSize(14);
  doc.text(`${activeMission.name}`, pageWidth / 2, pageHeight / 3 + 10, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`ID: ${activeMission.id}`, pageWidth / 2, pageHeight / 3 + 18, { align: 'center' });
  doc.addPage();

  // 2. Mission Data
  addHeader('Mission Overview');
  const details = [
    ['Name', activeMission.name],
    ['ID', activeMission.id],
    ['Status', activeMission.status],
    ['Validated', activeMission.validationPassed ? 'Yes' : 'No'],
    ['Created', new Date(activeMission.createdAt).toLocaleString()]
  ];
  autoTable(doc, { body: details, startY: 20, theme: 'striped' });

  // 3. Route & Metrics
  if (activeMission.routes && activeMission.routes.length > 0) {
    doc.addPage();
    addHeader('Route Analysis & Metrics');
    const route = activeMission.routes[activeMission.selectedRouteIndex || 0];
    const routeData = [
      ['Total Distance', `${route.totalLengthM?.toFixed(2) || 'N/A'} m`],
      ['Traversal Cost', route.totalCost || 'N/A'],
      ['Max Slope', `${route.maxSlope?.toFixed(2) || 'N/A'}°`],
      ['Waypoints', route.waypoints?.length || 0],
      ['Feasibility / Difficulty', route.difficulty || 'N/A']
    ];
    autoTable(doc, { body: routeData, startY: 20, theme: 'striped' });
  }

  // 4. Dataset Verification & Validation Reports
  if (activeMission.validationReports && activeMission.validationReports.length > 0) {
    doc.addPage();
    addHeader('Dataset Verification & Validation Reports');
    const report = activeMission.validationReports[0];
    const reportData = [
      ['Dataset ID', report.datasetId || 'N/A'],
      ['Compatibility', report.compatible ? 'Passed' : 'Failed'],
      ['Details', report.details || 'N/A']
    ];
    autoTable(doc, { body: reportData, startY: 20, theme: 'striped' });
  }

  // 5. Field Notes
  if (activeMission.fieldNotes && activeMission.fieldNotes.length > 0) {
    doc.addPage();
    addHeader('Field Notes & Observations');
    let y = 25;
    activeMission.fieldNotes.forEach((note: any, i: number) => {
      doc.setFontSize(10);
      doc.text(`${i + 1}. [${note.category || 'General'}] ${note.text} (${new Date(note.timestamp).toLocaleDateString()})`, margin, y);
      y += 12;
      if (y > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }
    });
  }

  // 6. Embedded Images (Terrain & Segmentation)
  if (activeMission.terrainImage || activeMission.processedImage || activeMission.obstacleOverlay) {
    doc.addPage();
    addHeader('Mission Visual Evidence & Segmentation');
    let yPos = 25;
    
    const addImgToPdf = (title: string, dataUrl: string) => {
      try {
        doc.setFontSize(10);
        doc.text(title, margin, yPos);
        yPos += 5;
        doc.addImage(dataUrl, 'PNG', margin, yPos, 80, 60);
        yPos += 65;
        if (yPos > pageHeight - 60) {
          doc.addPage();
          yPos = 20;
        }
      } catch (e) {
        console.warn('Could not embed image into PDF:', e);
      }
    };

    if (activeMission.terrainImage) addImgToPdf('Original Terrain Image', activeMission.terrainImage);
    if (activeMission.processedImage) addImgToPdf('Processed Terrain Image', activeMission.processedImage);
    if (activeMission.obstacleOverlay) addImgToPdf('Obstacle Detection Overlay', activeMission.obstacleOverlay);
  }


  // Download
  console.log("PDF generation completed. Triggering device download...");
  const filename = `MarsNav_Mission_Audit_${activeMission.name.replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  
  try {
    // jsPDF built-in save method is the most robust across all browsers and preview environments
    doc.save(filename);
    console.log("Download triggered successfully via doc.save().");
  } catch (err) {
    console.error("doc.save() failed, attempting blob fallback:", err);
    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
