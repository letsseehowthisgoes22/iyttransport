# Financial Statement Reconciliation System

This system parses and reconciles financial statements from PayPal, Chase Checking, and Chase Credit Card accounts to provide a comprehensive view of business finances.

## Features

- **Multi-Source Parsing**: Parses CSV statements from PayPal, Chase Checking, and Chase Credit Card
- **Automatic Categorization**: Intelligently categorizes transactions (revenue, expenses, transfers, owner draws)
- **Owner Draw Tracking**: Automatically identifies and tracks Zelle payments to Bobby Tredinnick and Brendan Wilder
- **Reconciliation**: Matches transfers between PayPal and Chase Checking, and credit card payments
- **Comprehensive Reports**: Generates detailed reconciliation reports showing cash flow, expenses, and discrepancies

## Business Logic

The system understands the following cash flow:

1. **PayPal Account**
   - Receives revenue from customers
   - Pays some expenses directly
   - Pays staff salaries/wages
   - Transfers money to Chase Checking

2. **Chase Checking Account**
   - Receives transfers from PayPal
   - May collect some revenue directly
   - Holds operating cash
   - Pays off Chase Credit Card
   - Processes owner draws via Zelle to Bobby Tredinnick and Brendan Wilder

3. **Chase Credit Card**
   - Used for business expenses
   - Paid off from Chase Checking account

## Usage

### Option 1: Command Line Interface (CLI)

The quickest way to process statements is using the CLI tool:

```bash
node server/utils/processStatements.js paypal.csv checking.csv credit.csv
```

**With Options:**
```bash
node server/utils/processStatements.js \
  statements/paypal.csv \
  statements/checking.csv \
  statements/credit.csv \
  --start-date 2024-01-01 \
  --end-date 2024-12-31 \
  --output report.txt
```

**CLI Options:**
- `--start-date YYYY-MM-DD`: Filter transactions from this date
- `--end-date YYYY-MM-DD`: Filter transactions to this date
- `--output <file>`: Save report to file instead of console
- `--json`: Output as JSON instead of text report

### Option 2: REST API

The system provides REST API endpoints for integration with other applications.

#### 1. Upload Statements

Upload each statement separately:

**Upload PayPal Statement:**
```bash
curl -X POST http://localhost:5000/api/statements/upload \
  -H "Content-Type: application/json" \
  -d '{
    "csvContent": "Date,Name,Type,Gross,Fee,Net,Balance...",
    "sourceType": "paypal"
  }'
```

**Upload Chase Checking Statement:**
```bash
curl -X POST http://localhost:5000/api/statements/upload \
  -H "Content-Type: application/json" \
  -d '{
    "csvContent": "Details,Posting Date,Description,Amount,Balance...",
    "sourceType": "chase_checking"
  }'
```

**Upload Chase Credit Card Statement:**
```bash
curl -X POST http://localhost:5000/api/statements/upload \
  -H "Content-Type: application/json" \
  -d '{
    "csvContent": "Transaction Date,Post Date,Description,Amount...",
    "sourceType": "chase_credit"
  }'
```

#### 2. Reconcile Statements

After uploading all three statements:

```bash
curl -X POST http://localhost:5000/api/statements/reconcile \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2024-01-01",
    "endDate": "2024-12-31"
  }'
```

#### 3. Check Upload Status

```bash
curl http://localhost:5000/api/statements/status
```

#### 4. Get Owner Draws Summary

```bash
curl http://localhost:5000/api/statements/owner-draws
```

#### 5. Get Transactions by Type

```bash
curl http://localhost:5000/api/statements/transactions/paypal
curl http://localhost:5000/api/statements/transactions/checking
curl http://localhost:5000/api/statements/transactions/credit
```

#### 6. Clear All Data

```bash
curl -X POST http://localhost:5000/api/statements/clear
```

### Option 3: Node.js Module

Use the parsers and reconciliation functions directly in your code:

