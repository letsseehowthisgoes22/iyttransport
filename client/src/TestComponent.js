import React, { useState } from 'react';

const TestComponent = () => {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState('React hooks test');

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h2>React Hooks Test</h2>
      <p>{message}</p>
      <p>Count: {count}</p>
      <button 
        onClick={() => setCount(count + 1)}
        style={{ 
          padding: '10px 20px', 
          margin: '10px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Increment
      </button>
      <button 
        onClick={() => setMessage('useState is working!')}
        style={{ 
          padding: '10px 20px', 
          margin: '10px',
          backgroundColor: '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Update Message
      </button>
    </div>
  );
};

export default TestComponent;
