/**
 * API Routes for Financial Statement Processing
 */

const express = require('express');
const router = express.Router();
const { parseStatement } = require('../utils/statementParser');
const { reconcileStatements, generateReconciliationReport } = require('../utils/reconciliation');

// In-memory storage for parsed statements (in production, use database)
let statementData = {
  paypal: [],
  checking: [],
  credit: []
};

/**
 * POST /api/statements/upload
 * Upload and parse a statement
 * Body: { csvContent: string, sourceType: 'paypal' | 'chase_checking' | 'chase_credit' }
 */
router.post('/upload', async (req, res) => {
  try {
    const { csvContent, sourceType } = req.body;

    if (!csvContent || !sourceType) {
      return res.status(400).json({
        error: 'Missing required fields: csvContent and sourceType'
      });
    }

    // Parse the statement
    const transactions = parseStatement(csvContent, sourceType);

    // Store parsed transactions
    const normalizedType = sourceType.toLowerCase().replace(/-/g, '_');
    if (normalizedType.includes('paypal')) {
      statementData.paypal = transactions;
    } else if (normalizedType.includes('checking')) {
      statementData.checking = transactions;
    } else if (normalizedType.includes('credit')) {
      statementData.credit = transactions;
    } else {
      return res.status(400).json({
        error: 'Invalid sourceType. Must be paypal, chase_checking, or chase_credit'
      });
    }

    res.json({
      success: true,
      message: `Parsed ${transactions.length} transactions from ${sourceType}`,
      transactionCount: transactions.length,
      sourceType,
      transactions: transactions.slice(0, 10) // Return first 10 as preview
    });

  } catch (error) {
    console.error('Error parsing statement:', error);
    res.status(500).json({
      error: 'Failed to parse statement',
      message: error.message
    });
  }
});

/**
 * POST /api/statements/reconcile
 * Reconcile all uploaded statements
 * Body: { startDate?: string, endDate?: string }
 */
router.post('/reconcile', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    // Check if we have data for all three sources
    if (statementData.paypal.length === 0) {
      return res.status(400).json({
        error: 'Missing PayPal statement data. Please upload PayPal statement first.'
      });
    }
    if (statementData.checking.length === 0) {
      return res.status(400).json({
        error: 'Missing Chase Checking statement data. Please upload Chase Checking statement first.'
      });
    }
    if (statementData.credit.length === 0) {
      return res.status(400).json({
        error: 'Missing Chase Credit Card statement data. Please upload Chase Credit Card statement first.'
      });
    }

    // Perform reconciliation
    const reconciliationData = reconcileStatements(
      statementData.paypal,
      statementData.checking,
      statementData.credit,
      { startDate, endDate }
    );

    // Generate report
    const report = generateReconciliationReport(reconciliationData);

    res.json({
      success: true,
      reconciliation: reconciliationData,
      report
    });

  } catch (error) {
    console.error('Error reconciling statements:', error);
    res.status(500).json({
      error: 'Failed to reconcile statements',
      message: error.message
    });
  }
});

/**
 * GET /api/statements/status
 * Get current status of uploaded statements
 */
router.get('/status', (req, res) => {
  res.json({
    paypal: {
      uploaded: statementData.paypal.length > 0,
      transactionCount: statementData.paypal.length,
      dateRange: statementData.paypal.length > 0 ? {
        start: statementData.paypal[statementData.paypal.length - 1]?.date,
        end: statementData.paypal[0]?.date
      } : null
    },
    checking: {
      uploaded: statementData.checking.length > 0,
      transactionCount: statementData.checking.length,
      dateRange: statementData.checking.length > 0 ? {
        start: statementData.checking[statementData.checking.length - 1]?.date,
        end: statementData.checking[0]?.date
      } : null
    },
    credit: {
      uploaded: statementData.credit.length > 0,
      transactionCount: statementData.credit.length,
      dateRange: statementData.credit.length > 0 ? {
        start: statementData.credit[statementData.credit.length - 1]?.date,
        end: statementData.credit[0]?.date
      } : null
    }
  });
});

/**
 * POST /api/statements/clear
 * Clear all statement data
 */
router.post('/clear', (req, res) => {
  statementData = {
    paypal: [],
    checking: [],
    credit: []
  };

  res.json({
    success: true,
    message: 'All statement data cleared'
  });
});

/**
 * GET /api/statements/transactions/:type
 * Get all transactions for a specific statement type
 */
router.get('/transactions/:type', (req, res) => {
  const { type } = req.params;

  const normalizedType = type.toLowerCase().replace(/-/g, '_');
  let transactions = [];

  if (normalizedType.includes('paypal')) {
    transactions = statementData.paypal;
  } else if (normalizedType.includes('checking')) {
    transactions = statementData.checking;
  } else if (normalizedType.includes('credit')) {
    transactions = statementData.credit;
  } else {
    return res.status(400).json({
      error: 'Invalid type. Must be paypal, checking, or credit'
    });
  }

  res.json({
    type,
    transactionCount: transactions.length,
    transactions
  });
});

/**
 * GET /api/statements/owner-draws
 * Get owner draw summary
 */
router.get('/owner-draws', (req, res) => {
  try {
    const { calculateOwnerDraws } = require('../utils/reconciliation');
    const ownerDraws = calculateOwnerDraws(statementData.checking);

    res.json({
      success: true,
      ownerDraws
    });

  } catch (error) {
    console.error('Error calculating owner draws:', error);
    res.status(500).json({
      error: 'Failed to calculate owner draws',
      message: error.message
    });
  }
});

module.exports = router;
