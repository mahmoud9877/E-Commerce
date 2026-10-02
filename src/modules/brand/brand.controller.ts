import type { Request, Response } from "express";
import { BaseController } from "../../core/BaseController.js";
import type { BrandService } from "./brand.service.js";

export class BrandController extends BaseController {
  constructor(private readonly brandService: BrandService) {
    super();
  }

  async getBrand(req: Request, res: Response) {
    const { data: brandList, pagination } = await this.brandService.list(req.query);
    return res.status(201).json({ message: "Done", brandList, pagination });
  }

  async createBrand(req: Request, res: Response) {
    const { _id } = BaseController.currentUser(req);
    const brand = await this.brandService.create(req.body, req.file, _id);
    return res.status(201).json({ message: "Done", brand });
  }

  async updateBrand(req: Request<{ brandId: string }>, res: Response) {
    const updateBrand = await this.brandService.update(
      req.params.brandId,
      req.body,
      req.file
    );
    return res
      .status(201)
      .json({ message: "brand updated successfully", updateBrand });
  }

  async deleteBrand(req: Request, res: Response) {
    await this.brandService.delete(req.body.brandId);
    return res.status(200).json({ message: "Brand deleted successfully" });
  }
}
