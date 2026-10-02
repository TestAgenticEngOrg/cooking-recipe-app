Feature: Meal planning and shopping

  @story-7
  Rule: A Cook can assign recipes to days of a weekly meal plan

    Scenario: Planning a recipe for a day
      Given Maria has a recipe titled "Grandma's Chili"
      When Maria assigns "Grandma's Chili" to Monday on her meal plan
      Then Monday on Maria's meal plan shows "Grandma's Chili"

    Scenario: Removing a recipe from the plan
      Given Maria has assigned "Pancakes" to Tuesday on her meal plan
      When Maria removes "Pancakes" from Tuesday
      Then Tuesday on Maria's meal plan no longer shows "Pancakes"

  @story-8
  Rule: A Cook can generate a shopping list from their meal plan, listed separately per recipe

    Scenario: Generating a shopping list from two planned recipes
      Given Maria has planned "Grandma's Chili" for Monday and "Pancakes" for Tuesday
      When Maria generates her shopping list
      Then the shopping list shows the ingredients of "Grandma's Chili" and the ingredients of "Pancakes" as separate entries

    @negative
    Scenario: An empty meal plan produces no shopping list items
      Given Maria has no recipes planned this week
      When Maria generates her shopping list
      Then her shopping list is empty

  @story-9
  Rule: A Cook can check off shopping list items as they buy them

    Scenario: Checking off a purchased item
      Given Maria's shopping list has an unchecked item "1 can kidney beans"
      When Maria checks off "1 can kidney beans"
      Then "1 can kidney beans" is shown as checked on her shopping list
