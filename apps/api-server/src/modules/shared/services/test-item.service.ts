import { AppDataSource } from '../../../database/connection.js';
import { BaseService } from '../../../common/base.service.js';
import { TestItem } from '../entities/TestItem.js';
import { NotFoundError } from '../../../common/middleware/error-handler.middleware.js';

class TestItemService extends BaseService<TestItem> {
  constructor() {
    super(AppDataSource.getRepository(TestItem));
  }

  /**
   * Find active test items
   */
  async findActive(): Promise<TestItem[]> {
    return this.repository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Increment value
   */
  async incrementValue(id: string): Promise<TestItem> {
    const item = await this.findById(id);

    if (!item) {
      throw new NotFoundError('TestItem');
    }

    item.value += 1;
    return this.repository.save(item);
  }
}

export const testItemService = new TestItemService();
