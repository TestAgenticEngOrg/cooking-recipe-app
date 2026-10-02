import ballerina/http;

// Wire types mirrored from specs/design/components/recipe-api/openapi.yaml.
// Field names and required-ness match the contract exactly.

public type ApiError record {|
    int code;
    string message;
    string description?;
    string moreInfo?;
|};

public type Recipe record {|
    string id;
    string title;
    string category;
    string[] tags?;
    string[] ingredients;
    string[] steps;
    string? photoUrl = ();
    boolean isFavorite = false;
    string? sourceUrl = ();
    string createdAt?;
|};

public type RecipeInput record {|
    string title;
    string category;
    string[] tags?;
    string[] ingredients;
    string[] steps;
    boolean isFavorite?;
|};

public type MealPlanEntry record {|
    string id;
    string recipeId;
    string recipeTitle?;
    string plannedDate;
|};

public type MealPlanEntryInput record {|
    string recipeId;
    string plannedDate;
|};

public type ShoppingListItem record {|
    string id;
    string recipeId;
    string recipeTitle?;
    string ingredientText;
    boolean isChecked;
|};

public type PhotoInput record {|
    string photo;
|};

public type CheckedInput record {|
    boolean isChecked;
|};

public type RecipePage record {|
    int count;
    string? next = ();
    string? previous = ();
    Recipe[] data;
|};

public type MealPlanPage record {|
    int count;
    string? next = ();
    string? previous = ();
    MealPlanEntry[] data;
|};

public type ShoppingListPage record {|
    int count;
    string? next = ();
    string? previous = ();
    ShoppingListItem[] data;
|};

public type ShoppingListGeneratedResponse record {|
    int count;
    ShoppingListItem[] data;
|};

public type ErrorBadRequest record {|
    *http:BadRequest;
    ApiError body;
|};

public type ErrorNotFound record {|
    *http:NotFound;
    ApiError body;
|};
