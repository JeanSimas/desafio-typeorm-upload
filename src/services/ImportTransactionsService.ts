import fs from 'fs';
import csv from 'csv-parser';
import csvParse from 'csv-parse';
import path from 'path';
import { getCustomRepository, getRepository, In } from 'typeorm';
import uploadConfig from '../config/upload';
import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';
import CreateTransactionService from './CreateTransactionService';
import Category from '../models/Category';

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}
class ImportTransactionsService {
  async execute (importedDataFileName: string): Promise<Transaction[]> {
    const createTransactionService = new CreateTransactionService();
    const importedDataPath = path.join(
      uploadConfig.directory,
      importedDataFileName,
    );

    // const importedData: Transaction[] = [];
    // fs.createReadStream(importedDataPath)
    //   .pipe(csv({separator:', '}))
    //   .on('data', async data => {
    //     const { title, value, type, category } = data;

    //     const importedDataItem = await createTransactionService.execute({
    //       title,
    //       value,
    //       type,
    //       category,
    //     });

    //     importedData.push(importedDataItem);
    //   })
    //   .on('end', () => {
    //     console.log('CSV file successfully processed');
    //   });

    // console.log(importedData);

    const parser = csvParse({
      delimiter: ', ',
      from_line: 2,
    });
    const csvData: CSVTransaction[] = [];
    const categories: string[] = [];
    fs.createReadStream(importedDataPath)
      .pipe(parser)
      .on('data', async line => {
        const [title, type, value, category] = line;

        if (!title || !type || !value) return;
        categories.push(category);
        csvData.push({ title, type, value, category });
      });

    await new Promise(resolve => parser.on('end', resolve));

    const categoriesRepository = getRepository(Category);
    const existentCategories = await categoriesRepository.find({
      where: { title: In(categories) },
    });
    const existentCategoriesTitles = existentCategories.map(
      (category: Category) => category.title,
    );
    const addCategoryTitles = categories
      .filter(category => !existentCategoriesTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoriesRepository.create(
      addCategoryTitles.map(title => ({ title })),
    );

    await categoriesRepository.save(newCategories);
    const finalCategories = [...newCategories, ...existentCategories];

    const transactionRepository = getCustomRepository(TransactionsRepository);

    const createdTransactions = transactionRepository.create(
      csvData.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: finalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionRepository.save(createdTransactions);

    await fs.promises.unlink(importedDataPath);
    return createdTransactions;
  }
}

export default ImportTransactionsService;
