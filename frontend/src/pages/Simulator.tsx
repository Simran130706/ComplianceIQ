import React, { useState, useMemo, useRef } from 'react';
import { AlertTriangle, CheckCircle, Cpu, Play, Upload, FileText, TrendingUp, TrendingDown, AlertCircle, BarChart3, Table } from 'lucide-react';
import { useData } from '../context/DataContext';
import { formatINR } from '../utils/format';
import { motion, AnimatePresence } from 'framer-motion';
import Papa from 'papaparse';

interface SimulationResults {
  predictedNewViolations: number;
  transactionsCleared: number;
  perSliderBreakdown: {
    aml: number;
    cash: number;
    structuring: number;
  };
  branchImpact: Array<{
    branch: string;
    current: number;
    predicted: number;
    delta: number;
  }>;
  inflationPercentage: number;
  isCriticalInflation: boolean;
  safeThresholds: {
    aml: number;
    cash: number;
    structuring: number;
  };
  currentViolations: {
    aml: number;
    cash: number;
    structuring: number;
    total: number;
  };
  predictedViolations: {
    aml: number;
    cash: number;
    structuring: number;
    total: number;
  };
}

interface ThresholdConfig {
  aml: number;
  cash: number;
  structuring: number;
}

export const Simulator: React.FC = () => {
  const { transactions } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Data source management
  const [dataSource, setDataSource] = useState<'existing' | 'uploaded'>('existing');
  const [uploadedTransactions, setUploadedTransactions] = useState<any[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  
  // Threshold configurations (updated to match requirements)
  const [currentThresholds] = useState<ThresholdConfig>({
    aml: 1000000, // ₹10 Lakh
    cash: 500000,  // ₹5 Lakh
    structuring: 300000 // ₹3 Lakh
  });
  
  const [proposedThresholds, setProposedThresholds] = useState<ThresholdConfig>({
    aml: 1000000,
    cash: 500000,
    structuring: 300000
  });
  
  // Simulation state
  const [simulationResults, setSimulationResults] = useState<SimulationResults | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Simple INR formatter for values already in INR
  const formatINRValue = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Helper function to get branch name from transaction
  const getBranchName = (transaction: any) => {
    // Use actual bank code from transaction data
    const bankCode = transaction['From Bank'];
    return bankCode ? `Bank-${bankCode}` : 'Unassigned';
  };

  // Calculate violations for given thresholds
  const calculateViolations = (transactionData: any[], thresholds: ThresholdConfig) => {
    const violations = {
      aml: 0,
      cash: 0,
      structuring: 0,
      total: 0
    };

    transactionData.forEach((transaction) => {
      // Convert USD amount to INR (multiply by 83)
      const amountUSD = transaction['Amount Paid'] || 0;
      const amountINR = amountUSD * 83;
      const isCash = (transaction['Payment Format'] || '').toUpperCase() === 'CASH';
      
      // AML violations (any transaction amount exceeding AML threshold)
      if (amountINR > thresholds.aml) {
        violations.aml++;
      }
      
      // Cash transaction violations (cash transactions exceeding cash threshold)
      if (amountINR > thresholds.cash && isCash) {
        violations.cash++;
      }
      
      // Structuring violations (transactions within 10% below structuring threshold)
      const structuringLowerBound = thresholds.structuring * 0.9;
      if (amountINR >= structuringLowerBound && amountINR < thresholds.structuring) {
        violations.structuring++;
      }
    });

    violations.total = violations.aml + violations.cash + violations.structuring;
    return violations;
  };

  // Calculate branch-level impact
  const calculateBranchImpact = (transactionData: any[], currentThresh: ThresholdConfig, proposedThresh: ThresholdConfig) => {
    const branchMap = new Map<string, { current: number; predicted: number }>();
    
    transactionData.forEach(transaction => {
      const branch = getBranchName(transaction);
      // Convert USD amount to INR (multiply by 83)
      const amountUSD = transaction['Amount Paid'] || 0;
      const amountINR = amountUSD * 83;
      const isCash = (transaction['Payment Format'] || '').toUpperCase() === 'CASH';
      
      if (!branchMap.has(branch)) {
        branchMap.set(branch, { current: 0, predicted: 0 });
      }
      
      const branchData = branchMap.get(branch)!;
      
      // Current violations
      const currentAmlViolation = amountINR > currentThresh.aml;
      const currentCashViolation = amountINR > currentThresh.cash && isCash;
      const currentStructuringViolation = amountINR >= (currentThresh.structuring * 0.9) && amountINR < currentThresh.structuring;
      if (currentAmlViolation || currentCashViolation || currentStructuringViolation) {
        branchData.current++;
      }
      
      // Predicted violations
      const proposedAmlViolation = amountINR > proposedThresh.aml;
      const proposedCashViolation = amountINR > proposedThresh.cash && isCash;
      const proposedStructuringViolation = amountINR >= (proposedThresh.structuring * 0.9) && amountINR < proposedThresh.structuring;
      if (proposedAmlViolation || proposedCashViolation || proposedStructuringViolation) {
        branchData.predicted++;
      }
    });
    
    // Convert to array and sort by delta (highest impact first)
    const impact = Array.from(branchMap.entries())
      .map(([branch, data]) => ({
        branch,
        current: data.current,
        predicted: data.predicted,
        delta: data.predicted - data.current
      }))
      .filter(item => item.branch !== 'Unassigned') // Skip unassigned branches
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    
    return impact;
  };

  // Calculate safe thresholds
  const calculateSafeThresholds = (transactionData: any[], currentThresh: ThresholdConfig, maxInflation: number = 100) => {
    const currentViolations = calculateViolations(transactionData, currentThresh);
    const maxAllowedViolations = Math.ceil(currentViolations.total * (1 + maxInflation / 100));
    
    const safeThresholds = { ...currentThresh };
    const stepSize = 50000; // ₹50K steps
    
    // Test each threshold type
    (['aml', 'cash', 'structuring'] as const).forEach(type => {
      let testThreshold = currentThresh[type];
      
      // Try reducing threshold until we hit the limit
      while (testThreshold > stepSize) {
        testThreshold -= stepSize;
        const testConfig = { ...currentThresh, [type]: testThreshold };
        const testViolations = calculateViolations(transactionData, testConfig);
        
        if (testViolations.total > maxAllowedViolations) {
          safeThresholds[type] = testThreshold + stepSize; // Go back to safe level
          break;
        }
      }
    });
    
    return safeThresholds;
  };

  // Get current transaction data based on source
  const currentTransactionData = dataSource === 'uploaded' ? uploadedTransactions : transactions;

  // Calculate current violations
  const currentViolations = useMemo(() => {
    return calculateViolations(currentTransactionData, currentThresholds);
  }, [currentTransactionData, currentThresholds]);

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setUploadedFileName(file.name);
    
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        const filtered = results.data.filter((t: any) => t && t.Timestamp);
        setUploadedTransactions(filtered);
      },
      error: (err: any) => {
        console.error('CSV parsing error:', err);
        alert('Failed to parse CSV file. Please check the format.');
      }
    });
  };

  // Run simulation
  const runSimulation = async () => {
    setIsSimulating(true);
    setShowToast(false);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Calculate current violations
    const currentViolations = calculateViolations(currentTransactionData, currentThresholds);
    
    // Calculate predicted violations
    const predictedViolations = calculateViolations(currentTransactionData, proposedThresholds);
    
    // Calculate new violations and cleared transactions
    let newViolations = 0;
    let transactionsCleared = 0;
    
    currentTransactionData.forEach(transaction => {
      // Convert USD amount to INR (multiply by 83)
      const amountUSD = transaction['Amount Paid'] || 0;
      const amountINR = amountUSD * 83;
      const isCash = (transaction['Payment Format'] || '').toUpperCase() === 'CASH';
      
      // Check current violations
      const currentAmlViolation = amountINR > currentThresholds.aml;
      const currentCashViolation = amountINR > currentThresholds.cash && isCash;
      const currentStructuringViolation = amountINR >= (currentThresholds.structuring * 0.9) && amountINR < currentThresholds.structuring;
      const currentlyViolating = currentAmlViolation || currentCashViolation || currentStructuringViolation;
      
      // Check proposed violations
      const proposedAmlViolation = amountINR > proposedThresholds.aml;
      const proposedCashViolation = amountINR > proposedThresholds.cash && isCash;
      const proposedStructuringViolation = amountINR >= (proposedThresholds.structuring * 0.9) && amountINR < proposedThresholds.structuring;
      const proposedViolating = proposedAmlViolation || proposedCashViolation || proposedStructuringViolation;
      
      // Count new violations and cleared transactions
      if (!currentlyViolating && proposedViolating) {
        newViolations++;
      } else if (currentlyViolating && !proposedViolating) {
        transactionsCleared++;
      }
    });
    
    // Calculate branch impact
    const branchImpact = calculateBranchImpact(currentTransactionData, currentThresholds, proposedThresholds);
    
    // Calculate safe thresholds
    const safeThresholds = calculateSafeThresholds(currentTransactionData, currentThresholds, currentViolations.total);
    
    // Calculate inflation percentage
    const inflationPercentage = currentViolations.total > 0 
      ? ((predictedViolations.total - currentViolations.total) / currentViolations.total) * 100 
      : 0;
    
    const isCriticalInflation = inflationPercentage > 100;
    
    setSimulationResults({
      predictedNewViolations: newViolations,
      transactionsCleared,
      perSliderBreakdown: {
        aml: predictedViolations.aml,
        cash: predictedViolations.cash,
        structuring: predictedViolations.structuring
      },
      branchImpact,
      inflationPercentage,
      isCriticalInflation,
      safeThresholds,
      currentViolations,
      predictedViolations
    });
    
    setIsSimulating(false);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const isCriticalInflation = simulationResults?.inflationPercentage && simulationResults.inflationPercentage > 100;
  const maxVal = Math.max(
    simulationResults?.currentViolations?.total || 0, 
    simulationResults?.predictedViolations?.total || 0, 
    10
  );

  const handleApply = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Threshold slider component
  const ThresholdSlider = ({ 
    label, 
    value, 
    onChange, 
    min, 
    max, 
    step,
    currentValue
  }: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    min: number;
    max: number;
    step: number;
    currentValue: number;
  }) => (
    <div className="glass-card p-8 mb-6">
      <div className="flex justify-between items-end mb-6">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
        <div className="flex gap-8 items-end">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Current</span>
            <span className="text-2xl font-black text-slate-400 tracking-tighter">{formatINRValue(currentValue)}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-[#A8E6CF] uppercase tracking-widest mb-1">Proposed</span>
            <span className="text-3xl font-black text-slate-800 tracking-tighter">{formatINRValue(value)}</span>
          </div>
        </div>
      </div>
      
      <input 
        type="range" 
        min={min} 
        max={max} 
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2.5 bg-slate-100 rounded-full appearance-none outline-none cursor-pointer accent-[#A8E6CF]"
      />
      
      <div className="flex justify-between text-[9px] font-black text-slate-300 uppercase tracking-widest mt-2">
        <span>More Lenient</span>
        <span>Stricter</span>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-10 w-full mx-auto pb-20">
      
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="p-5 rounded-3xl bg-white shadow-xl border border-slate-100">
          <Cpu className="w-10 h-10 text-[#A8E6CF]" />
        </div>
        <div className="space-y-2">
           <h2 className="text-5xl font-black text-slate-800 tracking-tighter">What-If Prediction Simulator</h2>
           <p className="text-slate-500 font-medium text-lg leading-relaxed max-w-xl">Dry-run threshold manipulations against historical datasets before applying live-layer sanctions.</p>
        </div>
      </div>

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-card p-12 shadow-2xl shadow-emerald-900/[0.04] bg-white/70 border-slate-50">
        
        {/* Data Source Toggle */}
        <div className="flex flex-col gap-4 mb-8">
           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Data Source</label>
           <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setDataSource('existing')}
                className={`p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-3 ${
                  dataSource === 'existing' 
                    ? 'bg-[#A8E6CF]/20 border-[#A8E6CF] text-[#2D5A4C]' 
                    : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-8 h-8" />
                <span className="font-black text-sm uppercase tracking-widest">Existing Data</span>
                <span className="text-[10px] opacity-70">{transactions.length} transactions</span>
              </button>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-3 relative ${
                  dataSource === 'uploaded' 
                    ? 'bg-[#A8E6CF]/20 border-[#A8E6CF] text-[#2D5A4C]' 
                    : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'
                }`}
              >
                <Upload className="w-8 h-8" />
                <span className="font-black text-sm uppercase tracking-widest">Upload CSV</span>
                <span className="text-[10px] opacity-70">
                  {uploadedFileName || 'Choose file'}
                </span>
                {uploadedFileName && (
                  <span className="text-[10px] text-[#A8E6CF]">{uploadedTransactions.length} transactions</span>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </button>
           </div>
        </div>

        {/* Threshold Sliders */}
        <div className="mb-8">
          <h3 className="text-lg font-black text-slate-800 mb-6">Configure Threshold Adjustments</h3>
          
          <ThresholdSlider
            label="AML Transaction Threshold"
            value={proposedThresholds.aml}
            onChange={(value) => setProposedThresholds(prev => ({ ...prev, aml: value }))}
            min={100000}
            max={5000000}
            step={100000}
            currentValue={currentThresholds.aml}
          />
          
          <ThresholdSlider
            label="Cash Transaction Threshold"
            value={proposedThresholds.cash}
            onChange={(value) => setProposedThresholds(prev => ({ ...prev, cash: value }))}
            min={50000}
            max={2000000}
            step={50000}
            currentValue={currentThresholds.cash}
          />
          
          <ThresholdSlider
            label="Structuring Threshold"
            value={proposedThresholds.structuring}
            onChange={(value) => setProposedThresholds(prev => ({ ...prev, structuring: value }))}
            min={50000}
            max={1000000}
            step={50000}
            currentValue={currentThresholds.structuring}
          />
        </div>

        {/* Run Simulation Button */}
        <div className="flex justify-center mb-12">
          <button 
            onClick={runSimulation}
            disabled={isSimulating || currentTransactionData.length === 0}
            className="h-20 px-16 bg-[#2D5A4C] text-white rounded-[2rem] font-black text-xl shadow-2xl shadow-emerald-900/10 hover:-translate-y-1 transition-all flex items-center justify-center gap-4 active:scale-95 group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {isSimulating ? (
              <>
                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                SIMULATING...
              </>
            ) : (
                           <>
                <Play className="w-6 h-6 stroke-[3px] fill-white group-hover:scale-125 transition-transform" />
                RUN SIMULATION
              </>
            )}
          </button>
        </div>

        {/* Current Status Overview */}
        <div className="grid grid-cols-3 gap-8 mb-12">
          <div className="bg-slate-50/50 p-6 rounded-[2rem] flex flex-col items-center text-center border border-slate-100">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">AML Violations</h4>
            <span className="text-4xl font-black text-slate-600 tracking-tighter">{currentViolations.aml}</span>
          </div>
          <div className="bg-slate-50/50 p-6 rounded-[2rem] flex flex-col items-center text-center border border-slate-100">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Cash Violations</h4>
            <span className="text-4xl font-black text-slate-600 tracking-tighter">{currentViolations.cash}</span>
          </div>
          <div className="bg-slate-50/50 p-6 rounded-[2rem] flex flex-col items-center text-center border border-slate-100">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Structuring</h4>
            <span className="text-4xl font-black text-slate-600 tracking-tighter">{currentViolations.structuring}</span>
          </div>
        </div>

        {/* Simulation Results */}
        <AnimatePresence>
          {simulationResults && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-8">
                <div className="bg-rose-50/50 p-8 rounded-[2.5rem] flex flex-col items-center text-center border-2 border-rose-100">
                  <TrendingUp className="w-8 h-8 text-rose-500 mb-4" />
                  <h3 className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-3">New Violations</h3>
                  <span className="text-5xl font-black text-rose-600 tracking-tighter">{simulationResults.predictedNewViolations}</span>
                  <p className="text-[10px] font-black text-rose-300 mt-3 uppercase tracking-widest">Additional Flags</p>
                </div>
                <div className="bg-emerald-50/50 p-8 rounded-[2.5rem] flex flex-col items-center text-center border-2 border-emerald-100">
                  <TrendingDown className="w-8 h-8 text-emerald-600 mb-4" />
                  <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3">Transactions Cleared</h3>
                  <span className="text-5xl font-black text-emerald-700 tracking-tighter">{simulationResults.transactionsCleared}</span>
                  <p className="text-[10px] font-black text-emerald-500 mt-3 uppercase tracking-widest">Resolved Cases</p>
                </div>
              </div>

              {/* Per-Slider Breakdown */}
              <div className="glass-card p-8">
                <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-3">
                  <BarChart3 className="w-6 h-6 text-[#A8E6CF]" />
                  Per-Rule Impact Breakdown
                </h3>
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center p-6 bg-slate-50 rounded-2xl">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">AML</h4>
                    <span className="text-3xl font-black text-slate-700">{simulationResults.perSliderBreakdown.aml}</span>
                  </div>
                  <div className="text-center p-6 bg-slate-50 rounded-2xl">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Cash</h4>
                    <span className="text-3xl font-black text-slate-700">{simulationResults.perSliderBreakdown.cash}</span>
                  </div>
                  <div className="text-center p-6 bg-slate-50 rounded-2xl">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Structuring</h4>
                    <span className="text-3xl font-black text-slate-700">{simulationResults.perSliderBreakdown.structuring}</span>
                  </div>
                </div>
              </div>

              {/* Branch Impact Table */}
              {simulationResults.branchImpact.length > 0 && (
                <div className="glass-card p-8">
                  <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-3">
                    <Table className="w-6 h-6 text-[#A8E6CF]" />
                    Branch-Level Impact Analysis
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Branch</th>
                          <th className="text-right py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Current</th>
                          <th className="text-right py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Predicted</th>
                          <th className="text-right py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Delta</th>
                        </tr>
                      </thead>
                      <tbody>
                        {simulationResults.branchImpact.map((branch, index) => (
                          <tr key={index} className="border-b border-slate-100 last:border-b-0">
                            <td className="py-3 px-4 font-medium text-slate-700">{branch.branch}</td>
                            <td className="py-3 px-4 text-right text-slate-600">{branch.current}</td>
                            <td className="py-3 px-4 text-right text-slate-600">{branch.predicted}</td>
                            <td className={`py-3 px-4 text-right font-black ${
                              branch.delta > 0 ? 'text-rose-600' : branch.delta < 0 ? 'text-emerald-600' : 'text-slate-500'
                            }`}>
                              {branch.delta > 0 ? '+' : ''}{branch.delta}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Side-by-Side Comparison Chart */}
              <div className="glass-card p-8">
                <h3 className="text-lg font-black text-slate-800 mb-8">Current vs Predicted Violations</h3>
                <div className="flex items-end justify-center gap-12 h-64 pb-4">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-24 bg-slate-200 rounded-[1rem] relative flex items-end justify-center transition-all duration-1000" 
                         style={{ height: `${(simulationResults.currentViolations.total / maxVal) * 100}%` }}>
                      <span className="absolute -top-8 text-sm font-black text-slate-600">{simulationResults.currentViolations.total}</span>
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current</span>
                  </div>
                  <div className="flex flex-col items-center gap-4">
                    <div className={`w-24 rounded-[1rem] relative flex items-end justify-center transition-all duration-1000 ${
                      simulationResults.isCriticalInflation ? 'bg-rose-500' : 'bg-[#A8E6CF]'
                    }`} 
                         style={{ height: `${(simulationResults.predictedViolations.total / maxVal) * 100}%` }}>
                      <span className={`absolute -top-8 text-sm font-black ${
                        simulationResults.isCriticalInflation ? 'text-rose-600' : 'text-[#2D5A4C]'
                      }`}>
                        {simulationResults.predictedViolations.total}
                      </span>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Predicted</span>
                  </div>
                </div>
              </div>

              {/* Operational Risk Warning */}
              {isCriticalInflation && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  className="bg-rose-50 border-2 border-rose-200 rounded-[2rem] p-8 flex items-start gap-6"
                >
                  <div className="p-3 bg-white rounded-2xl shadow-sm">
                    <AlertTriangle className="w-6 h-6 shrink-0 text-rose-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-black tracking-tight mb-3 text-rose-600 uppercase">Critical Operational Inflation Warning</p>
                    <p className="text-sm font-bold text-rose-500 leading-relaxed mb-6">
                      This threshold adjustment will increase investigation volume by <span className="text-rose-700 font-extrabold">{simulationResults.inflationPercentage.toFixed(1)}%</span>. Your compliance team does not have the bandwidth to investigate this volume.
                    </p>
                    
                    <div className="bg-white/70 p-6 rounded-2xl">
                      <h4 className="text-sm font-black text-slate-700 mb-4 uppercase tracking-widest">Safe Threshold Suggestions</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-slate-50 rounded-xl">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">AML</div>
                          <div className="text-lg font-black text-slate-700">{formatINR(simulationResults.safeThresholds.aml)}</div>
                        </div>
                        <div className="text-center p-4 bg-slate-50 rounded-xl">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cash</div>
                          <div className="text-lg font-black text-slate-700">{formatINR(simulationResults.safeThresholds.cash)}</div>
                        </div>
                        <div className="text-center p-4 bg-slate-50 rounded-xl">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Structuring</div>
                          <div className="text-lg font-black text-slate-700">{formatINR(simulationResults.safeThresholds.structuring)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Non-Critical Inflation Notice */}
              {!isCriticalInflation && simulationResults.inflationPercentage > 0 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  className="bg-amber-50 border border-amber-200 rounded-[2rem] p-6 flex items-start gap-4"
                >
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-1" />
                  <div>
                    <p className="text-sm font-black text-amber-700 uppercase tracking-widest">Moderate Impact Detected</p>
                    <p className="text-sm text-amber-600 mt-1">
                      Investigation volume will increase by {simulationResults.inflationPercentage.toFixed(1)}%. This is within manageable operational capacity.
                    </p>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-center">
          <button 
            onClick={handleApply}
            className="h-20 px-16 bg-[#2D5A4C] text-white rounded-[2rem] font-black text-xl shadow-2xl shadow-emerald-900/10 hover:-translate-y-1 transition-all flex items-center justify-center gap-4 active:scale-95 group"
          >
            <Play className="w-6 h-6 stroke-[3px] fill-white group-hover:scale-125 transition-transform" />
            LIVE COMMIT THRESHOLD
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {showToast && (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: -40, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="fixed bottom-0 self-center z-[300]">
            <div className="bg-[#A8E6CF] text-[#2D5A4C] px-10 py-5 rounded-[2rem] shadow-2xl shadow-emerald-500/20 flex items-center gap-4 border-2 border-white">
              <CheckCircle className="w-6 h-6 stroke-[3px]" />
              <span className="font-black text-sm uppercase tracking-widest">Simulation thresholds ready for policy review</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
