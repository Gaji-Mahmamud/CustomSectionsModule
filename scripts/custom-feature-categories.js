// Module constants
const MODULE_ID = "custom-feature-categories";
const COMMON_CATEGORIES = [
  "Racial Features",
  "Class Features",
  "Background Features",
  "Feats",
  "Magecraft",
  "Pathway",
  "Axiom"
];

/**
 * Initialize the module
 */
Hooks.once('init', function() {
  console.log(`${MODULE_ID} | Initializing Custom Feature Categories Module`);
  
  // Register settings
  game.settings.register(MODULE_ID, "categoryOrder", {
    name: "Category Display Order",
    hint: "Comma-separated list of categories in the order they should appear",
    scope: "world",
    config: true,
    type: String,
    default: COMMON_CATEGORIES.join(",")
  });
  
  game.settings.register(MODULE_ID, "defaultExpanded", {
    name: "Default Expanded State",
    hint: "Whether categories should be expanded or collapsed by default",
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });
});

/**
 * Add category field to item sheets
 */
Hooks.on("renderItemSheet", (app, html, data) => {
  if (app.item?.type !== 'feat') return;
  
  console.log(`${MODULE_ID} | Adding category field to feat sheet`);
  
  // Get current category value
  const currentCategory = app.item.getFlag(MODULE_ID, 'category') || '';
  
  // Create the category input with datalist for common categories
  const categoryField = `
    <div class="form-group">
      <label>Feature Category</label>
      <div class="form-fields">
        <input type="text" name="flags.${MODULE_ID}.category" value="${currentCategory}" 
               list="custom-category-list" placeholder="e.g., Racial Features, Class Features">
        <datalist id="custom-category-list">
          ${COMMON_CATEGORIES.map(cat => `<option value="${cat}">`).join('')}
        </datalist>
      </div>
    </div>
  `;
  
  // For Foundry v13 with DnD5e v5.0+, locate the "FEATURE DETAILS" heading
  const featureDetailsHeading = html.find('h2:contains("FEATURE DETAILS")');
  if (featureDetailsHeading.length) {
    console.log(`${MODULE_ID} | Found FEATURE DETAILS heading`);
    
    // Find the Required Level field to insert after
    const requiredLevelField = html.find('.form-group:contains("Required Level")');
    if (requiredLevelField.length) {
      console.log(`${MODULE_ID} | Inserting after Required Level field`);
      requiredLevelField.after(categoryField);
    } else {
      // Insert after Feat Type field if required level not found
      const featTypeField = html.find('.form-group:contains("Feat Type")');
      if (featTypeField.length) {
        console.log(`${MODULE_ID} | Inserting after Feat Type field`);
        featTypeField.after(categoryField);
      } else {
        // Insert after repeatable field if feat type not found
        const repeatableField = html.find('.form-group:contains("Repeatable")');
        if (repeatableField.length) {
          console.log(`${MODULE_ID} | Inserting after Repeatable field`);
          repeatableField.after(categoryField);
        } else {
          // Last resort: find the feature details section and append to it
          const detailsSection = featureDetailsHeading.closest('section');
          if (detailsSection.length) {
            console.log(`${MODULE_ID} | Appending to details section`);
            detailsSection.append(categoryField);
          } else {
            console.log(`${MODULE_ID} | Unable to find appropriate insertion point`);
          }
        }
      }
    }
  } else {
    // Fallback for other sheet layouts
    console.log(`${MODULE_ID} | Using fallback insertion method`);
    const typeField = html.find('.form-group:contains("Type")').first();
    if (typeField.length) {
      typeField.after(categoryField);
      console.log(`${MODULE_ID} | Field inserted after Type field`);
    } else {
      // Last resort - just add to the details tab
      const detailsTab = html.find('.tab[data-tab="details"]');
      if (detailsTab.length) {
        detailsTab.append(categoryField);
        console.log(`${MODULE_ID} | Field appended to details tab`);
      }
    }
  }
  
  console.log(`${MODULE_ID} | Category field handling complete`);
});

/**
 * Inject categories after character sheet render
 */
