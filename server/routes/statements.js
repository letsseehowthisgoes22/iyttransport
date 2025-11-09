const express = require('express');
const multer = require('multer');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { parseChaseStatement } = require('../utils/parsing/chasePdfParser');
const { parsePayPalCsv } = require('../utils/parsing/paypalCsvParser');

const router = express.Router();

// Configure multer for file uploads (in-memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'text/csv', 'application/vnd.ms-excel'];
    if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and CSV files are allowed.'));
    }
  },
});

/**
 * POST /api/statements/upload
 * Upload and parse statement file (PDF for Chase, CSV for PayPal)
 */
router.post('/upload', authenticateToken, requireRole(['Admin', 'Staff']), upload.single('statement'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { statementType } = req.body;
    const userId = req.user.id;

    let transactions = [];
    let source = '';

    // Determine statement type and parse accordingly
    if (statementType === 'chase-credit' || statementType === 'chase-checking') {
      // Parse Chase PDF
      const result = await parseChaseStatement(req.file.buffer);
      transactions = result.transactions;
      source = result.type;
    } else if (statementType === 'paypal') {
      // Parse PayPal CSV
      transactions = await parsePayPalCsv(req.file.buffer);
      source = 'PayPal';
    } else {
      // Auto-detect based on file type
      if (req.file.mimetype === 'application/pdf') {
        const result = await parseChaseStatement(req.file.buffer);
        transactions = result.transactions;
        source = result.type;
      } else if (req.file.mimetype === 'text/csv' || req.file.originalname.endsWith('.csv')) {
        transactions = await parsePayPalCsv(req.file.buffer);
        source = 'PayPal';
      } else {
        return res.status(400).json({ error: 'Could not determine statement type' });
      }
    }

    if (transactions.length === 0) {
      return res.status(400).json({ error: 'No transactions found in the statement' });
    }

    // Store transactions in database
    const db = req.app.get('db');
    const insertedIds = [];

    for (const transaction of transactions) {
      try {
        const id = await db.createTransaction(
          source,
          transaction.transactionDate,
          transaction.description,
          transaction.amount,
          transaction.category,
          transaction.balance,
          transaction.transactionType,
          userId,
          transaction.rawData || null
        );
        insertedIds.push(id);
      } catch (error) {
        console.error('Error inserting transaction:', error);
      }
    }

    res.json({
      success: true,
      message: `Successfully imported ${insertedIds.length} transactions`,
      source,
      count: insertedIds.length,
      transactions: transactions.slice(0, 10), // Return first 10 for preview
    });
  } catch (error) {
    console.error('Statement upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to process statement' });
  }
});

/**
 * GET /api/statements/transactions
 * Get all transactions for the current user
 */
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const db = req.app.get('db');
    const userId = req.user.id;
    const userRole = req.user.role;

    const filters = {
      source: req.query.source,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };

    let transactions;
    if (userRole === 'Admin') {
      transactions = await db.getAllTransactions(filters);
    } else {
      transactions = await db.getTransactionsByUser(userId, filters);
    }

    res.json({ transactions });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to retrieve transactions' });
  }
});

/**
 * DELETE /api/statements/transactions/:id
 * Delete a specific transaction
 */
router.delete('/transactions/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.app.get('db');
    const transactionId = parseInt(req.params.id);
    const userId = req.user.id;
    const userRole = req.user.role;

    await db.deleteTransaction(transactionId, userId, userRole);

    res.json({ success: true, message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete transaction' });
  }
});

/**
 * GET /api/statements/summary
 * Get summary statistics for transactions
 */
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const db = req.app.get('db');
    const userId = req.user.id;
    const userRole = req.user.role;

    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };

    let transactions;
    if (userRole === 'Admin') {
      transactions = await db.getAllTransactions(filters);
    } else {
      transactions = await db.getTransactionsByUser(userId, filters);
    }

    // Calculate summary statistics
    const summary = {
      totalTransactions: transactions.length,
      bySource: {},
      totalAmount: 0,
      totalPositive: 0,
      totalNegative: 0,
    };

    transactions.forEach(t => {
      // Count by source
      if (!summary.bySource[t.source]) {
        summary.bySource[t.source] = { count: 0, total: 0 };
      }
      summary.bySource[t.source].count++;
      summary.bySource[t.source].total += t.amount;

      // Calculate totals
      summary.totalAmount += t.amount;
      if (t.amount > 0) {
        summary.totalPositive += t.amount;
      } else {
        summary.totalNegative += t.amount;
      }
    });

    res.json({ summary });
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({ error: 'Failed to retrieve summary' });
  }
});

module.exports = router;
