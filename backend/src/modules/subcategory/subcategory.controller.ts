import type { Request, Response } from "express";
import { BaseController } from "../../core/BaseController.js";
import type { SubcategoryService } from "./subcategory.service.js";

type SubcategoryParams = { categoryId: string; subcategoryId: string };

export class SubcategoryController extends BaseController {
  constructor(
    private readonly subcategoryService: SubcategoryService
  ) {
    super();
  }

  // Under /category/:categoryId/subcategory only that category's subcategories are listed
  async getSubcategories(req: Request<{ categoryId?: string }>, res: Response) {
    const { data: subcategoryList, pagination } = await this.subcategoryService.list(
      req.query,
      req.params.categoryId
    );
    return res.status(200).json({ message: "Done", subcategoryList, pagination });
  }

  async createSubcategory(req: Request<{ categoryId: string }>, res: Response) {
    const subcategory = await this.subcategoryService.create(
      req.params.categoryId,
      req.body,
      req.file
    );
    return res
      .status(201)
      .json({ message: "Subcategory created successfully", subcategory });
  }

  async updateSubcategory(req: Request<SubcategoryParams>, res: Response) {
    const { categoryId, subcategoryId } = req.params;
    const subcategory = await this.subcategoryService.update(
      categoryId,
      subcategoryId,
      req.body,
      req.file
    );
    return res
      .status(200)
      .json({ message: "Subcategory updated successfully", subcategory });
  }
}
