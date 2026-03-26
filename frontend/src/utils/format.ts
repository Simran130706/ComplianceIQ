export const formatINR = (usdAmount: number) => {
  // Multiply the original USD amount by 83 exactly once as requested
  // Rounding to nearest integer to avoid fractional Indian Paisa in grouping
  const inr = Math.round(usdAmount * 83);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(inr);
};

export const getRiskLevel = (usdAmount: number) => {
  const inr = Math.round(usdAmount * 83);
  if (inr > 2000000) return 'Critical';
  if (inr > 830000) return 'High';
  if (inr >= 415000) return 'Medium';
  return 'Low';
};

export const getRiskColor = (level: string) => {
  switch(level) {
    case 'Critical': return 'bg-rose-500 text-white';
    case 'High': return 'bg-amber-500 text-white';
    case 'Medium': return 'bg-[#A8E6CF] text-[#2D5A4C]';
    case 'Low': return 'bg-slate-100 text-slate-500';
    default: return 'bg-slate-100 text-slate-500';
  }
};