```javascript
const { parseStatement } = require('./server/utils/statementParser');
const { reconcileStatements, generateReconciliationReport } = require('./server/utils/reconciliation');
const fs = require('fs');

// Read CSV files
const paypalCSV = fs.readFileSync('paypal.csv', 'utf-8');
const checkingCSV = fs.readFileSync('checking.csv', 'utf-8');
const creditCSV = fs.readFileSync('credit.csv', 'utf-8');

// Parse statements
const paypalTransactions = parseStatement(paypalCSV, 'paypal');
const checkingTransactions = parseStatement(checkingCSV, 'chase_checking');
const creditTransactions = parseStatement(creditCSV, 'chase_credit');

// Reconcile
const reconciliation = reconcileStatements(
  paypalTransactions,
  checkingTransactions,
  creditTransactions,
  {
    startDate: '2024-01-01',
    endDate: '2024-12-31'
  }
);

// Generate report
const report = generateReconciliationReport(reconciliation);
console.log(report);
```

## Statement Format Requirements

### PayPal Statement CSV

Expected columns (order doesn't matter):
- `Date` - Transaction date
- `Name` - Merchant/customer name
- `Type` - Transaction type (Payment, Transfer, etc.)
- `Gross` - Gross amount
- `Fee` - PayPal fee
- `Net` - Net amount after fees
- `Balance` - Account balance
- `Transaction ID` - Unique transaction identifier

### Chase Checking Statement CSV

Expected columns:
- `Posting Date` or `Date` - Transaction date
- `Description` - Transaction description
- `Amount` - Transaction amount (positive for deposits, negative for withdrawals)
- `Balance` - Account balance
- `Type` - Transaction type
- `Details` (optional)
- `Check or Slip #` (optional)

### Chase Credit Card Statement CSV

Expected columns:
- `Transaction Date` - When transaction occurred
- `Post Date` - When transaction posted
- `Description` - Merchant/transaction description
- `Amount` - Transaction amount
- `Type` - Transaction type
- `Category` (optional) - Expense category
- `Memo` (optional)

## Transaction Categorization

The system automatically categorizes transactions:

### PayPal Categories
- `revenue` - Incoming payments (positive gross amount)
- `expense` - Outgoing payments (negative gross amount, not transfers or staff)
- `transfer_to_chase` - Bank transfers to Chase
- `staff_payment` - Payments to staff/employees
- `other` - Uncategorized

### Chase Checking Categories
- `revenue` - Direct revenue deposits
- `transfer_from_paypal` - Incoming transfers from PayPal
- `credit_card_payment` - Payments to Chase credit card
- `owner_draw_bobby` - Zelle payments to Bobby/Robert Tredinnick
- `owner_draw_brendan` - Zelle payments to Brendan/Boone Wilder
- `zelle_payment` - Other Zelle payments
- `expense` - Other expenses
- `other` - Uncategorized

### Chase Credit Card Categories
- `expense` - Credit card purchases (negative amounts)
- `payment_credit` - Payments or credits (positive amounts)

## Reconciliation Logic

The system performs the following reconciliation checks:

1. **PayPal to Chase Checking Transfers**
   - Matches transfers from PayPal with deposits in Chase Checking
   - Tolerance: ±$0.01 amount, ±5 days
   - Reports matched and unmatched transfers

2. **Credit Card Payments**
   - Matches payments from Chase Checking with credits on Chase Credit Card
   - Tolerance: ±$0.01 amount, ±5 days
   - Reports matched and unmatched payments

3. **Cash Flow Verification**
   - Verifies total transfers match between accounts
   - Identifies discrepancies

4. **Owner Draws**
   - Tracks all Zelle payments to Bobby Tredinnick
   - Tracks all Zelle payments to Brendan Wilder
   - Calculates total owner draws

5. **Net Income Calculation**
   - Total Revenue (PayPal + Checking)
   - - Total Expenses (PayPal + Checking + Credit Card)
   - - PayPal Fees
   - - Staff Payments
   - = Net Income Before Owner Draws
   - - Owner Draws
   - = Net Income After Owner Draws

## Report Output

The reconciliation report includes:

1. **Summary Section**
   - PayPal account summary (revenue, expenses, fees, transfers)
   - Chase Checking summary (deposits, withdrawals, payments, owner draws)
   - Chase Credit Card summary (expenses, payments)

2. **Owner Draws Detail**
   - Breakdown by owner (Bobby Tredinnick, Brendan Wilder)
   - Individual transaction details
   - Total owner draws

3. **Reconciliation Analysis**
   - Transfer matching results
   - Credit card payment matching results
   - Total revenue and expenses across all accounts
   - Net income before and after owner draws

4. **Status & Issues**
   - Overall reconciliation status (Balanced ✓ or Issues Found ✗)
   - List of any discrepancies or unmatched transactions

## Example Report

```
================================================================================
FINANCIAL STATEMENT RECONCILIATION REPORT
================================================================================
Date Range: 2024-01-01 to 2024-12-31

--------------------------------------------------------------------------------
PAYPAL SUMMARY
--------------------------------------------------------------------------------
Total Revenue:            $125,000.00
Total Expenses:           $12,500.00
Total Fees:               $3,625.00
Staff Payments:           $25,000.00
Transfers to Chase:       $80,000.00
Net Income:               $83,875.00
Transaction Count:        456

--------------------------------------------------------------------------------
CHASE CHECKING SUMMARY
--------------------------------------------------------------------------------
Total Deposits:           $95,000.00
Total Withdrawals:        $70,000.00
Transfers from PayPal:    $80,000.00
Credit Card Payments:     $45,000.00
Total Owner Draws:        $20,000.00
  - Bobby Tredinnick:     $12,000.00
  - Brendan Wilder:       $8,000.00
Other Revenue:            $15,000.00
Other Expenses:           $5,000.00
Net Cash Flow:            $25,000.00
Transaction Count:        234

--------------------------------------------------------------------------------
CHASE CREDIT CARD SUMMARY
--------------------------------------------------------------------------------
Total Expenses:           $45,500.00
Total Payments:           $45,000.00
Net Balance:              $500.00
Transaction Count:        178

--------------------------------------------------------------------------------
OWNER DRAWS DETAIL
--------------------------------------------------------------------------------
Bobby Tredinnick:         $12,000.00 (6 transactions)
Brendan Wilder:           $8,000.00 (4 transactions)
Total Owner Draws:        $20,000.00

================================================================================
RECONCILIATION ANALYSIS
================================================================================

PayPal to Chase Checking Transfers:
  Expected (PayPal):      $80,000.00
  Actual (Checking):      $80,000.00
  Difference:             $0.00
  Matched Transfers:      12
  Unmatched Transfers:    0

Credit Card Payments:
  Expected (Checking):    $45,000.00
  Actual (Credit):        $45,000.00
  Difference:             $0.00
  Matched Payments:       11
  Unmatched Payments:     0

Total Revenue & Expenses:
  Total Revenue:          $140,000.00
    - PayPal:             $125,000.00
    - Checking:           $15,000.00
  Total Expenses:         $63,000.00
    - PayPal:             $12,500.00
    - Checking:           $5,000.00
    - Credit Card:        $45,500.00

Net Income:
  Before Owner Draws:     $51,875.00
  Owner Draws:            $20,000.00
  After Owner Draws:      $31,875.00

================================================================================
STATUS: BALANCED ✓
================================================================================

No issues found. All statements are properly reconciled.

================================================================================
```

## Tips for Best Results

1. **Export Full Statement Period**: Export statements for the same date range from all three sources

2. **Use CSV Format**: All three banks support CSV export - use this format for best results

3. **Check Column Headers**: The parser looks for common column names, but verify your exports match expected format

4. **Review Unmatched Transactions**: If the system reports unmatched transfers or payments, manually review these transactions

5. **Date Tolerance**: The system allows up to 5 days difference for matching transactions (transfers can take time to clear)

6. **Amount Tolerance**: Matching allows $0.01 difference to account for rounding

## Troubleshooting

### "Failed to parse statement"
- Check that the CSV file has the expected column headers
- Ensure the file is in CSV format (not XLS or XLSX)
- Check for special characters or encoding issues

### "Unmatched transfers"
- Verify date ranges match across all statements
- Check if transfer amounts are exact (fees may cause differences)
- Look for timing differences (transfers may appear on different dates)

### "Owner draws not detected"
- Ensure Zelle payment descriptions contain owner names: "Bobby", "Robert", "Tredinnick", "Brendan", "Boone", or "Wilder"
- Check that transactions are from Chase Checking (not credit card)

### "Reconciliation issues"
- Review the specific issues listed in the report
- Check for missing transactions in any statement
- Verify all statements cover the same time period

## Files

- `server/utils/statementParser.js` - CSV parsing for all three statement types
- `server/utils/reconciliation.js` - Reconciliation logic and report generation
- `server/utils/processStatements.js` - CLI tool for batch processing
- `server/routes/statements.js` - REST API endpoints

## Support

For issues or questions:
1. Check this documentation
2. Review example CSV formats
3. Test with a small date range first
4. Contact system administrator

---

**Last Updated**: November 2025
