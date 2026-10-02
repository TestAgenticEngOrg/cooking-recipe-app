Feature: Recipe management

  @story-1
  Rule: A Cook can create a new recipe with a title, ingredients, steps, a category and tags

    Scenario: Adding a new recipe
      Given Maria is signed in
      When Maria creates a recipe titled "Grandma's Chili" with category "Dinner", tags "spicy, beef", ingredients "2 lb ground beef, 1 can kidney beans" and steps "Brown the beef, Add beans and simmer"
      Then "Grandma's Chili" appears in Maria's recipe collection

    @negative
    Scenario: A recipe without a title is refused
      Given Maria is signed in
      When Maria tries to create a recipe with no title, category "Dinner", ingredients "Salt" and steps "Season it"
      Then no new recipe is added to Maria's collection

  @story-2
  Rule: A Cook can edit or delete their own recipe

    Scenario: Editing a recipe's ingredients
      Given Maria has a recipe titled "Pancakes" with ingredients "2 cups flour, 1 cup milk"
      When Maria edits "Pancakes" to add the ingredient "1 egg"
      Then "Pancakes" now lists the ingredient "1 egg"

    Scenario: Deleting a recipe
      Given Maria has a recipe titled "Garden Salad"
      When Maria deletes "Garden Salad"
      Then "Garden Salad" no longer appears in Maria's recipe collection

  @story-3
  Rule: A Cook can search and filter their recipes by title, category or tag

    Scenario: Searching by title
      Given Maria has recipes titled "Grandma's Chili" and "Garden Salad"
      When Maria searches her recipes for "Chili"
      Then only "Grandma's Chili" appears in the results

    Scenario: Filtering by category
      Given Maria has a recipe titled "Pancakes" in category "Breakfast" and a recipe titled "Grandma's Chili" in category "Dinner"
      When Maria filters her recipes by category "Breakfast"
      Then only "Pancakes" appears in the results

  @story-4
  Rule: A Cook can mark their own recipe as a favorite

    Scenario: Favoriting a recipe
      Given Maria has a recipe titled "Grandma's Chili" that is not a favorite
      When Maria marks "Grandma's Chili" as a favorite
      Then "Grandma's Chili" is shown as a favorite in Maria's collection

  @story-10
  Rule: A Cook can attach a photo of the finished meal to their recipe

    Scenario: Attaching a photo
      Given Maria has a recipe titled "Pancakes" with no photo
      When Maria uploads a photo of the finished pancakes to "Pancakes"
      Then "Pancakes" shows the uploaded photo

    @negative
    Scenario: Recipes without a photo still display normally
      Given Maria has a recipe titled "Garden Salad" with no photo attached
      When Maria opens "Garden Salad"
      Then the recipe details are shown without a photo
