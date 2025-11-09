#!/usr/bin/env node

/**
 * CLI Tool for Processing Financial Statements
 *
 * Usage:
 *   node processStatements.js <paypal.csv> <checking.csv> <credit.csv> [options]
 *
 * Options:
 *   --start-date YYYY-MM-DD    Start date for reconciliation
 *   --end-date YYYY-MM-DD      End date for reconciliation
 *   --output <file>            Output file for report (default: console)
 */

const fs = require('fs');
const path = require('path');
const { parseStatement } = require('./statementParser');
const { reconcileStatements, generateReconciliationReport } = require('./reconciliation');

function main() {
  const args = process.argv.slice(2);

  if (args.length < 3 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Financial Statement Reconciliation Tool

Usage:
  node processStatements.js <paypal.csv> <checking.csv> <credit.csv> [options]

Arguments:
  paypal.csv     Path to PayPal statement CSV file
  checking.csv   Path to Chase Checking statement CSV file
  credit.csv     Path to Chase Credit Card statement CSV file

Options:
  --start-date YYYY-MM-DD    Start date for reconciliation period
  --end-date YYYY-MM-DD      End date for reconciliation period
  --output <file>            Output file for report (default: console)
  --json                     Output as JSON instead of text report
  --help, -h                 Show this help message

Example:
  node processStatements.js paypal.csv checking.csv credit.csv --start-date 2024-01-01 --end-date 2024-12-31 --output report.txt
    `);
    process.exit(0);
  }

  // Parse arguments
  const paypalFile = args[0];
  const checkingFile = args[1];
  const creditFile = args[2];

  const options = {};
  for (let i = 3; i < args.length; i++) {
    if (args[i] === '--start-date' && args[i + 1]) {
      options.startDate = args[i + 1];
      i++;
    } else if (args[i] === '--end-date' && args[i + 1]) {
      options.endDate = args[i + 1];
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      options.outputFile = args[i + 1];
      i++;
    } else if (args[i] === '--json') {
      options.json = true;
    }
  }

  try {
    console.log('Reading statement files...');

    // Read files
    const paypalContent = fs.readFileSync(paypalFile, 'utf-8');
    const checkingContent = fs.readFileSync(checkingFile, 'utf-8');
    const creditContent = fs.readFileSync(creditFile, 'utf-8');

    console.log('Parsing PayPal statement...');
    const paypalTransactions = parseStatement(paypalContent, 'paypal');
    console.log(`  Found ${paypalTransactions.length} transactions`);

    console.log('Parsing Chase Checking statement...');
    const checkingTransactions = parseStatement(checkingContent, 'chase_checking');
    console.log(`  Found ${checkingTransactions.length} transactions`);

    console.log('Parsing Chase Credit Card statement...');
    const creditTransactions = parseStatement(creditContent, 'chase_credit');
    console.log(`  Found ${creditTransactions.length} transactions`);

    console.log('\nReconciling statements...');
    const reconciliationData = reconcileStatements(
      paypalTransactions,
      checkingTransactions,
      creditTransactions,
      options
    );

    // Generate output
    let output;
    if (options.json) {
      output = JSON.stringify(reconciliationData, null, 2);
    } else {
      output = generateReconciliationReport(reconciliationData);
    }

    // Write output
    if (options.outputFile) {
      fs.writeFileSync(options.outputFile, output);
      console.log(`\nReport written to: ${options.outputFile}`);
    } else {
      console.log('\n' + output);
    }

    // Exit with appropriate code
    if (reconciliationData.reconciliation.balanced) {
      console.log('\n✓ Reconciliation completed successfully!');
      process.exit(0);
    } else {
      console.log('\n✗ Reconciliation found issues. Please review the report.');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n✗ Error processing statements:');
    console.error(error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };
