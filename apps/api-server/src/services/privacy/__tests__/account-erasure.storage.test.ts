const file = {getMetadata:jest.fn(),delete:jest.fn(),exists:jest.fn()};
const selectFile = jest.fn(() => file);
jest.mock('@google-cloud/storage',()=>({Storage:jest.fn().mockImplementation(()=>({bucket:()=>({file:selectFile})}))}));
jest.mock('../../../database/connection.js',()=>({AppDataSource:{}}));
import {accountErasureStorage as storage} from '../account-erasure.http.js';

const owned = () => ({generation:'17',metageneration:'3',metadata:{o4o_owner_user_id:'OWNER',o4o_asset_purpose:'personal'}});
describe('erasure storage ownership and exact generation adapter',()=>{
  beforeEach(()=>jest.clearAllMocks());
  beforeEach(()=>{file.getMetadata.mockReset();file.delete.mockReset();file.exists.mockReset();file.getMetadata.mockResolvedValue([owned()]);});
  it('requires both owner proof and personal purpose before selecting a generation',async()=>{
    file.getMetadata.mockResolvedValue([{...owned(),metadata:{o4o_owner_user_id:'other',o4o_asset_purpose:'personal'}}]);
    await expect(storage.generation('fixture','object','owner')).rejects.toMatchObject({code:'PERSONAL_FILE_OWNERSHIP_REVIEW_REQUIRED'});
    file.getMetadata.mockResolvedValue([{...owned(),metadata:{o4o_owner_user_id:'owner',o4o_asset_purpose:'shared'}}]);
    await expect(storage.generation('fixture','object','owner')).rejects.toMatchObject({code:'PERSONAL_FILE_OWNERSHIP_REVIEW_REQUIRED'});
    expect(file.delete).not.toHaveBeenCalled();
  });
  it('rechecks ownership and pins both content and ownership metadata at deletion',async()=>{
    expect(await storage.generation('fixture','object','owner')).toBe('17');
    await storage.deleteGeneration('fixture','object','17','owner');
    expect(selectFile).toHaveBeenLastCalledWith('object',{preconditionOpts:{ifGenerationMatch:'17',ifMetagenerationMatch:'3'}});
    expect(file.delete).toHaveBeenCalledWith();
  });
  it('refuses a changed owner on a retry even when content generation is unchanged',async()=>{
    expect(await storage.generation('fixture','object','owner')).toBe('17');
    file.getMetadata.mockResolvedValue([{...owned(),metadata:{o4o_owner_user_id:'other',o4o_asset_purpose:'personal'}}]);
    await expect(storage.deleteGeneration('fixture','object','17','owner')).rejects.toMatchObject({code:'PERSONAL_FILE_OWNERSHIP_REVIEW_REQUIRED'});
    expect(file.delete).not.toHaveBeenCalled();
  });
  it('refuses a changed purpose and missing metageneration',async()=>{
    file.getMetadata.mockResolvedValue([{...owned(),metadata:{o4o_owner_user_id:'owner',o4o_asset_purpose:'business'}}]);
    await expect(storage.deleteGeneration('fixture','object','17','owner')).rejects.toMatchObject({code:'PERSONAL_FILE_OWNERSHIP_REVIEW_REQUIRED'});
    file.getMetadata.mockResolvedValue([{...owned(),metageneration:undefined}]);
    await expect(storage.deleteGeneration('fixture','object','17','owner')).rejects.toMatchObject({code:'PERSONAL_FILE_GENERATION_REQUIRED'});
    expect(file.delete).not.toHaveBeenCalled();
  });
  it('treats missing objects as absent but never a replacement generation as deleted',async()=>{
    file.getMetadata.mockRejectedValue({code:404});
    expect(await storage.generation('fixture','object','owner')).toBeNull();
    file.exists.mockResolvedValue([true]);
    await expect(storage.deleteGeneration('fixture','object','17','owner')).rejects.toMatchObject({code:'PERSONAL_FILE_GENERATION_CHANGED'});
    file.exists.mockResolvedValue([false]);await storage.deleteGeneration('fixture','object','17','owner');
  });
  it('does not delete a different current generation',async()=>{
    file.getMetadata.mockResolvedValue([{...owned(),generation:'18'}]);
    await expect(storage.deleteGeneration('fixture','object','17','owner')).rejects.toMatchObject({code:'PERSONAL_FILE_GENERATION_CHANGED'});
    expect(file.delete).not.toHaveBeenCalled();
  });
  it('fails closed on content/metadata precondition races and transient storage failures',async()=>{
    file.delete.mockRejectedValue({code:412});
    await expect(storage.deleteGeneration('fixture','object','17','owner')).rejects.toMatchObject({code:'PERSONAL_FILE_GENERATION_CHANGED'});
    file.getMetadata.mockRejectedValue({code:503});
    await expect(storage.generation('fixture','object','owner')).rejects.toMatchObject({code:503});
    await expect(storage.deleteGeneration('fixture','object','17','owner')).rejects.toMatchObject({code:503});
  });
});
