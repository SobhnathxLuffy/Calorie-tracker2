import { useState, useRef, useEffect } from "react";
import { Search, Star, Scan } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { FoodItem, CustomFood } from "@/lib/types";
import { useNutritionApi, FoodSearchResult } from "@/hooks/useNutritionApi";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import BarcodeScanner from "./BarcodeScanner";

interface TrackFoodFormProps {
  userId: number;
  date: string;
}

const TrackFoodForm = ({ userId, date }: TrackFoodFormProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodSearchResult | null>(null);
  const [quantity, setQuantity] = useState<number>(100);
  const [unit, setUnit] = useState<string>("g");
  const [mealType, setMealType] = useState<string>("breakfast");
  const [searchMode, setSearchMode] = useState<"all" | "indian" | "usda" | "custom">("all");
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [isLoadingBarcode, setIsLoadingBarcode] = useState(false);
  const searchResultsRef = useRef<HTMLDivElement>(null);
  const { searchFoods, searchIndianFoods, searchAllFoods, isSearching } = useNutritionApi();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchResultsRef.current && !searchResultsRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch custom foods
  const { data: customFoods } = useQuery<CustomFood[]>({
    queryKey: [`/api/custom-foods?userId=${userId}`],
    enabled: !!userId,
  });

  // Convert a custom food to a food search result format
  const convertCustomFoodToSearchResult = (food: CustomFood): FoodSearchResult => {
    return {
      fdcId: `custom-${food.id}`,
      description: food.foodName,
      nutrients: [
        { nutrientId: 1008, nutrientName: 'Energy', nutrientNumber: '208', unitName: 'kcal', value: food.calories },
        { nutrientId: 1003, nutrientName: 'Protein', nutrientNumber: '203', unitName: 'g', value: food.protein },
        { nutrientId: 1005, nutrientName: 'Carbohydrates', nutrientNumber: '205', unitName: 'g', value: food.carbs },
        { nutrientId: 1004, nutrientName: 'Total lipid (fat)', nutrientNumber: '204', unitName: 'g', value: food.fat },
      ],
      foodGroup: food.foodGroup || 'Custom Foods',
      isCustomFood: true
    };
  };

  useEffect(() => {
    const delaySearch = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        try {
          let results: FoodSearchResult[] = [];
          
          if (searchMode === "indian") {
            results = await searchIndianFoods(searchQuery);
          } else if (searchMode === "usda") {
            results = await searchFoods(searchQuery);
          } else if (searchMode === "custom" && customFoods) {
            // Search custom foods
            const filteredCustomFoods = customFoods.filter(food => 
              food.foodName.toLowerCase().includes(searchQuery.toLowerCase())
            );
            results = filteredCustomFoods.map(convertCustomFoodToSearchResult);
          } else if (searchMode === "all") {
            // Search all food sources
            results = await searchAllFoods(searchQuery);
            
            // Add matching custom foods if available
            if (customFoods) {
              const filteredCustomFoods = customFoods.filter(food => 
                food.foodName.toLowerCase().includes(searchQuery.toLowerCase())
              );
              const customResults = filteredCustomFoods.map(convertCustomFoodToSearchResult);
              results = [...customResults, ...results];
            }
          }
          
          setSearchResults(results);
          setShowResults(true);
        } catch (error) {
          console.error("Failed to search foods:", error);
          toast({
            title: "Search error",
            description: "Failed to retrieve food data. Please try again.",
            variant: "destructive",
          });
        }
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 500);

    return () => clearTimeout(delaySearch);
  }, [searchQuery, searchMode, searchFoods, searchIndianFoods, searchAllFoods, toast, customFoods]);

  const handleFoodSelection = (food: FoodSearchResult) => {
    setSelectedFood(food);
    setShowResults(false);
    setSearchQuery(food.description);
    
    // For countable foods, automatically set the unit to 'piece'
    if (isCountableFood(food)) {
      setUnit('piece');
      // For chapati, roti, etc., set default quantity to 1
      setQuantity(1);
    } else {
      // For other foods, default to weight in grams
      setUnit('g');
      setQuantity(100);
    }
  };
  
  // Handle barcode scan result
  const handleBarcodeScanned = async (barcodeValue: string) => {
    setIsLoadingBarcode(true);
    
    try {
      // Call the barcode API endpoint
      const response = await fetch(`/api/barcode/${barcodeValue}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          toast({
            title: "Product not found",
            description: "We couldn't find this product in our database. Try searching by name instead.",
            variant: "destructive",
          });
        } else {
          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        return;
      }
      
      // Convert the response to a FoodSearchResult
      const productData = await response.json();
      
      // Convert the USDA format to our FoodSearchResult format
      const food: FoodSearchResult = {
        fdcId: productData.fdcId,
        description: productData.description,
        nutrients: productData.foodNutrients.map((nutrient: any) => ({
          nutrientId: nutrient.nutrientId,
          nutrientName: nutrient.name,
          nutrientNumber: nutrient.number || '',
          unitName: nutrient.unitName,
          value: nutrient.amount
        })),
        dataType: productData.dataType,
        brandName: productData.brandName,
        foodGroup: productData.foodCategory
      };
      
      // Select the food
      handleFoodSelection(food);
      
      // Close the barcode scanner
      setShowBarcodeScanner(false);
      
      toast({
        title: "Product found!",
        description: `Found: ${food.description}`,
      });
    } catch (error) {
      console.error("Error scanning barcode:", error);
      toast({
        title: "Scan error",
        description: "There was a problem processing the barcode. Please try again or search manually.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingBarcode(false);
    }
  };

  const getNutrientValue = (nutrients: any[] | undefined, nutrientId: number) => {
    if (!nutrients || !Array.isArray(nutrients)) {
      return 0;
    }
    const nutrient = nutrients.find(n => n.nutrientId === nutrientId);
    return nutrient ? nutrient.value : 0;
  };

  // List of food keywords that are typically counted as pieces rather than weighed
  const countableFoods = [
    'chapati', 'roti', 'naan', 'bread', 'slice', 'roll', 'bun', 'muffin', 'bagel', 'waffle', 
    'pancake', 'dosa', 'idli', 'cookie', 'biscuit', 'cracker', 'puri', 'paratha', 'tortilla',
    'piece', 'serving', 'egg', 'biscuit'
  ];
  
  // Check if a food should be counted rather than weighed
  const isCountableFood = (food: FoodSearchResult): boolean => {
    const lowerDescription = food.description.toLowerCase();
    return countableFoods.some(keyword => lowerDescription.includes(keyword));
  };
  
  // Determine the appropriate multiplier based on food type and selected unit
  const getMultiplier = (food: FoodSearchResult, quantity: number, selectedUnit: string): number => {
    // For countable foods, when unit is 'piece', treat the quantity as number of pieces
    if (isCountableFood(food) && selectedUnit === 'piece') {
      // Assuming the nutrition data is per piece/serving already
      return quantity;
    }
    
    // For all other cases (including countable foods with 'g' selected), 
    // use the standard calculation (quantity / 100g)
    return quantity / 100;
  };

  const calculateNutrition = (food: FoodSearchResult, quantity: number, selectedUnit: string) => {
    // Standard nutrient IDs
    const CALORIES_ID = 1008; // Energy (kcal)
    const PROTEIN_ID = 1003; // Protein
    const CARBS_ID = 1005;   // Carbohydrates
    const FAT_ID = 1004;     // Total lipid (fat)

    const multiplier = getMultiplier(food, quantity, selectedUnit);
    
    const calories = getNutrientValue(food.nutrients, CALORIES_ID) * multiplier;
    const protein = getNutrientValue(food.nutrients, PROTEIN_ID) * multiplier;
    const carbs = getNutrientValue(food.nutrients, CARBS_ID) * multiplier;
    const fat = getNutrientValue(food.nutrients, FAT_ID) * multiplier;

    return { calories, protein, carbs, fat };
  };

  const addFoodMutation = useMutation({
    mutationFn: async (foodData: Omit<FoodItem, "id">) => {
      const response = await apiRequest("POST", "/api/food-items", foodData);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: [`/api/food-items?userId=${userId}&date=${date}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/food-items/meal?userId=${userId}&date=${date}&mealType=${mealType}`] });
      
      // Reset form
      setSelectedFood(null);
      setSearchQuery("");
      setQuantity(100);
      
      toast({
        title: "Food added successfully",
        description: "Your food item has been added to your daily log.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add food",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });

  const handleAddFood = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFood) {
      toast({
        title: "No food selected",
        description: "Please search and select a food item first.",
        variant: "destructive",
      });
      return;
    }
    
    // Auto-select "piece" as the unit for countable foods
    if (isCountableFood(selectedFood) && unit === 'g') {
      // Suggest a better unit to the user
      toast({
        title: "Unit suggestion",
        description: `${selectedFood.description} is typically counted by piece rather than weighed. Switched to "piece" as the unit.`,
      });
      setUnit('piece');
    }
    
    // Calculate nutrition values based on quantity and unit
    const { calories, protein, carbs, fat } = calculateNutrition(selectedFood, quantity, unit);
    
    const foodItem: Omit<FoodItem, "id"> = {
      userId,
      foodName: selectedFood.description,
      quantity,
      unit,
      calories,
      protein,
      carbs,
      fat,
      mealType,
      date,
      fdcId: selectedFood.fdcId,
    };
    
    addFoodMutation.mutate(foodItem);
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <h2 className="text-xl font-semibold mb-4 text-primary-dark">Track Food</h2>
        
        <Tabs defaultValue="all" className="mb-4" onValueChange={(value) => setSearchMode(value as "all" | "indian" | "usda" | "custom")}>
          <TabsList className="grid grid-cols-4 mb-2">
            <TabsTrigger value="all">All Foods</TabsTrigger>
            <TabsTrigger value="custom">My Foods</TabsTrigger>
            <TabsTrigger value="indian">Indian Foods</TabsTrigger>
            <TabsTrigger value="usda">International</TabsTrigger>
          </TabsList>
          <TabsContent value="all">Search across all food databases</TabsContent>
          <TabsContent value="custom">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              <span>Search your custom foods</span>
            </div>
          </TabsContent>
          <TabsContent value="indian">Search only Indian foods database</TabsContent>
          <TabsContent value="usda">Search international food database</TabsContent>
        </Tabs>
        
        <form onSubmit={handleAddFood} className="space-y-4">
          {showBarcodeScanner ? (
            <div className="mb-4">
              <BarcodeScanner 
                onScan={handleBarcodeScanned} 
                onClose={() => setShowBarcodeScanner(false)} 
              />
            </div>
          ) : (
            <>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    placeholder="Search for a food..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-shrink-0"
                    onClick={() => setShowBarcodeScanner(true)}
                  >
                    <Scan className="h-5 w-5 mr-1" />
                    Scan
                  </Button>
                </div>
                {showResults && searchResults.length > 0 && (
                  <div 
                    ref={searchResultsRef}
                    className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-80 overflow-y-auto"
                  >
                    {searchResults.map((food) => (
                      <div 
                        key={food.fdcId} 
                        className="py-2 px-4 hover:bg-gray-100 cursor-pointer border-b"
                        onClick={() => handleFoodSelection(food)}
                      >
                        <div className="flex justify-between items-center">
                          <div className="font-medium">{food.description}</div>
                          {food.isCustomFood && (
                            <Badge variant="outline" className="ml-2 bg-amber-50 text-amber-700 border-amber-200">
                              My Food
                            </Badge>
                          )}
                          {food.isIndianFood && !food.isCustomFood && (
                            <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                              Indian
                            </Badge>
                          )}
                          {food.foodGroup && !food.isIndianFood && !food.isCustomFood && (
                            <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 border-blue-200">
                              {food.foodGroup}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {getNutrientValue(food.nutrients, 1008)} cal | {getNutrientValue(food.nutrients, 1003)}g protein | {getNutrientValue(food.nutrients, 1005)}g carbs | {getNutrientValue(food.nutrients, 1004)}g fat
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {isSearching && (
                  <div className="absolute top-full left-0 mt-1 w-full p-2 text-center bg-white rounded-lg shadow-lg border border-gray-200">
                    Searching...
                  </div>
                )}
                {showResults && searchResults.length === 0 && !isSearching && searchQuery.length >= 2 && (
                  <div className="absolute top-full left-0 mt-1 w-full p-2 text-center bg-white rounded-lg shadow-lg border border-gray-200">
                    No foods found
                  </div>
                )}
              </div>
            
              <div className="flex flex-wrap gap-4">
                <div className="w-full md:w-1/4">
                  <Label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="0"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                
                <div className="w-full md:w-1/4">
                  <Label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-1">
                    Unit
                  </Label>
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="g">grams</SelectItem>
                      <SelectItem value="oz">ounces</SelectItem>
                      <SelectItem value="ml">milliliters</SelectItem>
                      <SelectItem value="serving">serving</SelectItem>
                      <SelectItem value="piece">piece</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="w-full md:w-1/4">
                  <Label htmlFor="meal-type" className="block text-sm font-medium text-gray-700 mb-1">
                    Meal
                  </Label>
                  <Select value={mealType} onValueChange={setMealType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select meal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="breakfast">Breakfast</SelectItem>
                      <SelectItem value="lunch">Lunch</SelectItem>
                      <SelectItem value="dinner">Dinner</SelectItem>
                      <SelectItem value="snack">Snack</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}
          
          {selectedFood && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <h3 className="font-medium text-lg">{selectedFood.description}</h3>
                {selectedFood.isCustomFood && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    My Food
                  </Badge>
                )}
                {selectedFood.isIndianFood && !selectedFood.isCustomFood && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Indian Food
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2 mt-2">
                <div className="text-center">
                  <p className="text-xs text-gray-500">Calories</p>
                  <p className="font-bold text-primary">
                    {Math.round(calculateNutrition(selectedFood, quantity, unit).calories)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Protein</p>
                  <p className="font-bold text-primary">
                    {Math.round(calculateNutrition(selectedFood, quantity, unit).protein)}g
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Carbs</p>
                  <p className="font-bold text-primary">
                    {Math.round(calculateNutrition(selectedFood, quantity, unit).carbs)}g
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Fat</p>
                  <p className="font-bold text-primary">
                    {Math.round(calculateNutrition(selectedFood, quantity, unit).fat)}g
                  </p>
                </div>
              </div>
              {isCountableFood(selectedFood) && unit === 'g' && (
                <div className="mt-2 bg-yellow-50 p-2 rounded text-sm text-yellow-700 border border-yellow-200">
                  <span className="font-medium">Tip:</span> This food is typically counted in pieces rather than by weight. Switch to "piece" for more accurate tracking.
                </div>
              )}
              {getNutrientValue(selectedFood.nutrients, 1079) > 0 && (
                <div className="mt-2 text-sm text-gray-600">
                  <span className="font-medium">Additional nutrients: </span>
                  Fiber: {Math.round(getNutrientValue(selectedFood.nutrients, 1079) * getMultiplier(selectedFood, quantity, unit))}g
                  {getNutrientValue(selectedFood.nutrients, 1087) > 0 && (
                    <span> | Calcium: {Math.round(getNutrientValue(selectedFood.nutrients, 1087) * getMultiplier(selectedFood, quantity, unit))}mg</span>
                  )}
                  {getNutrientValue(selectedFood.nutrients, 1089) > 0 && (
                    <span> | Iron: {Math.round(getNutrientValue(selectedFood.nutrients, 1089) * getMultiplier(selectedFood, quantity, unit))}mg</span>
                  )}
                </div>
              )}
            </div>
          )}
          
          <Button 
            type="submit" 
            className="w-full bg-primary hover:bg-primary-dark text-white"
            disabled={addFoodMutation.isPending || isLoadingBarcode}
          >
            {addFoodMutation.isPending ? "Adding..." : "Add Food"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default TrackFoodForm;