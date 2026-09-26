import 'fake-indexeddb/auto';
import { db } from '../src/lib/db';
import { reconstructCategories } from '../src/domain/categories';
export async function seedTestCategories(){
 await db.categories.bulkPut(reconstructCategories({settings:{expenseCategories:['food','rent','transport','other'],incomeCategories:['salary','gift']}}));
}

