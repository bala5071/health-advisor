export interface ProductScan {
  id: string;
  userId: string;
  barcode: string;
  productName: string;
  timestamp: Date;
  nutritionFacts: NutritionFacts;
  healthRisks: HealthRisk[];
  allergenWarnings: AllergenWarning[];
}

export interface NutritionFacts {
  calories: number;
  fat: number; // in grams
  saturatedFat: number; // in grams
  transFat: number; // in grams
  cholesterol: number; // in mg
  sodium: number; // in mg
  carbohydrates: number; // in grams
  fiber: number; // in grams
  sugar: number; // in grams
  protein: number; // in grams
}

export interface HealthRisk {
  risk: string;
  isHighRisk: boolean;
  explanation: string;
}

export interface AllergenWarning {
  allergen: string;
  isPresent: boolean;
  explanation: string;
}
