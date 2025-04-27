import { useState, useCallback } from 'react';
import { IndianFood, CustomFood } from '@/lib/types';

// Define the nutrients structure for our foods
export interface FoodNutrient {
  nutrientId: number;
  nutrientName: string;
  nutrientNumber: string;
  unitName: string;
  value: number;
}

// Define the common structure for all food search results
export interface FoodSearchResult {
  fdcId: string;
  description: string;
  nutrients: FoodNutrient[];
  dataType?: string;
  foodCode?: string;
  brandName?: string;
  foodGroup?: string;
  isIndianFood?: boolean;
  isCustomFood?: boolean;
}

const getNutrientValue = (nutrients: FoodNutrient[] | undefined, nutrientId: number): number => {
  if (!nutrients || !Array.isArray(nutrients)) {
    return 0;
  }
  const nutrient = nutrients.find(n => n.nutrientId === nutrientId);
  return nutrient ? (nutrient.value || 0) : 0;
};

const convertIndianFoodToSearchResult = (food: IndianFood): FoodSearchResult => {
  return {
    fdcId: `indian-${food.id}`,
    description: food.foodName,
    nutrients: [
      { nutrientId: 1008, nutrientName: 'Energy', nutrientNumber: '208', unitName: 'kcal', value: food.calories },
      { nutrientId: 1003, nutrientName: 'Protein', nutrientNumber: '203', unitName: 'g', value: food.protein },
      { nutrientId: 1005, nutrientName: 'Carbohydrates', nutrientNumber: '205', unitName: 'g', value: food.carbs },
      { nutrientId: 1004, nutrientName: 'Total lipid (fat)', nutrientNumber: '204', unitName: 'g', value: food.fat },
      ...(food.fiber !== undefined ? [{ nutrientId: 1079, nutrientName: 'Fiber', nutrientNumber: '291', unitName: 'g', value: food.fiber }] : []),
      ...(food.calcium !== undefined ? [{ nutrientId: 1087, nutrientName: 'Calcium', nutrientNumber: '301', unitName: 'mg', value: food.calcium }] : []),
      ...(food.iron !== undefined ? [{ nutrientId: 1089, nutrientName: 'Iron', nutrientNumber: '303', unitName: 'mg', value: food.iron }] : [])
    ],
    foodGroup: food.foodGroup,
    isIndianFood: true
  };
};

const convertCustomFoodToSearchResult = (food: CustomFood): FoodSearchResult => {
  return {
    fdcId: `custom-${food.id}`,
    description: food.foodName,
    nutrients: [
      { nutrientId: 1008, nutrientName: 'Energy', nutrientNumber: '208', unitName: 'kcal', value: food.calories },
      { nutrientId: 1003, nutrientName: 'Protein', nutrientNumber: '203', unitName: 'g', value: food.protein },
      { nutrientId: 1005, nutrientName: 'Carbohydrates', nutrientNumber: '205', unitName: 'g', value: food.carbs },
      { nutrientId: 1004, nutrientName: 'Total lipid (fat)', nutrientNumber: '204', unitName: 'g', value: food.fat },
      ...(food.fiber !== undefined ? [{ nutrientId: 1079, nutrientName: 'Fiber', nutrientNumber: '291', unitName: 'g', value: food.fiber }] : [])
    ],
    foodGroup: food.foodGroup,
    isCustomFood: true
  };
};

export const useNutritionApi = () => {
  const [isSearching, setIsSearching] = useState(false);

  // USDA foods search function
  const searchFoods = useCallback(async (query: string): Promise<FoodSearchResult[]> => {
    if (!query || query.trim() === '') {
      return [];
    }
    
    setIsSearching(true);
    try {
      console.log("Searching USDA foods for:", query);
      
      // Make a direct fetch request to our USDA API endpoint
      const response = await fetch(`/api/usda/search?query=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error(`USDA API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Map USDA API response to our standard format
      return data.map((food: any) => ({
        fdcId: food.fdcId.toString(),
        description: food.description,
        nutrients: food.foodNutrients.map((n: any) => ({
          nutrientId: n.nutrientId,
          nutrientName: n.name,
          nutrientNumber: n.number || '',
          unitName: n.unitName,
          value: n.amount
        })),
        dataType: food.dataType,
        foodGroup: food.foodCategory,
        brandName: food.brandName
      }));
    } catch (error) {
      console.error('Error searching USDA foods:', error);
      return [];
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Indian foods search function
  const searchIndianFoods = useCallback(async (query: string): Promise<FoodSearchResult[]> => {
    if (!query || query.trim() === '') {
      return [];
    }
    
    setIsSearching(true);
    try {
      console.log("Searching Indian foods for:", query);
      
      // Make direct fetch request to the API
      const response = await fetch(`/api/indian-foods/search?query=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error("Failed to search Indian foods");
      
      const data = await response.json();
      
      // Map Indian foods to our standard format
      return data.map((food: IndianFood) => ({
        fdcId: `indian-${food.id}`,
        description: food.foodName,
        nutrients: [
          { nutrientId: 1008, nutrientName: 'Energy', nutrientNumber: '208', unitName: 'kcal', value: food.calories },
          { nutrientId: 1003, nutrientName: 'Protein', nutrientNumber: '203', unitName: 'g', value: food.protein },
          { nutrientId: 1005, nutrientName: 'Carbohydrates', nutrientNumber: '205', unitName: 'g', value: food.carbs },
          { nutrientId: 1004, nutrientName: 'Total lipid (fat)', nutrientNumber: '204', unitName: 'g', value: food.fat },
          ...(food.fiber !== undefined ? [{ nutrientId: 1079, nutrientName: 'Fiber', nutrientNumber: '291', unitName: 'g', value: food.fiber }] : [])
        ],
        foodGroup: food.foodGroup,
        isIndianFood: true
      }));
    } catch (error) {
      console.error("Error searching Indian foods:", error);
      return [];
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Comprehensive search function that searches all food sources
  const searchAllFoods = useCallback(async (query: string): Promise<FoodSearchResult[]> => {
    if (!query || query.trim() === '') {
      return [];
    }
    
    setIsSearching(true);
    try {
      console.log("Searching all foods for:", query);
      
      // Search both sources in parallel
      const [indianFoods, usdaFoods] = await Promise.all([
        searchIndianFoods(query),
        searchFoods(query)
      ]);
      
      // Combine the results
      return [...indianFoods, ...usdaFoods];
    } catch (error) {
      console.error("Error in comprehensive search:", error);
      return [];
    } finally {
      setIsSearching(false);
    }
  }, [searchIndianFoods, searchFoods]);

  // Utility function to extract macronutrients from a food result
  const extractMacronutrients = useCallback((food: FoodSearchResult) => {
    // Reuse our existing getNutrientValue function
    return {
      calories: getNutrientValue(food.nutrients, 1008),
      protein: getNutrientValue(food.nutrients, 1003),
      carbs: getNutrientValue(food.nutrients, 1005),
      fat: getNutrientValue(food.nutrients, 1004),
      fiber: getNutrientValue(food.nutrients, 1079)
    };
  }, []);

  return {
    searchFoods,
    searchIndianFoods,
    searchAllFoods,
    extractMacronutrients,
    isSearching
  };
};