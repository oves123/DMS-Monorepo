

const CATEGORY_ORDER = {
  'chips': 1,
  'corn products': 2,
  'chocos': 3,
  'extruded': 4,
  'fryums': 5,
  'namkeen': 6,
  'biscuits': 7,
  'bakery': 8
};

const extractPriceOrWeight = (packSize) => {
  if (!packSize) return null;
  const str = String(packSize).trim();
  const rsMatch = str.match(/(\d+)Rs/i);
  if (rsMatch) return `${rsMatch[1]}Rs`;
  
  const weightMatch = str.match(/(\d+(?:\.\d+)?)\s*(g|gm|kg|ml|l)/i);
  if (weightMatch) {
    let unit = weightMatch[2].toLowerCase();
    if (unit === 'gm') unit = 'g';
    return `${weightMatch[1]}${unit}`;
  }
  return null;
};

const formatPackSize = (packSize) => {
  if (!packSize) return '';
  const match = String(packSize).match(/^(\d+)Rs/i);
  if (match) {
    const retailPrice = parseInt(match[1], 10);
    if (retailPrice <= 20) {
      return String(packSize).replace(/\s*\d+\s*(?:g|gm|kg)\s*$/i, '');
    }
  }
  return packSize;
};

const getPackSizeWeight = (packSize) => {
  if (!packSize) return 999999;
  const str = String(packSize).toLowerCase();
  const numMatch = str.match(/(\d+(\.\d+)?)/);
  const num = numMatch ? parseFloat(numMatch[1]) : 0;
  
  if (str.includes('rs')) return num;
  if (str.includes('kg')) return 10000 + (num * 1000);
  if (str.includes('gm') || str.includes('g')) return 10000 + num;
  if (str.includes('l') && !str.includes('ml')) return 20000 + (num * 1000);
  if (str.includes('ml')) return 20000 + num;
  
  return 999000 + num;
};

const sortItemsByCategory = (items) => {
  if (!items || !Array.isArray(items)) return items;
  return [...items].sort((a, b) => {
    const weightA = getPackSizeWeight(a.pack_size);
    const weightB = getPackSizeWeight(b.pack_size);
    
    if (weightA !== weightB) {
      return weightA - weightB;
    }
    
    const catA = a.category_name ? String(a.category_name).toLowerCase().trim() : '';
    const catB = b.category_name ? String(b.category_name).toLowerCase().trim() : '';
    const rankA = CATEGORY_ORDER[catA] || 99;
    const rankB = CATEGORY_ORDER[catB] || 99;
    
    return rankA - rankB;
  });
};
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const signatureBase64 = require('./signature');

