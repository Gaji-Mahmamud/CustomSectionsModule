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

// Immediate logging to verify script loading
console.log("==== CUSTOM FEATURE CATEGORIES MODULE FILE LOADED ====");

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

// Global hook monitor to identify available sheet hooks
Hooks.on('ready', () => {
  console.log("==== CUSTOM FEATURE CATEGORIES READY ====");
  
  // Debug helper to log all sheet rendering
  Hooks.on('render', (app, html, data) => {
    if (app.constructor.name.includes('Sheet')) {
      console.log(`Sheet rendered: ${app.constructor.name}`, app);
    }
  });
  
  // Monitor all hooks that might be related to sheets
  const originalHooksCall = Hooks.call;
  Hooks.call = function(hook, ...args) {
    if (hook.includes('render') && hook.includes('Sheet')) {
      console.log(`Hook fired: ${hook}`, args[0]?.constructor?.name);
    }
    return originalHooksCall.call(this, hook, ...args);
  };
});

/**
 * Add category field to item sheets - Simplified test version
 */
Hooks.on("renderItemSheet", (app, html, data) => {
  console.log(`${MODULE_ID} | renderItemSheet fired for:`, app.item?.name, app);
  
  // Only process feat items
  if (app.item?.type !== 'feat') {
    console.log(`${MODULE_ID} | Not a feat item, skipping`);
    return;
  }
  
  // Very basic test injection to confirm hook is working
  html.find('form').append(`
    <div style="background:red;color:white;padding:10px;margin-top:10px;border:2px solid black;">
      TEST INJECTION - Item: ${app.item.name} - Type: ${app.item.type}
    </div>
  `);
  
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
  
  // Log sheet structure for debugging
  console.log(`${MODULE_ID} | Sheet structure:`, {
    formGroups: html.find('.form-group').length,
    headings: html.find('h2').map((i, el) => $(el).text()).get(),
    sections: html.find('section').map((i, el) => $(el).attr('class')).get(),
    tabs: html.find('.tab').map((i, el) => $(el).data('tab')).get()
  });
  
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
 * Try multiple actor sheet hooks to find the one that works
 */
// Generic actor sheet hook
Hooks.on("renderActorSheet", (app, html, data) => {
  console.log(`${MODULE_ID} | renderActorSheet fired for:`, app.actor?.name, app);
  
  // Basic test injection visible on all actor sheets
  html.find('header').after(`
    <div style="background:blue;color:white;padding:10px;margin:10px;border:2px solid black;">
      TEST - Actor: ${app.actor?.name} - Type: ${app.actor?.type} - Sheet: ${app.constructor.name}
    </div>
  `);
  
  // Only continue for character type actors
  if (app.actor?.type !== 'character') return;
  
  processCategoriesForActor(app, html, data);
});

// Specific DnD5e character sheet hook
Hooks.on("renderActorSheet5eCharacter", (app, html, data) => {
  console.log(`${MODULE_ID} | renderActorSheet5eCharacter fired for:`, app.actor?.name, app);
  
  // Only continue for character type actors
  if (app.actor?.type !== 'character') return;
  
  processCategoriesForActor(app, html, data);
});

// Try with Application v2 sheet hooks
Hooks.on("renderDND5E.applications.actor.ActorSheet5eCharacter", (app, html, data) => {
  console.log(`${MODULE_ID} | renderDND5E.applications.actor.ActorSheet5eCharacter fired for:`, app.actor?.name, app);
  
  // Only continue for character type actors
  if (app.actor?.type !== 'character') return;
  
  processCategoriesForActor(app, html, data);
});

/**
 * Process categories for an actor
 */
function processCategoriesForActor(app, html, data) {
  const actor = app.actor;
  if (!actor) {
    console.log(`${MODULE_ID} | No actor found`);
    return;
  }
  
  // Find the features tab - log all tabs for debugging
  console.log(`${MODULE_ID} | All tabs:`, html.find('[data-tab]').map((i, el) => $(el).data('tab')).get());
  
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
    console.log(`${MODULE_ID} | Feature ${feature.name} has category:`, category);
    
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
  
  // Log what sections are available for debugging
  console.log(`${MODULE_ID} | Available sections:`, 
    html.find('section').map((i, el) => ({
      className: $(el).attr('class'),
      id: $(el).attr('id'),
      children: $(el).children().length
    })).get()
  );
  
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
  
  // Remove categorized features from the "Other Features" section to avoid duplication
  for (const category in categories) {
    for (const feat of categories[category]) {
      const featureItem = html.find(`.features-list .item[data-item-id="${feat.id}"]`);
      if (featureItem.length) {
        // Find the parent section
        const parentSection = featureItem.closest('section');
        featureItem.remove();
        
        // If the section is now empty, hide or update it
        if (parentSection.find('.item').length === 0) {
          const sectionHeader = parentSection.find('.items-header');
          if (sectionHeader.text().includes('Other')) {
            if (uncategorized.length === 0) {
              parentSection.hide();
            }
          }
        }
      }
    }
  }
  
  console.log(`${MODULE_ID} | Adding event listeners`);
  
  // Add event listeners to the new elements
  // Toggle category visibility
  html.find('.custom-category-toggle').click(ev => {
    ev.preventDefault();
    const categoryId = ev.currentTarget.dataset.category;
    const content = html.find(`.custom-category-content[data-category="${categoryId}"]`);
    const icon = ev.currentTarget.querySelector('i');
    
    if (content.is(':visible')) {
      content.slideUp(200);
      icon.classList.replace('fa-angle-down', 'fa-angle-right');
    } else {
      content.slideDown(200);
      icon.classList.replace('fa-angle-right', 'fa-angle-down');
    }
  });
  
  // Feature item interactions
  html.find('.custom-category .item-name.rollable').click(ev => {
    ev.preventDefault();
    const itemId = ev.currentTarget.closest('.item').dataset.itemId;
    const item = actor.items.get(itemId);
    if (item) item.roll();
  });
  
  html.find('.custom-category .item-edit').click(ev => {
    ev.preventDefault();
    const itemId = ev.currentTarget.closest('.item').dataset.itemId;
    const item = actor.items.get(itemId);
    if (item) item.sheet.render(true);
  });
  
  html.find('.custom-category .item-delete').click(ev => {
    ev.preventDefault();
    const li = ev.currentTarget.closest('.item');
    const itemId = li.dataset.itemId;
    
    renderDialog({
      title: `Delete Feature`,
      content: `<p>Are you sure you want to delete <strong>${actor.items.get(itemId).name}</strong>?</p>`,
      buttons: {
        yes: {
          icon: '<i class="fas fa-trash"></i>',
          label: "Delete",
          callback: () => actor.items.get(itemId).delete()
        },
        no: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        }
      },
      default: "no"
    });
  });
  
  // Uses counter interactions - increase/decrease
  html.find('.custom-category .item-uses input').change(ev => {
    ev.preventDefault();
    const itemId = ev.currentTarget.closest('.item').dataset.itemId;
    const item = actor.items.get(itemId);
    if (!item) return;
    
    const value = Number(ev.currentTarget.value);
    item.update({"system.uses.value": value});
  });
  
  console.log(`${MODULE_ID} | Custom categories injection complete`);
}

/**
 * Helper function to render confirmation dialogs
 */
function renderDialog({title, content, buttons, default: defaultButton}) {
  return new Dialog({
    title,
    content,
    buttons,
    default: defaultButton
  }).render(true);
}

/**
 * Helper function to get feature uses data
 */
function getFeatureUseData(feature) {
  const uses = feature.system.uses || {};
  const usesValue = uses.value ?? "";
  const usesMax = uses.max ?? "";
  const usesPer = uses.per ? CONFIG.DND5E.limitedUsePeriods[uses.per] : "";
  
  let usesHTML = '';
  if (usesMax) {
    usesHTML = `
      <div class="item-uses flexrow">
        <div class="item-usage">
          <input class="uses-value" type="text" value="${usesValue}" placeholder="0">
          <span class="sep"> / </span>
          <span class="uses-max">${usesMax}</span>
          <span class="recovery">${usesPer}</span>
        </div>
      </div>
    `;
  } else {
    usesHTML = `<div class="item-uses flexrow"></div>`;
  }
  
  return { usesHTML };
}
