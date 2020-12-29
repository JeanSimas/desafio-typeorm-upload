import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}
interface Sum {
  income: number;
  outcome: number;
}
@EntityRepository(Transaction)
export default class TransactionsRepository extends Repository<Transaction> {
  public async getBalance (): Promise<Balance> {
    const sum: Sum = { income: 0, outcome: 0 };
    const transactions = await this.find();

    transactions.forEach(transaction => {
      if (transaction.type === 'income') {
        sum.income += Number(transaction.value);
      } else {
        sum.outcome += Number(transaction.value);
      }
    });

    const balance = {
      income: sum.income,
      outcome: sum.outcome,
      total: sum.income - sum.outcome,
    };

    return balance;
  }
}
