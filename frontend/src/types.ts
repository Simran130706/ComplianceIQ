export interface Transaction {
  Timestamp: string;
  'From Bank': number;
  Account: string;
  'To Bank': number;
  'Account.1': string;
  'Amount Received': number;
  'Receiving Currency': string;
  'Amount Paid': number;
  'Payment Currency': string;
  'Payment Format': string;
  'Is Laundering': number;
}

export interface Rule {
  clause_id: string;
  condition: string;
  requirement: string;
  exception: string | null;
  confidence: number;
  is_vague: boolean;
}
