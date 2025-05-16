// custom-feature-categories.js
const MODULE_ID = "custom-feature-categories";

// Initialize
Hooks.once('init', () => {
  console.log(`${MODULE_ID} | Initializing`);
});

// Add category field to item sheets
Hooks.on("renderItemSheet", (app, html, data) => {
  if (app.item?.type !== 'feat') return;
  
  // Get current category value
  const currentCategory = app.item.getFlag(MODULE_ID, 'category') || '';
  
  // Create the category input field
  const categoryField = `
    <div class="form-group">
      <label>Category</label>
      <div class="form-fields">
        <input type="text" name="flags.${MODULE_ID}.category" value="${currentCategory}">
      </div>
    </div>
  `;
  
  // Try to find the right place to insert
  const typeLabel = html.find('label:contains("Type")').first();
  if (typeLabel.length) {
    typeLabel.closest('.form-group').before(categoryField);
  } else {
    html.find('form').prepend(categoryField);
  }
});

// Create custom feature groups on character sheet
Hooks.on("renderActorSheet", (app, html, data) => {
  if (app.actor?.type !== 'character') return;
  
  // Find the features tab
  const featuresTab = html.find('.tab.features, [data-tab="features"]').first();
  if (!featuresTab.length) return;
  
  // Get all features
  const features = app.actor.items.filter(i => i.type === 'feat');
  
  // Group by category
  const categories = {};
  for (const feature of features) {
    const category = feature.getFlag(MODULE_ID, 'category');
    if (category) {
      if (!categories[category]) categories[category] = [];
      categories[category].push(feature);
    }
  }
  
  // If no categorized features, nothing to do
  if (Object.keys(categories).length === 0) return;
  
  // Create HTML for custom categories
  let categoryHTML = '<div class="custom-categories">';
  
  for (const [category, feats] of Object.entries(categories)) {
    categoryHTML += `
      <div class="custom-category">
        <h3>${category}</h3>
        <ol class="items-list">
    `;
    
    for (const feat of feats) {
      const itemId = feat.id;
      const uses = feat.system.uses || {};
      const useValue = uses.value ?? "";
      const useMax = uses.max ?? "";
      const useRecovery = uses.per ? CONFIG.DND5E.limitedUsePeriods[uses.per] : "";
      
      categoryHTML += `
        <li class="item" data-item-id="${itemId}">
          <div class="item-name rollable">
            <div class="item-image"><img src="${feat.img}" alt="${feat.name}"></div>
            <h4>${feat.name}</h4>
          </div>
          <div class="item-uses">${useValue} ${useMax ? `/ ${useMax}` : ""}</div>
          <div class="item-recovery">${useRecovery}</div>
          <div class="item-controls">
            <a class="item-control item-edit" title="Edit Item"><i class="fas fa-edit"></i></a>
            <a class="item-control item-delete" title="Delete Item"><i class="fas fa-trash"></i></a>
          </div>
        </li>
      `;
    }
    
    categoryHTML += `
        </ol>
      </div>
    `;
  }
  
  categoryHTML += '</div>';
  
  // Insert before first section or at top of features tab
  const firstSection = featuresTab.find('section, .item-list, .features-list').first();
  if (firstSection.length) {
    firstSection.before(categoryHTML);
  } else {
    featuresTab.append(categoryHTML);
  }
  
  // Remove categorized features from default lists to avoid duplication
  for (const category in categories) {
    for (const feat of categories[category]) {
      html.find(`.item[data-item-id="${feat.id}"]`).not('.custom-category .item').remove();
    }
  }
  
  // Add event listeners to the new elements
  html.find('.custom-category .item-name.rollable').click(ev => {
    const itemId = $(ev.currentTarget).closest('.item').data('item-id');
    const item = app.actor.items.get(itemId);
    if (item) item.roll();
  });
  
  html.find('.custom-category .item-edit').click(ev => {
    const itemId = $(ev.currentTarget).closest('.item').data('item-id');
    const item = app.actor.items.get(itemId);
    if (item) item.sheet.render(true);
  });
  
  html.find('.custom-category .item-delete').click(ev => {
    const itemId = $(ev.currentTarget).closest('.item').data('item-id');
    const item = app.actor.items.get(itemId);
    if (item) item.delete();
  });
});
