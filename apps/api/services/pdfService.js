const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function generateInvoicePdf(invoiceData, settings) {
    const { invoice, items } = invoiceData;
    
    // Group categories for the summary table
    const categorySummary = {};
    if (items) {
        items.forEach(item => {
            const cat = item.category_name || 'Other';
            categorySummary[cat] = (categorySummary[cat] || 0) + item.executed_qty;
        });
    }

    // Read Logo
    const logoPath = path.join(__dirname, '../../web/public/logo.png');
    let logoBase64 = '';
    if (fs.existsSync(logoPath)) {
        logoBase64 = fs.readFileSync(logoPath, { encoding: 'base64' });
    }

    // Process QR
    let qrBase64 = '';
    if (settings && settings.qr_code_image) {
        qrBase64 = settings.qr_code_image.toString('base64');
    }

    // Generate HTML
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; color: #000; font-size: 12px; background: #fff; margin: 0; padding: 20px; }
            .excel-table { width: 100%; border-collapse: collapse; border-bottom: 2px solid #22c55e; }
            .excel-table td, .excel-table th { border: 1px solid #000; padding: 4px; }
            h2 { margin: 0 0 2px 0; fontSize: 14px; font-weight: bold; }
            p { margin: 0 0 2px 0; }
        </style>
    </head>
    <body>
        <div style="border: 2px solid #22c55e;">
            <div style="border-bottom: 2px solid #22c55e; text-align: center; font-weight: bold; font-size: 14px; padding: 4px;">
                TAX INVOICE
            </div>
            
            <div style="display: flex; border-bottom: 2px solid #22c55e;">
                <div style="flex: 1; padding: 4px 8px; border-right: 2px solid #22c55e;">
                    <h2>Anand Enterprises</h2>
                    <p>Address : ${settings?.address || ''}</p>
                    <p>Mobile No. : ${settings?.mobile_number || ''} , State : ${settings?.state || ''}</p>
                    <p style="margin: 0;">GST No : ${settings?.gst_number || ''} , FSSAI No : ${settings?.fssai_number || ''}</p>
                </div>
                <div style="width: 180px; padding: 8px; display: flex; align-items: center; justify-content: center;">
                    ${logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" style="max-width: 120px; max-height: 80px; object-fit: contain;" />` : ''}
                </div>
            </div>
            
            <div style="display: flex; border-bottom: 2px solid #22c55e;">
                <div style="flex: 1; padding: 4px 8px; border-right: 2px solid #22c55e;">
                    <p><strong>Bill To:</strong> ${invoice.firm_name}</p>
                    ${invoice.owner_name ? `<p>Owner Name: ${invoice.owner_name}</p>` : ''}
                    <p>Address: ${invoice.address}</p>
                    <p style="margin: 0;">Place Of Supply: Maharashtra ${invoice.fssai_number ? `, FSSAI No : ${invoice.fssai_number}` : ''}</p>
                </div>
                <div style="flex: 1; padding: 4px 8px;">
                    <p><strong>Ship To:</strong> ${invoice.firm_name}</p>
                    ${invoice.owner_name ? `<p>Owner Name: ${invoice.owner_name}</p>` : ''}
                    <p>Address: ${invoice.address}</p>
                    <p style="margin: 0;">Place Of Supply: Maharashtra ${invoice.fssai_number ? `, FSSAI No : ${invoice.fssai_number}` : ''}</p>
                </div>
            </div>
            
            <div style="display: flex; border-bottom: 2px solid #22c55e;">
                <div style="flex: 1; padding: 4px 8px; border-right: 2px solid #22c55e; font-weight: bold;">
                    BILL NO. : ${invoice.invoice_number}
                </div>
                <div style="flex: 1; padding: 4px 8px; font-weight: bold;">
                    Date : ${new Date(invoice.created_at).toLocaleDateString('en-GB').replace(/\//g, '-')}
                </div>
            </div>
            
            <table class="excel-table">
                <thead>
                    <tr>
                        <th style="text-align: center; width: 30px;">#</th>
                        <th style="text-align: center; width: 50px;">HSN</th>
                        <th style="text-align: left;">Item Name</th>
                        <th style="text-align: center; width: 50px;">UOM</th>
                        <th style="text-align: center; width: 40px;">Qty</th>
                        <th style="text-align: right; width: 50px;">Rate</th>
                        <th style="text-align: right; width: 60px;">Taxable Amt</th>
                        <th style="text-align: center; width: 40px;">CGST %</th>
                        <th style="text-align: right; width: 50px;">CGST Amt</th>
                        <th style="text-align: center; width: 40px;">SGST %</th>
                        <th style="text-align: right; width: 50px;">SGST Amt</th>
                        <th style="text-align: right; width: 70px;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map((item, idx) => {
                        const taxableAmt = item.executed_qty * item.price_at_order;
                        const cgstRate = settings?.cgst_rate || 2.5;
                        const sgstRate = settings?.sgst_rate || 2.5;
                        const cgstAmt = taxableAmt * (cgstRate / 100);
                        const sgstAmt = taxableAmt * (sgstRate / 100);
                        const rowTotal = taxableAmt + cgstAmt + sgstAmt;

                        return `
                        <tr>
                            <td style="text-align: center;">${idx + 1}</td>
                            <td style="text-align: center;">${item.hsn_code || '-'}</td>
                            <td style="font-weight: bold;">${item.product_name} - ${item.pack_size}</td>
                            <td style="text-align: center;">${item.uom || 'Box'}</td>
                            <td style="text-align: center; font-weight: bold;">${item.executed_qty}</td>
                            <td style="text-align: right; font-weight: bold;">${item.price_at_order}</td>
                            <td style="text-align: right; font-weight: bold;">${taxableAmt.toFixed(2)}</td>
                            <td style="text-align: center;">${cgstRate}%</td>
                            <td style="text-align: right;">${cgstAmt.toFixed(2)}</td>
                            <td style="text-align: center;">${sgstRate}%</td>
                            <td style="text-align: right;">${sgstAmt.toFixed(2)}</td>
                            <td style="text-align: right; font-weight: bold;">${rowTotal.toFixed(2)}</td>
                        </tr>`;
                    }).join('')}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="4" style="text-align: right; font-weight: bold;">TOTAL</td>
                        <td style="text-align: center; font-weight: bold; color: #ef4444;">
                            ${items.reduce((sum, item) => sum + item.executed_qty, 0)}
                        </td>
                        <td></td>
                        <td style="text-align: right; font-weight: bold;">${(invoice.subtotal || 0).toFixed(2)}</td>
                        <td colspan="2" style="text-align: right; font-weight: bold;">${(invoice.cgst_amount || 0).toFixed(2)}</td>
                        <td colspan="2" style="text-align: right; font-weight: bold;">${(invoice.sgst_amount || 0).toFixed(2)}</td>
                        <td style="text-align: right; font-weight: bold;">${(invoice.grand_total || 0).toFixed(2)}</td>
                    </tr>
                </tfoot>
            </table>
            
            ${Object.keys(categorySummary).length > 0 ? `
            <table class="excel-table">
                <thead>
                    <tr>
                        <th style="text-align: center; background: #f8fafc;">Filling Type</th>
                        ${Object.keys(categorySummary).map(cat => `<th style="text-align: center; background: #f8fafc;">${cat}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="text-align: center; font-weight: bold;">Box</td>
                        ${Object.keys(categorySummary).map(cat => `<td style="text-align: center; font-weight: bold;">${categorySummary[cat]}</td>`).join('')}
                    </tr>
                </tbody>
            </table>
            ` : ''}
            
            <div style="display: flex; min-height: 100px;">
                <div style="flex: 1; padding: 4px 8px; border-right: 2px solid #22c55e; font-size: 11px; font-weight: bold;">
                    <p>Note:</p>
                    <p>1. Order By: ${invoice.owner_name || '-'}</p>
                    <p>2. Goods Check Before Received!</p>
                    <p>3. Subject to jurisdiction : Palghar</p>
                </div>
                <div style="width: 150px; display: flex; align-items: center; justify-content: center; border-right: 2px solid #22c55e;">
                    ${qrBase64 ? `<img src="data:${settings.qr_code_mimetype || 'image/png'};base64,${qrBase64}" style="width: 100px; height: 100px; object-fit: contain;" />` : ''}
                </div>
                <div style="flex: 1; padding: 4px 8px; display: flex; flex-direction: column; justify-content: space-between; align-items: flex-end; font-size: 12px; font-weight: bold;">
                    <p>For Anand Enterprises</p>
                    <br><br>
                    <p>Authorised Signatory</p>
                </div>
            </div>
            
        </div>
    </body>
    </html>
    `;

    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const dir = path.join(__dirname, '../uploads/invoices');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const fileName = `invoice_${invoice.invoice_number}_${Date.now()}.pdf`;
    const filePath = path.join(dir, fileName);

    await page.pdf({
        path: filePath,
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
    });

    await browser.close();

    return `/uploads/invoices/${fileName}`;
}

module.exports = { generateInvoicePdf };
