/**
 * Custom Feature Categories
 * A module that allows creating custom feature categories on character sheets
 */

const MODULE_ID = "custom-feature-categories";

Hooks.once('init', () => {
  console.log(`${MODULE_ID} | Initializing Custom Feature Categories`);
});

// Add the category field to item sheets
Hooks.on("renderItemSheet", (app, html, data) => {
  // Only for features
  if (app.item.type !== 'feat') return;

  // Create the custom category input
  const customCategoryDiv = document.createElement('div');
  customCategoryDiv.classList.add('form-group');
  customCategoryDiv.innerHTML = `
    <label>Category</label>
    <div class="form-fields">
      <input type="text" name="flags.${MODULE_ID}.category" value="${app.item.getFlag(MODULE_ID, 'category') || ''}">
    </div>
  `;

  // Find the details tab
  const detailsTab = html[0].querySelector('.tab[data-tab="details"]');
  if (!detailsTab) return;

  // Insert at the top of the details tab
  const firstGroup = detailsTab.querySelector('.form-group');
  if (firstGroup) {
    firstGroup.parentNode.insertBefore(customCategoryDiv, firstGroup);
  } else {
    detailsTab.appendChild(customCategoryDiv);
  }
});

// Reorganize features on the character sheet
Hooks.on("renderActorSheet5eCharacter", (app, html, data) => {
  const featuresTab = html[0].querySelector('.tab.features');
  if (!featuresTab) return;

  // Get all features
  const features = app.actor.items.filter(i => i.type === 'feat');
  
  // Group by category
  const categories = {};
  const uncategorized = [];
  
  // First pass - collect category information
  for (const feature of features) {
    const category = feature.getFlag(MODULE_ID, 'category');
    if (category) {
      if (!categories[category]) categories[category] = [];
      categories[category].push(feature);
    } else {
      uncategorized.push(feature);
    }
  }
  
  // No custom categories, no work to do
  if (Object.keys(categories).length === 0) return;
  
  // Second pass - build the new HTML
  const newFeaturesHTML = document.createElement('div');
  
  // Add all category sections
  for (const [category, categoryFeatures] of Object.entries(categories)) {
    const sectionHTML = buildCategorySection(category, categoryFeatures, app);
    newFeaturesHTML.appendChild(sectionHTML);
  }
  
  // Locate existing sections
  const existingSections = featuresTab.querySelectorAll('section.features-group, .item-list');
  
  // If there's at least one section, add our custom sections before it
  if (existingSections.length > 0) {
    existingSections[0].parentNode.insertBefore(newFeaturesHTML, existingSections[0]);
  } else {
    // Otherwise just append to the features tab
    featuresTab.appendChild(newFeaturesHTML);
  }
});

/**
 * Build a category section with all its features
 */
function buildCategorySection(category, features, app) {
  const section = document.createElement('section');
  section.classList.add('features-group', 'custom-category');
  section.dataset.customCategory = category;
  
  // Create the section header
  const header = document.createElement('header');
  header.classList.add('items-header');
  header.innerHTML = `
    <h3 class="item-name">${category}</h3>
    <div class="item-controls">
      <a class="item-control item-create" title="Create Item" data-category="${category}">
        <i class="fas fa-plus"></i> Add
      </a>
    </div>
  `;
  section.appendChild(header);
  
  // Create the items list
  const ol = document.createElement('ol');
  ol.classList.add('items-list');
  section.appendChild(ol);
  
  // Add each feature to the list
  for (const feature of features) {
    const li = buildFeatureItem(feature, app);
    ol.appendChild(li);
  }
  
  // Add event listener for the create button
  section.querySelector('.item-create').addEventListener('click', ev => {
    ev.preventDefault();
    const categoryName = ev.currentTarget.dataset.category;
    
    // Create a new feature
    const itemData = {
      name: `New ${categoryName} Feature`,
      type: 'feat'
    };
    
    // Create the item and set its category
    app.actor.createEmbeddedDocuments('Item', [itemData]).then(items => {
      if (items.length > 0) {
        const item = items[0];
        item.setFlag(MODULE_ID, 'category', categoryName);
      }
    });
  });
  
  return section;
}

/**
 * Build a single feature item for the list
 */
function buildFeatureItem(feature, app) {
  const li = document.createElement('li');
  li.classList.add('item');
  li.dataset.itemId = feature.id;
  
  // Get uses info
  const uses = feature.system.uses || {};
  const useValue = uses.value ?? "";
  const useMax = uses.max ?? "";
  const useRecovery = uses.per ? CONFIG.DND5E.limitedUsePeriods[uses.per] : "";
  
  li.innerHTML = `
    <div class="item-name rollable">
      <div class="item-image">
        <img src="${feature.img}" alt="${feature.name}" />
      </div>
      <h4>${feature.name}</h4>
    </div>
    <div class="item-uses">
      ${useValue} ${useMax ? `/ ${useMax}` : ""}
    </div>
    <div class="item-recovery">
      ${useRecovery}
    </div>
    <div class="item-controls">
      <a class="item-control item-edit" title="Edit Item"><i class="fas fa-edit"></i></a>
      <a class="item-control item-delete" title="Delete Item"><i class="fas fa-trash"></i></a>
    </div>
  `;
  
  // Add event listeners
  li.querySelector('.item-name.rollable').addEventListener('click', () => {
    feature.roll();
  });
  
  li.querySelector('.item-edit').addEventListener('click', () => {
    feature.sheet.render(true);
  });
  
  li.querySelector('.item-delete').addEventListener('click', () => {
    feature.delete();
  });
  
  return li;
}

// Initialize the module
Hooks.once('ready', () => {
  console.log(`${MODULE_ID} | Ready`);
});
