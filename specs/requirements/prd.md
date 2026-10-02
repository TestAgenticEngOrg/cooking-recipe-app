# Cooking Recipe App — PRD

## Problem Statement

Home cooks collect recipes from many places — handwritten notes, screenshots,
bookmarked web pages, memory — and the collection quickly becomes
unmanageable. Finding "that one recipe" or figuring out what to cook and buy
for the week takes more effort than it should, and retyping a recipe found
online or in a text message is tedious busywork.

## Solution

A personal recipe-keeping app where a cook builds and organizes their own
recipe collection, finds recipes quickly by category or tag, plans meals for
the week, and gets a shopping list generated from that plan. Entering a new
recipe can be done by hand or by handing the app raw text or a link, which an
agent turns into a structured recipe for the cook to review.

## Actors

- **Cook** — a signed-in user who creates, edits, organizes, searches, plans
with, and deletes their own recipes. Every recipe and meal plan belongs to
exactly one Cook; there is no sharing or public visibility.

## User Stories

1. As a Cook, I want to create a new recipe with a title, ingredients, steps,
a category and tags, so that I can keep track of how to make it.
2. As a Cook, I want to edit or delete a recipe, so that I can keep my
collection accurate.
3. As a Cook, I want to browse and search my recipes by title, category or
tag, so that I can quickly find what I want to cook.
4. As a Cook, I want to mark recipes as favorites, so that I can find the
ones I cook most often.
5. As a Cook, I want to paste recipe text or give a recipe URL and have it
automatically extracted into a structured recipe, so that I don't have to
retype it by hand.
6. As a Cook, I want to review and edit an agent-extracted recipe before it
is saved, so that I can correct anything the extraction got wrong.
7. As a Cook, I want to add recipes to a weekly meal plan, so that I can plan
what to cook each day.
8. As a Cook, I want to generate a shopping list from my meal plan, so that I
know what ingredients to buy.
9. As a Cook, I want to check off items on my shopping list as I buy them, so
that I can track my shopping progress.
10. As a Cook, I want to upload a photo of the finished meal to its recipe,
so that I can remember what it's supposed to look like.

## Product Decisions

- Sign-in: every Cook signs in via SSO through Thunder, the platform IDP (org
default).
- Actors: a single Cook actor; no recipe sharing or public browsing (per the
user's decision).
- Organization: recipes are organized with a category plus free-form tags,
searchable by either (per the user's decision).
- Meal planning: Cooks assign recipes to days of a weekly plan, and a
shopping list is generated from that plan (per the user's decision).
- Recipe import: an agent extracts a structured recipe (title, ingredients,
steps) from pasted text or a recipe URL, which the Cook reviews before
saving (per the user's decision).
- Shopping-list generation lists ingredients separately per recipe rather
than combining matching ingredients across recipes (per the user's
decision).
- Guardrail: a URL the Cook submits for recipe extraction is checked for
reachability before the agent fetches it, so a broken or unreachable link
fails fast with a clear error instead of a confusing agent failure (per the
user's decision).
- Serving-size scaling is not included (per the user's decision — see Out of
Scope).
- Photo: a Cook may attach one photo of the finished meal to a recipe; it's
optional and purely illustrative, with no gallery or multi-photo support.

## Out of Scope

- Recalculating ingredient quantities for different serving sizes.
- Sharing recipes between users, or any publicly browsable recipe collection.
- Nutritional information or calorie calculation.
- Notifications or reminders (e.g. meal-plan or shopping reminders).

## Open Questions

None at this time.

## Further Notes

None.