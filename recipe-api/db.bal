import ballerina/lang.array;
import ballerina/sql;
import ballerina/time;
import ballerina/uuid;
import ballerinax/postgresql;
import ballerinax/postgresql.driver as _;

// A row that exists but does not belong to the caller, or does not exist at
// all, is the same outcome from the caller's side: 404.
public type NotFoundError distinct error;

// Input the caller sent fails a business rule (e.g. a blank title).
public type ValidationError distinct error;

function dbPort() returns int {
    int|error parsed = int:fromString(recipeDbPort);
    if parsed is int {
        return parsed;
    }
    return 5432;
}

// The pool is built lazily, on the first call that actually needs it, rather
// than at module init. recipe-db's env vars are blank until the platform
// wires the dependency, and a service that cannot even START without a
// reachable database fails every request instead of only the ones that touch
// one — and, in this sandbox, blocks `bal test` entirely (its gateway
// assertion cases need no database at all).
postgresql:Client? dbClientInstance = ();
boolean dbSchemaReady = false;

function getDbClient() returns postgresql:Client|error {
    postgresql:Client? existing = dbClientInstance;
    if existing is postgresql:Client {
        return existing;
    }
    postgresql:Client newClient = check new (
        host = recipeDbHost,
        username = recipeDbUser,
        password = recipeDbPassword,
        database = recipeDbName,
        port = dbPort()
    );
    dbClientInstance = newClient;
    if !dbSchemaReady {
        check initDb(newClient);
        dbSchemaReady = true;
    }
    return newClient;
}

function initDb(postgresql:Client dbClient) returns error? {
    _ = check dbClient->execute(`
        CREATE TABLE IF NOT EXISTS recipe (
            id TEXT PRIMARY KEY,
            cook_id TEXT NOT NULL,
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            photo_url TEXT,
            is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
            source_url TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    `);
    _ = check dbClient->execute(`
        CREATE TABLE IF NOT EXISTS recipe_ingredient (
            id TEXT PRIMARY KEY,
            recipe_id TEXT NOT NULL REFERENCES recipe(id) ON DELETE CASCADE,
            text TEXT NOT NULL,
            sort_order INT NOT NULL
        )
    `);
    _ = check dbClient->execute(`
        CREATE TABLE IF NOT EXISTS recipe_step (
            id TEXT PRIMARY KEY,
            recipe_id TEXT NOT NULL REFERENCES recipe(id) ON DELETE CASCADE,
            sort_order INT NOT NULL,
            instruction TEXT NOT NULL
        )
    `);
    _ = check dbClient->execute(`
        CREATE TABLE IF NOT EXISTS tag (
            id TEXT PRIMARY KEY,
            cook_id TEXT NOT NULL,
            name TEXT NOT NULL,
            CONSTRAINT tag_cook_name_unique UNIQUE (cook_id, name)
        )
    `);
    _ = check dbClient->execute(`
        CREATE TABLE IF NOT EXISTS recipe_tag (
            recipe_id TEXT NOT NULL REFERENCES recipe(id) ON DELETE CASCADE,
            tag_id TEXT NOT NULL REFERENCES tag(id) ON DELETE CASCADE,
            PRIMARY KEY (recipe_id, tag_id)
        )
    `);
    _ = check dbClient->execute(`
        CREATE TABLE IF NOT EXISTS meal_plan_entry (
            id TEXT PRIMARY KEY,
            cook_id TEXT NOT NULL,
            recipe_id TEXT NOT NULL REFERENCES recipe(id) ON DELETE CASCADE,
            planned_date TEXT NOT NULL
        )
    `);
    _ = check dbClient->execute(`
        CREATE TABLE IF NOT EXISTS shopping_list_item (
            id TEXT PRIMARY KEY,
            cook_id TEXT NOT NULL,
            recipe_id TEXT NOT NULL REFERENCES recipe(id) ON DELETE CASCADE,
            ingredient_text TEXT NOT NULL,
            is_checked BOOLEAN NOT NULL DEFAULT FALSE
        )
    `);
    return ();
}

type RecipeRow record {|
    string id;
    string title;
    string category;
    string? photoUrl;
    boolean isFavorite;
    string? sourceUrl;
    time:Utc createdAt;
|};

type TextRow record {|
    string text;
|};

type InstructionRow record {|
    string instruction;
|};

type NameRow record {|
    string name;
|};

type IdRow record {|
    string id;
|};

type CountRow record {|
    int total;
|};

type TitleRow record {|
    string title;
|};

