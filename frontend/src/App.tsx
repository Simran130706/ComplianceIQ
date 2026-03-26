import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider } from './context/DataContext';
import { Layout } from './components/Layout';

// Pages
import { Landing } from './pages/Landing';
import { Home } from './pages/Home';
import { Policies } from './pages/Policies';
import { Compliance } from './pages/Compliance';
import { Violations } from './pages/Violations';
import { Investigation } from './pages/Investigation';
import { Simulator } from './pages/Simulator';
import { RBIMonitor } from './pages/RBIMonitor';

const App: React.FC = () => {
  return (
    <DataProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Landing />} />
            <Route path="home" element={<Home />} />
            <Route path="policies" element={<Policies />} />
            <Route path="compliance" element={<Compliance />} />
            <Route path="violations" element={<Violations />} />
            <Route path="investigation" element={<Investigation />} />
            <Route path="simulator" element={<Simulator />} />
            <Route path="rbi-monitor" element={<RBIMonitor />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Router>
    </DataProvider>
  );
};

export default App;
