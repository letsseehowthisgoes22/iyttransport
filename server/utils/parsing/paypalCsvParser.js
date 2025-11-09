const csv = require('csv-parser');
const { Readable } = require('stream');

/**
 * Parse PayPal CSV statement
 * @param {Buffer|string} csvData - The CSV file buffer or string
 * @returns {Promise<Array>} Array of transactions
 */
async function parsePayPalCsv(csvData) {
  return new Promise((resolve, reject) => {
    const transactions = [];
    const errors = [];

    // Convert buffer to stream if needed
    const stream = csvData instanceof Buffer
      ? Readable.from(csvData.toString())
      : Readable.from(csvData);

    stream
      .pipe(csv({
        mapHeaders: ({ header }) => header.trim().toLowerCase().replace(/\s+/g, '_'),
        skipLines: 0,
      }))
      .on('data', (row) => {
        try {
          // PayPal CSV format typically includes:
          // Date, Time, TimeZone, Name, Type, Status, Currency, Gross, Fee, Net, From Email Address, To Email Address, Transaction ID, etc.

          // Parse date (format: MM/DD/YYYY)
          let transactionDate = null;
          if (row.date) {
            const dateParts = row.date.split('/');
            if (dateParts.length === 3) {
              const [month, day, year] = dateParts;
              transactionDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
          }

          // Use 'net' for amount (after fees), or 'gross' if net not available
          let amount = 0;
          if (row.net) {
            amount = parseFloat(row.net.replace(/[,$]/g, ''));
          } else if (row.gross) {
            amount = parseFloat(row.gross.replace(/[,$]/g, ''));
          }

          // Build description from available fields
          let description = '';
          if (row.name) {
            description = row.name;
          } else if (row.type) {
            description = row.type;
          }

          // Add additional context if available
          if (row.item_title) {
            description += ` - ${row.item_title}`;
          }

          // Determine transaction type
          let transactionType = 'other';
          if (row.type) {
            const type = row.type.toLowerCase();
            if (type.includes('payment')) {
              transactionType = 'payment';
            } else if (type.includes('refund')) {
              transactionType = 'refund';
            } else if (type.includes('withdrawal')) {
              transactionType = 'withdrawal';
            } else if (type.includes('transfer')) {
              transactionType = 'transfer';
            } else if (type.includes('fee')) {
              transactionType = 'fee';
            } else if (type.includes('subscription')) {
              transactionType = 'subscription';
            }
          }

          // Only add if we have valid data
          if (transactionDate && description && amount !== 0) {
            transactions.push({
              transactionDate,
              description: description.trim(),
              amount,
              category: row.type || null,
              balance: row.balance ? parseFloat(row.balance.replace(/[,$]/g, '')) : null,
              transactionType,
              rawData: JSON.stringify(row),
            });
          }
        } catch (error) {
          errors.push(`Error parsing row: ${error.message}`);
        }
      })
      .on('end', () => {
        if (transactions.length === 0 && errors.length > 0) {
          reject(new Error(`Failed to parse PayPal CSV: ${errors.join(', ')}`));
        } else {
          resolve(transactions);
        }
      })
      .on('error', (error) => {
        reject(new Error(`CSV parsing error: ${error.message}`));
      });
  });
}

/**
 * Validate PayPal CSV format
 * @param {Buffer|string} csvData - The CSV file buffer or string
 * @returns {Promise<boolean>} True if valid PayPal CSV
 */
async function validatePayPalCsv(csvData) {
  return new Promise((resolve) => {
    const stream = csvData instanceof Buffer
      ? Readable.from(csvData.toString())
      : Readable.from(csvData);

    let headerChecked = false;

    stream
      .pipe(csv({ mapHeaders: ({ header }) => header.trim().toLowerCase() }))
      .on('headers', (headers) => {
        // Check for common PayPal CSV headers
        const paypalHeaders = ['date', 'name', 'type', 'status', 'gross', 'net'];
        const hasPayPalHeaders = paypalHeaders.some(h => headers.includes(h));
        headerChecked = true;
        resolve(hasPayPalHeaders);
      })
      .on('error', () => {
        resolve(false);
      })
      .on('end', () => {
        if (!headerChecked) {
          resolve(false);
        }
      });
  });
}

module.exports = {
  parsePayPalCsv,
  validatePayPalCsv,
};
