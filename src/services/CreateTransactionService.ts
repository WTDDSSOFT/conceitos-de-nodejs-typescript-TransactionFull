import { getCustomRepository, getRepository } from 'typeorm';
import AppError from '../errors/AppError';

import Transaction from '../models/Transaction';

import TransactionsRepository from '../repositories/TransactionsRepository';

import Category from '../models/Category';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}
class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    // TODO
    const transationsRepository = getCustomRepository(TransactionsRepository);
    const categoryRepository = getRepository(Category);

    const { total } = await transationsRepository.getBalance();

    if (type === 'outcome' && total < value) {
      throw new AppError('You do not have enough balence');
    }
    // verifica se a category n exist e cria
    let transactionCategory = await categoryRepository.findOne({
      where: {
        title: category,
      },
    });

    if (!transactionCategory) {
      transactionCategory = categoryRepository.create({
        title: category,
      });

      await categoryRepository.save(transactionCategory);
    }

    // criando no db
    const transaction = transationsRepository.create({
      title,
      value,
      type,
      category: transactionCategory,
    });
    // salvando no db
    await transationsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
