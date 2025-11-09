import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const StatementUpload = () => {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [statementType, setStatementType] = useState('auto');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({
    source: '',
    startDate: '',
    endDate: '',
  });
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetchTransactions();
    fetchSummary();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.source) params.append('source', filter.source);
      if (filter.startDate) params.append('startDate', filter.startDate);
      if (filter.endDate) params.append('endDate', filter.endDate);

      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/statements/transactions?${params}`,
        { withCredentials: true }
      );
      setTransactions(response.data.transactions);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      setError('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.startDate) params.append('startDate', filter.startDate);
      if (filter.endDate) params.append('endDate', filter.endDate);

      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/statements/summary?${params}`,
        { withCredentials: true }
      );
      setSummary(response.data.summary);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
      setUploadResult(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!file) {
      setError('Please select a file');
      return;
    }

    const formData = new FormData();
    formData.append('statement', file);
    formData.append('statementType', statementType);

    try {
      setUploading(true);
      setError('');
      setUploadResult(null);

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/statements/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          withCredentials: true,
        }
      );

      setUploadResult(response.data);
      setFile(null);

      // Refresh transactions and summary
      fetchTransactions();
      fetchSummary();
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.response?.data?.error || 'Failed to upload statement');
    } finally {
      setUploading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilter({
      ...filter,
      [e.target.name]: e.target.value,
    });
  };

  const applyFilters = () => {
    fetchTransactions();
    fetchSummary();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US');
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Statement Upload & Management</h1>

      {/* Upload Section */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Upload Statement</h2>
        <form onSubmit={handleUpload} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Statement Type</label>
            <select
              value={statementType}
              onChange={(e) => setStatementType(e.target.value)}
              style={styles.select}
            >
              <option value="auto">Auto-detect</option>
              <option value="chase-credit">Chase Credit Card (PDF)</option>
              <option value="chase-checking">Chase Checking (PDF)</option>
              <option value="paypal">PayPal (CSV)</option>
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Select File</label>
            <input
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.csv"
              style={styles.fileInput}
            />
            {file && (
              <p style={styles.fileName}>
                Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={uploading || !file}
            style={{
              ...styles.button,
              ...styles.primaryButton,
              ...(uploading || !file ? styles.disabledButton : {}),
            }}
          >
            {uploading ? 'Uploading...' : 'Upload & Parse'}
          </button>
        </form>

        {error && <div style={styles.error}>{error}</div>}

        {uploadResult && (
          <div style={styles.success}>
            <h3>Upload Successful!</h3>
            <p>Source: {uploadResult.source}</p>
            <p>Transactions imported: {uploadResult.count}</p>
            {uploadResult.transactions && uploadResult.transactions.length > 0 && (
              <div style={styles.preview}>
                <h4>Preview (first 10 transactions):</h4>
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Date</th>
                        <th style={styles.th}>Description</th>
                        <th style={styles.th}>Amount</th>
                        <th style={styles.th}>Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploadResult.transactions.map((t, idx) => (
                        <tr key={idx} style={styles.tr}>
                          <td style={styles.td}>{formatDate(t.transactionDate)}</td>
                          <td style={styles.td}>{t.description}</td>
                          <td style={{...styles.td, color: t.amount >= 0 ? '#28a745' : '#dc3545'}}>
                            {formatCurrency(t.amount)}
                          </td>
                          <td style={styles.td}>{t.transactionType}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary Section */}
      {summary && (
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Summary</h2>
          <div style={styles.summaryGrid}>
            <div style={styles.summaryItem}>
              <div style={styles.summaryLabel}>Total Transactions</div>
              <div style={styles.summaryValue}>{summary.totalTransactions}</div>
            </div>
            <div style={styles.summaryItem}>
              <div style={styles.summaryLabel}>Total Positive</div>
              <div style={{...styles.summaryValue, color: '#28a745'}}>
                {formatCurrency(summary.totalPositive)}
              </div>
            </div>
            <div style={styles.summaryItem}>
              <div style={styles.summaryLabel}>Total Negative</div>
              <div style={{...styles.summaryValue, color: '#dc3545'}}>
                {formatCurrency(summary.totalNegative)}
              </div>
            </div>
            <div style={styles.summaryItem}>
              <div style={styles.summaryLabel}>Net Total</div>
              <div style={{...styles.summaryValue, color: summary.totalAmount >= 0 ? '#28a745' : '#dc3545'}}>
                {formatCurrency(summary.totalAmount)}
              </div>
            </div>
          </div>
          {summary.bySource && Object.keys(summary.bySource).length > 0 && (
            <div style={styles.bySource}>
              <h3 style={styles.subtitle}>By Source</h3>
              {Object.entries(summary.bySource).map(([source, data]) => (
                <div key={source} style={styles.sourceItem}>
                  <strong>{source}:</strong> {data.count} transactions, {formatCurrency(data.total)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filters Section */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Filter Transactions</h2>
        <div style={styles.filterGrid}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Source</label>
            <select
              name="source"
              value={filter.source}
              onChange={handleFilterChange}
              style={styles.select}
            >
              <option value="">All Sources</option>
              <option value="Chase Credit Card">Chase Credit Card</option>
              <option value="Chase Checking">Chase Checking</option>
              <option value="PayPal">PayPal</option>
            </select>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Start Date</label>
            <input
              type="date"
              name="startDate"
              value={filter.startDate}
              onChange={handleFilterChange}
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>End Date</label>
            <input
              type="date"
              name="endDate"
              value={filter.endDate}
              onChange={handleFilterChange}
              style={styles.input}
            />
          </div>
        </div>
        <button onClick={applyFilters} style={{...styles.button, ...styles.primaryButton}}>
          Apply Filters
        </button>
      </div>

      {/* Transactions List */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Transactions ({transactions.length})</h2>
        {loading ? (
          <p>Loading transactions...</p>
        ) : transactions.length === 0 ? (
          <p>No transactions found. Upload a statement to get started.</p>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Source</th>
                  <th style={styles.th}>Description</th>
                  <th style={styles.th}>Amount</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} style={styles.tr}>
                    <td style={styles.td}>{formatDate(t.transaction_date)}</td>
                    <td style={styles.td}>{t.source}</td>
                    <td style={styles.td}>{t.description}</td>
                    <td style={{...styles.td, color: t.amount >= 0 ? '#28a745' : '#dc3545', fontWeight: 'bold'}}>
                      {formatCurrency(t.amount)}
                    </td>
                    <td style={styles.td}>{t.transaction_type || '-'}</td>
                    <td style={styles.td}>
                      {t.balance ? formatCurrency(t.balance) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  title: {
    fontSize: '28px',
    marginBottom: '20px',
    color: '#333',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  cardTitle: {
    fontSize: '20px',
    marginBottom: '15px',
    color: '#555',
  },
  subtitle: {
    fontSize: '16px',
    marginTop: '15px',
    marginBottom: '10px',
    color: '#666',
  },
  form: {
    marginBottom: '15px',
  },
  formGroup: {
    marginBottom: '15px',
  },
  label: {
    display: 'block',
    marginBottom: '5px',
    fontWeight: 'bold',
    color: '#555',
  },
  select: {
    width: '100%',
    padding: '10px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '4px',
  },
  input: {
    width: '100%',
    padding: '10px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '4px',
  },
  fileInput: {
    width: '100%',
    padding: '10px',
    fontSize: '14px',
  },
  fileName: {
    marginTop: '5px',
    fontSize: '14px',
    color: '#666',
  },
  button: {
    padding: '10px 20px',
    fontSize: '16px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
  },
  primaryButton: {
    backgroundColor: '#007bff',
    color: '#fff',
  },
  disabledButton: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed',
  },
  error: {
    padding: '10px',
    backgroundColor: '#f8d7da',
    color: '#721c24',
    borderRadius: '4px',
    marginTop: '15px',
  },
  success: {
    padding: '15px',
    backgroundColor: '#d4edda',
    color: '#155724',
    borderRadius: '4px',
    marginTop: '15px',
  },
  preview: {
    marginTop: '15px',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
    marginBottom: '15px',
  },
  summaryItem: {
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px',
  },
  summaryLabel: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '5px',
  },
  summaryValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
  },
  bySource: {
    marginTop: '15px',
  },
  sourceItem: {
    padding: '8px',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px',
    marginBottom: '5px',
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
    marginBottom: '15px',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },
  th: {
    backgroundColor: '#f8f9fa',
    padding: '12px',
    textAlign: 'left',
    borderBottom: '2px solid #dee2e6',
    fontWeight: 'bold',
    color: '#555',
  },
  tr: {
    borderBottom: '1px solid #dee2e6',
  },
  td: {
    padding: '12px',
  },
};

export default StatementUpload;
