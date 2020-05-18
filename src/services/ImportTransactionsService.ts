import { getCustomRepository, getRepository, In } from 'typeorm';
import csvParse from 'csv-parse';
import fs from 'fs';

/**
 * In busca o dados do db de uma vez só
 */
import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionRepository from '../repositories/TransactionsRepository';

interface CSVtransaction {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}
class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    // TODO
    const transactionRepository = getCustomRepository(TransactionRepository);
    const categoryRepository = getRepository(Category);

    const contactReadStream = fs.createReadStream(filePath);
    // busca
    const pasers = csvParse({
      from_line: 2,
    });
    const parseCSV = contactReadStream.pipe(pasers);

    const transactions: CSVtransaction[] = [];
    const categories: string[] = [];

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      if (!title || !type || !value) return;

      categories.push(category);

      transactions.push({ title, type, value, category });
    });
    // espera o envento de end
    await new Promise(resolve => parseCSV.on('end', resolve));

    /** mapeando todas as categorias no banco de dados */

    const existentCategories = await categoryRepository.find({
      where: {
        title: In(categories),
      },
    });

    const existentCategoriesTiles = existentCategories.map(
      (category: Category) => category.title,
    );
    /** filtro de categories */
    const addCategoryTitles = categories
      .filter(category => !existentCategoriesTiles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);
    const newCategories = categoryRepository.create(
      addCategoryTitles.map(title => ({
        title,
      })),
    );

    await categoryRepository.save(newCategories);
    /** sabe quais categorias foram inseridas no db */

    const finalCategories = [...newCategories, ...existentCategories];

    const createdTransactions = transactionRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: finalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );
    await transactionRepository.save(createdTransactions);

    await fs.promises.unlink(filePath);

    return createdTransactions;

    // console.log(addCategoryTitles);
    // return { categories, transactions };
  }
}

export default ImportTransactionsService;
