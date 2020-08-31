import Search from './models/Search';
import Recipe from './models/Recipe';
import List from './models/List';
import Likes from './models/Likes';
import * as searchView from './views/searchView';
import * as recipeView from './views/recipeView';
import * as listView from './views/listView';
import * as likesView from './views/likesView';
import { elements, renderLoader, clearLoader } from './views/base';

/** Global state of app
*
* - Search object
* - Current recipe object
* - Shopping list object
* - Liked recipes
*
**/

const state = {};
window.state = state;

/**
* Search Controller
**/
const controlSearch = async () => {
  // 1. Get query from view
  const query = searchView.getInput();

  if (query) {
    // 2. New search object and add to state
    state.search = new Search(query);

    // 3. Prepare UI for results
    searchView.clearInput();
    searchView.clearResults();
    renderLoader(elements.searchRes);

    try {
      // 4. Search for recipes
      await state.search.getResults();

      // 5. Render results on UI
      clearLoader();
      searchView.renderResults(state.search.result);
    } catch (error) {
      alert('Something went wrong with the search query.');
      clearLoader();
    }

  }
};

elements.searchForm.addEventListener('submit', e => {
  e.preventDefault();
  controlSearch();
});

elements.searchResPages.addEventListener('click', e => {
  const btn = e.target.closest('.btn-inline');

  if (btn) {
    const goToPage = parseInt(btn.dataset.goto, 10);
    searchView.clearResults();
    searchView.renderResults(state.search.result, goToPage);
  }
});

/**
* Recipe Controller
**/
const controlRecipe = async () => {
  // Get ID from url
  const id = window.location.hash.replace('#', '');

  if (id) {
    // 1. Prepare UI for changes
    recipeView.clearRecipe();
    renderLoader(elements.recipe);

    // Highlight selected search item
    if (state.search) searchView.highlightSelected(id);

    // 2. Create new recipe object
    state.recipe = new Recipe(id);

    try {
      // 3. Get recipe data & parse ingredients
      await state.recipe.getRecipe();
      state.recipe.parseIngredients();

      // 4. Calculate servings & time
      state.recipe.calcTime();
      state.recipe.calcServings();

      // 5. Render recipe
      clearLoader();
      recipeView.renderRecipe(
        state.recipe,
        state.likes.isLiked(id)
      );

    } catch (error) {
      alert('Error processing recipe.');
    }

  }
};

['hashchange', 'load'].forEach(event => window.addEventListener(event, controlRecipe));

/**
* List Controller
**/
const controlList = () => {
  // 1. Create a new list if there is none yet
  if (!state.list) state.list = new List();

  // 2. Add each ingredient to the list and UI
  state.recipe.ingredients.forEach(el => {
    const item = state.list.addItem(el.count, el.unit, el.ingredient);
    listView.renderItem(item);
  });
};

// Handle update & delete list item events
elements.shopping.addEventListener('click', e => {
  const id = e.target.closest('.shopping__item').dataset.itemid;

  // Handle the delete button event
  if (e.target.matches('.shopping__delete, .shopping__delete *')) {
    // Delete from state
    state.list.deleteItem(id);
    // Delete from UI
    listView.deleteItem(id);

  // Handle the count update
  } else if (e.target.matches('.shopping__count-value')) {
    const val = parseFloat(e.target.value, 10);
    state.list.updateCount(id, val);
  }
});

/**
* Like Controller
**/

// Temporary fix
state.likes = new Likes();
likesView.toggleLikesMenu(state.likes.getLikesTotal());

const controlLike = () => {
  const currentID = state.recipe.id;
  if (!state.likes) state.likes = new Likes();

  if (!state.likes.isLiked(currentID)) {
    // User has not yet liked current recipe
    // 1. Add like to the state
    const newLike = state.likes.addLike(
      currentID,
      state.recipe.title,
      state.recipe.author,
      state.recipe.img
    );

    // 2. Toggle the like button
    likesView.toggleLikeBtn(true);

    // 3. Add like to the UI list
    likesView.renderLike(newLike);

  } else {
    // User has liked current recipe
    // 1. Remove like from the state
    state.likes.deleteLike(currentID);

    // 2. Toggle the like button
    likesView.toggleLikeBtn(false);

    // 3. Remove like from the UI list
    likesView.deleteLike(currentID);
  }
  likesView.toggleLikesMenu(state.likes.getLikesTotal());
};

// Handling recipe button clicks
elements.recipe.addEventListener('click', e => {
  if (e.target.matches('.btn-decrease, .btn-decrease *')) {
    // Decrease button has been clicked
    if (state.recipe.servings > 1) {
      state.recipe.updateServings('dec');
      recipeView.updateServingsIngredients(state.recipe);
    }
  } else if (e.target.matches('.btn-increase, .btn-increase *')) {
    // Increase button has been clicked
    state.recipe.updateServings('inc');
    recipeView.updateServingsIngredients(state.recipe);
  } else if (e.target.matches('.recipe__btn-add, .recipe__btn-add *')) {
    // Add ingredients to shopping list
    controlList();
  } else if (e.target.matches('.recipe__love, .recipe__love *')) {
    // Call Like controller
    controlLike();
  }
});
