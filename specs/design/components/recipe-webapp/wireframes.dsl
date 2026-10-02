screen Recipes "Browse and search the Cook's recipe collection"
  navbar "Recipe Keeper | Recipes -> Recipes | Meal Plan -> MealPlan | Shopping List -> ShoppingList"
  row
    search "Search by title"
    select "Category"
    select "Tag"
    right
    button "Import from text or URL" -> ImportRecipe
    button "New Recipe" primary -> NewRecipe
  table "Title | Category | Tags | Favorite" -> RecipeDetail
    row "Grandma's Chili | Dinner | spicy, beef | ★"
    row "Pancakes | Breakfast | sweet | "
    row "Garden Salad | Lunch | vegan, quick | ★"

screen RecipeDetail "Full view of one recipe"
  navbar "Recipe Keeper | Recipes -> Recipes | Meal Plan -> MealPlan | Shopping List -> ShoppingList"
  row
    heading "Grandma's Chili"
    right
    badge "Favorite" success
    button "Edit" -> EditRecipe
    button "Delete"
  image "Finished meal photo"
  text "Category: Dinner  |  Tags: spicy, beef"
  card "Ingredients"
    list "2 lb ground beef | 1 can kidney beans | 2 cups diced tomatoes | 1 onion, chopped"
  card "Steps"
    list "Brown the beef | Add onions and cook until soft | Stir in beans and tomatoes | Simmer 30 minutes"
  button "Add to meal plan" -> MealPlan

screen NewRecipe "Manually enter a new recipe"
  navbar "Recipe Keeper | Recipes -> Recipes | Meal Plan -> MealPlan | Shopping List -> ShoppingList"
  heading "New Recipe"
  input "Title"
  select "Category"
  input "Tags (comma separated)"
  textarea "Ingredients, one per line"
  textarea "Steps, one per line"
  row
    right
    button "Cancel" -> Recipes
    button "Save Recipe" primary -> Recipes

screen EditRecipe "Edit an existing recipe"
  navbar "Recipe Keeper | Recipes -> Recipes | Meal Plan -> MealPlan | Shopping List -> ShoppingList"
  heading "Edit Recipe"
  input "Title"
  select "Category"
  input "Tags (comma separated)"
  textarea "Ingredients, one per line"
  textarea "Steps, one per line"
  toggle "Favorite" active
  image "Finished meal photo"
  button "Replace photo"
  row
    right
    button "Cancel" -> RecipeDetail
    button "Save Changes" primary -> RecipeDetail

screen ImportRecipe "Paste recipe text or a URL for the agent to extract"
  navbar "Recipe Keeper | Recipes -> Recipes | Meal Plan -> MealPlan | Shopping List -> ShoppingList"
  heading "Import a Recipe"
  textarea "Paste recipe text"
  input "...or a recipe URL"
  row
    right
    button "Extract Recipe" primary -> ReviewImportedRecipe

screen ReviewImportedRecipe "Review and correct the agent's extracted draft before saving"
  navbar "Recipe Keeper | Recipes -> Recipes | Meal Plan -> MealPlan | Shopping List -> ShoppingList"
  heading "Review Extracted Recipe"
  badge "AI Draft" ai
  input "Title"
  select "Category"
  input "Tags (comma separated)"
  textarea "Ingredients, one per line"
  textarea "Steps, one per line"
  row
    right
    button "Discard" -> Recipes
    button "Save Recipe" primary -> Recipes

screen MealPlan "Assign recipes to days of the week"
  navbar "Recipe Keeper | Recipes -> Recipes | Meal Plan -> MealPlan | Shopping List -> ShoppingList"
  heading "Weekly Meal Plan"
  table "Day | Recipe" -> Recipes
    row "Monday | Grandma's Chili"
    row "Tuesday | Pancakes"
    row "Wednesday | -"
  row
    right
    button "Assign Recipe to Day"
    button "Generate Shopping List" primary -> ShoppingList

screen ShoppingList "Check off items while shopping, listed per recipe"
  navbar "Recipe Keeper | Recipes -> Recipes | Meal Plan -> MealPlan | Shopping List -> ShoppingList"
  heading "Shopping List"
  card "Grandma's Chili"
    checkbox "2 lb ground beef"
    checkbox "1 can kidney beans" active
    checkbox "2 cups diced tomatoes"
  card "Pancakes"
    checkbox "2 cups flour"
    checkbox "1 cup milk"
  row
    right
    button "Regenerate from Meal Plan" -> MealPlan

flow "Keep and cook recipes"
  role "Cook"
  description "A Cook browses, creates, imports, plans and shops from their recipe collection"
  Recipes
  RecipeDetail
  NewRecipe
  EditRecipe
  ImportRecipe
  ReviewImportedRecipe
  MealPlan
  ShoppingList
