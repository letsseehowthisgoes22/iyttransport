const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class AccountManager {
  constructor(accountsFile = './data/accounts.json') {
    this.accountsFile = accountsFile;
    this.accounts = [];
    this.currentAccountIndex = 0;
  }

  async initialize() {
    await this.loadAccounts();
  }

  async loadAccounts() {
    try {
      if (await fs.pathExists(this.accountsFile)) {
        const data = await fs.readJson(this.accountsFile);
        this.accounts = data.accounts || [];
      } else {
        await this.createDefaultAccountsFile();
      }
    } catch (error) {
      console.error('Error loading accounts:', error.message);
      this.accounts = [];
    }
  }

  async createDefaultAccountsFile() {
    const defaultData = {
      accounts: [
        {
          id: uuidv4(),
          username: 'example_user1',
          password: 'example_password1',
          email: 'user1@example.com',
          status: 'active',
          lastUsed: null,
          commentsPosted: 0,
          createdAt: new Date().toISOString(),
          notes: 'Example account - replace with real credentials'
        }
      ]
    };

    await fs.ensureDir(path.dirname(this.accountsFile));
    await fs.writeJson(this.accountsFile, defaultData, { spaces: 2 });
    this.accounts = defaultData.accounts;
  }

  async saveAccounts() {
    try {
      await fs.writeJson(this.accountsFile, { accounts: this.accounts }, { spaces: 2 });
    } catch (error) {
      console.error('Error saving accounts:', error.message);
    }
  }

  getActiveAccounts() {
    return this.accounts.filter(account => account.status === 'active');
  }

  getNextAccount() {
    const activeAccounts = this.getActiveAccounts();
    if (activeAccounts.length === 0) {
      return null;
    }

    const account = activeAccounts[this.currentAccountIndex % activeAccounts.length];
    this.currentAccountIndex = (this.currentAccountIndex + 1) % activeAccounts.length;
    
    return account;
  }

  async updateAccountUsage(accountId) {
    const account = this.accounts.find(acc => acc.id === accountId);
    if (account) {
      account.lastUsed = new Date().toISOString();
      account.commentsPosted = (account.commentsPosted || 0) + 1;
      await this.saveAccounts();
    }
  }

  async updateAccountStatus(accountId, status, notes = '') {
    const account = this.accounts.find(acc => acc.id === accountId);
    if (account) {
      account.status = status;
      if (notes) {
        account.notes = notes;
      }
      await this.saveAccounts();
    }
  }

  async addAccount(accountData) {
    const newAccount = {
      id: uuidv4(),
      username: accountData.username,
      password: accountData.password,
      email: accountData.email || '',
      status: 'active',
      lastUsed: null,
      commentsPosted: 0,
      createdAt: new Date().toISOString(),
      notes: accountData.notes || ''
    };

    this.accounts.push(newAccount);
    await this.saveAccounts();
    return newAccount;
  }

  async removeAccount(accountId) {
    this.accounts = this.accounts.filter(acc => acc.id !== accountId);
    await this.saveAccounts();
  }

  getAccountStats() {
    const total = this.accounts.length;
    const active = this.accounts.filter(acc => acc.status === 'active').length;
    const suspended = this.accounts.filter(acc => acc.status === 'suspended').length;
    const totalComments = this.accounts.reduce((sum, acc) => sum + (acc.commentsPosted || 0), 0);

    return {
      total,
      active,
      suspended,
      totalComments
    };
  }
}

module.exports = AccountManager;
