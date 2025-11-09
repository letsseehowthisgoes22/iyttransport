/**
 * Financial Statement Parser
 * Parses PayPal, Chase Checking, and Chase Credit Card statements
 */

const fs = require('fs');
const path = require('path');

/**
 * Parse PayPal statement (CSV format)
 * Expected columns: Date, Name, Type, Status, Currency, Gross, Fee, Net, Balance, Transaction ID, etc.
 */
function parsePayPalStatement(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

  const transactions = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);

    if (values.length < headers.length) continue;

    const transaction = {};
    headers.forEach((header, index) => {
      transaction[header] = values[index] ? values[index].trim().replace(/"/g, '') : '';
    });

    // Parse date
    const date = new Date(transaction['Date'] || transaction['date']);
    if (isNaN(date.getTime())) continue;

    // Categorize transaction
    const name = (transaction['Name'] || transaction['name'] || '').toLowerCase();
    const type = (transaction['Type'] || transaction['type'] || '').toLowerCase();
    const gross = parseFloat((transaction['Gross'] || transaction['gross'] || '0').replace(/[^0-9.-]/g, ''));
    const fee = parseFloat((transaction['Fee'] || transaction['fee'] || '0').replace(/[^0-9.-]/g, ''));
    const net = parseFloat((transaction['Net'] || transaction['net'] || '0').replace(/[^0-9.-]/g, ''));

    // Categorize
    let category = 'other';
    if (gross > 0) {
      category = 'revenue';
    } else if (gross < 0) {
      // Check if it's a transfer to Chase
      if (name.includes('bank') || name.includes('transfer') || type.includes('transfer')) {
        category = 'transfer_to_chase';
      } else if (name.includes('staff') || name.includes('payroll') || name.includes('salary')) {
        category = 'staff_payment';
      } else {
        category = 'expense';
      }
    }

    transactions.push({
      date: date.toISOString().split('T')[0],
      description: transaction['Name'] || transaction['name'] || '',
      type: transaction['Type'] || transaction['type'] || '',
      gross,
      fee,
      net,
      balance: parseFloat((transaction['Balance'] || transaction['balance'] || '0').replace(/[^0-9.-]/g, '')),
      transactionId: transaction['Transaction ID'] || transaction['transaction id'] || '',
      category,
      source: 'paypal',
      raw: transaction
    });
  }

  return transactions;
}

/**
 * Parse Chase Checking statement (CSV format)
 * Expected columns: Details, Posting Date, Description, Amount, Type, Balance, Check or Slip #
 */
function parseChaseCheckingStatement(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

  const transactions = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);

    if (values.length < headers.length) continue;

    const transaction = {};
    headers.forEach((header, index) => {
      transaction[header] = values[index] ? values[index].trim().replace(/"/g, '') : '';
    });

    // Parse date
    const dateStr = transaction['Posting Date'] || transaction['Date'] || transaction['posting date'];
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) continue;

    const description = (transaction['Description'] || transaction['description'] || '').toLowerCase();
    const amount = parseFloat((transaction['Amount'] || transaction['amount'] || '0').replace(/[^0-9.-]/g, ''));
    const type = (transaction['Type'] || transaction['type'] || '').toLowerCase();

    // Categorize
    let category = 'other';
    if (amount > 0) {
      // Incoming - could be revenue or transfer from PayPal
      if (description.includes('paypal') || description.includes('transfer from')) {
        category = 'transfer_from_paypal';
      } else {
        category = 'revenue';
      }
    } else if (amount < 0) {
      // Outgoing
      if (description.includes('zelle')) {
        // Check if it's owner draw
        if (description.includes('bobby') || description.includes('robert') || description.includes('tredinnick')) {
          category = 'owner_draw_bobby';
        } else if (description.includes('brendan') || description.includes('boone') || description.includes('wilder')) {
          category = 'owner_draw_brendan';
        } else {
          category = 'zelle_payment';
        }
      } else if (description.includes('chase') || description.includes('credit card payment') || description.includes('payment to chase')) {
        category = 'credit_card_payment';
      } else {
        category = 'expense';
      }
    }

    transactions.push({
      date: date.toISOString().split('T')[0],
      description: transaction['Description'] || transaction['description'] || '',
      details: transaction['Details'] || transaction['details'] || '',
      amount,
      type: transaction['Type'] || transaction['type'] || '',
      balance: parseFloat((transaction['Balance'] || transaction['balance'] || '0').replace(/[^0-9.-]/g, '')),
      checkNumber: transaction['Check or Slip #'] || transaction['check or slip #'] || '',
      category,
      source: 'chase_checking',
      raw: transaction
    });
  }

  return transactions;
}

/**
 * Parse Chase Credit Card statement (CSV format)
 * Expected columns: Transaction Date, Post Date, Description, Category, Type, Amount, Memo
 */
function parseChaseCreditCardStatement(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

  const transactions = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);

    if (values.length < headers.length) continue;

    const transaction = {};
    headers.forEach((header, index) => {
      transaction[header] = values[index] ? values[index].trim().replace(/"/g, '') : '';
    });

    // Parse date
    const dateStr = transaction['Transaction Date'] || transaction['Post Date'] || transaction['Date'] || transaction['transaction date'];
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) continue;

    const description = (transaction['Description'] || transaction['description'] || '').toLowerCase();
    const amount = parseFloat((transaction['Amount'] || transaction['amount'] || '0').replace(/[^0-9.-]/g, ''));
    const type = (transaction['Type'] || transaction['type'] || '').toLowerCase();
    const categoryFromStatement = transaction['Category'] || transaction['category'] || '';

    // Categorize - Credit card amounts are typically negative for purchases
    let category = 'expense';
    if (amount > 0) {
      // Positive amount = payment/credit
      category = 'payment_credit';
    } else {
      // Negative amount = expense
      category = 'expense';
    }

    transactions.push({
      date: date.toISOString().split('T')[0],
      transactionDate: transaction['Transaction Date'] || transaction['transaction date'] || '',
      postDate: transaction['Post Date'] || transaction['post date'] || '',
      description: transaction['Description'] || transaction['description'] || '',
      statementCategory: categoryFromStatement,
      type: transaction['Type'] || transaction['type'] || '',
      amount,
      memo: transaction['Memo'] || transaction['memo'] || '',
      category,
      source: 'chase_credit',
      raw: transaction
    });
  }

  return transactions;
}

/**
 * Helper function to parse CSV line with proper quote handling
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

/**
 * Parse statement based on source type
 */
function parseStatement(csvContent, sourceType) {
  switch (sourceType.toLowerCase()) {
    case 'paypal':
      return parsePayPalStatement(csvContent);
    case 'chase_checking':
    case 'chase-checking':
    case 'checking':
      return parseChaseCheckingStatement(csvContent);
    case 'chase_credit':
    case 'chase-credit':
    case 'credit':
    case 'credit_card':
      return parseChaseCreditCardStatement(csvContent);
    default:
      throw new Error(`Unknown source type: ${sourceType}`);
  }
}

module.exports = {
  parsePayPalStatement,
  parseChaseCheckingStatement,
  parseChaseCreditCardStatement,
  parseStatement
};
