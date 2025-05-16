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

// Store the libWrapper reference
let libWrapper;

/**
 * Initialize the module
 */
Hooks.once('init', function() {
  console.log(`${MODULE_ID} | Initializing Custom Feature Categories Module`);
  
  // Get libWrapper reference (either from the module if active, or the shim)
  libWrapper = game.modules.get('lib-wrapper')?.active ? window.libWrapper : window.libWrapper;
  
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
  
  // Register the wrapper for character sheet rendering
  // Try to find the appropriate class based on the loaded system version
  if (libWrapper) {
    try {
      libWrapper.register(
        MODULE_ID,
        'dnd5e.applications.actor.ActorSheet5eCharacter.prototype._renderInner',
        injectCustomCategories,
        'WRAPPER'
      );
      console.log(`${MODULE_ID} | Successfully registered wrapper`);
    } catch (e) {
      console.error(`${MODULE_ID} | Failed to register wrapper:`, e);
      // Try alternative method
      try {
        const ActorSheet5eCharacter = CONFIG.Actor.sheetClasses.character["dnd5e.ActorSheet5eCharacter"].cls;
        libWrapper.register(
          MODULE_ID,
          'ActorSheet5eCharacter.prototype._renderInner',
          injectCustomCategories,
          'WRAPPER'
        );
        console.log(`${MODULE_ID} | Successfully registered wrapper (alternative method)`);
      } catch (e2) {
        console.error(`${MODULE_ID} | Could not find or wrap character sheet class:`, e2);
      }
    }
  } else {
    console.error(`${MODULE_ID} | libWrapper not found, module will not function correctly`);
  }
});

/**
 * Add category field to item sheets
 */
Hooks.on("renderItemSheet", (app, html, data) => {
  if (app.item?.type !== 'feat') return;
  
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
  
  // Try to find the right place to insert
  const targetElement = html.find('.tab[data-tab="details"] .form-group').first();
  if (targetElement.length) {
    targetElement.before(categoryField);
  } else {
    html.find('.tab[data-tab="details"]').prepend(categoryField);
  }
});

/**
 * Primary function to inject custom categories into the character sheet
 */
async function injectCustomCategories(wrapped, ...args) {
  console.log(`${MODULE_ID} | Injecting categories function called`);
  
  // Call the original _renderInner method to get the HTML
  const html = await wrapped(...args);
  
  // Our actor
  const actor = this.actor;
  if (!actor) {
    console.log(`${MODULE_ID} | No actor found`);
    return html;
  }
  
  if (actor.type !== 'character') {
    console.log(`${MODULE_ID} | Not a character actor: ${actor.type}`);
    return html;
  }
  
  // Find the features tab
  const featuresTab = html.find('.tab.features, [data-tab="features"]');
  if (!featuresTab.length) {
    console.log(`${MODULE_ID} | Features tab not found`);
    return html;
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
    return html;
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
  return html;
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
