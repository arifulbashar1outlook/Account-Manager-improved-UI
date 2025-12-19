
import { Transaction, Account } from '../types';

const TRANSACTIONS_KEY = 'smartspend_transactions_v2';
const ACCOUNTS_KEY = 'smartspend_accounts_v2';
const BAZAR_TEMPLATES_KEY = 'smartspend_bazar_templates_v2';
const TO_BUY_LIST_KEY = 'smartspend_to_buy_list_v2';

export const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'salary', name: 'EBL', color: '#6366f1', isDefault: true },
  { id: 'savings', name: 'Islami Bank', color: '#10b981', isDefault: true },
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
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
};

export const getStoredAccounts = (): Account[] => {
  try {
    const stored = localStorage.getItem(ACCOUNTS_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_ACCOUNTS;
  } catch (error) {
    return DEFAULT_ACCOUNTS;
  }
};

export const saveStoredAccounts = (accounts: Account[]): void => {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
};

export const getStoredBazarTemplates = (): string[] => {
  const stored = localStorage.getItem(BAZAR_TEMPLATES_KEY);
  return stored ? JSON.parse(stored) : ['Potato', 'Onion', 'Rice', 'Oil', 'Egg', 'Milk'];
};

export const saveStoredBazarTemplates = (templates: string[]): void => {
  localStorage.setItem(BAZAR_TEMPLATES_KEY, JSON.stringify(templates));
};

export const getStoredToBuyList = (): string[] => {
  const stored = localStorage.getItem(TO_BUY_LIST_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveStoredToBuyList = (list: string[]): void => {
  localStorage.setItem(TO_BUY_LIST_KEY, JSON.stringify(list));
};
