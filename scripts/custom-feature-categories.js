const MODULE_ID = "custom-feature-categories";

// Initialize
Hooks.once('init', () => {
  console.log(`${MODULE_ID} | Initializing`);
});

// Add category field to item sheets
Hooks.on("renderItemSheet", (app, html, data) => {
  if (app.item.type !== 'feat') return;
  
  // Create the category input field
  const categoryField = `
    <div class="form-group">
      <label>Category</label>
      <div class="form-fields">
        <input type="text" name="flags.${MODULE_ID}.category" value="${app.item.getFlag(MODULE_ID, 'category') || ''}">
      </div>
    </div>
  `;
  
  // Insert at the top of the details tab
  const detailsHeader = html.find('.sheet-header').next();
  if (detailsHeader.length) {
    detailsHeader.after(categoryField);
  } else {
    html.find('form').prepend(categoryField);
  }
});

// Patch the character sheet's getData method
Hooks.once("ready", () => {
  libWrapper.register(
    MODULE_ID,
    "dnd5e.applications.actor.ActorSheet5eCharacter.prototype.getData",
    customCategoriesGetData,
    "WRAPPER"
  );
});

// Custom getData function
async function customCategoriesGetData(wrapped, ...args) {
  // Get the original data
  const data = await wrapped(...args);
  
  // Check if there are features to categorize
  if (!data.features || !data.features.length) return data;
  
  // Create a copy of the features array to modify
  const originalFeatures = [...data.features];
  
  // Collect all items with custom categories
  const categorizedItems = [];
  const categories = {};
  
  // First pass - identify items with custom categories
  for (const section of originalFeatures) {
    if (!section.items) continue;
    
    for (const item of section.items) {
      const category = item.flags?.[MODULE_ID]?.category;
      if (category) {
        if (!categories[category]) {
          categories[category] = {
            label: category,
            items: [],
            dataset: { type: category },
            hasActions: true
          };
        }
        
        // Add to the custom category
        categories[category].items.push(item);
        categorizedItems.push(item);
      }
    }
  }
  
  // Second pass - remove categorized items from original sections
  for (const section of originalFeatures) {
    if (!section.items) continue;
    
    section.items = section.items.filter(item => 
      !categorizedItems.some(ci => ci._id === item._id)
    );
  }
  
  // Add custom categories to features
  for (const category of Object.values(categories)) {
    originalFeatures.push(category);
  }
  
  // Replace the features array in the data
  data.features = originalFeatures;
  
  return data;
}
