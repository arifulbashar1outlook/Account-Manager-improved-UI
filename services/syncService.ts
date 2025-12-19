
import { Transaction, Account } from '../types';

const SYNC_CONFIG_KEY = 'smartspend_sheets_sync_v1';

export interface SyncConfig {
  url: string;
  lastSynced?: string;
}

export const getSyncConfig = (): SyncConfig | null => {
  const stored = localStorage.getItem(SYNC_CONFIG_KEY);
  return stored ? JSON.parse(stored) : null;
};

export const saveSyncConfig = (config: SyncConfig) => {
  localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(config));
};

export const clearSyncConfig = () => {
  localStorage.removeItem(SYNC_CONFIG_KEY);
};

// No longer need complex merging for 'keep sheet only' policy
export const mergeFinancialData = (local: Transaction[], cloud: Transaction[]): Transaction[] => {
  return cloud; // Sheet is the single source of truth during pull
};

export const pushToSheets = async (
  transactions: Transaction[], 
  accounts: Account[],
  templates: string[],
  toBuyList: string[]
): Promise<boolean> => {
  if (!navigator.onLine) return false;
  const config = getSyncConfig();
  if (!config || !config.url) return false;

  // Enrich transactions with human-readable names for the spreadsheet
  const enrichedTransactions = transactions.map(t => {
    const acc = accounts.find(a => a.id === t.accountId);
    const targetAcc = t.targetAccountId ? accounts.find(a => a.id === t.targetAccountId) : null;
    return {
      ...t,
      accountName: acc ? acc.name : 'Unknown Wallet',
      targetAccountName: targetAcc ? targetAcc.name : ''
    };
  });

  try {
    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'push',
        transactions: enrichedTransactions,
        accounts,
        templates,
        toBuyList
      }),
    });
    
    if (!response.ok) throw new Error('Push failed');
    saveSyncConfig({ ...config, lastSynced: new Date().toISOString() });
    return true;
  } catch (error) {
    console.error('Push failed:', error);
    return false;
  }
};

export const pullFromSheets = async (): Promise<{ 
  transactions: Transaction[], 
  accounts: Account[],
  templates: string[],
  toBuyList: string[]
} | null> => {
  if (!navigator.onLine) return null;
  const config = getSyncConfig();
  if (!config || !config.url) return null;

  try {
    const response = await fetch(`${config.url}?action=pull`);
    if (!response.ok) throw new Error('Pull failed');
    const data = await response.json();
    
    if (data && data.transactions && data.accounts) {
       saveSyncConfig({ ...config, lastSynced: new Date().toISOString() });
       return {
         transactions: data.transactions,
         accounts: data.accounts,
         templates: data.templates || [],
         toBuyList: data.toBuyList || []
       };
    }
    return null;
  } catch (error) {
    console.error('Pull failed:', error);
    return null;
  }
};

export const GOOGLE_APPS_SCRIPT_CODE = `
/**
 * GOOGLE APPS SCRIPT FOR SMARTSPEND SYNC (v5 - Dual Column Logic)
 */
function doGet(e) {
  var action = e.parameter.action;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (action === 'pull') {
    var txSheet = ss.getSheetByName("Transactions");
    var accSheet = ss.getSheetByName("Accounts");
    var tmplSheet = ss.getSheetByName("BazarTemplates");
    var buySheet = ss.getSheetByName("ToBuyList");
    
    var transactions = [];
    if (txSheet && txSheet.getLastRow() > 1) {
      var data = txSheet.getDataRange().getValues();
      data.shift(); // Remove headers
      transactions = data.map(function(row) {
        // App only needs columns 0-7. Columns 8-9 (Names) are for human reading only.
        return {
          id: row[0], 
          date: row[1], 
          amount: Number(row[2]), 
          type: row[3], 
          category: row[4], 
          description: row[5], 
          accountId: row[6], 
          targetAccountId: row[7] || undefined
        };
      });
    }

    var accounts = [];
    if (accSheet && accSheet.getLastRow() > 1) {
      var data = accSheet.getDataRange().getValues();
      data.shift();
      accounts = data.map(function(row) {
        return {id: row[0], name: row[1], color: row[2]};
      });
    }

    var templates = [];
    if (tmplSheet && tmplSheet.getLastRow() > 0) {
      templates = tmplSheet.getDataRange().getValues().map(function(r) { return r[0]; });
    }

    var toBuyList = [];
    if (buySheet && buySheet.getLastRow() > 0) {
      toBuyList = buySheet.getDataRange().getValues().map(function(r) { return r[0]; });
    }

    var result = {
      transactions: transactions, 
      accounts: accounts,
      templates: templates,
      toBuyList: toBuyList
    };

    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput("Sync active").setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  var payload = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (payload.action === 'push') {
    // 1. Transactions - Enriched with Names for visibility
    var txSheet = ss.getSheetByName("Transactions") || ss.insertSheet("Transactions");
    txSheet.clear();
    txSheet.appendRow(["ID", "Date", "Amount", "Type", "Category", "Description", "AccountId", "TargetAccountId", "AccountName", "TargetAccountName"]);
    if (payload.transactions && payload.transactions.length > 0) {
      var rows = payload.transactions.map(function(t) {
        return [
          t.id, 
          t.date, 
          t.amount, 
          t.type, 
          t.category, 
          t.description, 
          t.accountId, 
          t.targetAccountId || "",
          t.accountName || "",
          t.targetAccountName || ""
        ];
      });
      txSheet.getRange(2, 1, rows.length, 10).setValues(rows);
      
      // Formatting for readability
      txSheet.getRange(1, 1, 1, 10).setFontWeight("bold").setBackground("#f3f4f6");
      txSheet.setFrozenRows(1);
    }

    // 2. Accounts
    var accSheet = ss.getSheetByName("Accounts") || ss.insertSheet("Accounts");
    accSheet.clear();
    accSheet.appendRow(["ID", "Name", "Color"]);
    if (payload.accounts && payload.accounts.length > 0) {
      var rows = payload.accounts.map(function(a) { return [a.id, a.name, a.color]; });
      accSheet.getRange(2, 1, rows.length, 3).setValues(rows);
      accSheet.getRange(1, 1, 1, 3).setFontWeight("bold").setBackground("#f3f4f6");
    }

    // 3. Bazar Templates
    var tmplSheet = ss.getSheetByName("BazarTemplates") || ss.insertSheet("BazarTemplates");
    tmplSheet.clear();
    if (payload.templates && payload.templates.length > 0) {
      var rows = payload.templates.map(function(t) { return [t]; });
      tmplSheet.getRange(1, 1, rows.length, 1).setValues(rows);
    }

    // 4. To Buy List
    var buySheet = ss.getSheetByName("ToBuyList") || ss.insertSheet("ToBuyList");
    buySheet.clear();
    if (payload.toBuyList && payload.toBuyList.length > 0) {
      var rows = payload.toBuyList.map(function(t) { return [t]; });
      buySheet.getRange(1, 1, rows.length, 1).setValues(rows);
    }

    return ContentService.createTextOutput(JSON.stringify({status: "success"})).setMimeType(ContentService.MimeType.JSON);
  }
}
`;
