import type { Request, Response } from "express";
import { BaseController } from "../../core/BaseController.js";
import type { CategoryService } from "./category.service.js";

export class CategoryController extends BaseController {
  constructor(private readonly categoryService: CategoryService) {
    super();
  }

  async getCategories(req: Request, res: Response) {
    const { data: categoryList, pagination } = await this.categoryService.list(req.query);
    return res.status(200).json({ message: "Done", categoryList, pagination });
  }

  async createCategory(req: Request, res: Response) {
    const { _id } = BaseController.currentUser(req);
    const category = await this.categoryService.create(req.body, req.file, _id);
    return res.status(201).json({ message: "Done", category });
  }

  async updateCategory(req: Request<{ categoryId: string }>, res: Response) {
    const updatedCategory = await this.categoryService.update(
      req.params.categoryId,
      req.body,
      req.file,
      BaseController.currentUser(req)._id
    );
    return res
      .status(200)
      .json({ message: "Category updated successfully", updatedCategory });
  }

  async deleteCategory(req: Request, res: Response) {
    await this.categoryService.delete(req.body.categoryId);
    return res.status(200).json({ message: "Category Deleted successively" });
  }
}
