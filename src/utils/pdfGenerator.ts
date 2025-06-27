import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export interface PDFData {
  comparison: any;
  practiceName: string;
  practiceEmail?: string;
  generatedAt: string;
}

export const generateComparisonPDF = async (data: PDFData): Promise<void> => {
  try {
    // Create a hidden div for PDF content
    const pdfContent = document.createElement('div');
    pdfContent.style.position = 'absolute';
    pdfContent.style.left = '-9999px';
    pdfContent.style.width = '800px';
    pdfContent.style.padding = '40px';
    pdfContent.style.backgroundColor = 'white';
    pdfContent.style.fontFamily = 'Arial, sans-serif';

    pdfContent.innerHTML = `
      <div style="margin-bottom: 40px; text-align: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px;">
        <h1 style="color: #1f2937; margin: 0; font-size: 24px;">Contact Lens Cost Comparison</h1>
        <h2 style="color: #374151; margin: 10px 0; font-size: 18px;">${data.practiceName}</h2>
        <p style="color: #6b7280; margin: 5px 0;">${data.practiceEmail || ''}</p>
        <p style="color: #6b7280; margin: 5px 0; font-size: 12px;">Generated on ${data.generatedAt}</p>
      </div>

      <div style="margin-bottom: 30px;">
        <h3 style="color: #1f2937; margin-bottom: 15px; font-size: 18px;">
          ${data.comparison.brand.name} - ${data.comparison.brand.replacement_schedule} (${data.comparison.wearer_status} wearer)
        </h3>
        <p style="color: #374151; margin: 5px 0;">Annual supply: ${data.comparison.brand.boxes_per_annual} boxes</p>
        ${data.comparison.insurance_benefit > 0 ? `<p style="color: #374151; margin: 5px 0;">Insurance benefit applied: $${data.comparison.insurance_benefit.toFixed(2)}</p>` : ''}
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
        <!-- Practice Column -->
        <div style="border: 2px solid #3b82f6; border-radius: 8px; padding: 20px; background-color: #eff6ff;">
          <h4 style="color: #1d4ed8; margin: 0 0 15px 0; text-align: center; font-size: 16px;">🏥 ${data.practiceName}</h4>
          
          <div style="margin-bottom: 10px; display: flex; justify-content: space-between;">
            <span>Price per box:</span>
            <span style="font-weight: bold;">$${data.comparison.practice.price_per_box.toFixed(2)}</span>
          </div>
          
          <div style="margin-bottom: 10px; display: flex; justify-content: space-between;">
            <span>Annual subtotal:</span>
            <span style="font-weight: bold;">$${data.comparison.practice.subtotal.toFixed(2)}</span>
          </div>
          
          ${data.comparison.practice.rebate_applied > 0 ? `
          <div style="margin-bottom: 10px; display: flex; justify-content: space-between; color: #059669;">
            <span>Rebate discount:</span>
            <span style="font-weight: bold;">-$${data.comparison.practice.rebate_applied.toFixed(2)}</span>
          </div>
          ` : ''}
          
          ${data.comparison.practice.insurance_applied > 0 ? `
          <div style="margin-bottom: 10px; display: flex; justify-content: space-between; color: #059669;">
            <span>Insurance benefit:</span>
            <span style="font-weight: bold;">-$${data.comparison.practice.insurance_applied.toFixed(2)}</span>
          </div>
          ` : ''}
          
          <hr style="border: 1px solid #9ca3af; margin: 15px 0;">
          
          <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; color: #1d4ed8;">
            <span>You pay:</span>
            <span>$${data.comparison.practice.final_amount.toFixed(2)}</span>
          </div>
        </div>

        <!-- Competitor Column -->
        <div style="border: 2px solid #dc2626; border-radius: 8px; padding: 20px; background-color: #fef2f2;">
          <h4 style="color: #dc2626; margin: 0 0 15px 0; text-align: center; font-size: 16px;">🌐 ${data.comparison.competitor.name}</h4>
          
          <div style="margin-bottom: 10px; display: flex; justify-content: space-between;">
            <span>Price per box:</span>
            <span style="font-weight: bold;">$${data.comparison.competitor.price_per_box.toFixed(2)}</span>
          </div>
          
          <div style="margin-bottom: 10px; display: flex; justify-content: space-between;">
            <span>Annual subtotal:</span>
            <span style="font-weight: bold;">$${data.comparison.competitor.subtotal.toFixed(2)}</span>
          </div>
          
          <div style="margin-bottom: 10px; display: flex; justify-content: space-between; color: #6b7280;">
            <span>Manufacturer rebate:</span>
            <span>$0.00 (Not available online)</span>
          </div>
          
          <div style="margin-bottom: 10px; display: flex; justify-content: space-between; color: #6b7280;">
            <span>Insurance benefit:</span>
            <span>$0.00</span>
          </div>
          
          <hr style="border: 1px solid #9ca3af; margin: 15px 0;">
          
          <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; color: #dc2626;">
            <span>You pay:</span>
            <span>$${data.comparison.competitor.final_amount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <!-- Savings Summary -->
      <div style="border: 2px solid #059669; border-radius: 8px; padding: 20px; background-color: #ecfdf5; text-align: center;">
        <h4 style="color: #059669; margin: 0 0 20px 0; font-size: 18px;">💰 Your Annual Savings</h4>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
          <div>
            <div style="font-size: 32px; font-weight: bold; color: #059669;">
              $${data.comparison.savings.total_savings.toFixed(2)}
            </div>
            <div style="color: #065f46;">Total Savings</div>
          </div>
          
          <div>
            <div style="font-size: 32px; font-weight: bold; color: #059669;">
              ${data.comparison.savings.percentage_savings.toFixed(1)}%
            </div>
            <div style="color: #065f46;">Percentage Savings</div>
          </div>
        </div>
        
        <p style="color: #065f46; margin: 0 0 15px 0; font-weight: bold;">
          By purchasing your annual supply here, you save $${data.comparison.savings.total_savings.toFixed(2)} compared to ${data.comparison.competitor.name}!
        </p>
        <div style="background-color: #dbeafe; border: 1px solid #3b82f6; border-radius: 8px; padding: 15px; margin-top: 10px;">
          <h5 style="color: #1e40af; margin: 0 0 10px 0; font-size: 14px; font-weight: bold;">🏆 Your Competitive Advantage</h5>
          <p style="color: #1e40af; margin: 0; font-size: 12px;">
            Manufacturer rebates from <strong>Alcon, Johnson & Johnson, Bausch + Lomb, and CooperVision</strong> are <strong>EXCLUSIVE to private practices</strong>. 
            Online retailers like 1-800-CONTACTS cannot offer these rebates, making your practice the better choice for patients!
          </p>
        </div>
      </div>

      <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px;">
        <p>This comparison is based on current pricing and may be subject to change.</p>
        <p>Contact us for the most up-to-date pricing and to place your order.</p>
        <p style="font-weight: bold; color: #059669; margin-top: 10px;">Manufacturer rebates are exclusive to private practices and not available through online retailers.</p>
      </div>
    `;

    document.body.appendChild(pdfContent);

    // Generate canvas from HTML
    const canvas = await html2canvas(pdfContent, {
      scale: 2,
      useCORS: true,
      allowTaint: true
    });

    // Remove the temporary element
    document.body.removeChild(pdfContent);

    // Create PDF
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 295; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;

    const pdf = new jsPDF('p', 'mm', 'a4');
    let position = 0;

    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Save the PDF
    const fileName = `Contact_Lens_Comparison_${data.comparison.brand.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
    pdf.save(fileName);

  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF');
  }
};