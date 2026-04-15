import { generatePDF } from '../services/pdfService';
import * as Print from 'expo-print';

jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn(),
}));

describe('pdfService', () => {
  it('should generate HTML with correct summary and entries', async () => {
    const mockBook = {
      name: 'Test Book',
      business_name: 'Test Biz',
      id: 'book1',
      business_id: 'biz1',
    };
    const mockEntries = [
      {
        id: 'e1',
        type: 'CASH_IN',
        amount: 100,
        entry_date: new Date('2026-04-13'),
        contact_name: 'John',
        category_name: 'Sales',
        payment_mode_name: 'Cash',
        remark: 'Payment for services',
      },
    ];
    const mockSummary = {
      total_in: 100,
      total_out: 0,
      net_balance: 100,
      entry_count: 1,
    };
    const mockDateRange = { from: '2026-04-01', to: '2026-04-30' };

    (Print.printToFileAsync as jest.Mock).mockResolvedValue({ uri: 'file://test.pdf' });

    const uri = await generatePDF(mockBook, mockEntries, mockSummary, mockDateRange);

    expect(uri).toBe('file://test.pdf');
    const { html } = (Print.printToFileAsync as jest.Mock).mock.calls[0][0];
    expect(html).toContain('Test Biz');
    expect(html).toContain('Test Book');
    expect(html).toContain('100.00');
    expect(html).toContain('John');
    expect(html).toContain('Sales');
    expect(html).toContain('Payment for services');
  });

  it('should escape HTML content to prevent injection', async () => {
    const mockBook = {
      name: 'Evil Book',
      business_name: 'Evil Biz <script>alert(1)</script>',
      id: 'book-evil',
      business_id: 'biz-evil',
    };
    const mockEntries = [
      {
        id: 'e-evil',
        type: 'CASH_IN',
        amount: 666,
        entry_date: new Date('2026-06-06'),
        contact_name: '<b>Hacker</b>',
        category_name: 'Evil Sales',
        payment_mode_name: 'Dark Cash',
        remark: 'Injection <img src=x onerror=alert(1)>',
      },
    ];
    const mockSummary = {
      total_in: 666,
      total_out: 0,
      net_balance: 666,
      entry_count: 1,
    };
    const mockDateRange = { from: '2026-06-01', to: '2026-06-30' };

    (Print.printToFileAsync as jest.Mock).mockClear();
    (Print.printToFileAsync as jest.Mock).mockResolvedValue({ uri: 'file://evil.pdf' });

    await generatePDF(mockBook, mockEntries, mockSummary, mockDateRange);

    const { html } = (Print.printToFileAsync as jest.Mock).mock.calls[0][0];
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&lt;b&gt;');
  });

});
