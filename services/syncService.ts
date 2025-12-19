
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

export const mergeFinancialData = (local: Transaction[], cloud: Transaction[]): Transaction[] => {
  const mergedMap = new Map<string, Transaction>();
  local.forEach(t => mergedMap.set(t.id, t));
  cloud.forEach(t => {
    if (!mergedMap.has(t.id)) {
      mergedMap.set(t.id, t);
    }
  });
  return Array.from(mergedMap.values()).sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
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

  try {
    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'push',
        transactions,
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
 * GOOGLE APPS SCRIPT FOR SMARTSPEND SYNC (v2 - Multi-Device Full Sync)
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
      data.shift();
      transactions = data.map(function(row) {
        return {id: row[0], date: row[1], amount: Number(row[2]), type: row[3], category: row[4], description: row[5], accountId: row[6], targetAccountId: row[7] || undefined};
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
    // 1. Transactions
    var txSheet = ss.getSheetByName("Transactions") || ss.insertSheet("Transactions");
    txSheet.clear();
    txSheet.appendRow(["ID", "Date", "Amount", "Type", "Category", "Description", "AccountId", "TargetAccountId"]);
    if (payload.transactions && payload.transactions.length > 0) {
      var rows = payload.transactions.map(function(t) {
        return [t.id, t.date, t.amount, t.type, t.category, t.description, t.accountId, t.targetAccountId || ""];
      });
      txSheet.getRange(2, 1, rows.length, 8).setValues(rows);
    }

    // 2. Accounts
    var accSheet = ss.getSheetByName("Accounts") || ss.insertSheet("Accounts");
    accSheet.clear();
    accSheet.appendRow(["ID", "Name", "Color"]);
    if (payload.accounts && payload.accounts.length > 0) {
      var rows = payload.accounts.map(function(a) { return [a.id, a.name, a.color]; });
      accSheet.getRange(2, 1, rows.length, 3).setValues(rows);
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