function fetchIngredients(string recipeId) returns string[]|error {
    postgresql:Client dbClient = check getDbClient();
    stream<TextRow, sql:Error?> rows = dbClient->query(`
        SELECT text FROM recipe_ingredient WHERE recipe_id = ${recipeId} ORDER BY sort_order
    `);
    return from TextRow row in rows select row.text;
}

function fetchSteps(string recipeId) returns string[]|error {
    postgresql:Client dbClient = check getDbClient();
    stream<InstructionRow, sql:Error?> rows = dbClient->query(`
        SELECT instruction FROM recipe_step WHERE recipe_id = ${recipeId} ORDER BY sort_order
    `);
    return from InstructionRow row in rows select row.instruction;
}

function fetchTagNames(string recipeId) returns string[]|error {
    postgresql:Client dbClient = check getDbClient();
    stream<NameRow, sql:Error?> rows = dbClient->query(`
        SELECT t.name AS name FROM recipe_tag rt JOIN tag t ON t.id = rt.tag_id
        WHERE rt.recipe_id = ${recipeId} ORDER BY t.name
    `);
    return from NameRow row in rows select row.name;
}

function toRecipe(RecipeRow row) returns Recipe|error {
    string[] ingredients = check fetchIngredients(row.id);
    string[] steps = check fetchSteps(row.id);
    string[] tags = check fetchTagNames(row.id);
    return {
        id: row.id,
        title: row.title,
        category: row.category,
        tags: tags,
        ingredients: ingredients,
        steps: steps,
        photoUrl: row.photoUrl,
        isFavorite: row.isFavorite,
        sourceUrl: row.sourceUrl,
        createdAt: time:utcToString(row.createdAt)
    };
}

function findOrCreateTag(string cookId, string name) returns string|error {
    postgresql:Client dbClient = check getDbClient();
    IdRow|error existing = dbClient->queryRow(`SELECT id FROM tag WHERE cook_id = ${cookId} AND name = ${name}`);
    if existing is IdRow {
        return existing.id;
    }
    if existing is sql:NoRowsError {
        string tagId = uuid:createRandomUuid();
        _ = check dbClient->execute(`INSERT INTO tag (id, cook_id, name) VALUES (${tagId}, ${cookId}, ${name})`);
        return tagId;
    }
    return existing;
}

function attachTags(string cookId, string recipeId, string[]? tagNames) returns error? {
    if tagNames is () {
        return ();
    }
    postgresql:Client dbClient = check getDbClient();
    foreach string name in tagNames {
        string trimmed = name.trim();
        if trimmed == "" {
            continue;
        }
        string tagId = check findOrCreateTag(cookId, trimmed);
        _ = check dbClient->execute(`
            INSERT INTO recipe_tag (recipe_id, tag_id) VALUES (${recipeId}, ${tagId})
            ON CONFLICT DO NOTHING
        `);
    }
    return ();
}

function replaceChildRows(string recipeId, string[] ingredients, string[] steps) returns error? {
    postgresql:Client dbClient = check getDbClient();
    _ = check dbClient->execute(`DELETE FROM recipe_ingredient WHERE recipe_id = ${recipeId}`);
    _ = check dbClient->execute(`DELETE FROM recipe_step WHERE recipe_id = ${recipeId}`);
    _ = check dbClient->execute(`DELETE FROM recipe_tag WHERE recipe_id = ${recipeId}`);
    foreach int i in 0 ..< ingredients.length() {
        string ingId = uuid:createRandomUuid();
        _ = check dbClient->execute(`
            INSERT INTO recipe_ingredient (id, recipe_id, text, sort_order) VALUES (${ingId}, ${recipeId}, ${ingredients[i]}, ${i})
        `);
    }
    foreach int i in 0 ..< steps.length() {
        string stepId = uuid:createRandomUuid();
        _ = check dbClient->execute(`
            INSERT INTO recipe_step (id, recipe_id, instruction, sort_order) VALUES (${stepId}, ${recipeId}, ${steps[i]}, ${i})
        `);
    }
    return ();
}

function validateRecipeInput(RecipeInput input) returns ValidationError? {
    if input.title.trim() == "" {
        return error ValidationError("title is required");
    }
    if input.category.trim() == "" {
        return error ValidationError("category is required");
    }
    return ();
}

