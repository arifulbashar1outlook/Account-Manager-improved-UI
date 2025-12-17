import { Transaction, Account } from '../types';

const TRANSACTIONS_KEY = 'smartspend_transactions_v1';
const ACCOUNTS_KEY = 'smartspend_accounts_v1';

export const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'salary', name: 'Salary Account', color: '#6366f1', isDefault: true },
  { id: 'savings', name: 'Savings Account', color: '#10b981', isDefault: true },
  { id: 'cash', name: 'Cash Wallet', color: '#f59e0b', isDefault: true }
];

export const getStoredTransactions = (): Transaction[] => {
  try {
    const stored = localStorage.getItem(TRANSACTIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Failed to load transactions", error);
    return [];
  }
};

export const saveStoredTransactions = (transactions: Transaction[]): void => {
  try {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
  } catch (error) {
    console.error("Failed to save transactions", error);
  }
};

export const getStoredAccounts = (): Account[] => {
  try {
    const stored = localStorage.getItem(ACCOUNTS_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_ACCOUNTS;
  } catch (error) {
    console.error("Failed to load accounts", error);
    return DEFAULT_ACCOUNTS;
  }
};

export const saveStoredAccounts = (accounts: Account[]): void => {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch (error) {
    console.error("Failed to save accounts", error);
  }
};