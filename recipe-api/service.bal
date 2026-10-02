import ballerina/http;
import ballerina/log;

listener http:Listener ep0 = new (9090);

function internalError(error err) returns http:InternalServerError {
    log:printError("unexpected error", 'error = err);
    return <http:InternalServerError>{body: {code: 500, message: "internal error"}};
}

function pageLinks(string basePath, int count, int 'limit, int offset) returns [string?, string?] {
    string? next = ();
    if offset + 'limit < count {
        next = basePath + "?limit=" + 'limit.toString() + "&offset=" + (offset + 'limit).toString();
    }
    string? previous = ();
    if offset > 0 {
        int prevOffset = offset - 'limit > 0 ? offset - 'limit : 0;
        previous = basePath + "?limit=" + 'limit.toString() + "&offset=" + prevOffset.toString();
    }
    return [next, previous];
}

service http:InterceptableService / on ep0 {
    public function createInterceptors() returns AssertionInterceptor => new;

    # The caller's recipes, searchable by title, category or tag
    resource function get me/recipes(http:RequestContext ctx, string? q, string? category, string? tag,
            int 'limit = 20, int offset = 0) returns RecipePage|http:Unauthorized|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return caller;
        }
        [Recipe[], int]|error result = listRecipes(caller.userId, q, category, tag, 'limit, offset);
        if result is error {
            return internalError(result);
        }
        [Recipe[], int] [recipes, total] = result;
        [string?, string?] [next, previous] = pageLinks("/me/recipes", total, 'limit, offset);
        return {count: total, next, previous, data: recipes};
    }

    # Add a new recipe to the caller's collection
    resource function post me/recipes(http:RequestContext ctx, @http:Payload RecipeInput payload)
            returns http:Created|ErrorBadRequest|http:Unauthorized|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return caller;
        }
        Recipe|error result = createRecipe(caller.userId, payload);
        if result is ValidationError {
            return <ErrorBadRequest>{body: {code: 400, message: result.message()}};
        }
        if result is error {
            return internalError(result);
        }
        return <http:Created>{body: result};
    }

    # The caller's recipe by id
    resource function get me/recipes/[string recipeId](http:RequestContext ctx)
            returns Recipe|ErrorNotFound|http:Unauthorized|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return caller;
        }
        Recipe|error result = getRecipe(caller.userId, recipeId);
        if result is NotFoundError {
            return <ErrorNotFound>{body: {code: 404, message: result.message()}};
        }
        if result is error {
            return internalError(result);
        }
        return result;
    }

    # Edit a recipe, favorite it, or change its fields
    resource function put me/recipes/[string recipeId](http:RequestContext ctx, @http:Payload RecipeInput payload)
            returns Recipe|ErrorBadRequest|ErrorNotFound|http:Unauthorized|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return caller;
        }
        Recipe|error result = updateRecipe(caller.userId, recipeId, payload);
        if result is ValidationError {
            return <ErrorBadRequest>{body: {code: 400, message: result.message()}};
        }
        if result is NotFoundError {
            return <ErrorNotFound>{body: {code: 404, message: result.message()}};
        }
        if result is error {
            return internalError(result);
        }
        return result;
    }

    # Remove a recipe from the caller's collection
    resource function delete me/recipes/[string recipeId](http:RequestContext ctx)
            returns http:NoContent|ErrorNotFound|http:Unauthorized|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return caller;
        }
        error? result = deleteRecipe(caller.userId, recipeId);
        if result is NotFoundError {
            return <ErrorNotFound>{body: {code: 404, message: result.message()}};
        }
        if result is error {
            return internalError(result);
        }
        return http:NO_CONTENT;
    }

    # Attach or replace the finished-meal photo on a recipe
    resource function put me/recipes/[string recipeId]/photo(http:RequestContext ctx, @http:Payload PhotoInput payload)
            returns Recipe|ErrorBadRequest|ErrorNotFound|http:Unauthorized|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return caller;
        }
        Recipe|error result = setRecipePhoto(caller.userId, recipeId, payload.photo);
        if result is ValidationError {
            return <ErrorBadRequest>{body: {code: 400, message: result.message()}};
        }
        if result is NotFoundError {
            return <ErrorNotFound>{body: {code: 404, message: result.message()}};
        }
        if result is error {
            return internalError(result);
        }
        return result;
    }

    # The caller's planned recipes by day
    resource function get me/meal\-plan(http:RequestContext ctx, string? 'from, string? to,
            int 'limit = 20, int offset = 0) returns MealPlanPage|http:Unauthorized|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return caller;
        }
        [MealPlanEntry[], int]|error result = listMealPlan(caller.userId, 'from, to, 'limit, offset);
        if result is error {
            return internalError(result);
        }
        [MealPlanEntry[], int] [entries, total] = result;
        [string?, string?] [next, previous] = pageLinks("/me/meal-plan", total, 'limit, offset);
        return {count: total, next, previous, data: entries};
    }

    # Assign a recipe to a day on the caller's plan
    resource function post me/meal\-plan(http:RequestContext ctx, @http:Payload MealPlanEntryInput payload)
            returns http:Created|ErrorBadRequest|ErrorNotFound|http:Unauthorized|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return caller;
        }
        MealPlanEntry|error result = addMealPlanEntry(caller.userId, payload);
        if result is ValidationError {
            return <ErrorBadRequest>{body: {code: 400, message: result.message()}};
        }
        if result is NotFoundError {
            return <ErrorNotFound>{body: {code: 404, message: result.message()}};
        }
        if result is error {
            return internalError(result);
        }
        return <http:Created>{body: result};
    }

    # Remove a recipe from a day on the caller's plan
    resource function delete me/meal\-plan/[string entryId](http:RequestContext ctx)
            returns http:NoContent|ErrorNotFound|http:Unauthorized|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return caller;
        }
        error? result = removeMealPlanEntry(caller.userId, entryId);
        if result is NotFoundError {
            return <ErrorNotFound>{body: {code: 404, message: result.message()}};
        }
        if result is error {
            return internalError(result);
        }
        return http:NO_CONTENT;
    }

    # Rebuild the caller's shopping list from their current meal plan, listed per recipe
    resource function post me/shopping\-list/generate(http:RequestContext ctx)
            returns http:Ok|http:Unauthorized|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return caller;
        }
        ShoppingListItem[]|error result = generateShoppingList(caller.userId);
        if result is error {
            return internalError(result);
        }
        ShoppingListGeneratedResponse generated = {count: result.length(), data: result};
        return <http:Ok>{body: generated};
    }

    # The caller's current shopping list
    resource function get me/shopping\-list(http:RequestContext ctx, int 'limit = 20, int offset = 0)
            returns ShoppingListPage|http:Unauthorized|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return caller;
        }
        [ShoppingListItem[], int]|error result = listShoppingList(caller.userId, 'limit, offset);
        if result is error {
            return internalError(result);
        }
        [ShoppingListItem[], int] [items, total] = result;
        [string?, string?] [next, previous] = pageLinks("/me/shopping-list", total, 'limit, offset);
        return {count: total, next, previous, data: items};
    }

    # Check or uncheck a shopping list item
    resource function patch me/shopping\-list/[string itemId](http:RequestContext ctx, @http:Payload CheckedInput payload)
            returns ShoppingListItem|ErrorNotFound|http:Unauthorized|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return caller;
        }
        ShoppingListItem|error result = updateShoppingListItem(caller.userId, itemId, payload.isChecked);
        if result is NotFoundError {
            return <ErrorNotFound>{body: {code: 404, message: result.message()}};
        }
        if result is error {
            return internalError(result);
        }
        return result;
    }
}