public function createRecipe(string cookId, RecipeInput input) returns Recipe|error {
    ValidationError? invalid = validateRecipeInput(input);
    if invalid is ValidationError {
        return invalid;
    }
    postgresql:Client dbClient = check getDbClient();
    string recipeId = uuid:createRandomUuid();
    time:Utc now = time:utcNow();
    string title = input.title.trim();
    string category = input.category.trim();
    boolean isFavorite = input?.isFavorite ?: false;
    string? sourceUrl = ();
    string? photoUrl = ();
    _ = check dbClient->execute(`
        INSERT INTO recipe (id, cook_id, title, category, photo_url, is_favorite, source_url, created_at)
        VALUES (${recipeId}, ${cookId}, ${title}, ${category}, ${photoUrl}, ${isFavorite}, ${sourceUrl}, ${now})
    `);
    check replaceChildRows(recipeId, input.ingredients, input.steps);
    check attachTags(cookId, recipeId, input?.tags);
    RecipeRow row = check dbClient->queryRow(`
        SELECT id, title, category, photo_url AS photoUrl, is_favorite AS isFavorite,
               source_url AS sourceUrl, created_at AS createdAt
        FROM recipe WHERE id = ${recipeId}
    `);
    return toRecipe(row);
}

public function getRecipe(string cookId, string recipeId) returns Recipe|error {
    postgresql:Client dbClient = check getDbClient();
    RecipeRow|error row = dbClient->queryRow(`
        SELECT id, title, category, photo_url AS photoUrl, is_favorite AS isFavorite,
               source_url AS sourceUrl, created_at AS createdAt
        FROM recipe WHERE id = ${recipeId} AND cook_id = ${cookId}
    `);
    if row is sql:NoRowsError {
        return error NotFoundError("no such recipe for the caller");
    }
    if row is error {
        return row;
    }
    return toRecipe(row);
}

