const file = {getMetadata:jest.fn(),delete:jest.fn(),exists:jest.fn()};
jest.mock('@google-cloud/storage',()=>({Storage:jest.fn().mockImplementation(()=>({bucket:()=>({file:()=>file})}))}));
jest.mock('../../../database/connection.js',()=>({AppDataSource:{}}));
import {accountErasureStorage as storage} from '../account-erasure.http.js';

describe('erasure storage ownership and exact generation adapter',()=>{
  beforeEach(()=>jest.resetAllMocks());
  it('requires both owner proof and personal purpose before selecting a generation',async()=>{
    file.getMetadata.mockResolvedValue([{generation:'17',metadata:{o4o_owner_user_id:'other',o4o_asset_purpose:'personal'}}]);
    await expect(storage.generation('fixture','object','owner')).rejects.toMatchObject({code:'PERSONAL_FILE_OWNERSHIP_REVIEW_REQUIRED'});
    file.getMetadata.mockResolvedValue([{generation:'17',metadata:{o4o_owner_user_id:'owner',o4o_asset_purpose:'shared'}}]);
    await expect(storage.generation('fixture','object','owner')).rejects.toMatchObject({code:'PERSONAL_FILE_OWNERSHIP_REVIEW_REQUIRED'});
    expect(file.delete).not.toHaveBeenCalled();
  });
  it('selects the proven personal generation and requires it on delete',async()=>{
    file.getMetadata.mockResolvedValue([{generation:'17',metadata:{o4o_owner_user_id:'OWNER',o4o_asset_purpose:'personal'}}]);
    expect(await storage.generation('fixture','object','owner')).toBe('17');
    await storage.deleteGeneration('fixture','object','17');
    expect(file.delete).toHaveBeenCalledWith({ifGenerationMatch:'17'});
  });
  it('treats missing objects as absent but never a replacement generation as deleted',async()=>{
    file.getMetadata.mockRejectedValue({code:404});
    expect(await storage.generation('fixture','object','owner')).toBeNull();
    file.delete.mockRejectedValue({code:404});file.exists.mockResolvedValue([true]);
    await expect(storage.deleteGeneration('fixture','object','17')).rejects.toMatchObject({code:'PERSONAL_FILE_GENERATION_CHANGED'});
    file.exists.mockResolvedValue([false]);await storage.deleteGeneration('fixture','object','17');
  });
  it('fails closed on generation races, missing generation and transient storage failures',async()=>{
    file.delete.mockRejectedValue({code:412});
    await expect(storage.deleteGeneration('fixture','object','17')).rejects.toMatchObject({code:'PERSONAL_FILE_GENERATION_CHANGED'});
    file.getMetadata.mockResolvedValue([{metadata:{o4o_owner_user_id:'owner',o4o_asset_purpose:'personal'}}]);
    await expect(storage.generation('fixture','object','owner')).rejects.toMatchObject({code:'PERSONAL_FILE_GENERATION_REQUIRED'});
    file.getMetadata.mockRejectedValue({code:503});await expect(storage.generation('fixture','object','owner')).rejects.toMatchObject({code:503});
  });
});
