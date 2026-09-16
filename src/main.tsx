import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// No StrictMode: effect double-invocation would double-seed local databases
// in development and complicate gesture-bound listeners. Production behavior
// is identical.
const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(<App />);
}
