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
  obligation: string;
  exception: string | null;
  section_ref: string;
  confidence: number;
  parent_id?: string | null;
}
