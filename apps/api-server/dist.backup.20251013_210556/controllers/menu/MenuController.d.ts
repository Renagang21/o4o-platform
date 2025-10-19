import { Request, Response } from 'express';
import { AuthRequest } from '../../types/auth';
export declare class MenuController {
    getMenus: (req: Request, res: Response) => Promise<void>;
    getMenuLocations: (req: Request, res: Response) => Promise<void>;
    getMenu: (req: Request, res: Response) => Promise<void>;
    getFilteredMenu: (req: AuthRequest, res: Response) => Promise<void>;
    createMenu: (req: Request, res: Response) => Promise<void>;
    updateMenu: (req: Request, res: Response) => Promise<void>;
    deleteMenu: (req: Request, res: Response) => Promise<void>;
    reorderMenuItems: (req: Request, res: Response) => Promise<void>;
    duplicateMenu: (req: Request, res: Response) => Promise<void>;
    addMenuItem: (req: Request, res: Response) => Promise<void>;
    updateMenuItem: (req: Request, res: Response) => Promise<void>;
    deleteMenuItem: (req: Request, res: Response) => Promise<void>;
    getMenuByLocation: (req: Request, res: Response) => Promise<void>;
}
//# sourceMappingURL=MenuController.d.ts.map