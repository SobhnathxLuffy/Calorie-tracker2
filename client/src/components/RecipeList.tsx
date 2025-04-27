import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Heart, Clock, ChefHat, Edit, Trash } from "lucide-react";
import { queryClient } from '@/lib/queryClient';

interface Recipe {
  id: number;
  userId: number;
  name: string;
  description: string | null;
  servings: number;
  prepTime: number | null;
  cookTime: number | null;
  imageUrl: string | null;
  instructions: string | null;
  createdAt: string;
  isFavorite: boolean;
}

interface RecipeListProps {
  userId: number;
}

const RecipeList = ({ userId }: RecipeListProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");

  // Query to fetch all recipes
  const {
    data: recipes,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['/api/recipes', userId],
    queryFn: async () => {
      const res = await fetch(`/api/recipes?userId=${userId}`);
      if (!res.ok) throw new Error('Failed to fetch recipes');
      return res.json() as Promise<Recipe[]>;
    }
  });

  // Query to fetch favorite recipes
  const {
    data: favoriteRecipes,
    isLoading: isLoadingFavorites,
  } = useQuery({
    queryKey: ['/api/recipes/favorites', userId],
    queryFn: async () => {
      const res = await fetch(`/api/recipes/favorites?userId=${userId}`);
      if (!res.ok) throw new Error('Failed to fetch favorite recipes');
      return res.json() as Promise<Recipe[]>;
    }
  });

  // Mutation to toggle favorite status
  const toggleFavoriteMutation = useMutation({
    mutationFn: async (recipeId: number) => {
      const res = await fetch(`/api/recipes/${recipeId}/favorite`, {
        method: 'PATCH',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to toggle favorite');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recipes/favorites'] });
      toast({
        title: "Success",
        description: "Recipe favorite status updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update favorite status",
        variant: "destructive",
      });
    }
  });

  // Mutation to delete a recipe
  const deleteRecipeMutation = useMutation({
    mutationFn: async (recipeId: number) => {
      const res = await fetch(`/api/recipes/${recipeId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to delete recipe');
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recipes/favorites'] });
      toast({
        title: "Success",
        description: "Recipe deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete recipe",
        variant: "destructive",
      });
    }
  });

  const handleToggleFavorite = (recipeId: number) => {
    toggleFavoriteMutation.mutate(recipeId);
  };

  const handleDeleteRecipe = (recipeId: number) => {
    if (window.confirm("Are you sure you want to delete this recipe?")) {
      deleteRecipeMutation.mutate(recipeId);
    }
  };

  const renderRecipeCard = (recipe: Recipe) => (
    <Card key={recipe.id} className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl">{recipe.name}</CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => handleToggleFavorite(recipe.id)}
            className={recipe.isFavorite ? "text-red-500" : ""}
          >
            <Heart className={recipe.isFavorite ? "fill-current" : ""} />
          </Button>
        </div>
        <CardDescription>
          {recipe.description || "No description provided"}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="flex flex-wrap gap-2 mb-3">
          <Badge variant="outline" className="flex items-center gap-1">
            <ChefHat size={14} />
            {recipe.servings} {recipe.servings > 1 ? 'servings' : 'serving'}
          </Badge>
          {recipe.prepTime && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock size={14} />
              Prep: {recipe.prepTime} min
            </Badge>
          )}
          {recipe.cookTime && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock size={14} />
              Cook: {recipe.cookTime} min
            </Badge>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-2">
        <Button asChild>
          <Link to={`/recipes/${recipe.id}`}>View Recipe</Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link to={`/recipes/edit/${recipe.id}`}><Edit size={18} /></Link>
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => handleDeleteRecipe(recipe.id)}
          >
            <Trash size={18} />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );

  const renderSkeletons = () => (
    Array(3).fill(0).map((_, i) => (
      <Card key={i} className="mb-4">
        <CardHeader>
          <Skeleton className="h-6 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-3">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-20" />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Skeleton className="h-10 w-24" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
          </div>
        </CardFooter>
      </Card>
    ))
  );

  return (
    <div className="my-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">My Recipes</h2>
        <Button asChild>
          <Link to="/recipes/new">Create New Recipe</Link>
        </Button>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Recipes</TabsTrigger>
          <TabsTrigger value="favorites">Favorites</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          {isLoading ? (
            renderSkeletons()
          ) : isError ? (
            <p>Error loading recipes. Please try again.</p>
          ) : recipes && recipes.length > 0 ? (
            recipes.map(renderRecipeCard)
          ) : (
            <p>You haven't created any recipes yet. Create your first recipe!</p>
          )}
        </TabsContent>
        
        <TabsContent value="favorites">
          {isLoadingFavorites ? (
            renderSkeletons()
          ) : favoriteRecipes && favoriteRecipes.length > 0 ? (
            favoriteRecipes.map(renderRecipeCard)
          ) : (
            <p>You don't have any favorite recipes yet.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RecipeList;