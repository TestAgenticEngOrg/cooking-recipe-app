Feature: Recipe import via agent

  @story-5
  Rule: A Cook can have a recipe extracted automatically from pasted text or a recipe URL

    Scenario: Extracting a recipe from pasted text
      Given Maria has pasted recipe text for "Lemon Bars" including its ingredients and steps
      When Maria asks the agent to extract the recipe
      Then the agent returns a draft recipe titled "Lemon Bars" with its ingredients and steps filled in

    @negative
    Scenario: An unreachable recipe URL is refused before extraction
      Given Maria submits the unreachable URL "https://example.invalid/no-such-recipe"
      When Maria asks the agent to extract the recipe
      Then no draft recipe is produced and Maria is told the link could not be reached

  @story-6
  Rule: A Cook reviews and edits an agent-extracted draft before it is saved

    Scenario: Correcting a draft before saving
      Given the agent has produced a draft recipe titled "Lemon Bars" with the category left blank
      When Maria sets the draft's category to "Dessert" and saves it
      Then "Lemon Bars" appears in Maria's recipe collection with category "Dessert"

    @negative
    Scenario: Discarding an unwanted draft
      Given the agent has produced a draft recipe titled "Lemon Bars"
      When Maria discards the draft instead of saving it
      Then "Lemon Bars" does not appear in Maria's recipe collection
