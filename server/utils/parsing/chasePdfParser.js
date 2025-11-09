const pdfParse = require('pdf-parse');

/**
 * Parse Chase Credit Card PDF statement
 * @param {Buffer} pdfBuffer - The PDF file buffer
 * @returns {Promise<Array>} Array of transactions
 */
async function parseChaseCreditCard(pdfBuffer) {
  try {
    const data = await pdfParse(pdfBuffer);
    const text = data.text;

    const transactions = [];
    const lines = text.split('\n');

    // Chase credit card statement pattern: MM/DD Description Amount
    // Example: "01/15 AMAZON.COM*ABCD123 25.99"
    const creditCardPattern = /^(\d{2}\/\d{2})\s+(.+?)\s+(-?\d+[\d,]*\.?\d{0,2})$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const match = line.match(creditCardPattern);

      if (match) {
        const [, date, description, amount] = match;

        // Convert MM/DD to full date (assume current year or use statement date)
        const year = new Date().getFullYear();
        const fullDate = `${year}-${date.replace('/', '-')}`;

        transactions.push({
          transactionDate: fullDate,
          description: description.trim(),
          amount: parseFloat(amount.replace(/,/g, '')),
          category: null,
          balance: null,
          transactionType: parseFloat(amount.replace(/,/g, '')) < 0 ? 'payment' : 'charge',
        });
      }
    }

    return transactions;
  } catch (error) {
    throw new Error(`Failed to parse Chase Credit Card PDF: ${error.message}`);
  }
}

/**
 * Parse Chase Checking Account PDF statement
 * @param {Buffer} pdfBuffer - The PDF file buffer
 * @returns {Promise<Array>} Array of transactions
 */
async function parseChaseChecking(pdfBuffer) {
  try {
    const data = await pdfParse(pdfBuffer);
    const text = data.text;

    const transactions = [];
    const lines = text.split('\n');

    // Chase checking statement pattern: MM/DD/YY Description Amount Balance
    // Example: "01/15/24 DEBIT PURCHASE -AMAZON.COM 45.99 1,234.56"
    const checkingPattern = /^(\d{2}\/\d{2}\/\d{2,4})\s+(.+?)\s+(-?\$?[\d,]+\.?\d{0,2})\s+(\$?[\d,]+\.?\d{2})$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const match = line.match(checkingPattern);

      if (match) {
        const [, date, description, amount, balance] = match;

        // Convert MM/DD/YY to YYYY-MM-DD
        const [month, day, year] = date.split('/');
        const fullYear = year.length === 2 ? `20${year}` : year;
        const fullDate = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

        // Determine transaction type based on description
        let transactionType = 'other';
        const desc = description.toUpperCase();
        if (desc.includes('DEBIT') || desc.includes('PURCHASE')) {
          transactionType = 'debit';
        } else if (desc.includes('DEPOSIT') || desc.includes('CREDIT')) {
          transactionType = 'deposit';
        } else if (desc.includes('CHECK')) {
          transactionType = 'check';
        } else if (desc.includes('ATM')) {
          transactionType = 'atm';
        } else if (desc.includes('FEE')) {
          transactionType = 'fee';
        } else if (desc.includes('TRANSFER')) {
          transactionType = 'transfer';
        }

        transactions.push({
          transactionDate: fullDate,
          description: description.trim(),
          amount: parseFloat(amount.replace(/[$,]/g, '')),
          category: null,
          balance: parseFloat(balance.replace(/[$,]/g, '')),
          transactionType: transactionType,
        });
      }
    }

    return transactions;
  } catch (error) {
    throw new Error(`Failed to parse Chase Checking PDF: ${error.message}`);
  }
}

/**
 * Auto-detect Chase statement type and parse accordingly
 * @param {Buffer} pdfBuffer - The PDF file buffer
 * @returns {Promise<Object>} Object with type and transactions
 */
async function parseChaseStatement(pdfBuffer) {
  try {
    const data = await pdfParse(pdfBuffer);
    const text = data.text.toLowerCase();

    let type = null;
    let transactions = [];

    // Detect statement type based on content
    if (text.includes('credit card') || text.includes('card account')) {
      type = 'Chase Credit Card';
      transactions = await parseChaseCreditCard(pdfBuffer);
    } else if (text.includes('checking') || text.includes('total checking')) {
      type = 'Chase Checking';
      transactions = await parseChaseChecking(pdfBuffer);
    } else {
      // Try both parsers and see which one returns more results
      const creditResults = await parseChaseCreditCard(pdfBuffer);
      const checkingResults = await parseChaseChecking(pdfBuffer);

      if (creditResults.length > checkingResults.length) {
        type = 'Chase Credit Card';
        transactions = creditResults;
      } else if (checkingResults.length > 0) {
        type = 'Chase Checking';
        transactions = checkingResults;
      } else {
        throw new Error('Could not detect Chase statement type');
      }
    }

    return {
      type,
      transactions,
      rawText: text.substring(0, 500), // Store first 500 chars for debugging
    };
  } catch (error) {
    throw new Error(`Failed to parse Chase PDF statement: ${error.message}`);
  }
}

module.exports = {
  parseChaseCreditCard,
  parseChaseChecking,
  parseChaseStatement,
};
