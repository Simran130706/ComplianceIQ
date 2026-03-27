export interface FilterIntent {
  type: 'risk' | 'amount' | 'pattern' | 'employee' | 'combined';
  label: string;
  filters: {
    risk?: string[];
    minAmount?: number;
    isLaundering?: boolean;
    employeeId?: string;
    text?: string;
  };
}

export const QueryEngine = {
  preprocess: (query: string): string => {
    return query.toLowerCase()
      .replace(/\b(show|find|list|me|all|filter|get)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  },

  parse: (input: string): FilterIntent | null => {
    const query = QueryEngine.preprocess(input);
    if (!query) return null;

    const intent: FilterIntent = {
      type: 'combined',
      label: '',
      filters: {}
    };

    let matched = false;
    const labels: string[] = [];

    // 1. Risk Intent
    if (/\b(high risk|priority|critical)\b/.test(query)) {
      intent.filters.risk = ['High', 'Critical'];
      labels.push('High Risk');
      matched = true;
    }

    // 2. Amount Intent (Above/Greater)
    const aboveMatch = query.match(/(?:above|greater than|more than)\s*(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)\s*(lakh|l|cr|k)?/);
    if (aboveMatch) {
      let val = parseFloat(aboveMatch[1].replace(/,/g, ''));
      const unit = aboveMatch[2];
      
      if (unit === 'lakh' || unit === 'l') val *= 100000;
      else if (unit === 'cr') val *= 10000000;
      else if (unit === 'k') val *= 1000;
      
      // Convert to USD/Demo units if necessary (Demo data is in USD-like small numbers)
      // The demo data amount is e.g. 1000, 5000. 
      // If user says "10 lakh", we should probably scale it or assume the user knows the demo scale.
      // Based on Violations.tsx: (t['Amount Paid'] * 83) > val
      intent.filters.minAmount = val / 83; 
      labels.push(`> ₹${val.toLocaleString()}`);
      matched = true;
    }

    // 3. Pattern Intent (Structuring)
    if (/\b(structuring|smurfing|suspects)\b/.test(query)) {
      intent.filters.isLaundering = true;
      labels.push('Structuring Suspects');
      matched = true;
    }

    // 4. Employee Intent
    const empMatch = query.match(/emp-(\d+)/);
    if (empMatch) {
      intent.filters.employeeId = empMatch[1];
      labels.push(`EMP-${empMatch[1]}`);
      matched = true;
    }

    if (!matched) return null;

    intent.label = labels.join(' + ');
    return intent;
  }
};
