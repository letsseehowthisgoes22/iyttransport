/**
 * Financial Statement Reconciliation
 * Reconciles PayPal, Chase Checking, and Chase Credit Card statements
 */

/**
 * Reconcile all three statements and generate a comprehensive report
 */
function reconcileStatements(paypalTransactions, checkingTransactions, creditTransactions, options = {}) {
  const startDate = options.startDate ? new Date(options.startDate) : null;
  const endDate = options.endDate ? new Date(options.endDate) : null;

  // Filter by date range if provided
  const filterByDate = (transactions) => {
    if (!startDate && !endDate) return transactions;
    return transactions.filter(t => {
      const tDate = new Date(t.date);
      if (startDate && tDate < startDate) return false;
      if (endDate && tDate > endDate) return false;
      return true;
    });
  };

  const paypal = filterByDate(paypalTransactions);
  const checking = filterByDate(checkingTransactions);
  const credit = filterByDate(creditTransactions);

  // Calculate summaries
  const paypalSummary = summarizePayPal(paypal);
  const checkingSummary = summarizeChecking(checking);
  const creditSummary = summarizeCredit(credit);
  const ownerDraws = calculateOwnerDraws(checking);

  // Find transfers between accounts
  const transfers = matchTransfers(paypal, checking);

  // Find credit card payments
  const creditCardPayments = matchCreditCardPayments(checking, credit);

  // Calculate reconciliation
  const reconciliation = calculateReconciliation(
    paypalSummary,
    checkingSummary,
    creditSummary,
    transfers,
    creditCardPayments
  );

  return {
    summary: {
      paypal: paypalSummary,
      checking: checkingSummary,
      credit: creditSummary,
      ownerDraws
    },
    transfers,
    creditCardPayments,
    reconciliation,
    dateRange: {
      start: startDate ? startDate.toISOString().split('T')[0] : 'beginning',
      end: endDate ? endDate.toISOString().split('T')[0] : 'end'
    }
  };
}

/**
 * Summarize PayPal transactions
 */
function summarizePayPal(transactions) {
  const summary = {
    totalRevenue: 0,
    totalExpenses: 0,
    totalFees: 0,
    totalStaffPayments: 0,
    totalTransfersToChase: 0,
    netIncome: 0,
    transactionCount: transactions.length,
    byCategory: {}
  };

  transactions.forEach(t => {
    if (!summary.byCategory[t.category]) {
      summary.byCategory[t.category] = { count: 0, total: 0 };
    }
    summary.byCategory[t.category].count++;
    summary.byCategory[t.category].total += t.net;

    summary.totalFees += Math.abs(t.fee);

    switch (t.category) {
      case 'revenue':
        summary.totalRevenue += t.gross;
        break;
      case 'expense':
        summary.totalExpenses += Math.abs(t.gross);
        break;
      case 'staff_payment':
        summary.totalStaffPayments += Math.abs(t.net);
        break;
      case 'transfer_to_chase':
        summary.totalTransfersToChase += Math.abs(t.net);
        break;
    }
  });

  summary.netIncome = summary.totalRevenue - summary.totalExpenses - summary.totalFees - summary.totalStaffPayments;

  return summary;
}

/**
 * Summarize Chase Checking transactions
 */
function summarizeChecking(transactions) {
  const summary = {
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalRevenue: 0,
    totalTransfersFromPayPal: 0,
    totalCreditCardPayments: 0,
    totalOwnerDraws: 0,
    ownerDrawBobby: 0,
    ownerDrawBrendan: 0,
    totalExpenses: 0,
    netCashFlow: 0,
    transactionCount: transactions.length,
    byCategory: {}
  };

  transactions.forEach(t => {
    if (!summary.byCategory[t.category]) {
      summary.byCategory[t.category] = { count: 0, total: 0 };
    }
    summary.byCategory[t.category].count++;
    summary.byCategory[t.category].total += t.amount;

    if (t.amount > 0) {
      summary.totalDeposits += t.amount;
    } else {
      summary.totalWithdrawals += Math.abs(t.amount);
    }

    switch (t.category) {
      case 'revenue':
        summary.totalRevenue += t.amount;
        break;
      case 'transfer_from_paypal':
        summary.totalTransfersFromPayPal += t.amount;
        break;
      case 'credit_card_payment':
        summary.totalCreditCardPayments += Math.abs(t.amount);
        break;
      case 'owner_draw_bobby':
        summary.totalOwnerDraws += Math.abs(t.amount);
        summary.ownerDrawBobby += Math.abs(t.amount);
        break;
      case 'owner_draw_brendan':
        summary.totalOwnerDraws += Math.abs(t.amount);
        summary.ownerDrawBrendan += Math.abs(t.amount);
        break;
      case 'expense':
        summary.totalExpenses += Math.abs(t.amount);
        break;
    }
  });

  summary.netCashFlow = summary.totalDeposits - summary.totalWithdrawals;

  return summary;
}

