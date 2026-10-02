// recipe-api's `category` field is a free-form string (openapi.yaml), so this
// is this app's own suggested list, not a contract constraint.
export const CATEGORY_OPTIONS = ["Breakfast", "Lunch", "Dinner", "Dessert", "Snack"] as const;
