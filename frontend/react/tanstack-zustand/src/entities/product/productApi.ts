import { apiClient } from "../../shared/api/client";
import { productSchema, productsResponseSchema } from "./schemas";

export const productApi = {
  getAll: (limit = 20, skip = 0) => 
    apiClient.get(`/products?limit=${limit}&skip=${skip}`, productsResponseSchema),
  
  getById: (id: number) => 
    apiClient.get(`/products/${id}`, productSchema),
    
  getByCategory: (category: string) => 
    apiClient.get(`/products/category/${category}`, productsResponseSchema),
};