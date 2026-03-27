import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import Papa from 'papaparse';
import type { Transaction, Rule } from '../types';

interface PolicyThresholds {
  aml: number;
  cash: number;
  structuring: number;
}

interface DataContextType {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  rules: Rule[];
  setRules: React.Dispatch<React.SetStateAction<Rule[]>>;
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  policiesAnalyzed: number;
  policyThresholds: PolicyThresholds | null;
  setPolicyThresholds: React.Dispatch<React.SetStateAction<PolicyThresholds | null>>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [policiesAnalyzed] = useState(1); // Default to 1
  const [policyThresholds, setPolicyThresholds] = useState<PolicyThresholds | null>(null);

  useEffect(() => {
    async function loadData() {
      console.log("Fetching /HI-Small_Trans_Demo.csv");
      try {
        const response = await fetch('/HI-Small_Trans_Demo.csv');
        if (!response.ok) throw new Error("HTTP error " + response.status);
        
        const csvText = await response.text();
        console.log("CSV fetched, size:", csvText.length);
        
        Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            console.log("PapaParse complete. Rows:", results.data.length);
            const filtered = (results.data as Transaction[]).filter(t => t && t.Timestamp);
            console.log("Filtered rows:", filtered.length);
            setTransactions(filtered);
            setLoading(false);
          },
          error: (err: any) => {
            console.error("PapaParse error:", err);
            setError("Parse error: " + err.message);
            setLoading(false);
          }
        });
      } catch (err: any) {
        console.error("Fetch error:", err);
        setError("Failed to fetch data: " + err.message);
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <DataContext.Provider value={{ 
      transactions, 
      loading, 
      error, 
      rules, 
      setRules, 
      setTransactions, 
      setLoading, 
      setError, 
      policiesAnalyzed,
      policyThresholds,
      setPolicyThresholds
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