/**
 * Summarize Chase Credit Card transactions
 */
function summarizeCredit(transactions) {
  const summary = {
    totalExpenses: 0,
    totalPayments: 0,
    netBalance: 0,
    transactionCount: transactions.length,
    byCategory: {}
  };

  transactions.forEach(t => {
    if (!summary.byCategory[t.category]) {
      summary.byCategory[t.category] = { count: 0, total: 0 };
    }
    summary.byCategory[t.category].count++;
    summary.byCategory[t.category].total += Math.abs(t.amount);

    switch (t.category) {
      case 'expense':
        summary.totalExpenses += Math.abs(t.amount);
        break;
      case 'payment_credit':
        summary.totalPayments += Math.abs(t.amount);
        break;
    }
  });

  summary.netBalance = summary.totalExpenses - summary.totalPayments;

  return summary;
}

/**
 * Calculate owner draws
 */
function calculateOwnerDraws(checkingTransactions) {
  const ownerDraws = {
    bobby: {
      total: 0,
      transactions: []
    },
    brendan: {
      total: 0,
      transactions: []
    },
    combined: {
      total: 0,
      count: 0
    }
  };

  checkingTransactions.forEach(t => {
    if (t.category === 'owner_draw_bobby') {
      ownerDraws.bobby.total += Math.abs(t.amount);
      ownerDraws.bobby.transactions.push({
        date: t.date,
        amount: Math.abs(t.amount),
        description: t.description
      });
      ownerDraws.combined.total += Math.abs(t.amount);
      ownerDraws.combined.count++;
    } else if (t.category === 'owner_draw_brendan') {
      ownerDraws.brendan.total += Math.abs(t.amount);
      ownerDraws.brendan.transactions.push({
        date: t.date,
        amount: Math.abs(t.amount),
        description: t.description
      });
      ownerDraws.combined.total += Math.abs(t.amount);
      ownerDraws.combined.count++;
    }
  });

  return ownerDraws;
}

/**
 * Match transfers between PayPal and Chase Checking
 */
function matchTransfers(paypalTransactions, checkingTransactions) {
  const paypalTransfers = paypalTransactions.filter(t => t.category === 'transfer_to_chase');
  const checkingTransfers = checkingTransactions.filter(t => t.category === 'transfer_from_paypal');

  const matches = [];
  const unmatched = {
    paypal: [],
    checking: []
  };

  const tolerance = 0.01; // $0.01 tolerance for matching
  const dayTolerance = 5; // 5 days tolerance for matching

  paypalTransfers.forEach(pt => {
    const amount = Math.abs(pt.net);
    const date = new Date(pt.date);

    // Try to find matching checking transaction
    const match = checkingTransfers.find(ct => {
      const ctAmount = Math.abs(ct.amount);
      const ctDate = new Date(ct.date);
      const daysDiff = Math.abs((date - ctDate) / (1000 * 60 * 60 * 24));

      return Math.abs(amount - ctAmount) < tolerance && daysDiff <= dayTolerance;
    });

    if (match) {
      matches.push({
        paypal: {
          date: pt.date,
          amount: Math.abs(pt.net),
          description: pt.description,
          transactionId: pt.transactionId
        },
        checking: {
          date: match.date,
          amount: Math.abs(match.amount),
          description: match.description
        },
        difference: Math.abs(Math.abs(pt.net) - Math.abs(match.amount)),
        matched: true
      });

      // Remove from checking transfers to avoid duplicate matching
      const index = checkingTransfers.indexOf(match);
      checkingTransfers.splice(index, 1);
    } else {
      unmatched.paypal.push({
        date: pt.date,
        amount: Math.abs(pt.net),
        description: pt.description
      });
    }
  });

  // Remaining checking transfers are unmatched
  checkingTransfers.forEach(ct => {
    unmatched.checking.push({
      date: ct.date,
      amount: Math.abs(ct.amount),
      description: ct.description
    });
  });

  return {
    matched: matches,
    unmatched,
    totalMatched: matches.length,
    totalUnmatched: unmatched.paypal.length + unmatched.checking.length
  };
}

/**
 * Match credit card payments between Checking and Credit Card
 */