public function listRecipes(string cookId, string? q, string? category, string? tag, int 'limit, int offset)
        returns [Recipe[], int]|error {
    postgresql:Client dbClient = check getDbClient();
    sql:ParameterizedQuery whereClause = `WHERE r.cook_id = ${cookId}`;
    if q is string && q.trim() != "" {
        string likeTerm = "%" + q.trim() + "%";
        whereClause = sql:queryConcat(whereClause, ` AND r.title ILIKE ${likeTerm}`);
    }
    if category is string && category.trim() != "" {
        string categoryValue = category.trim();
        whereClause = sql:queryConcat(whereClause, ` AND r.category = ${categoryValue}`);
    }
    if tag is string && tag.trim() != "" {
        string tagValue = tag.trim();
        whereClause = sql:queryConcat(whereClause, ` AND EXISTS (
            SELECT 1 FROM recipe_tag rt JOIN tag t ON t.id = rt.tag_id
            WHERE rt.recipe_id = r.id AND t.cook_id = ${cookId} AND t.name = ${tagValue}
        )`);
    }

    sql:ParameterizedQuery countQuery = sql:queryConcat(`SELECT COUNT(*) AS total FROM recipe r `, whereClause);
    CountRow countRow = check dbClient->queryRow(countQuery);

    sql:ParameterizedQuery dataQuery = sql:queryConcat(
        `SELECT r.id, r.title, r.category, r.photo_url AS photoUrl, r.is_favorite AS isFavorite,
                r.source_url AS sourceUrl, r.created_at AS createdAt
         FROM recipe r `,
        whereClause,
        ` ORDER BY r.created_at DESC LIMIT ${'limit} OFFSET ${offset}`
    );
    stream<RecipeRow, sql:Error?> rowStream = dbClient->query(dataQuery);
    RecipeRow[] rows = check from RecipeRow row in rowStream select row;

    Recipe[] recipes = [];
    foreach RecipeRow row in rows {
        recipes.push(check toRecipe(row));
    }
    return [recipes, countRow.total];
}

public function updateRecipe(string cookId, string recipeId, RecipeInput input) returns Recipe|error {
    ValidationError? invalid = validateRecipeInput(input);
    if invalid is ValidationError {
        return invalid;
    }
    postgresql:Client dbClient = check getDbClient();
    string title = input.title.trim();
    string category = input.category.trim();
    boolean isFavorite = input?.isFavorite ?: false;
    sql:ExecutionResult result = check dbClient->execute(`
        UPDATE recipe SET title = ${title}, category = ${category},
               is_favorite = ${isFavorite}
        WHERE id = ${recipeId} AND cook_id = ${cookId}
    `);
    int? affected = result.affectedRowCount;
    if affected is int && affected == 0 {
        return error NotFoundError("no such recipe for the caller");
    }
    check replaceChildRows(recipeId, input.ingredients, input.steps);
    check attachTags(cookId, recipeId, input?.tags);
    RecipeRow row = check dbClient->queryRow(`
        SELECT id, title, category, photo_url AS photoUrl, is_favorite AS isFavorite,
               source_url AS sourceUrl, created_at AS createdAt
        FROM recipe WHERE id = ${recipeId}
    `);
    return toRecipe(row);
}

public function deleteRecipe(string cookId, string recipeId) returns error? {
    postgresql:Client dbClient = check getDbClient();
    sql:ExecutionResult result = check dbClient->execute(`
        DELETE FROM recipe WHERE id = ${recipeId} AND cook_id = ${cookId}
    `);
    int? affected = result.affectedRowCount;
    if affected is int && affected == 0 {
        return error NotFoundError("no such recipe for the caller");
    }
    return ();
}

public function setRecipePhoto(string cookId, string recipeId, string photoBase64) returns Recipe|error {
    byte[]|error decoded = array:fromBase64(photoBase64);
    if decoded is error {
        return error ValidationError("photo is not valid base64 image data");
    }
    postgresql:Client dbClient = check getDbClient();
    string photoUrl = "data:image/jpeg;base64," + photoBase64;
    sql:ExecutionResult result = check dbClient->execute(`
        UPDATE recipe SET photo_url = ${photoUrl} WHERE id = ${recipeId} AND cook_id = ${cookId}
    `);
    int? affected = result.affectedRowCount;
    if affected is int && affected == 0 {
        return error NotFoundError("no such recipe for the caller");
    }
    RecipeRow row = check dbClient->queryRow(`
        SELECT id, title, category, photo_url AS photoUrl, is_favorite AS isFavorite,
               source_url AS sourceUrl, created_at AS createdAt
        FROM recipe WHERE id = ${recipeId}
    `);
    return toRecipe(row);
}

type MealPlanRow record {|
    string id;
    string recipeId;
    string recipeTitle;
    string plannedDate;
|};

public function addMealPlanEntry(string cookId, MealPlanEntryInput input) returns MealPlanEntry|error {
    string recipeId = input.recipeId.trim();
    string plannedDate = input.plannedDate.trim();
    if recipeId == "" || plannedDate == "" {
        return error ValidationError("recipeId and plannedDate are required");
    }
    postgresql:Client dbClient = check getDbClient();
    TitleRow|error recipeRow = dbClient->queryRow(`SELECT title FROM recipe WHERE id = ${recipeId} AND cook_id = ${cookId}`);
    if recipeRow is sql:NoRowsError {
        return error NotFoundError("no such recipe for the caller");
    }
    if recipeRow is error {
        return recipeRow;
    }
    string entryId = uuid:createRandomUuid();
    _ = check dbClient->execute(`
        INSERT INTO meal_plan_entry (id, cook_id, recipe_id, planned_date) VALUES (${entryId}, ${cookId}, ${recipeId}, ${plannedDate})
    `);
    return {id: entryId, recipeId: recipeId, recipeTitle: recipeRow.title, plannedDate: plannedDate};
}

public function listMealPlan(string cookId, string? 'from, string? to, int 'limit, int offset)
        returns [MealPlanEntry[], int]|error {
    postgresql:Client dbClient = check getDbClient();
    sql:ParameterizedQuery whereClause = `WHERE m.cook_id = ${cookId}`;
    if 'from is string && 'from.trim() != "" {
        string fromValue = 'from.trim();
        whereClause = sql:queryConcat(whereClause, ` AND m.planned_date >= ${fromValue}`);
    }
    if to is string && to.trim() != "" {
        string toValue = to.trim();
        whereClause = sql:queryConcat(whereClause, ` AND m.planned_date <= ${toValue}`);
    }

    sql:ParameterizedQuery countQuery = sql:queryConcat(`SELECT COUNT(*) AS total FROM meal_plan_entry m `, whereClause);
    CountRow countRow = check dbClient->queryRow(countQuery);

    sql:ParameterizedQuery dataQuery = sql:queryConcat(
        `SELECT m.id, m.recipe_id AS recipeId, r.title AS recipeTitle, m.planned_date AS plannedDate
         FROM meal_plan_entry m JOIN recipe r ON r.id = m.recipe_id `,
        whereClause,
        ` ORDER BY m.planned_date LIMIT ${'limit} OFFSET ${offset}`
    );
    stream<MealPlanRow, sql:Error?> rowStream = dbClient->query(dataQuery);
    MealPlanRow[] rows = check from MealPlanRow row in rowStream select row;

    MealPlanEntry[] entries = [];
    foreach MealPlanRow row in rows {
        entries.push({
            id: row.id,
            recipeId: row.recipeId,
            recipeTitle: row.recipeTitle,
            plannedDate: row.plannedDate
        });
    }
    return [entries, countRow.total];
}

public function removeMealPlanEntry(string cookId, string entryId) returns error? {
    postgresql:Client dbClient = check getDbClient();
    sql:ExecutionResult result = check dbClient->execute(`
        DELETE FROM meal_plan_entry WHERE id = ${entryId} AND cook_id = ${cookId}
    `);
    int? affected = result.affectedRowCount;
    if affected is int && affected == 0 {
        return error NotFoundError("no such entry for the caller");
    }
    return ();
}

type RecipeIdRow record {|
    string recipeId;
|};

type ShoppingListRow record {|
    string id;
    string recipeId;
    string recipeTitle;
    string ingredientText;
    boolean isChecked;
|};

public function generateShoppingList(string cookId) returns ShoppingListItem[]|error {
    postgresql:Client dbClient = check getDbClient();
    _ = check dbClient->execute(`DELETE FROM shopping_list_item WHERE cook_id = ${cookId}`);

    stream<RecipeIdRow, sql:Error?> planned = dbClient->query(`
        SELECT DISTINCT recipe_id AS recipeId FROM meal_plan_entry WHERE cook_id = ${cookId}
    `);
    RecipeIdRow[] plannedRecipes = check from RecipeIdRow row in planned select row;

    ShoppingListItem[] items = [];
    foreach RecipeIdRow plannedRecipe in plannedRecipes {
        string recipeId = plannedRecipe.recipeId;
        TitleRow titleRow = check dbClient->queryRow(`SELECT title FROM recipe WHERE id = ${recipeId}`);
        string[] ingredients = check fetchIngredients(recipeId);
        foreach string ingredientText in ingredients {
            string itemId = uuid:createRandomUuid();
            _ = check dbClient->execute(`
                INSERT INTO shopping_list_item (id, cook_id, recipe_id, ingredient_text, is_checked)
                VALUES (${itemId}, ${cookId}, ${recipeId}, ${ingredientText}, FALSE)
            `);
            items.push({
                id: itemId,
                recipeId: recipeId,
                recipeTitle: titleRow.title,
                ingredientText: ingredientText,
                isChecked: false
            });
        }
    }
    return items;
}

public function listShoppingList(string cookId, int 'limit, int offset) returns [ShoppingListItem[], int]|error {
    postgresql:Client dbClient = check getDbClient();
    CountRow countRow = check dbClient->queryRow(`
        SELECT COUNT(*) AS total FROM shopping_list_item WHERE cook_id = ${cookId}
    `);
    stream<ShoppingListRow, sql:Error?> rowStream = dbClient->query(`
        SELECT s.id, s.recipe_id AS recipeId, r.title AS recipeTitle, s.ingredient_text AS ingredientText,
               s.is_checked AS isChecked
        FROM shopping_list_item s JOIN recipe r ON r.id = s.recipe_id
        WHERE s.cook_id = ${cookId}
        ORDER BY r.title, s.ingredient_text
        LIMIT ${'limit} OFFSET ${offset}
    `);
    ShoppingListRow[] rows = check from ShoppingListRow row in rowStream select row;

    ShoppingListItem[] items = [];
    foreach ShoppingListRow row in rows {
        items.push({
            id: row.id,
            recipeId: row.recipeId,
            recipeTitle: row.recipeTitle,
            ingredientText: row.ingredientText,
            isChecked: row.isChecked
        });
    }
    return [items, countRow.total];
}

public function updateShoppingListItem(string cookId, string itemId, boolean isChecked) returns ShoppingListItem|error {
    postgresql:Client dbClient = check getDbClient();
    sql:ExecutionResult result = check dbClient->execute(`
        UPDATE shopping_list_item SET is_checked = ${isChecked} WHERE id = ${itemId} AND cook_id = ${cookId}
    `);
    int? affected = result.affectedRowCount;
    if affected is int && affected == 0 {
        return error NotFoundError("no such item for the caller");
    }
    ShoppingListRow row = check dbClient->queryRow(`
        SELECT s.id, s.recipe_id AS recipeId, r.title AS recipeTitle, s.ingredient_text AS ingredientText,
               s.is_checked AS isChecked
        FROM shopping_list_item s JOIN recipe r ON r.id = s.recipe_id
        WHERE s.id = ${itemId} AND s.cook_id = ${cookId}
    `);
    return {
        id: row.id,
        recipeId: row.recipeId,
        recipeTitle: row.recipeTitle,
        ingredientText: row.ingredientText,
        isChecked: row.isChecked
    };
}
