import { Repository } from 'typeorm';
import { AppDataSource } from '../database/connection';
import { User, UserRole, UserStatus, BusinessType } from '../entities/User';

export { User, UserRole, UserStatus, BusinessType };

export const getUserRepository = (): Repository<User> => {
  return AppDataSource.getRepository(User);
};

// Helper functions for backward compatibility
export const UserRepository = {
  find: (options?: any) => getUserRepository().find(options),
  findOne: (options: any) => getUserRepository().findOne(options),
  findById: (id: string) => getUserRepository().findOne({ where: { id } }),
  save: (user: User) => getUserRepository().save(user),
  create: (userData: any) => getUserRepository().create(userData),
  countDocuments: (filter: any) => getUserRepository().count({ where: filter }),
  findByIdAndUpdate: (id: string, updateData: any, options: any) => {
    return getUserRepository().update(id, updateData).then(() => 
      getUserRepository().findOne({ where: { id } })
    );
  },
  aggregate: async (pipeline: any[]) => {
    // MongoDB-style aggregation to PostgreSQL conversion
    const repository = getUserRepository();
    const queryBuilder = repository.createQueryBuilder('user');
    
    // Handle basic aggregation patterns
    for (const stage of pipeline) {
      if (stage.$group) {
        if (stage.$group._id === '$status') {
          const result = await queryBuilder
            .select('user.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .groupBy('user.status')
            .getRawMany();
          
          return result.map(r => ({ _id: r.status, count: parseInt(r.count) }));
        }
        
        if (stage.$group._id === '$businessInfo.businessType') {
          const result = await queryBuilder
            .select('user.businessInfo->>\'businessType\'', 'businessType')
            .addSelect('COUNT(*)', 'count')
            .where('user.status = :status', { status: 'approved' })
            .groupBy('user.businessInfo->>\'businessType\'')
            .getRawMany();
          
          return result.map(r => ({ _id: r.businessType, count: parseInt(r.count) }));
        }
      }
    }
    
    return [];
  }
};
