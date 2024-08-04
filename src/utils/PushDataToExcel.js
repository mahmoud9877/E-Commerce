import xlsx from "xlsx";
import fs from "fs";

export const pushDataToExcel = (filePath, sheetName, data) => {
  // Read the existing Excel file
  let workbook;
  if (fs.existsSync(filePath)) {
    workbook = xlsx.readFile(filePath);
  } else {
    workbook = xlsx.utils.book_new();
  }
  // Get or create the worksheet
  let worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    worksheet = xlsx.utils.json_to_sheet([]);
    xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);
  }

  // Convert the worksheet to JSON and append the new data
  const existingData = xlsx.utils.sheet_to_json(worksheet);
  const updatedData = [...existingData, ...data];

  // Convert the updated data back to a worksheet
  const updatedWorksheet = xlsx.utils.json_to_sheet(updatedData);

  // Replace the old worksheet with the updated one
  workbook.Sheets[sheetName] = updatedWorksheet;

  // Write the updated workbook back to the file
  xlsx.writeFile(workbook, filePath);
};

export const updateExcelSheet = (filePath, productId, updatedData) => {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(worksheet);

  for (let i = 0; i < rows.length; i++) {
    if (rows[i].productId === productId) {
      rows[i].name = updatedData.name || rows[i].name;
      rows[i].price = updatedData.price || rows[i].price;
      rows[i].discount = updatedData.discount || rows[i].discount;
      rows[i].finalPrice = updatedData.finalPrice || rows[i].finalPrice;
      rows[i].categoryId = updatedData.categoryId || rows[i].categoryId;
      rows[i].subcategoryId =
        updatedData.subcategoryId || rows[i].subcategoryId;
      rows[i].brandId = updatedData.brandId || rows[i].brandId;
      rows[i].updateBy = updatedData.updateBy || rows[i].updateBy;
      rows[i].slug = updatedData.slug || rows[i].slug;
      break;
    }
  }

  const updatedWorksheet = xlsx.utils.json_to_sheet(rows);
  workbook.Sheets[sheetName] = updatedWorksheet;
  xlsx.writeFile(workbook, filePath);
};