async function generateInvoicePdf(invoiceData, settings) {
    const { invoice, items } = invoiceData;
    
    // Group categories for the summary table
    const categorySummary = {};
    const priceSummary = {};
    if (items) {
        items.forEach(item => {
            const cat = item.category_name || 'Other';
            categorySummary[cat] = (categorySummary[cat] || 0) + item.executed_qty;
            
            const groupKey = extractPriceOrWeight(item.pack_size);
            if (groupKey) {
                priceSummary[groupKey] = (priceSummary[groupKey] || 0) + item.executed_qty;
            }
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
            body { font-family: Arial, sans-serif; color: #000; font-size: 13px; background: #fff; margin: 0; padding: 10px 5px; }
            .excel-table { width: 100%; border-collapse: collapse; border-bottom: 2px solid #000; font-size: 10px; }
            .excel-table td, .excel-table th { border: 1px solid #000; padding: 4px 2px; }
            .excel-table tr { page-break-inside: avoid; }
            tfoot { display: table-row-group; }
            h2 { margin: 0 0 2px 0; font-size: 16px; font-weight: bold; }
            p { margin: 0 0 2px 0; }
        </style>
    </head>
    <body>
        <div style="border: 2px solid #000;">
            <div style="border-bottom: 2px solid #000; text-align: center; font-weight: bold; font-size: 14px; padding: 4px;">
                TAX INVOICE
            </div>
            
            <div style="display: flex; border-bottom: 2px solid #000;">
                <div style="flex: 1; padding: 4px 8px; border-right: 2px solid #000;">
                    <h2>Anand Enterprises</h2>
                    <p>Address : ${settings?.address || ''}</p>
                    <p>Mobile No. : ${settings?.mobile_number || ''} , State : ${settings?.state || ''}</p>
                    <p style="margin: 0;">GST No : ${settings?.gst_number || ''} , FSSAI No : ${settings?.fssai_number || ''}</p>
                </div>
                <div style="width: 180px; padding: 8px; display: flex; align-items: center; justify-content: center;">
                    ${logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" style="max-width: 120px; max-height: 80px; object-fit: contain;" />` : ''}
                </div>
            </div>
            
            <div style="display: flex; border-bottom: 2px solid #000;">
                <div style="flex: 1; padding: 4px 8px; border-right: 2px solid #000;">
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
            
            <div style="display: flex; border-bottom: 2px solid #000;">
                <div style="flex: 1; padding: 4px 8px; border-right: 2px solid #000; font-weight: bold;">
                    BILL NO. : ${invoice.invoice_number}
                </div>
                <div style="flex: 1; padding: 4px 8px; font-weight: bold;">
                    Date : ${new Date(invoice.created_at).toLocaleDateString('en-GB').replace(/\//g, '-')}
                </div>
            </div>
            
            <table class="excel-table">
                <thead>
                    <tr>
                        <th style="text-align: center; width: 3%;">#</th>
                        <th style="text-align: center; width: 6%;">HSN</th>
                        <th style="text-align: left; width: 35%;">Item Name</th>
                        <th style="text-align: center; width: 4%;">UOM</th>
                        <th style="text-align: center; width: 4%;">Qty</th>
                        <th style="text-align: right; width: 6%;">Rate</th>
                        <th style="text-align: center; width: 4%;">CGST %</th>
                        <th style="text-align: right; width: 6%;">CGST Amt</th>
                        <th style="text-align: center; width: 4%;">SGST %</th>
                        <th style="text-align: right; width: 6%;">SGST Amt</th>
                        <th style="text-align: right; width: 10%;">Taxable Amt</th>
                        <th style="text-align: right; width: 12%;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortItemsByCategory(items).map((item, idx) => {
                        const taxableAmt = item.executed_qty * item.price_at_order;
                        const gstPct = parseFloat(item.gst_percent) || 0;
                        const cgstRate = gstPct / 2;
                        const sgstRate = gstPct / 2;
                        const cgstAmt = taxableAmt * (cgstRate / 100);
                        const sgstAmt = taxableAmt * (sgstRate / 100);
                        const rowTotal = taxableAmt + cgstAmt + sgstAmt;

                        return `
                        <tr>
                            <td style="text-align: center;">${idx + 1}</td>
                            <td style="text-align: center;">${item.hsn_code || '-'}</td>
                            <td style="font-weight: bold; white-space: nowrap;">${item.product_name} - ${formatPackSize(item.pack_size)}</td>
                            <td style="text-align: center;">${item.uom || 'Box'}</td>
                            <td style="text-align: center; font-weight: bold;">${item.executed_qty}</td>
                            <td style="text-align: right; font-weight: bold;">${item.price_at_order}</td>
                            <td style="text-align: center;">${cgstRate}%</td>
                            <td style="text-align: right;">${cgstAmt.toFixed(2)}</td>
                            <td style="text-align: center;">${sgstRate}%</td>
                            <td style="text-align: right;">${sgstAmt.toFixed(2)}</td>
                            <td style="text-align: right; font-weight: bold;">${taxableAmt.toFixed(2)}</td>
                            <td style="text-align: right; font-weight: bold;">${Math.round(rowTotal).toFixed(2)}</td>
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
                        <td></td>
                        <td style="text-align: right; font-weight: bold;">${items.reduce((sum, item) => sum + (item.executed_qty * item.price_at_order * ((parseFloat(item.gst_percent) || 0) / 2 / 100)), 0).toFixed(2)}</td>
                        <td></td>
                        <td style="text-align: right; font-weight: bold;">${items.reduce((sum, item) => sum + (item.executed_qty * item.price_at_order * ((parseFloat(item.gst_percent) || 0) / 2 / 100)), 0).toFixed(2)}</td>
                        <td style="text-align: right; font-weight: bold;">${(invoice.subtotal || 0).toFixed(2)}</td>
                        <td style="text-align: right; font-weight: bold;">${Math.round(items.reduce((sum, item) => {
                            const taxable = item.executed_qty * item.price_at_order;
                            const gstPct = parseFloat(item.gst_percent) || 0;
                            return sum + taxable + (taxable * (gstPct / 100));
                        }, 0)).toFixed(2)}</td>
                    </tr>
                    ${invoice.extra_discount ? `
                    <tr>
                        <td colspan="11" style="text-align: right; font-weight: bold;">Extra Discount</td>
                        <td style="text-align: right; font-weight: bold; color: #ef4444;">-${Number(invoice.extra_discount).toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td colspan="11" style="text-align: right; font-weight: bold;">FINAL PAYABLE</td>
                        <td style="text-align: right; font-weight: bold;">${Math.round(items.reduce((sum, item) => {
                            const taxable = item.executed_qty * item.price_at_order;
                            const gstPct = parseFloat(item.gst_percent) || 0;
                            return sum + taxable + (taxable * (gstPct / 100));
                        }, 0) - (invoice.extra_discount || 0) - (invoice.credit_applied || 0)).toFixed(2)}</td>
                    </tr>
                    ` : ''}
                </tfoot>
            </table>
            
            ${Object.keys(categorySummary).length > 0 ? (() => {
                const preferredOrder = [
                  'chips',
                  'corn products',
                  'chocos',
                  'extruded',
                  'fryums',
                  'namkeen',
                  'biscuits',
                  'bakery'
                ];
                
                const getCategorySortWeight = (catName) => {
                  const lowerName = catName.toLowerCase();
                  const index = preferredOrder.indexOf(lowerName);
                  return index !== -1 ? index : 999;
                };

                const sortedCategories = Object.keys(categorySummary).sort((a, b) => {
                  return getCategorySortWeight(a) - getCategorySortWeight(b);
                });

                return `
                <table class="excel-table">
                    <thead>
                        <tr>
                            <th style="text-align: center; background: #f8fafc;">Filling Type</th>
                            ${sortedCategories.map(cat => `<th style="text-align: center; background: #f8fafc; text-transform: uppercase;">${cat}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="text-align: center; font-weight: bold;">Box</td>
                            ${sortedCategories.map(cat => `<td style="text-align: center; font-weight: bold;">${categorySummary[cat]}</td>`).join('')}
                        </tr>
                    </tbody>
                </table>
                `;
            })() : ''}

            ${Object.keys(priceSummary).length > 0 ? (() => {
                const sortedPrices = Object.keys(priceSummary).sort((a, b) => {
                  return getPackSizeWeight(a) - getPackSizeWeight(b);
                });

                return `
                <table class="excel-table">
                    <thead>
                        <tr>
                            <th style="text-align: center; background: #f8fafc;">Pack Size / Price</th>
                            ${sortedPrices.map(price => `<th style="text-align: center; background: #f8fafc;">${price}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="text-align: center; font-weight: bold;">Total Box</td>
                            ${sortedPrices.map(price => `<td style="text-align: center; font-weight: bold;">${priceSummary[price]}</td>`).join('')}
                        </tr>
                    </tbody>
                </table>
                `;
            })() : ''}
            
            <div style="display: flex; min-height: 150px; page-break-inside: avoid;">
                <div style="flex: 1; padding: 4px 8px; border-right: 2px solid #000; font-size: 13px; font-weight: bold;">
                    <p>Note:</p>
                    <p>1. Order By: ${invoice.owner_name || '-'}</p>
                    <p>2. Goods Check Before Received!</p>
                    <p>3. Subject to jurisdiction : Palghar</p>
                </div>
                <div style="width: 200px; display: flex; align-items: center; justify-content: center; border-right: 2px solid #000;">
                    ${qrBase64 ? `<img src="data:${settings.qr_code_mimetype || 'image/png'};base64,${qrBase64}" style="width: 160px; height: 160px; object-fit: contain;" />` : ''}
                </div>
                <div style="flex: 1; padding: 4px 8px; display: flex; flex-direction: column; justify-content: space-between; align-items: flex-end; font-size: 14px; font-weight: bold;">
                    <p>For Anand Enterprises</p>
                    <img src="${signatureBase64}" alt="Signature" style="width: 100px; height: auto; margin: 10px 0;" />
                    <p>Authorised Signatory</p>
                </div>
            </div>
            
        </div>
    </body>
    </html>
    `;

    let executablePath;
    if (fs.existsSync('/usr/bin/chromium-browser')) {
        executablePath = '/usr/bin/chromium-browser';
    } else if (fs.existsSync('/usr/bin/chromium')) {
        executablePath = '/usr/bin/chromium';
    } else if (fs.existsSync('/usr/bin/google-chrome')) {
        executablePath = '/usr/bin/google-chrome';
    }

    const browser = await puppeteer.launch({
        headless: "new",
        executablePath: executablePath,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote'
        ]
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

async function generateLedgerPdf(ledgerData, distributorDetails, settings) {
    const { summary, history } = ledgerData;
    
    // Read Logo
    const logoPath = path.join(__dirname, '../../web/public/logo.png');
    let logoBase64 = '';
    if (fs.existsSync(logoPath)) {
        logoBase64 = fs.readFileSync(logoPath, { encoding: 'base64' });
    }

    // Generate HTML
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; color: #000; font-size: 14px; background: #fff; margin: 0; padding: 20px; }
            .excel-table { width: 100%; border-collapse: collapse; border-bottom: 2px solid #000; margin-top: 16px; }
            .excel-table td, .excel-table th { border: 1px solid #000; padding: 6px; }
            h2 { margin: 0 0 2px 0; font-size: 18px; font-weight: bold; }
            p { margin: 0 0 2px 0; }
        </style>
    </head>
    <body>
        <div style="border: 2px solid #000;">
            <div style="border-bottom: 2px solid #000; text-align: center; font-weight: bold; font-size: 16px; padding: 6px; background: #f0fdf4;">
                STATEMENT OF ACCOUNT
            </div>
            
            <div style="display: flex; border-bottom: 2px solid #000;">
                <div style="flex: 1; padding: 8px; border-right: 2px solid #000;">
                    <h2>Anand Enterprises</h2>
                    <p>Address : ${settings?.address || ''}</p>
                    <p>Mobile No. : ${settings?.mobile_number || ''} , State : ${settings?.state || ''}</p>
                    <p style="margin: 0;">GST No : ${settings?.gst_number || ''} , FSSAI No : ${settings?.fssai_number || ''}</p>
                </div>
                <div style="width: 180px; padding: 8px; display: flex; align-items: center; justify-content: center;">
                    ${logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" style="max-width: 120px; max-height: 80px; object-fit: contain;" />` : ''}
                </div>
            </div>
            
            <div style="display: flex; border-bottom: 2px solid #000;">
                <div style="flex: 1; padding: 8px;">
                    <p><strong>Distributor / Firm:</strong> ${distributorDetails.firm_name}</p>
                    ${distributorDetails.owner_name ? `<p>Owner Name: ${distributorDetails.owner_name}</p>` : ''}
                    <p>Address: ${distributorDetails.address || '-'}</p>
                    <p>Contact: ${distributorDetails.phone_number || '-'}</p>
                </div>
                <div style="flex: 1; padding: 8px; border-left: 2px solid #000; background: #f8fafc;">
                    <p><strong>Account Summary</strong></p>
                    <table style="width: 100%; margin-top: 8px;">
                        <tr><td>Total Billed:</td><td style="text-align: right;">₹${(summary.total_billed || 0).toFixed(2)}</td></tr>
                        <tr><td>Total Paid:</td><td style="text-align: right; color: #16a34a;">₹${(summary.total_paid || 0).toFixed(2)}</td></tr>
                        <tr><td style="font-weight: bold; padding-top: 4px;">Pending Balance:</td><td style="text-align: right; font-weight: bold; color: #ef4444; padding-top: 4px;">₹${(summary.total_pending || 0).toFixed(2)}</td></tr>
                    </table>
                </div>
            </div>

            <div style="padding: 12px;">
                <h3 style="margin: 0 0 8px 0; font-size: 15px;">Transaction History</h3>
                <table class="excel-table">
                    <thead>
                        <tr style="background: #f8fafc;">
                            <th style="text-align: left; width: 100px;">Date</th>
                            <th style="text-align: left;">Transaction Details</th>
                            <th style="text-align: right; width: 100px;">Debit (₹)</th>
                            <th style="text-align: right; width: 100px;">Credit (₹)</th>
                            <th style="text-align: right; width: 100px;">Balance (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${history.map(row => `
                            <tr>
                                <td>${new Date(row.date).toLocaleDateString('en-GB').replace(/\//g, '-')}</td>
                                <td>${row.type === 'INVOICE' ? `Invoice #${row.ref}` : `Payment Received (${row.ref})`}</td>
                                <td style="text-align: right;">${row.debit ? row.debit.toFixed(2) : '-'}</td>
                                <td style="text-align: right; color: #16a34a;">${row.credit ? row.credit.toFixed(2) : '-'}</td>
                                <td style="text-align: right; font-weight: bold;">${row.balance.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div style="display: flex; min-height: 120px; border-top: 2px solid #000;">
                <div style="flex: 1; padding: 8px; border-right: 2px solid #000; font-size: 13px; font-weight: bold;">
                    <p>Note:</p>
                    <p>1. Statement generated on ${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}</p>
                    <p>2. Subject to jurisdiction : Palghar</p>
                </div>
                <div style="flex: 1; padding: 8px; display: flex; flex-direction: column; justify-content: space-between; align-items: flex-end; font-size: 14px; font-weight: bold;">
                    <p>For Anand Enterprises</p>
                    <img src="${signatureBase64}" alt="Signature" style="width: 100px; height: auto; margin: 10px 0;" />
                    <p>Authorised Signatory</p>
                </div>
            </div>
            
        </div>
    </body>
    </html>
    `;

    let executablePath;
    if (fs.existsSync('/usr/bin/chromium-browser')) {
        executablePath = '/usr/bin/chromium-browser';
    } else if (fs.existsSync('/usr/bin/chromium')) {
        executablePath = '/usr/bin/chromium';
    } else if (fs.existsSync('/usr/bin/google-chrome')) {
        executablePath = '/usr/bin/google-chrome';
    }

    const browser = await puppeteer.launch({
        headless: "new",
        executablePath: executablePath,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote'
        ]
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // Ensure directory exists
    const dir = path.join(__dirname, '../uploads/ledgers');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const fileName = `ledger_${distributorDetails.distributor_id}_${Date.now()}.pdf`;
    const filePath = path.join(dir, fileName);

    await page.pdf({
        path: filePath,
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
    });

    await browser.close();

    return filePath; // For Ledger, we will stream the file directly so we return absolute path
}

async function generateCreditNotePdf(creditNoteData, distributorDetails, settings) {
    const { credit_note, items } = creditNoteData;

    // Read Logo
    const logoPath = path.join(__dirname, '../../web/public/logo.png');
    let logoBase64 = '';
    if (fs.existsSync(logoPath)) {
        logoBase64 = fs.readFileSync(logoPath, { encoding: 'base64' });
    }

    // Generate HTML
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; color: #000; font-size: 13px; background: #fff; margin: 0; padding: 10px 5px; }
            .excel-table { width: 100%; border-collapse: collapse; border-bottom: 2px solid #000; font-size: 10px; }
            .excel-table td, .excel-table th { border: 1px solid #000; padding: 4px 2px; }
            .excel-table tr { page-break-inside: avoid; }
            tfoot { display: table-row-group; }
            h2 { margin: 0 0 2px 0; font-size: 18px; font-weight: bold; }
            p { margin: 0 0 2px 0; }
        </style>
    </head>
    <body>
        <div style="border: 2px solid #000;">
            <div style="border-bottom: 2px solid #000; text-align: center; font-weight: bold; font-size: 14px; padding: 4px;">
                Credit Note
            </div>
            
            <div style="display: flex; border-bottom: 2px solid #000;">
                <div style="flex: 1; padding: 4px 8px; border-right: 2px solid #000;">
                    <h2>Anand Enterprises</h2>
                    <p>Address : ${settings?.address || ''}</p>
                    <p>State : ${settings?.state || ''}</p>
                    <p style="margin: 0;">GST No : ${settings?.gst_number || ''} , FSSAI No : ${settings?.fssai_number || ''}</p>
                </div>
                <div style="width: 180px; padding: 8px; display: flex; align-items: center; justify-content: center;">
                    ${logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" style="max-width: 120px; max-height: 80px; object-fit: contain;" />` : ''}
                </div>
            </div>
            
            <div style="display: flex; border-bottom: 2px solid #000;">
                <div style="flex: 1; padding: 4px 8px; border-right: 2px solid #000;">
                    <p><strong>Bill To:</strong> ${distributorDetails.firm_name}</p>
                    ${distributorDetails.owner_name ? `<p>Owner Name: ${distributorDetails.owner_name}</p>` : ''}
                    <p>Address: ${distributorDetails.address || '-'}</p>
                    <p style="margin: 0;">Place Of Supply: Maharashtra ${distributorDetails.fssai_number ? `, FSSAI No : ${distributorDetails.fssai_number}` : ''}</p>
                </div>
            </div>
            
            <div style="display: flex; border-bottom: 2px solid #000;">
                <div style="flex: 1; padding: 4px 8px; border-right: 2px solid #000; font-weight: bold;">
                    CREDIT NOTE NO. : ${credit_note.credit_note_number}
                </div>
                <div style="flex: 1; padding: 4px 8px; font-weight: bold;">
                    Date : ${new Date(credit_note.created_at).toLocaleDateString('en-GB').replace(/\//g, '-')}
                </div>
            </div>
            
            <table class="excel-table">
                <thead>
                    <tr>
                        <th style="text-align: center; width: 5%;">Sr. no</th>
                        <th style="text-align: left; width: 30%;">Product</th>
                        <th style="text-align: center; width: 10%;">Pack Size</th>
                        <th style="text-align: center; width: 20%;">Reason</th>
                        <th style="text-align: center; width: 10%;">Defective Box</th>
                        <th style="text-align: center; width: 10%;">Defective Pcs</th>
                        <th style="text-align: right; width: 15%;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map((item, idx) => {
                        const taxableAmt = item.item_total;
                        const gstPct = parseFloat(item.gst_percent) || 0;
                        const cgstAmt = taxableAmt * ((gstPct / 2) / 100);
                        const sgstAmt = taxableAmt * ((gstPct / 2) / 100);
                        const rowTotal = taxableAmt + cgstAmt + sgstAmt;

                        return `
                        <tr>
                            <td style="text-align: center; vertical-align: top; padding: 6px;">${idx + 1}</td>
                            <td style="font-weight: bold; vertical-align: top; padding: 6px;">${item.product_name}</td>
                            <td style="text-align: center; vertical-align: top; padding: 6px;">${item.pack_size && item.pack_size !== '-' ? item.pack_size : '-'}</td>
                            <td style="text-align: center; vertical-align: top; padding: 6px;">${item.reason || '-'}</td>
                            <td style="text-align: center; vertical-align: top; padding: 6px;">${item.quantity || 0}</td>
                            <td style="text-align: center; vertical-align: top; padding: 6px;">${item.pieces_qty || 0}</td>
                            <td style="text-align: right; font-weight: bold; vertical-align: top; padding: 6px;">${Math.round(rowTotal).toFixed(2)}</td>
                        </tr>`;
                    }).join('')}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="6" style="text-align: right; font-weight: bold; padding: 6px;">Total</td>
                        <td style="text-align: right; font-weight: bold; padding: 6px;">${Math.round(credit_note.amount).toFixed(2)}</td>
                    </tr>
                </tfoot>
            </table>
            
            <div style="display: flex; min-height: 150px; page-break-inside: avoid;">
                <div style="flex: 1; padding: 4px 8px; border-right: 2px solid #000; font-size: 13px; font-weight: bold;">
                    <p>Note:</p>
                    ${credit_note.applied_details ? `<p style="color: #059669;">Amount Applied To: ${credit_note.applied_details}</p>` : ''}
                    <p>1. Order By: ${distributorDetails.owner_name || '-'}</p>
                    <p>2. Goods Check Before Received:</p>
                    <p>3. Subject to jurisdiction : Palghar</p>
                </div>
                <div style="flex: 1; padding: 4px 8px; display: flex; flex-direction: column; justify-content: space-between; align-items: flex-end; font-size: 14px; font-weight: bold;">
                    <p>For Anand Enterprises</p>
                    <img src="${signatureBase64}" alt="Signature" style="width: 100px; height: auto; margin: 10px 0;" />
                    <p>Authorised Signatory</p>
                </div>
            </div>
            
        </div>
    </body>
    </html>
    `;

    let executablePath;
    if (fs.existsSync('/usr/bin/chromium-browser')) {
        executablePath = '/usr/bin/chromium-browser';
    } else if (fs.existsSync('/usr/bin/chromium')) {
        executablePath = '/usr/bin/chromium';
    } else if (fs.existsSync('/usr/bin/google-chrome')) {
        executablePath = '/usr/bin/google-chrome';
    }

    const browser = await puppeteer.launch({
        headless: "new",
        executablePath: executablePath,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote'
        ]
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const dir = path.join(__dirname, '../uploads/credit_notes');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const safeNumber = String(credit_note.credit_note_number).replace(/[\/\\]/g, '_');
    const fileName = `cn_${safeNumber}_${Date.now()}.pdf`;
    const filePath = path.join(dir, fileName);

    await page.pdf({
        path: filePath,
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
    });

    await browser.close();

    return `/uploads/credit_notes/${fileName}`;
}

module.exports = { generateInvoicePdf, generateLedgerPdf, generateCreditNotePdf };