function matchCreditCardPayments(checkingTransactions, creditTransactions) {
  const checkingPayments = checkingTransactions.filter(t => t.category === 'credit_card_payment');
  const creditPayments = creditTransactions.filter(t => t.category === 'payment_credit');

  const matches = [];
  const unmatched = {
    checking: [],
    credit: []
  };

  const tolerance = 0.01; // $0.01 tolerance
  const dayTolerance = 5; // 5 days tolerance

  checkingPayments.forEach(cp => {
    const amount = Math.abs(cp.amount);
    const date = new Date(cp.date);

    // Try to find matching credit transaction
    const match = creditPayments.find(ct => {
      const ctAmount = Math.abs(ct.amount);
      const ctDate = new Date(ct.date);
      const daysDiff = Math.abs((date - ctDate) / (1000 * 60 * 60 * 24));

      return Math.abs(amount - ctAmount) < tolerance && daysDiff <= dayTolerance;
    });

    if (match) {
      matches.push({
        checking: {
          date: cp.date,
          amount: Math.abs(cp.amount),
          description: cp.description
        },
        credit: {
          date: match.date,
          amount: Math.abs(match.amount),
          description: match.description
        },
        difference: Math.abs(Math.abs(cp.amount) - Math.abs(match.amount)),
        matched: true
      });

      // Remove from credit payments to avoid duplicate matching
      const index = creditPayments.indexOf(match);
      creditPayments.splice(index, 1);
    } else {
      unmatched.checking.push({
        date: cp.date,
        amount: Math.abs(cp.amount),
        description: cp.description
      });
    }
  });

  // Remaining credit payments are unmatched
  creditPayments.forEach(ct => {
    unmatched.credit.push({
      date: ct.date,
      amount: Math.abs(ct.amount),
      description: ct.description
    });
  });

  return {
    matched: matches,
    unmatched,
    totalMatched: matches.length,
    totalUnmatched: unmatched.checking.length + unmatched.credit.length
  };
}

/**
 * Calculate overall reconciliation
 */
function calculateReconciliation(paypalSummary, checkingSummary, creditSummary, transfers, creditCardPayments) {
  const reconciliation = {
    cashFlow: {
      // PayPal revenue should flow into checking
      expectedCheckingFromPayPal: paypalSummary.totalTransfersToChase,
      actualCheckingFromPayPal: checkingSummary.totalTransfersFromPayPal,
      differencePayPalToChecking: Math.abs(
        paypalSummary.totalTransfersToChase - checkingSummary.totalTransfersFromPayPal
      ),
      matchedTransfers: transfers.totalMatched,
      unmatchedTransfers: transfers.totalUnmatched
    },
    creditCardReconciliation: {
      // Checking payments should match credit card receipts
      expectedCreditPayments: checkingSummary.totalCreditCardPayments,
      actualCreditPayments: creditSummary.totalPayments,
      differenceCreditPayments: Math.abs(
        checkingSummary.totalCreditCardPayments - creditSummary.totalPayments
      ),
      matchedPayments: creditCardPayments.totalMatched,
      unmatchedPayments: creditCardPayments.totalUnmatched
    },
    totalRevenue: {
      paypal: paypalSummary.totalRevenue,
      checking: checkingSummary.totalRevenue,
      combined: paypalSummary.totalRevenue + checkingSummary.totalRevenue
    },
    totalExpenses: {
      paypal: paypalSummary.totalExpenses,
      checking: checkingSummary.totalExpenses,
      credit: creditSummary.totalExpenses,
      combined: paypalSummary.totalExpenses + checkingSummary.totalExpenses + creditSummary.totalExpenses
    },
    netIncome: {
      // Revenue - Expenses - Fees - Owner Draws - Staff Payments
      beforeOwnerDraws: (
        paypalSummary.totalRevenue + checkingSummary.totalRevenue -
        paypalSummary.totalExpenses - checkingSummary.totalExpenses - creditSummary.totalExpenses -
        paypalSummary.totalFees - paypalSummary.totalStaffPayments
      ),
      ownerDraws: checkingSummary.totalOwnerDraws,
      afterOwnerDraws: (
        paypalSummary.totalRevenue + checkingSummary.totalRevenue -
        paypalSummary.totalExpenses - checkingSummary.totalExpenses - creditSummary.totalExpenses -
        paypalSummary.totalFees - paypalSummary.totalStaffPayments - checkingSummary.totalOwnerDraws
      )
    },
    balanced: true,
    issues: []
  };

  // Check for issues
  if (reconciliation.cashFlow.differencePayPalToChecking > 10) {
    reconciliation.balanced = false;
    reconciliation.issues.push({
      type: 'paypal_checking_mismatch',
      message: `PayPal transfers to Chase (${paypalSummary.totalTransfersToChase.toFixed(2)}) don't match checking deposits from PayPal (${checkingSummary.totalTransfersFromPayPal.toFixed(2)})`,
      difference: reconciliation.cashFlow.differencePayPalToChecking
    });
  }

  if (reconciliation.creditCardReconciliation.differenceCreditPayments > 10) {
    reconciliation.balanced = false;
    reconciliation.issues.push({
      type: 'credit_payment_mismatch',
      message: `Checking credit card payments (${checkingSummary.totalCreditCardPayments.toFixed(2)}) don't match credit card receipts (${creditSummary.totalPayments.toFixed(2)})`,
      difference: reconciliation.creditCardReconciliation.differenceCreditPayments
    });
  }

  if (transfers.totalUnmatched > 0) {
    reconciliation.balanced = false;
    reconciliation.issues.push({
      type: 'unmatched_transfers',
      message: `Found ${transfers.totalUnmatched} unmatched transfers between PayPal and Checking`,
      count: transfers.totalUnmatched
    });
  }

  if (creditCardPayments.totalUnmatched > 0) {
    reconciliation.balanced = false;
    reconciliation.issues.push({
      type: 'unmatched_cc_payments',
      message: `Found ${creditCardPayments.totalUnmatched} unmatched credit card payments`,
      count: creditCardPayments.totalUnmatched
    });
  }

  return reconciliation;
}