Hooks.on("renderActorSheet5eCharacter", (app, html, data) => {
  console.log(`${MODULE_ID} | Character sheet rendered, injecting categories`);
  
  // Our actor
  const actor = app.actor;
  if (!actor || actor.type !== 'character') {
    console.log(`${MODULE_ID} | Not a character actor`);
    return;
  }
  
  // Find the features tab
  const featuresTab = html.find('.tab.features, [data-tab="features"]');
  if (!featuresTab.length) {
    console.log(`${MODULE_ID} | Features tab not found`);
    return;
  }
  
  console.log(`${MODULE_ID} | Found features tab, processing features`);
  
  // Get all features
  const features = actor.items.filter(i => i.type === 'feat');
  console.log(`${MODULE_ID} | Features found:`, features.length);
  
  // Group by category
  const categories = {};
  const uncategorized = [];
  
  for (const feature of features) {
    const category = feature.getFlag(MODULE_ID, 'category');
    if (category) {
      if (!categories[category]) categories[category] = [];
      categories[category].push(feature);
    } else {
      uncategorized.push(feature);
    }
  }
  
  console.log(`${MODULE_ID} | Categories grouped:`, Object.keys(categories));
  
  // If no categorized features, nothing to do
  if (Object.keys(categories).length === 0) {
    console.log(`${MODULE_ID} | No categorized features found`);
    return;
  }
  
  // Get the display order from settings
  const orderSetting = game.settings.get(MODULE_ID, "categoryOrder") || "";
  const orderList = orderSetting.split(",").map(c => c.trim());
  
  // Sort the categories
  const sortedCategoryNames = Array.from(new Set([
    ...orderList,
    ...Object.keys(categories)
  ])).filter(name => categories[name]);
  
  console.log(`${MODULE_ID} | Sorted category names:`, sortedCategoryNames);
  
  // Default expanded state
  const defaultExpanded = game.settings.get(MODULE_ID, "defaultExpanded");
  
  // Create HTML for custom categories
  let categoryHTML = '<div class="custom-categories">';
  
  for (const categoryName of sortedCategoryNames) {
    const feats = categories[categoryName];
    if (!feats || feats.length === 0) continue;
    
    // Generate unique ID for this category
    const categoryId = categoryName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    categoryHTML += `
      <div class="custom-category" data-category="${categoryName}">
        <div class="custom-category-header">
          <h3 class="custom-category-title">
            ${categoryName}
            <a class="custom-category-toggle" data-category="${categoryId}">
              <i class="fas ${defaultExpanded ? 'fa-angle-down' : 'fa-angle-right'}"></i>
            </a>
          </h3>
        </div>
        <div class="custom-category-content" data-category="${categoryId}" ${defaultExpanded ? '' : 'style="display: none;"'}>
          <ol class="items-list">
    `;
    
    for (const feat of feats) {
      const itemId = feat.id;
      const useData = getFeatureUseData(feat);
      
      categoryHTML += `
        <li class="item" data-item-id="${itemId}">
          <div class="item-name flexrow rollable">
            <div class="item-image" style="background-image: url('${feat.img}')"></div>
            <h4>${feat.name}</h4>
          </div>
          ${useData.usesHTML}
          <div class="item-controls flexrow">
            <a class="item-control item-edit" title="Edit Item"><i class="fas fa-edit"></i></a>
            <a class="item-control item-delete" title="Delete Item"><i class="fas fa-trash"></i></a>
          </div>
        </li>
      `;
    }
    
    categoryHTML += `
          </ol>
        </div>
      </div>
    `;
  }
  
  categoryHTML += '</div>';
  
  console.log(`${MODULE_ID} | Category HTML created, looking for insertion point`);
  
  // Insert before first feature section
  const firstFeatureSection = featuresTab.find('section.active-effects, .inventory-list, .features-list').first();
  if (firstFeatureSection.length) {
    console.log(`${MODULE_ID} | Inserting before first feature section`);
    firstFeatureSection.before(categoryHTML);
  } else {
    console.log(`${MODULE_ID} | Appending to features tab`);
    featuresTab.append(categoryHTML);
  }
  
  console.log(`${MODULE_ID} | Removing duplicated features from other sections`);
  
  // Remove categorized features from the "Other Features" section to a
