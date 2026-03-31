import * as Print from 'expo-print';

import type { Book, Entry } from '@/utils/models';
import * as Sharing from 'expo-sharing';

export async function generatePDF(
  book: Book & { business_name?: string; logo_url?: string },
  entries: Entry[],
  summary: { total_in: number; total_out: number; net_balance: number; entry_count: number },
  dateRange: { from: string; to: string },
): Promise<string> {
  /** Escape text for HTML so user-controlled fields cannot inject tags/scripts in the WebView PDF. */
  const escapeHtml = (v: unknown) => {
    const s = String(v ?? '');
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const safe = (v: unknown) => escapeHtml(v);

  const currencyFmt = (n: number) => n.toFixed(2);

  const rows = entries
    .slice(0, 500)
    .map((e) => {
      const dateRaw =
        e.entry_date &&
        typeof e.entry_date === 'object' &&
        'toDate' in e.entry_date &&
        typeof (e.entry_date as { toDate?: () => Date }).toDate === 'function'
          ? (e.entry_date as { toDate: () => Date }).toDate().toLocaleDateString()
          : String(e.entry_date ?? '');
      const date = safe(dateRaw);
      const typeLabel = e.type === 'CASH_IN' ? 'Cash In' : 'Cash Out';
      const amount = `${e.type === 'CASH_IN' ? '+' : '-'}${currencyFmt(e.amount)}`;
      return `<tr>
        <td>${date}</td>
        <td>${typeLabel}</td>
        <td>${amount}</td>
        <td>${safe(e.contact_name)}</td>
        <td>${safe(e.category_name)}</td>
        <td>${safe(e.payment_mode_name)}</td>
        <td>${safe(e.remark)}</td>
      </tr>`;
    })
    .join('');

  const html = `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Arial, Helvetica, sans-serif; padding: 24px; }
        h1 { font-size: 20px; margin: 0 0 8px; }
        .muted { color: #667085; font-size: 12px; }
        .summary { display: flex; gap: 12px; margin: 16px 0; }
        .box { border: 1px solid #E4E7EC; border-radius: 12px; padding: 12px; flex: 1; }
        .value { font-size: 22px; font-weight: 700; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border-bottom: 1px solid #EAECF0; padding: 10px 6px; font-size: 12px; text-align: left; }
        th { background: #F9FAFB; }
        .in { color: #10B981; font-weight: 700; }
        .out { color: #F43F5E; font-weight: 700; }
        .footer { margin-top: 18px; font-size: 11px; color: #667085; text-align: center; }
      </style>
    </head>
    <body>
      <h1>CashBook Global</h1>
      <div class="muted">${safe(book.business_name ?? '')} • ${safe(book.name)} • ${safe(dateRange.from)} → ${safe(dateRange.to)}</div>

      <div class="summary">
        <div class="box">
          <div class="muted">Total In</div>
          <div class="value in">${currencyFmt(summary.total_in)}</div>
        </div>
        <div class="box">
          <div class="muted">Total Out</div>
          <div class="value out">${currencyFmt(summary.total_out)}</div>
        </div>
        <div class="box">
          <div class="muted">Net Balance</div>
          <div class="value">${currencyFmt(summary.net_balance)}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Amount</th>
            <th>Contact</th>
            <th>Category</th>
            <th>Payment Mode</th>
            <th>Remark</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <div class="footer">Exported from CashBook Global</div>
    </body>
  </html>
  `;

  const result = await Print.printToFileAsync({ html, base64: false });
  const uri = result.uri;

  // Scaffold: do not auto-share. Uncomment later if desired.
  // if (await Sharing.isAvailableAsync()) { await Sharing.shareAsync(uri); }
  return uri;
}

