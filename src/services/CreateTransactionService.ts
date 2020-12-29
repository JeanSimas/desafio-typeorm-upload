import { getCustomRepository, getRepository } from 'typeorm';
import AppError from '../errors/AppError';

import Category from '../models/Category';
import Transaction from '../models/Transaction';

import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute ({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoryRepository = getRepository(Category);
    const balance = await (await transactionsRepository.getBalance()).total;

    // eslint-disable-next-line prettier/prettier
    if ((type === 'outcome') && ((balance - value) < 0)) {
      throw new AppError('Insuficient money to do this transaction');
    }

    const categoryExists = await categoryRepository.findOne({
      where: { title: category },
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let categoryId = '';
    if (categoryExists) {
      categoryId = categoryExists.id;
    } else {
      const categoryCreated = categoryRepository.create({
        title: category,
      });

      await categoryRepository.save(categoryCreated);
      categoryId = categoryCreated.id;
    }

    const transaction = transactionsRepository.create({
      title,
      value,
      type,
      category_id: categoryId,
    });

    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