/**
 * Generate a detailed reconciliation report
 */
function generateReconciliationReport(reconciliationData) {
  const { summary, transfers, creditCardPayments, reconciliation, dateRange } = reconciliationData;

  let report = '';
  report += '='.repeat(80) + '\n';
  report += 'FINANCIAL STATEMENT RECONCILIATION REPORT\n';
  report += '='.repeat(80) + '\n';
  report += `Date Range: ${dateRange.start} to ${dateRange.end}\n\n`;

  // PayPal Summary
  report += '-'.repeat(80) + '\n';
  report += 'PAYPAL SUMMARY\n';
  report += '-'.repeat(80) + '\n';
  report += `Total Revenue:            $${summary.paypal.totalRevenue.toFixed(2)}\n`;
  report += `Total Expenses:           $${summary.paypal.totalExpenses.toFixed(2)}\n`;
  report += `Total Fees:               $${summary.paypal.totalFees.toFixed(2)}\n`;
  report += `Staff Payments:           $${summary.paypal.totalStaffPayments.toFixed(2)}\n`;
  report += `Transfers to Chase:       $${summary.paypal.totalTransfersToChase.toFixed(2)}\n`;
  report += `Net Income:               $${summary.paypal.netIncome.toFixed(2)}\n`;
  report += `Transaction Count:        ${summary.paypal.transactionCount}\n\n`;

  // Chase Checking Summary
  report += '-'.repeat(80) + '\n';
  report += 'CHASE CHECKING SUMMARY\n';
  report += '-'.repeat(80) + '\n';
  report += `Total Deposits:           $${summary.checking.totalDeposits.toFixed(2)}\n`;
  report += `Total Withdrawals:        $${summary.checking.totalWithdrawals.toFixed(2)}\n`;
  report += `Transfers from PayPal:    $${summary.checking.totalTransfersFromPayPal.toFixed(2)}\n`;
  report += `Credit Card Payments:     $${summary.checking.totalCreditCardPayments.toFixed(2)}\n`;
  report += `Total Owner Draws:        $${summary.checking.totalOwnerDraws.toFixed(2)}\n`;
  report += `  - Bobby Tredinnick:     $${summary.checking.ownerDrawBobby.toFixed(2)}\n`;
  report += `  - Brendan Wilder:       $${summary.checking.ownerDrawBrendan.toFixed(2)}\n`;
  report += `Other Revenue:            $${summary.checking.totalRevenue.toFixed(2)}\n`;
  report += `Other Expenses:           $${summary.checking.totalExpenses.toFixed(2)}\n`;
  report += `Net Cash Flow:            $${summary.checking.netCashFlow.toFixed(2)}\n`;
  report += `Transaction Count:        ${summary.checking.transactionCount}\n\n`;

  // Chase Credit Card Summary
  report += '-'.repeat(80) + '\n';
  report += 'CHASE CREDIT CARD SUMMARY\n';
  report += '-'.repeat(80) + '\n';
  report += `Total Expenses:           $${summary.credit.totalExpenses.toFixed(2)}\n`;
  report += `Total Payments:           $${summary.credit.totalPayments.toFixed(2)}\n`;
  report += `Net Balance:              $${summary.credit.netBalance.toFixed(2)}\n`;
  report += `Transaction Count:        ${summary.credit.transactionCount}\n\n`;

  // Owner Draws Detail
  report += '-'.repeat(80) + '\n';
  report += 'OWNER DRAWS DETAIL\n';
  report += '-'.repeat(80) + '\n';
  report += `Bobby Tredinnick:         $${summary.ownerDraws.bobby.total.toFixed(2)} (${summary.ownerDraws.bobby.transactions.length} transactions)\n`;
  report += `Brendan Wilder:           $${summary.ownerDraws.brendan.total.toFixed(2)} (${summary.ownerDraws.brendan.transactions.length} transactions)\n`;
  report += `Total Owner Draws:        $${summary.ownerDraws.combined.total.toFixed(2)}\n\n`;

  // Reconciliation
  report += '='.repeat(80) + '\n';
  report += 'RECONCILIATION ANALYSIS\n';
  report += '='.repeat(80) + '\n\n';

  report += 'PayPal to Chase Checking Transfers:\n';
  report += `  Expected (PayPal):      $${reconciliation.cashFlow.expectedCheckingFromPayPal.toFixed(2)}\n`;
  report += `  Actual (Checking):      $${reconciliation.cashFlow.actualCheckingFromPayPal.toFixed(2)}\n`;
  report += `  Difference:             $${reconciliation.cashFlow.differencePayPalToChecking.toFixed(2)}\n`;
  report += `  Matched Transfers:      ${reconciliation.cashFlow.matchedTransfers}\n`;
  report += `  Unmatched Transfers:    ${reconciliation.cashFlow.unmatchedTransfers}\n\n`;

  report += 'Credit Card Payments:\n';
  report += `  Expected (Checking):    $${reconciliation.creditCardReconciliation.expectedCreditPayments.toFixed(2)}\n`;
  report += `  Actual (Credit):        $${reconciliation.creditCardReconciliation.actualCreditPayments.toFixed(2)}\n`;
  report += `  Difference:             $${reconciliation.creditCardReconciliation.differenceCreditPayments.toFixed(2)}\n`;
  report += `  Matched Payments:       ${reconciliation.creditCardReconciliation.matchedPayments}\n`;
  report += `  Unmatched Payments:     ${reconciliation.creditCardReconciliation.unmatchedPayments}\n\n`;

  report += 'Total Revenue & Expenses:\n';
  report += `  Total Revenue:          $${reconciliation.totalRevenue.combined.toFixed(2)}\n`;
  report += `    - PayPal:             $${reconciliation.totalRevenue.paypal.toFixed(2)}\n`;
  report += `    - Checking:           $${reconciliation.totalRevenue.checking.toFixed(2)}\n`;
  report += `  Total Expenses:         $${reconciliation.totalExpenses.combined.toFixed(2)}\n`;
  report += `    - PayPal:             $${reconciliation.totalExpenses.paypal.toFixed(2)}\n`;
  report += `    - Checking:           $${reconciliation.totalExpenses.checking.toFixed(2)}\n`;
  report += `    - Credit Card:        $${reconciliation.totalExpenses.credit.toFixed(2)}\n\n`;

  report += 'Net Income:\n';
  report += `  Before Owner Draws:     $${reconciliation.netIncome.beforeOwnerDraws.toFixed(2)}\n`;
  report += `  Owner Draws:            $${reconciliation.netIncome.ownerDraws.toFixed(2)}\n`;
  report += `  After Owner Draws:      $${reconciliation.netIncome.afterOwnerDraws.toFixed(2)}\n\n`;

  // Issues
  report += '='.repeat(80) + '\n';
  report += reconciliation.balanced ? 'STATUS: BALANCED ✓\n' : 'STATUS: ISSUES FOUND ✗\n';
  report += '='.repeat(80) + '\n';

  if (reconciliation.issues.length > 0) {
    report += '\nISSUES:\n';
    reconciliation.issues.forEach((issue, index) => {
      report += `${index + 1}. ${issue.message}\n`;
    });
  } else {
    report += '\nNo issues found. All statements are properly reconciled.\n';
  }

  report += '\n' + '='.repeat(80) + '\n';

  return report;
}

module.exports = {
  reconcileStatements,
  summarizePayPal,
  summarizeChecking,
  summarizeCredit,
  calculateOwnerDraws,
  matchTransfers,
  matchCreditCardPayments,
  calculateReconciliation,
  generateReconciliationReport
};
