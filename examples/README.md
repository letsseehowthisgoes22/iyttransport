# Financial Statement Processing Examples

This directory contains example files and scripts demonstrating the financial statement processing system.

## Contents

- `statements/` - Sample CSV files for testing
  - `sample_paypal.csv` - Example PayPal statement
  - `sample_chase_checking.csv` - Example Chase Checking statement
  - `sample_chase_credit.csv` - Example Chase Credit Card statement
- `test_statements.js` - Complete example script showing how to use the system

## Quick Start

### Run the Example Script

```bash
node examples/test_statements.js
```

This will:
1. Load the sample CSV files
2. Parse each statement
3. Perform reconciliation
4. Display key metrics
5. Generate a full reconciliation report

The report will be saved to `examples/reconciliation_report.txt`.

### Test with CLI Tool

You can also test the CLI tool with the sample files:

```bash
node server/utils/processStatements.js \
  examples/statements/sample_paypal.csv \
  examples/statements/sample_chase_checking.csv \
  examples/statements/sample_chase_credit.csv
```

Add date filtering:

```bash
node server/utils/processStatements.js \
  examples/statements/sample_paypal.csv \
  examples/statements/sample_chase_checking.csv \
  examples/statements/sample_chase_credit.csv \
  --start-date 2024-01-01 \
  --end-date 2024-02-28
```

Save to file:

```bash
node server/utils/processStatements.js \
  examples/statements/sample_paypal.csv \
  examples/statements/sample_chase_checking.csv \
  examples/statements/sample_chase_credit.csv \
  --output my_report.txt
```

## Sample Data

The sample CSV files contain realistic test data:

### PayPal Statement
- Revenue from transport services
- Staff payroll payments
- Business expenses
- Transfers to bank account

### Chase Checking Statement
- Deposits from PayPal
- Owner draws (Zelle to Bobby Tredinnick and Brendan Wilder)
- Credit card payments
- Other business expenses

### Chase Credit Card Statement
- Various business expenses
- Payments from checking account

## Creating Your Own Examples

To test with your own data:

1. Export CSV statements from PayPal, Chase Checking, and Chase Credit Card
2. Save them in the `statements/` directory
3. Run the CLI tool or modify `test_statements.js` to point to your files

## Understanding the Output

The reconciliation report shows:

1. **Summary** - Totals for each account
2. **Owner Draws** - Detailed breakdown of payments to Bobby and Brendan
3. **Reconciliation** - Matching transfers and payments between accounts
4. **Status** - Whether everything balances or if there are issues

## Troubleshooting

If you encounter errors:

1. Check CSV format matches expected columns
2. Verify dates are in MM/DD/YYYY format
3. Ensure amounts are numeric (may have $ or commas)
4. Check for special characters in descriptions

For more information, see [FINANCIAL_STATEMENTS.md](../FINANCIAL_STATEMENTS.md) in the root directory.
