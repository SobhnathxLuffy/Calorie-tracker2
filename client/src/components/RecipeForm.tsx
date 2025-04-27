import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash, ArrowLeft } from 'lucide-react';

interface RecipeFormProps {
  params?: {
    id?: string;
  };
}

interface Ingredient {
  id: number;
  foodName: string;
  quantity: string;
  unit: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
}

const RecipeForm: React.FC<RecipeFormProps> = ({ params }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const isEditMode = Boolean(params?.id);
  const recipeId = params?.id ? parseInt(params.id, 10) : undefined;
  const userId = 1; // Hardcoded for now, in a real app this would come from auth

  // State for form values
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [servings, setServings] = useState('1');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [instructions, setInstructions] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch recipe data if in edit mode
  const { data: recipe, isLoading: isLoadingRecipe } = useQuery({
    queryKey: ['/api/recipes', recipeId],
    queryFn: async () => {
      if (!recipeId) return null;
      const res = await fetch(`/api/recipes/${recipeId}`);
      if (!res.ok) throw new Error('Failed to fetch recipe');
      return res.json();
    },
    enabled: isEditMode 
  });

  // Update form when recipe data is loaded
  useEffect(() => {
    if (recipe && isEditMode) {
      // Populate form with recipe data
      setName(recipe.name);
      setDescription(recipe.description || '');
      setServings(recipe.servings.toString());
      setPrepTime(recipe.prepTime ? recipe.prepTime.toString() : '');
      setCookTime(recipe.cookTime ? recipe.cookTime.toString() : '');
      setInstructions(recipe.instructions || '');
      
      if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
        setIngredients(recipe.ingredients.map((ing: any, index: number) => ({
          id: index,
          foodName: ing.foodName,
          quantity: ing.quantity.toString(),
          unit: ing.unit,
          calories: ing.calories.toString(),
          protein: ing.protein.toString(),
          carbs: ing.carbs.toString(),
          fat: ing.fat.toString()
        })));
      }
    }
  }, [recipe, isEditMode]);

  // Add a new empty ingredient
  const addIngredient = () => {
    setIngredients([
      ...ingredients, 
      { 
        id: ingredients.length,
        foodName: '', 
        quantity: '0', 
        unit: 'g', 
        calories: '0', 
        protein: '0', 
        carbs: '0', 
        fat: '0'
      }
    ]);
  };

  // Remove an ingredient
  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  // Update ingredient field
  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    const updatedIngredients = [...ingredients];
    updatedIngredients[index] = {
      ...updatedIngredients[index],
      [field]: value
    };
    setIngredients(updatedIngredients);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const recipeData = {
        userId,
        name,
        description,
        servings: parseInt(servings, 10),
        prepTime: prepTime ? parseInt(prepTime, 10) : null,
        cookTime: cookTime ? parseInt(cookTime, 10) : null,
        instructions,
        ingredients: ingredients.map(ing => ({
          foodName: ing.foodName,
          quantity: parseFloat(ing.quantity),
          unit: ing.unit,
          calories: parseFloat(ing.calories),
          protein: parseFloat(ing.protein),
          carbs: parseFloat(ing.carbs),
          fat: parseFloat(ing.fat)
        }))
      };
      
      let response;
      if (isEditMode && recipeId) {
        response = await fetch(`/api/recipes/${recipeId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(recipeData)
        });
      } else {
        response = await fetch('/api/recipes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(recipeData)
        });
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save recipe');
      }
      
      // Success
      queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
      if (isEditMode) {
        queryClient.invalidateQueries({ queryKey: ['/api/recipes', recipeId] });
      }
      
      toast({
        title: 'Success',
        description: `Recipe ${isEditMode ? 'updated' : 'created'} successfully`
      });
      
      navigate('/recipes');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save recipe',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const goBack = () => {
    navigate('/recipes');
  };

  if (isEditMode && isLoadingRecipe) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading recipe...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={goBack} 
          className="mr-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-2xl font-bold">
          {isEditMode ? 'Edit Recipe' : 'Create New Recipe'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Recipe Basic Information */}
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <Label htmlFor="name">Recipe Name</Label>
            <Input 
              id="name"
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter recipe name" 
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="servings">Servings</Label>
            <Input 
              id="servings"
              type="number" 
              min="1" 
              value={servings}
              onChange={(e) => setServings(e.target.value)}
              placeholder="Number of servings" 
              className="mt-1"
              required
            />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <Label htmlFor="prepTime">Prep Time (minutes)</Label>
            <Input 
              id="prepTime"
              type="number" 
              min="0" 
              value={prepTime}
              onChange={(e) => setPrepTime(e.target.value)}
              placeholder="Preparation time" 
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="cookTime">Cook Time (minutes)</Label>
            <Input 
              id="cookTime"
              type="number" 
              min="0" 
              value={cookTime}
              onChange={(e) => setCookTime(e.target.value)}
              placeholder="Cooking time" 
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea 
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the recipe" 
            className="min-h-[80px] mt-1" 
          />
        </div>

        <div>
          <Label htmlFor="instructions">Instructions</Label>
          <Textarea 
            id="instructions"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Step-by-step cooking instructions" 
            className="min-h-[150px] mt-1" 
          />
        </div>

        {/* Ingredients Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Ingredients</h3>
            <Button 
              type="button" 
              onClick={addIngredient}
              variant="outline"
              size="sm"
              className="flex items-center"
            >
              <Plus className="h-4 w-4 mr-1" /> Add Ingredient
            </Button>
          </div>

          {ingredients.length === 0 ? (
            <div className="text-center py-6 border rounded-md border-dashed">
              <p className="text-gray-500">No ingredients added yet.</p>
              <p className="text-sm text-gray-400">Click the "Add Ingredient" button to start building your recipe.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {ingredients.map((ingredient, index) => (
                <Card key={ingredient.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-medium">Ingredient {index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeIngredient(index)}
                        className="text-red-500 h-8 w-8"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label>Name</Label>
                        <Input
                          value={ingredient.foodName}
                          onChange={(e) => updateIngredient(index, 'foodName', e.target.value)}
                          placeholder="Ingredient name"
                          className="mt-1"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>Quantity</Label>
                          <Input 
                            type="number" 
                            step="0.01" 
                            min="0" 
                            value={ingredient.quantity}
                            onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                            className="mt-1"
                            required
                          />
                        </div>

                        <div>
                          <Label>Unit</Label>
                          <Select
                            value={ingredient.unit}
                            onValueChange={(value) => updateIngredient(index, 'unit', value)}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="g">g (grams)</SelectItem>
                              <SelectItem value="kg">kg (kilograms)</SelectItem>
                              <SelectItem value="ml">ml (milliliters)</SelectItem>
                              <SelectItem value="l">l (liters)</SelectItem>
                              <SelectItem value="oz">oz (ounces)</SelectItem>
                              <SelectItem value="lb">lb (pounds)</SelectItem>
                              <SelectItem value="cup">cup</SelectItem>
                              <SelectItem value="tbsp">tbsp (tablespoon)</SelectItem>
                              <SelectItem value="tsp">tsp (teaspoon)</SelectItem>
                              <SelectItem value="piece">piece</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                      <div>
                        <Label>Calories</Label>
                        <Input 
                          type="number" 
                          step="0.1" 
                          min="0" 
                          value={ingredient.calories}
                          onChange={(e) => updateIngredient(index, 'calories', e.target.value)}
                          className="mt-1"
                          required
                        />
                      </div>

                      <div>
                        <Label>Protein (g)</Label>
                        <Input 
                          type="number" 
                          step="0.1" 
                          min="0" 
                          value={ingredient.protein}
                          onChange={(e) => updateIngredient(index, 'protein', e.target.value)}
                          className="mt-1"
                          required
                        />
                      </div>

                      <div>
                        <Label>Carbs (g)</Label>
                        <Input 
                          type="number" 
                          step="0.1" 
                          min="0" 
                          value={ingredient.carbs}
                          onChange={(e) => updateIngredient(index, 'carbs', e.target.value)}
                          className="mt-1"
                          required
                        />
                      </div>

                      <div>
                        <Label>Fat (g)</Label>
                        <Input 
                          type="number" 
                          step="0.1" 
                          min="0" 
                          value={ingredient.fat}
                          onChange={(e) => updateIngredient(index, 'fat', e.target.value)}
                          className="mt-1"
                          required
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button
            type="button"
            variant="outline"
            className="mr-2"
            onClick={goBack}
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {isEditMode ? 'Update Recipe' : 'Create Recipe'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default RecipeForm;