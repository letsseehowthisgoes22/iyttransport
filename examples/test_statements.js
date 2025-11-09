/**
 * Example: Testing Statement Processing
 *
 * This script demonstrates how to use the financial statement processing system
 */

const fs = require('fs');
const path = require('path');
const { parseStatement } = require('../server/utils/statementParser');
const { reconcileStatements, generateReconciliationReport } = require('../server/utils/reconciliation');

console.log('='.repeat(80));
console.log('Financial Statement Processing Example');
console.log('='.repeat(80));
console.log();

try {
  // Read sample CSV files
  console.log('Step 1: Reading sample statement files...');
  const paypalCSV = fs.readFileSync(path.join(__dirname, 'statements/sample_paypal.csv'), 'utf-8');
  const checkingCSV = fs.readFileSync(path.join(__dirname, 'statements/sample_chase_checking.csv'), 'utf-8');
  const creditCSV = fs.readFileSync(path.join(__dirname, 'statements/sample_chase_credit.csv'), 'utf-8');
  console.log('✓ Files read successfully\n');

  // Parse statements
  console.log('Step 2: Parsing statements...');
  const paypalTransactions = parseStatement(paypalCSV, 'paypal');
  console.log(`  ✓ PayPal: ${paypalTransactions.length} transactions`);

  const checkingTransactions = parseStatement(checkingCSV, 'chase_checking');
  console.log(`  ✓ Chase Checking: ${checkingTransactions.length} transactions`);

  const creditTransactions = parseStatement(creditCSV, 'chase_credit');
  console.log(`  ✓ Chase Credit Card: ${creditTransactions.length} transactions`);
  console.log();

  // Show sample transactions
  console.log('Step 3: Sample Transaction Data');
  console.log('-'.repeat(80));

  console.log('\nPayPal Sample:');
  if (paypalTransactions[0]) {
    console.log(`  Date: ${paypalTransactions[0].date}`);
    console.log(`  Description: ${paypalTransactions[0].description}`);
    console.log(`  Amount: $${paypalTransactions[0].net.toFixed(2)}`);
    console.log(`  Category: ${paypalTransactions[0].category}`);
  }

  console.log('\nChase Checking Sample:');
  if (checkingTransactions[0]) {
    console.log(`  Date: ${checkingTransactions[0].date}`);
    console.log(`  Description: ${checkingTransactions[0].description}`);
    console.log(`  Amount: $${checkingTransactions[0].amount.toFixed(2)}`);
    console.log(`  Category: ${checkingTransactions[0].category}`);
  }

  console.log('\nChase Credit Card Sample:');
  if (creditTransactions[0]) {
    console.log(`  Date: ${creditTransactions[0].date}`);
    console.log(`  Description: ${creditTransactions[0].description}`);
    console.log(`  Amount: $${creditTransactions[0].amount.toFixed(2)}`);
    console.log(`  Category: ${creditTransactions[0].category}`);
  }
  console.log();

  // Reconcile
  console.log('Step 4: Reconciling statements...');
  const reconciliation = reconcileStatements(
    paypalTransactions,
    checkingTransactions,
    creditTransactions
  );
  console.log('✓ Reconciliation complete\n');

  // Show key metrics
  console.log('Step 5: Key Financial Metrics');
  console.log('-'.repeat(80));
  console.log(`Total Revenue: $${reconciliation.reconciliation.totalRevenue.combined.toFixed(2)}`);
  console.log(`Total Expenses: $${reconciliation.reconciliation.totalExpenses.combined.toFixed(2)}`);
  console.log(`Net Income (before owner draws): $${reconciliation.reconciliation.netIncome.beforeOwnerDraws.toFixed(2)}`);
  console.log(`Owner Draws: $${reconciliation.reconciliation.netIncome.ownerDraws.toFixed(2)}`);
  console.log(`  - Bobby Tredinnick: $${reconciliation.summary.checking.ownerDrawBobby.toFixed(2)}`);
  console.log(`  - Brendan Wilder: $${reconciliation.summary.checking.ownerDrawBrendan.toFixed(2)}`);
  console.log(`Net Income (after owner draws): $${reconciliation.reconciliation.netIncome.afterOwnerDraws.toFixed(2)}`);
  console.log();

  // Show reconciliation status
  console.log('Step 6: Reconciliation Status');
  console.log('-'.repeat(80));
  console.log(`Status: ${reconciliation.reconciliation.balanced ? '✓ BALANCED' : '✗ ISSUES FOUND'}`);
  console.log(`Matched Transfers: ${reconciliation.reconciliation.cashFlow.matchedTransfers}`);
  console.log(`Unmatched Transfers: ${reconciliation.reconciliation.cashFlow.unmatchedTransfers}`);
  console.log(`Matched Credit Card Payments: ${reconciliation.reconciliation.creditCardReconciliation.matchedPayments}`);
  console.log(`Unmatched Credit Card Payments: ${reconciliation.reconciliation.creditCardReconciliation.unmatchedPayments}`);

  if (reconciliation.reconciliation.issues.length > 0) {
    console.log('\nIssues:');
    reconciliation.reconciliation.issues.forEach((issue, index) => {
      console.log(`  ${index + 1}. ${issue.message}`);
    });
  }
  console.log();

  // Generate full report
  console.log('Step 7: Generating full report...');
  const report = generateReconciliationReport(reconciliation);

  // Save report to file
  const reportPath = path.join(__dirname, 'reconciliation_report.txt');
  fs.writeFileSync(reportPath, report);
  console.log(`✓ Full report saved to: ${reportPath}`);
  console.log();

  console.log('='.repeat(80));
  console.log('Example completed successfully!');
  console.log('='.repeat(80));

} catch (error) {
  console.error('\n✗ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
