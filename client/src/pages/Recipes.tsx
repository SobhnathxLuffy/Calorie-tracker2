import React from 'react';
import { Route, Switch } from 'wouter';
import RecipeList from '../components/RecipeList';
import RecipeForm from '../components/RecipeForm';
import { Card, CardContent } from '@/components/ui/card';

// Placeholder component for recipe details - this will be implemented later
const RecipeDetails = ({ params }: { params: { id: string } }) => (
  <div>
    <h2>Recipe Details (ID: {params.id})</h2>
    <p>This page will show detailed recipe information</p>
  </div>
);

const Recipes = () => {
  // Hardcoded user ID for now - in a real app, this would come from authentication
  const userId = 1;

  // Get the current path
  const path = window.location.pathname;

  // Render content based on the path
  let content;
  if (path === "/recipes/new") {
    content = <RecipeForm />;
  } else if (path.startsWith("/recipes/edit/")) {
    const id = path.replace("/recipes/edit/", "");
    content = <RecipeForm params={{ id }} />;
  } else if (path.match(/^\/recipes\/\d+$/)) {
    const id = path.replace("/recipes/", "");
    content = <RecipeDetails params={{ id }} />;
  } else {
    content = <RecipeList userId={userId} />;
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <Card>
        <CardContent className="p-6">
          {content}
        </CardContent>
      </Card>
    </div>
  );
};

export default Recipes;